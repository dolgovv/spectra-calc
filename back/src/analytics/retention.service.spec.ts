import { randomUUID } from 'node:crypto';
import { existsSync, mkdtempSync, rmSync, symlinkSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { CalculationLogService } from './calculation-log.service';
import { DatabaseService } from './database.service';
import { RequestLogService } from './request-log.service';
import { RetentionService } from './retention.service';
import { VisitsService } from './visits.service';
import { fakeConfig } from '../../test/helpers/spectra-zip';
import type { AppConfig } from '../config/configuration';

const DAY_MS = 86_400_000;

describe('admin data retention', () => {
  let root: string;
  let database: DatabaseService;
  let calculations: CalculationLogService;
  let requests: RequestLogService;
  let visits: VisitsService;

  const config = (values: Partial<AppConfig> = {}) =>
    fakeConfig({ dataRoot: root, archiveTtlMs: 30 * DAY_MS, logRetentionMs: 90 * DAY_MS, ...values });
  const retention = (values?: Partial<AppConfig>) =>
    new RetentionService(calculations, requests, visits, config(values));

  function archive(ageDays: number, name = `${randomUUID()}.zip`): string {
    const file = join(calculations.archiveDir, name);
    writeFileSync(file, 'zip');
    const time = new Date(Date.now() - ageDays * DAY_MS);
    utimesSync(file, time, time);
    return file;
  }

  function request(ts: number): void {
    requests.record({
      ts,
      method: 'GET',
      path: '/',
      route: '/',
      status: 200,
      durationMs: 1,
      ip: null,
      userAgent: null,
      bytesIn: null,
      bytesOut: null,
    });
  }

  beforeEach(async () => {
    root = mkdtempSync(join(tmpdir(), 'spectra-data-'));
    database = new DatabaseService(config());
    calculations = new CalculationLogService(database, config());
    requests = new RequestLogService(database);
    visits = new VisitsService(database);
    await calculations.onModuleInit();
  });

  afterEach(() => {
    database.onModuleDestroy();
    rmSync(root, { recursive: true, force: true });
  });

  it('deletes logs and page views past their retention, and keeps the rest', async () => {
    const now = Date.now();
    request(now - 91 * DAY_MS);
    request(now - DAY_MS);
    visits.record({ ts: now - 91 * DAY_MS, path: '/', referrer: null, visitor: 'a' });
    visits.record({ ts: now - DAY_MS, path: '/', referrer: null, visitor: 'b' });

    await retention().sweep(now);

    expect(requests.list({ limit: 10, offset: 0 }).total).toBe(1);
    expect(database.db.prepare('SELECT visitor FROM visits').all()).toEqual([{ visitor: 'b' }]);
  });

  it('deletes expired archives and nothing that it did not save itself', async () => {
    const expired = archive(31);
    const fresh = archive(1);
    const foreign = archive(100, 'backup.zip');
    const outside = mkdtempSync(join(tmpdir(), 'spectra-outside-'));
    writeFileSync(join(outside, 'precious.zip'), 'keep me');
    const link = join(calculations.archiveDir, `${randomUUID()}.zip`);
    symlinkSync(join(outside, 'precious.zip'), link);

    await retention().sweep();

    expect(existsSync(expired)).toBe(false);
    expect(existsSync(fresh)).toBe(true);
    expect(existsSync(foreign)).toBe(true);
    expect(existsSync(join(outside, 'precious.zip'))).toBe(true);
    rmSync(outside, { recursive: true, force: true });
  });

  it('keeps everything when both retentions are 0', async () => {
    const old = archive(1000);
    request(0);

    await retention({ archiveTtlMs: 0, logRetentionMs: 0 }).sweep();

    expect(existsSync(old)).toBe(true);
    expect(requests.list({ limit: 10, offset: 0 }).total).toBe(1);
  });

  it('marks calculations left running by a dead process as failed', async () => {
    const id = randomUUID();
    calculations.start({ id, ip: null, userAgent: null, fileName: 'a.zip', fileBytes: 1, params: { from: 1, to: 2 } });

    await new CalculationLogService(database, config()).onModuleInit();

    expect(calculations.get(id)).toMatchObject({ status: 'error', error: 'Прервано перезапуском сервиса' });
  });

  it('never lets a failed write reach the caller', () => {
    database.onModuleDestroy();

    expect(() => request(Date.now())).not.toThrow();
    expect(visits.record({ ts: 0, path: '/', referrer: null, visitor: 'a' })).toBe(false);
    expect(() =>
      calculations.start({ id: randomUUID(), ip: null, userAgent: null, fileName: 'a.zip', fileBytes: 1, params: { from: 1, to: 2 } }),
    ).not.toThrow();
  });
});
