import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { INestApplication } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import request from 'supertest';
import { hundredHeights, makeSpectraZip } from './helpers/spectra-zip';

const PASSWORD = 'correct horse battery staple';
const ARCHIVE = makeSpectraZip(hundredHeights());
const BROWSER = 'Mozilla/5.0 (X11; Linux x86_64) Firefox/140.0';

/** Collects a response body as a Buffer whatever its content type. */
function binary(res: request.Response, cb: (err: Error | null, body: Buffer) => void): void {
  const chunks: Buffer[] = [];
  res.on('data', (chunk: Buffer) => chunks.push(chunk));
  res.on('end', () => cb(null, Buffer.concat(chunks)));
}

describe('admin', () => {
  let app: INestApplication;
  let root: string;
  let cookie: string;

  const server = () => app.getHttpServer();
  const admin = (path: string) => request(server()).get(`/api/admin${path}`).set('Cookie', cookie);
  const calculate = (from = '595', to = '625', name = 'карта.zip') =>
    request(server())
      .post('/api/calculate')
      .set('User-Agent', BROWSER)
      .set('X-Real-IP', '203.0.113.7')
      .field('from', from)
      .field('to', to)
      .attach('archive', ARCHIVE, name);
  const track = (fields: Record<string, string>, ua = BROWSER) =>
    request(server()).post('/api/track').set('User-Agent', ua).type('form').send(fields);

  const login = (password = PASSWORD, ip = '198.51.100.1') =>
    request(server()).post('/api/admin/login').set('X-Real-IP', ip).send({ password });

  beforeAll(async () => {
    root = mkdtempSync(join(tmpdir(), 'spectra-admin-'));
    Object.assign(process.env, {
      STORAGE_ROOT: join(root, 'storage'),
      DATA_ROOT: join(root, 'data'),
      PUBLIC_BASE_URL: 'https://spectra-calc.ru',
      STORAGE_TTL_HOURS: '0',
      ADMIN_PASSWORD: PASSWORD,
    });
    const { AppModule } = await import('../src/app.module');
    app = await NestFactory.create(AppModule, { logger: false });
    app.useGlobalPipes(
      new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: false }),
    );
    await app.init();

    const res = await login().expect(204);
    cookie = (res.headers['set-cookie'] as unknown as string[])[0].split(';')[0];
  });

  afterAll(async () => {
    await app.close();
    rmSync(root, { recursive: true, force: true });
  });

  describe('access', () => {
    it('answers the healthcheck', async () => {
      await request(server()).get('/api/health').expect(200, { status: 'ok' });
    });

    it('turns every admin endpoint away without a session', async () => {
      for (const path of ['/session', '/overview', '/requests', '/calculations']) {
        await request(server()).get(`/api/admin${path}`).expect(401);
      }
    });

    it('refuses a wrong password', async () => {
      const { body } = await login('guess', '198.51.100.2').expect(401);

      expect(body.message).toBe('Неверный пароль');
    });

    it('sets a session cookie the scripts cannot read, scoped to the admin API', async () => {
      const res = await login().set('X-Forwarded-Proto', 'https').expect(204);
      const header = (res.headers['set-cookie'] as unknown as string[])[0];

      expect(header).toMatch(/^spectra_admin=/);
      expect(header).toContain('HttpOnly');
      expect(header).toContain('SameSite=Strict');
      expect(header).toContain('Path=/api/admin');
      expect(header).toContain('Secure');
    });

    it('lets a valid session in', async () => {
      await admin('/session').expect(200, { authenticated: true });
    });

    it('rejects a tampered session', async () => {
      const [expiry] = cookie.split('=')[1].split('.');
      const forged = `spectra_admin=${Number(expiry) + 1}.${cookie.split('.')[1]}`;

      await request(server()).get('/api/admin/session').set('Cookie', forged).expect(401);
    });

    it('locks an address out after ten failed attempts', async () => {
      for (let i = 0; i < 10; i++) await login('nope', '198.51.100.66').expect(401);

      await login(PASSWORD, '198.51.100.66').expect(429);
      await login(PASSWORD, '198.51.100.67').expect(204);
    });

    it('clears the cookie on logout', async () => {
      const res = await request(server()).post('/api/admin/logout').expect(204);

      expect((res.headers['set-cookie'] as unknown as string[])[0]).toMatch(
        /^spectra_admin=;.*Expires=Thu, 01 Jan 1970/,
      );
    });
  });

  describe('calculations', () => {
    it('records a successful calculation with its parameters and result', async () => {
      const { body: result } = await calculate().field('step', '50').expect(201);

      const { body: list } = await admin('/calculations').expect(200);
      expect(list.items[0]).toMatchObject({
        id: result.id,
        fileName: 'карта.zip',
        fileBytes: ARCHIVE.length,
        params: { from: 595, to: 625, step: 50 },
        status: 'ok',
        httpStatus: 201,
        gridSize: 10,
        category: 'unacceptable',
        ip: '203.0.113.7',
        userAgent: BROWSER,
        archiveAvailable: true,
      });

      const { body: detail } = await admin(`/calculations/${result.id}`).expect(200);
      expect(detail.result).toEqual(result);
    });

    it('serves the uploaded archive under its original name', async () => {
      const { body: result } = await calculate().expect(201);

      const res = await admin(`/calculations/${result.id}/archive`)
        .buffer(true)
        .parse(binary)
        .expect(200)
        .expect('Content-Type', /zip/);

      expect(Buffer.compare(res.body as Buffer, ARCHIVE)).toBe(0);
      expect(res.headers['content-disposition']).toContain(
        `filename*=UTF-8''${encodeURIComponent('карта.zip')}`,
      );
    });

    it('renders the artifacts again even after /files has expired them', async () => {
      const { body: result } = await calculate().expect(201);
      rmSync(join(root, 'storage', result.id), { recursive: true });
      const file = (name: string) =>
        admin(`/calculations/${result.id}/files/${name}`).buffer(true).parse(binary).expect(200);

      const png = await file('heatmap.png').expect('Content-Type', /image\/png/);
      expect((png.body as Buffer).subarray(1, 4).toString()).toBe('PNG');

      const pdf = await file('report.pdf').expect('Content-Type', /pdf/);
      expect((pdf.body as Buffer).subarray(0, 4).toString()).toBe('%PDF');

      const csv = await file('matrix.csv').expect('Content-Type', /csv/);
      expect((csv.body as Buffer).toString()).toContain('11000');

      const json = await file('result.json');
      expect(JSON.parse((json.body as Buffer).toString())).toEqual(result);
    });

    it('records a failed calculation with the error the client saw, and keeps its archive', async () => {
      await calculate('625', '595', 'broken.zip').expect(400);

      const { body } = await admin('/calculations?status=error').expect(200);
      const failed = body.items.find((c: { fileName: string }) => c.fileName === 'broken.zip');
      expect(failed).toMatchObject({
        status: 'error',
        httpStatus: 400,
        error: expect.stringContaining('Некорректный интервал'),
        archiveAvailable: true,
      });

      await admin(`/calculations/${failed.id}/archive`).expect(200);
      await admin(`/calculations/${failed.id}/files/report.pdf`).expect(404);
    });

    it('pages the list', async () => {
      const { body: all } = await admin('/calculations').expect(200);
      const { body: page } = await admin('/calculations?limit=1&offset=1').expect(200);

      expect(page.total).toBe(all.total);
      expect(page.items).toEqual([all.items[1]]);
    });

    it.each([
      ['/calculations/not-a-uuid', 400],
      ['/calculations/2b1f0a3e-8c4d-4e5f-9a6b-7c8d9e0f1a2b', 404],
      ['/calculations?limit=0', 400],
      ['/calculations?status=maybe', 400],
    ])('answers %s with %i', async (path, status) => {
      await admin(path).expect(status);
    });
  });

  describe('request log', () => {
    it('logs API calls and /files downloads with the real status and address', async () => {
      const { body: result } = await calculate().expect(201);
      await request(server())
        .get(`/files/${result.id}/heatmap.png`)
        .set('X-Real-IP', '203.0.113.9')
        .expect(200);

      const { body } = await admin('/requests?search=/files/').expect(200);
      expect(body.items[0]).toMatchObject({
        method: 'GET',
        path: `/files/${result.id}/heatmap.png`,
        route: '/files/:id/heatmap.png',
        status: 200,
        ip: '203.0.113.9',
      });
      expect(body.items[0].durationMs).toBeGreaterThanOrEqual(0);
      expect(body.items[0].bytesOut).toBeGreaterThan(0);
    });

    it('filters by status class', async () => {
      await request(server()).get('/no-such-page').expect(404);

      const { body } = await admin('/requests?status=4xx').expect(200);

      expect(body.items.length).toBeGreaterThan(0);
      expect(body.items.every((r: { status: number }) => r.status >= 400 && r.status < 500)).toBe(true);
    });

    it('treats the search as a literal substring', async () => {
      const { body } = await admin('/requests?search=%25').expect(200);

      expect(body.items).toEqual([]);
    });

    it('leaves the healthcheck and the page-view beacon out', async () => {
      await request(server()).get('/api/health').expect(200);
      await track({ path: '/' });

      const health = await admin('/requests?search=/api/health').expect(200);
      const beacon = await admin('/requests?search=/api/track').expect(200);
      expect(health.body.total).toBe(0);
      expect(beacon.body.total).toBe(0);
    });

    it("hides the admin's own requests unless asked for", async () => {
      const routes = (body: { items: { route: string }[] }) => body.items.map((r) => r.route);

      const hidden = await admin('/requests?limit=200').expect(200);
      const shown = await admin('/requests?limit=200&admin=1').expect(200);
      const summary = await admin('/requests/summary?days=1').expect(200);

      expect(routes(hidden.body).some((r) => r.startsWith('/api/admin'))).toBe(false);
      expect(routes(shown.body)).toContain('/api/admin/login');
      expect(summary.body.some((r: { route: string }) => r.route.startsWith('/api/admin'))).toBe(false);
    });

    it('sums requests per endpoint', async () => {
      const { body } = await admin('/requests/summary?days=1').expect(200);

      expect(body).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ method: 'POST', route: '/api/calculate' }),
          expect.objectContaining({ method: 'GET', route: '/files/:id/heatmap.png', errors: 0 }),
        ]),
      );
    });
  });

  describe('visits', () => {
    const overview = async () => (await admin('/overview?days=7&tz=180').expect(200)).body;

    it('counts page views, visitors and external referrers', async () => {
      const before = await overview();

      await track({ path: '/example', referrer: 'https://www.yandex.ru/search/?text=raman' }).expect(204);
      await track({ path: '/example' }).expect(204); // the same visitor reloading: not counted
      await track({ path: '/result', referrer: 'https://spectra-calc.ru/' }).expect(204);
      await track({ path: '/' }, 'Googlebot/2.1').expect(204); // a crawler: not counted
      await track({ path: '/admin' }).expect(204); // the admin itself: not counted

      const after = await overview();
      expect(after.visits.today.views - before.visits.today.views).toBe(2);
      expect(after.topPaths).toEqual(
        expect.arrayContaining([expect.objectContaining({ path: '/example', views: 1 })]),
      );
      expect(after.topReferrers).toEqual([{ referrer: 'yandex.ru', views: 1, visitors: 1 }]);
      expect(after.daily).toHaveLength(7);
      expect(after.daily[6].views).toBe(after.visits.today.views);
    });

    it('rejects a beacon without a path', async () => {
      await track({ path: 'not-a-path' }).expect(400);
    });

    it('reports calculations and storage in the overview', async () => {
      const body = await overview();

      expect(body.calculations.today.ok).toBeGreaterThan(0);
      expect(body.calculations.today.error).toBeGreaterThan(0);
      expect(body.storage.archives).toBe(body.calculations.range.ok + body.calculations.range.error);
      expect(body.storage.archiveBytes).toBe(body.storage.archives * ARCHIVE.length);
      expect(body.retention).toEqual({ archiveDays: 30, logDays: 90 });
    });
  });
});
