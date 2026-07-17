import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { mkdir, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { join, sep } from 'node:path';
import { StorageService, type PruneResult } from './storage.service';
import type { AppConfig } from '../config/configuration';

/** Job directories are named with randomUUID() — v4, so the version nibble is fixed. */
const JOB_DIR_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@Injectable()
export class LocalStorageService extends StorageService {
  private readonly logger = new Logger(LocalStorageService.name);
  private readonly root: string;
  private readonly publicBaseUrl: string;
  /** False when the root looks too dangerous to ever run a recursive delete under. */
  private readonly prunable: boolean;

  constructor(config: ConfigService<AppConfig, true>) {
    super();
    this.root = config.get('storageRoot', { infer: true });
    this.publicBaseUrl = config.get('publicBaseUrl', { infer: true });
    this.prunable = this.checkRoot(this.root);
  }

  async save(jobId: string, name: string, data: Buffer | string): Promise<void> {
    const dir = join(this.root, jobId);
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, name), data);
  }

  publicUrl(jobId: string, name: string): string {
    return `${this.publicBaseUrl}/files/${jobId}/${name}`;
  }

  /**
   * Removes job directories whose mtime is older than `maxAgeMs`.
   *
   * Three guards, because this is the one place in the app that deletes recursively:
   *  - `withFileTypes` + `isDirectory()` — skips `.gitkeep` and, crucially, symlinks: a link is
   *    not a directory, so a "uuid" symlink pointing at / can never be followed. (A plain string
   *    readdir + stat() would follow it.)
   *  - the name must be a v4 UUID, so only paths this service itself created are candidates.
   *  - exactly one level deep: the only path ever built is join(root, <uuid>).
   *
   * mtime, not birthtime: birthtime is unsupported on some filesystems and Node then reports 0,
   * which would date every directory to the epoch and delete the lot on the first sweep. A
   * directory's mtime moves when its entries change, so it tracks job completion — it can only
   * ever make a directory look younger than it is, which is the safe direction.
   */
  async prune(maxAgeMs: number): Promise<PruneResult> {
    const result: PruneResult = { removed: 0, remaining: 0, skipped: 0, failed: 0 };
    if (!this.prunable) return result;

    const entries = await readdir(this.root, { withFileTypes: true });
    const now = Date.now();

    for (const entry of entries) {
      if (!entry.isDirectory() || !JOB_DIR_RE.test(entry.name)) {
        result.skipped++;
        continue;
      }

      const dir = join(this.root, entry.name);
      try {
        const { mtimeMs } = await stat(dir);
        if (now - mtimeMs <= maxAgeMs) {
          result.remaining++;
          continue;
        }
        // force: a concurrent delete (ENOENT) is success, not an error.
        await rm(dir, { recursive: true, force: true });
        result.removed++;
      } catch (err) {
        // One unreadable directory must not abort the rest of the batch.
        result.failed++;
        this.logger.error(`Не удалось удалить ${dir}: ${(err as Error).message}`);
      }
    }

    return result;
  }

  /**
   * Refuses to prune under a root that a typo could turn into a disaster. Checked once at
   * construction: a misconfigured STORAGE_ROOT should make cleanup a no-op, not an incident.
   */
  private checkRoot(root: string): boolean {
    const segments = root.split(sep).filter(Boolean);
    const tooShallow = segments.length < 2;
    const isCwd = root === process.cwd();

    if (tooShallow || isCwd) {
      this.logger.error(
        `STORAGE_ROOT="${root}" выглядит небезопасно для рекурсивного удаления — ` +
          'очистка storage отключена. Укажите выделенный каталог, например /app/storage.',
      );
      return false;
    }
    return true;
  }
}
