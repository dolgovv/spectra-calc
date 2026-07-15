import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AppConfig } from '../config/configuration';

/** Thrown (→ HTTP 429) when the in-flight queue is already at capacity. */
export class QueueFullException extends HttpException {
  constructor(max: number) {
    super(
      `Сервис перегружен: уже выполняется ${max} задач. Повторите попытку позже.`,
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}

/**
 * Minimal in-memory concurrency guard: rejects new work once `queueMax` jobs are already
 * in flight. State is intentionally process-local and resets on restart (acceptable for now).
 */
@Injectable()
export class QueueService {
  private readonly max: number;
  private inFlight = 0;

  constructor(config: ConfigService<AppConfig, true>) {
    this.max = config.get('queueMax', { infer: true });
  }

  get pending(): number {
    return this.inFlight;
  }

  get capacity(): number {
    return this.max;
  }

  /** Runs `task` if there is capacity, otherwise throws QueueFullException. */
  async run<T>(task: () => Promise<T>): Promise<T> {
    if (this.inFlight >= this.max) {
      throw new QueueFullException(this.max);
    }
    this.inFlight++;
    try {
      return await task();
    } finally {
      this.inFlight--;
    }
  }
}
