import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { INestApplication } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import request from 'supertest';
import { QueueFullException, QueueService } from '../src/queue/queue.service';
import { hundredHeights, makeSpectraZip } from './helpers/spectra-zip';

const BASE_URL = 'http://test.local';
const ARCHIVE = makeSpectraZip(hundredHeights());

describe('POST /api/calculate', () => {
  let app: INestApplication;
  let root: string;

  const post = (from = '595', to = '625') =>
    request(app.getHttpServer()).post('/api/calculate').field('from', from).field('to', to);

  beforeAll(async () => {
    root = mkdtempSync(join(tmpdir(), 'spectra-e2e-'));
    Object.assign(process.env, {
      STORAGE_ROOT: join(root, 'storage'),
      DATA_ROOT: join(root, 'data'),
      PUBLIC_BASE_URL: BASE_URL,
      STORAGE_TTL_HOURS: '0',
    });
    // AppModule reads the config while it is being imported, hence the late import. NestFactory
    // rather than @nestjs/testing: under the testing module ServeStaticModule sees no HTTP adapter
    // yet and silently serves nothing, which is exactly what these tests need to catch.
    const { AppModule } = await import('../src/app.module');
    app = await NestFactory.create(AppModule, { logger: false });
    // Same pipe as main.ts.
    app.useGlobalPipes(
      new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: false }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    rmSync(root, { recursive: true, force: true });
  });

  it('calculates and returns the result', async () => {
    const response = await post().attach('archive', ARCHIVE, 'map.zip').expect(201);

    expect(response.body).toMatchObject({
      interval: { from: 595, to: 625 },
      gridSize: 10,
      peakLabel: 610,
      sourceFileName: 'map.zip',
      stats: { meanIntensity: 50500, category: 'unacceptable', filesProcessed: 100 },
    });
    expect(response.body.matrix[1][0]).toBe(11000);
  });

  it('persists the artifacts and serves them under /files', async () => {
    const { body } = await post().attach('archive', ARCHIVE, 'map.zip').expect(201);
    const prefix = `${BASE_URL}/files/${body.id}`;

    expect(body.files).toEqual({
      heatmapPng: `${prefix}/heatmap.png`,
      reportPdf: `${prefix}/report.pdf`,
      matrixCsv: `${prefix}/matrix.csv`,
      metaJson: `${prefix}/result.json`,
    });

    const saved = JSON.parse(readFileSync(join(root, 'storage', body.id, 'result.json'), 'utf-8'));
    expect(saved).toEqual(body);

    const server = app.getHttpServer();
    const path = `/files/${body.id}`;
    await request(server).get(`${path}/heatmap.png`).expect(200).expect('Content-Type', /image\/png/);
    await request(server).get(`${path}/report.pdf`).expect(200).expect('Content-Type', /pdf/);
    await request(server).get(`${path}/matrix.csv`).expect(200);
  });

  it('restores a Cyrillic file name', async () => {
    const { body } = await post().attach('archive', ARCHIVE, 'карта.zip').expect(201);

    expect(body.sourceFileName).toBe('карта.zip');
  });

  it('applies the grid step and the colours, which do not affect the numbers', async () => {
    const { body } = await post()
      .field('step', '50')
      .field('colorHigh', '#ff0000')
      .attach('archive', ARCHIVE, 'map.zip')
      .expect(201);

    expect(body.xTicks.slice(0, 3)).toEqual([0, 50, 100]);
    expect(body.colorHigh).toBe('#ff0000');
    expect(body.colorLow).toBe('#000004');
    expect(body.stats.meanIntensity).toBe(50500);
  });

  it('reports the spectra that did not fit the square grid', async () => {
    const archive = makeSpectraZip([...hundredHeights(), 1000]);

    const { body } = await post().attach('archive', archive, 'map.zip').expect(201);

    expect(body).toMatchObject({ gridSize: 10, spectraFound: 101, spectraDropped: 1 });
  });

  describe('rejects with 400', () => {
    const message = (body: { message: string | string[] }) => [body.message].flat().join('; ');

    it('a request without an archive', async () => {
      const { body } = await post().expect(400);

      expect(message(body)).toContain('Не приложен ZIP-архив');
    });

    it('a file that is not named .zip', async () => {
      const { body } = await post().attach('archive', ARCHIVE, 'map.rar').expect(400);

      expect(message(body)).toBe('Ожидается .zip архив');
    });

    it('a corrupted archive', async () => {
      const { body } = await post().attach('archive', Buffer.from('junk'), 'map.zip').expect(400);

      expect(message(body)).toBe('Не удалось прочитать ZIP-архив');
    });

    it.each([
      ['step', '19'],
      ['step', '401'],
      ['colorHigh', 'red'],
      ['colorLow', '#12345'],
    ])('the display option %s=%j', async (name, value) => {
      await post().field(name, value).attach('archive', ARCHIVE, 'map.zip').expect(400);
    });

    it('an archive with too few spectra', async () => {
      const archive = makeSpectraZip([1000, 2000]);

      const { body } = await post().attach('archive', archive, 'map.zip').expect(400);

      expect(message(body)).toContain('найдено 2');
    });

    it.each([
      ['abc', '625'],
      ['595', ''],
      ['-1', '625'],
      ['595', '10001'],
    ])('the bounds from=%j to=%j', async (from, to) => {
      await post(from, to).attach('archive', ARCHIVE, 'map.zip').expect(400);
    });

    it('a reversed interval', async () => {
      const { body } = await post('625', '595').attach('archive', ARCHIVE, 'map.zip').expect(400);

      expect(message(body)).toContain('Некорректный интервал');
    });

    it('an interval that misses the spectra', async () => {
      const { body } = await post('5000', '6000').attach('archive', ARCHIVE, 'map.zip').expect(400);

      expect(message(body)).toContain('не содержит точек в интервале');
    });

    it('and does not persist anything for a failed calculation', async () => {
      await post().attach('archive', ARCHIVE, 'map.zip').expect(201);
      const jobsBefore = readdirSync(join(root, 'storage'));

      await post('625', '595').attach('archive', ARCHIVE, 'map.zip').expect(400);

      expect(readdirSync(join(root, 'storage'))).toEqual(jobsBefore);
    });
  });

  it('answers 429 when the queue is full', async () => {
    const queue = app.get(QueueService, { strict: false });
    jest.spyOn(queue, 'run').mockRejectedValueOnce(new QueueFullException(25));

    const { body } = await post().attach('archive', ARCHIVE, 'map.zip').expect(429);

    expect(body.message).toContain('Сервис перегружен');
  });
});
