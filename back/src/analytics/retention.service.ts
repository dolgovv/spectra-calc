import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CalculationLogService } from './calculation-log.service';
import { RequestLogService } from './request-log.service';
import { VisitsService } from './visits.service';
import type { AppConfig } from '../config/configuration';

/** Retention is counted in days, so checking hourly is plenty. */
const SWEEP_INTERVAL_MS = 3_600_000;

/**
 * Bounds what the admin data costs on disk. Archives (~9 MB each) are the only thing that
 * really grows and get their own TTL; logs and page views are small rows with a longer one.
 * Calculation records themselves are kept: a few KB each, and they are the history.
 *
 * Same timer discipline as StorageSweeperService: synchronous callback, no overlapping runs,
 * failures logged and never fatal.
 */
@Injectable()
export class RetentionService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RetentionService.name);
  private readonly archiveTtlMs: number;
  private readonly logRetentionMs: number;
  private timer?: NodeJS.Timeout;
  private running = false;

  constructor(
    private readonly calculations: CalculationLogService,
    private readonly requests: RequestLogService,
    private readonly visits: VisitsService,
    config: ConfigService<AppConfig, true>,
  ) {
    this.archiveTtlMs = config.get('archiveTtlMs', { infer: true });
    this.logRetentionMs = config.get('logRetentionMs', { infer: true });
  }

  onModuleInit(): void {
    if (this.archiveTtlMs <= 0 && this.logRetentionMs <= 0) return;
    this.schedule();
    this.timer = setInterval(() => this.schedule(), SWEEP_INTERVAL_MS);
    this.timer.unref();
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  private schedule(): void {
    if (this.running) return;
    this.running = true;
    void this.sweep()
      .catch((err) => this.logger.error(`Очистка данных админки упала: ${(err as Error).message}`))
      .finally(() => {
        this.running = false;
      });
  }

  async sweep(now = Date.now()): Promise<void> {
    let requests = 0;
    let visits = 0;
    if (this.logRetentionMs > 0) {
      requests = this.requests.pruneOlderThan(now - this.logRetentionMs);
      visits = this.visits.pruneOlderThan(now - this.logRetentionMs);
    }
    const archives =
      this.archiveTtlMs > 0
        ? await this.calculations.pruneArchives(this.archiveTtlMs)
        : { removed: 0, failed: 0 };

    if (requests || visits || archives.removed || archives.failed) {
      this.logger.log(
        `Очистка данных админки: логов=${requests} посещений=${visits} ` +
          `архивов=${archives.removed} ошибок=${archives.failed}`,
      );
    }
  }
}
