import { Injectable, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { RequestLogService } from './request-log.service';
import { clientIp, normalizeRoute, truncatePath, userAgent } from './client-info';

/**
 * Not logged: the container healthcheck (one hit every 10 s, forever) and the page-view beacon,
 * which is already recorded as a visit.
 */
const SKIPPED_PATHS = new Set(['/api/health', '/api/track']);

/** Answered before the response finished: the client went away (nginx's convention). */
const CLIENT_CLOSED = 499;

function headerNumber(value: number | string | string[] | undefined): number | null {
  const n = Number(Array.isArray(value) ? value[0] : value);
  return Number.isFinite(n) ? n : null;
}

/**
 * Logs every request that reaches the backend — the API and /files downloads alike — once its
 * response is done, so the status and the duration are the real ones.
 */
@Injectable()
export class RequestLogMiddleware implements NestMiddleware {
  constructor(private readonly log: RequestLogService) {}

  use(req: Request, res: Response, next: NextFunction): void {
    // originalUrl: under a Nest middleware req.url can be relative to the mount point.
    const url = req.originalUrl || req.url;
    if (SKIPPED_PATHS.has(url.split('?')[0])) {
      next();
      return;
    }

    const ts = Date.now();
    const start = process.hrtime.bigint();

    res.once('close', () => {
      this.log.record({
        ts,
        method: req.method,
        path: truncatePath(url),
        route: normalizeRoute(url),
        status: res.writableFinished ? res.statusCode : CLIENT_CLOSED,
        durationMs: Number(process.hrtime.bigint() - start) / 1e6,
        ip: clientIp(req),
        userAgent: userAgent(req),
        bytesIn: headerNumber(req.headers['content-length']),
        bytesOut: headerNumber(res.getHeader('content-length')),
      });
    });

    next();
  }
}
