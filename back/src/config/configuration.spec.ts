import { resolve } from 'node:path';
import { loadConfig } from './configuration';

const NAMES = [
  'PORT',
  'PUBLIC_BASE_URL',
  'CORS_ORIGIN',
  'STORAGE_ROOT',
  'STORAGE_TTL_HOURS',
  'STORAGE_SWEEP_INTERVAL_MINUTES',
  'QUEUE_MAX',
  'DATA_ROOT',
  'ADMIN_PASSWORD',
  'ARCHIVE_TTL_DAYS',
  'LOG_RETENTION_DAYS',
];

describe('loadConfig', () => {
  const original = { ...process.env };

  beforeEach(() => {
    for (const name of NAMES) delete process.env[name];
  });

  afterAll(() => {
    process.env = original;
  });

  it('has working defaults', () => {
    expect(loadConfig()).toEqual({
      port: 3000,
      publicBaseUrl: 'http://localhost:3000',
      corsOrigins: ['http://localhost:5173'],
      storageRoot: resolve(process.cwd(), 'storage'),
      storageTtlMs: 48 * 3_600_000,
      storageSweepIntervalMs: 60 * 60_000,
      queueMax: 25,
      dataRoot: resolve(process.cwd(), 'data'),
      adminPassword: undefined,
      archiveTtlMs: 30 * 86_400_000,
      logRetentionMs: 90 * 86_400_000,
    });
  });

  it('treats an empty ADMIN_PASSWORD as no admin at all', () => {
    process.env.ADMIN_PASSWORD = '';

    expect(loadConfig().adminPassword).toBeUndefined();
  });

  it('lets ARCHIVE_TTL_DAYS=0 keep the archives forever', () => {
    process.env.ARCHIVE_TTL_DAYS = '0';

    expect(loadConfig().archiveTtlMs).toBe(0);
  });

  it('derives the public URL from the port', () => {
    process.env.PORT = '8080';

    expect(loadConfig().publicBaseUrl).toBe('http://localhost:8080');
  });

  it('strips the trailing slash of the public URL', () => {
    process.env.PUBLIC_BASE_URL = 'https://spectra-calc.ru/';

    expect(loadConfig().publicBaseUrl).toBe('https://spectra-calc.ru');
  });

  it('splits and trims the CORS origins', () => {
    process.env.CORS_ORIGIN = 'https://a.ru, https://b.ru,,';

    expect(loadConfig().corsOrigins).toEqual(['https://a.ru', 'https://b.ru']);
  });

  it.each(['abc', '25abc', '0', '-1', '1.5', ''])(
    'falls back on QUEUE_MAX=%j rather than disabling the overload guard',
    (raw) => {
      process.env.QUEUE_MAX = raw;

      expect(loadConfig().queueMax).toBe(25);
    },
  );

  it('accepts a valid QUEUE_MAX', () => {
    process.env.QUEUE_MAX = '3';

    expect(loadConfig().queueMax).toBe(3);
  });

  it('lets STORAGE_TTL_HOURS=0 disable the sweep', () => {
    process.env.STORAGE_TTL_HOURS = '0';

    expect(loadConfig().storageTtlMs).toBe(0);
  });

  it.each(['abc', '-1'])('falls back on STORAGE_TTL_HOURS=%j', (raw) => {
    process.env.STORAGE_TTL_HOURS = raw;

    expect(loadConfig().storageTtlMs).toBe(48 * 3_600_000);
  });
});
