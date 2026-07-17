import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StorageService } from './storage.service';
import type { AppConfig } from '../config/configuration';

/** Below this a sweep could plausibly race a job that is still writing its artifacts. */
const RACY_TTL_MS = 60_000;

/**
 * Deletes job artifacts once they are older than the TTL, which turns unbounded disk growth into
 * a bounded steady state: jobs_per_hour × (ttl + sweep_interval) × ~1.1 MB.
 *
 * A plain interval rather than @nestjs/schedule — one fixed-period job with no calendar semantics
 * does not justify pulling in a cron parser.
 */
@Injectable()
export class StorageSweeperService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(StorageSweeperService.name);
  private readonly ttlMs: number;
  private readonly intervalMs: number;
  private timer?: NodeJS.Timeout;
  /** setInterval fires on wall-clock and will not wait for a slow sweep to finish. */
  private running = false;

  constructor(
    private readonly storage: StorageService,
    config: ConfigService<AppConfig, true>,
  ) {
    this.ttlMs = config.get('storageTtlMs', { infer: true });
    this.intervalMs = config.get('storageSweepIntervalMs', { infer: true });
  }

  onModuleInit(): void {
    if (this.ttlMs <= 0) {
      this.logger.log('Очистка storage отключена (STORAGE_TTL_HOURS=0)');
      return;
    }
    if (this.ttlMs < RACY_TTL_MS) {
      this.logger.warn(
        `TTL меньше минуты (${this.ttlMs} мс) — под удаление могут попасть задачи в работе`,
      );
    }

    this.logger.log(
      `Очистка storage: ttl=${this.ttlMs / 3_600_000} ч, ` +
        `интервал=${this.intervalMs / 60_000} мин`,
    );

    // Not awaited: a throwing startup sweep must disable cleanup, not abort Nest's bootstrap
    // and leave the container unable to start.
    this.scheduleSweep();

    // The callback stays synchronous: an async callback would leak a floating rejection, and
    // Node kills the process on unhandled rejections — one EACCES would take the app down.
    this.timer = setInterval(() => this.scheduleSweep(), this.intervalMs);
    // Independent of shutdown hooks (main.ts does not enable them), never hold the loop open.
    this.timer.unref();
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  private scheduleSweep(): void {
    if (this.running) {
      this.logger.warn('Предыдущая очистка storage ещё идёт — пропускаю тик');
      return;
    }
    this.running = true;
    void this.sweep()
      .catch((err) => this.logger.error(`Очистка storage упала: ${(err as Error).message}`))
      .finally(() => {
        this.running = false;
      });
  }

  private async sweep(): Promise<void> {
    const startedAt = Date.now();
    const { removed, remaining, skipped, failed } = await this.storage.prune(this.ttlMs);

    // Quiet when there was nothing to do — otherwise this is an hourly noise line forever.
    if (removed > 0 || failed > 0) {
      this.logger.log(
        `Очистка storage: удалено=${removed} осталось=${remaining} ` +
          `пропущено=${skipped} ошибок=${failed} за ${Date.now() - startedAt} мс`,
      );
    }
  }
}
