import { resolve } from 'node:path';
import { loadConfig } from './configuration';

const NAMES = [
  'PORT',
  'PUBLIC_BASE_URL',
  'CORS_ORIGIN',
  'STORAGE_ROOT',
  'STORAGE_TTL_HOURS',
  'STORAGE_SWEEP_INTERVAL_MINUTES',
  'LOGS_ROOT',
  'QUEUE_MAX',
  'BOT_TOKEN',
  'BOT_PROXY_URL',
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
      logsRoot: resolve(process.cwd(), 'logs'),
      queueMax: 25,
      botToken: null,
      botProxyUrl: null,
    });
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

  it('treats blank bot settings as absent', () => {
    process.env.BOT_TOKEN = '   ';
    process.env.BOT_PROXY_URL = '';

    expect(loadConfig().botToken).toBeNull();
    expect(loadConfig().botProxyUrl).toBeNull();
  });

  it('trims the bot token', () => {
    process.env.BOT_TOKEN = ' 123:abc ';

    expect(loadConfig().botToken).toBe('123:abc');
  });
});
