import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { LocalStorageService } from './local-storage.service';
import { fakeConfig } from '../../test/helpers/spectra-zip';

const HOUR_MS = 3_600_000;
const BASE_URL = 'https://spectra-calc.ru';

describe('LocalStorageService', () => {
  let root: string;

  const service = (storageRoot = root) =>
    new LocalStorageService(fakeConfig({ storageRoot, publicBaseUrl: BASE_URL }));

  /** Creates a job directory `ageHours` old. */
  function jobDir(ageHours: number, name: string = randomUUID()): string {
    const dir = join(root, name);
    mkdirSync(dir);
    writeFileSync(join(dir, 'result.json'), '{}');
    const time = new Date(Date.now() - ageHours * HOUR_MS);
    utimesSync(dir, time, time);
    return dir;
  }

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'spectra-storage-'));
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it('saves artifacts under the job directory', async () => {
    await service().save('job', 'matrix.csv', 'a,b');

    expect(readFileSync(join(root, 'job', 'matrix.csv'), 'utf-8')).toBe('a,b');
  });

  it('builds the public URL of an artifact', () => {
    expect(service().publicUrl('job', 'report.pdf')).toBe(`${BASE_URL}/files/job/report.pdf`);
  });

  describe('prune', () => {
    it('removes expired jobs and keeps fresh ones', async () => {
      const expired = jobDir(3);
      const fresh = jobDir(1);

      const result = await service().prune(2 * HOUR_MS);

      expect(existsSync(expired)).toBe(false);
      expect(existsSync(fresh)).toBe(true);
      expect(result).toEqual({ removed: 1, remaining: 1, skipped: 0, failed: 0 });
    });

    it('never touches a directory that is not named like a job', async () => {
      const foreign = jobDir(100, 'backups');

      const result = await service().prune(HOUR_MS);

      expect(existsSync(foreign)).toBe(true);
      expect(result).toMatchObject({ removed: 0, skipped: 1 });
    });

    it('leaves plain files such as .gitkeep alone', async () => {
      const keep = join(root, '.gitkeep');
      writeFileSync(keep, '');

      const result = await service().prune(0);

      expect(existsSync(keep)).toBe(true);
      expect(result).toMatchObject({ removed: 0, skipped: 1 });
    });

    it('does not follow a symlink named like a job', async () => {
      const outside = mkdtempSync(join(tmpdir(), 'spectra-outside-'));
      const precious = join(outside, 'precious.txt');
      writeFileSync(precious, 'keep me');
      symlinkSync(outside, join(root, randomUUID()));

      const result = await service().prune(0);

      expect(existsSync(precious)).toBe(true);
      expect(result).toMatchObject({ removed: 0, skipped: 1 });
      rmSync(outside, { recursive: true, force: true });
    });

    it('refuses to prune under a dangerously shallow root', async () => {
      const result = await service('/').prune(0);

      expect(result).toEqual({ removed: 0, remaining: 0, skipped: 0, failed: 0 });
    });

    it('refuses to prune the working directory', async () => {
      const result = await service(process.cwd()).prune(0);

      expect(result).toEqual({ removed: 0, remaining: 0, skipped: 0, failed: 0 });
    });
  });
});
