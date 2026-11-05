import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { LoggingService, type RequestLogEntry } from './logging.service';
import { fakeConfig } from '../../test/helpers/spectra-zip';

const ENTRY: RequestLogEntry = {
  chatId: 42,
  fileName: 'map.zip',
  fileSize: 1024,
  interval: '590-625',
  date: '2026-11-04T10:00:00.000Z',
  calcTime: 0.2,
};

describe('LoggingService', () => {
  let root: string;
  let service: LoggingService;

  beforeEach(async () => {
    root = mkdtempSync(join(tmpdir(), 'spectra-logs-'));
    service = new LoggingService(fakeConfig({ logsRoot: join(root, 'logs') }));
    await service.onModuleInit();
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  const read = (name: string) => readFileSync(join(root, 'logs', name), 'utf-8');

  it('appends one line per successful request', async () => {
    await service.logSuccess(ENTRY);
    await service.logSuccess(ENTRY);

    const line =
      '2026-11-04T10:00:00.000Z | chat_id=42 | file_name="map.zip" | file_size=1024 | ' +
      'interval=590-625 | calc_time=0.2s\n';
    expect(read('success.log')).toBe(line + line);
  });

  it('writes failures to errors.log with their description', async () => {
    await service.logError({ ...ENTRY, errorDescription: 'bad archive' });

    expect(read('errors.log')).toContain('| error_description="bad archive"\n');
  });

  it('prints a dash when the interval could not be parsed', async () => {
    await service.logSuccess({ ...ENTRY, interval: null });

    expect(read('success.log')).toContain('| interval=- |');
  });

  it('keeps each entry on one line whatever the user-supplied text contains', async () => {
    await service.logError({
      ...ENTRY,
      fileName: 'a"b\\c.zip',
      errorDescription: 'line 1\r\nline 2',
    });

    const log = read('errors.log');
    expect(log.trimEnd().split('\n')).toHaveLength(1);
    expect(log).toContain('file_name="a\\"b\\\\c.zip"');
    expect(log).toContain('error_description="line 1 line 2"');
  });

  it('does not propagate an I/O failure to the request flow', async () => {
    const blocked = join(root, 'blocked');
    writeFileSync(blocked, '');
    const broken = new LoggingService(fakeConfig({ logsRoot: blocked }));

    await expect(broken.logSuccess(ENTRY)).resolves.toBeUndefined();
  });
});
