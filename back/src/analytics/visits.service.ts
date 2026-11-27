import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from './database.service';
import { DAY_SQL, type DayWindow } from './days';

/** A reload or React's double effect in dev should not count twice. */
const DEDUPE_MS = 10_000;

export interface PageView {
  ts: number;
  path: string;
  referrer: string | null;
  visitor: string;
}

export interface VisitTotals {
  views: number;
  visitors: number;
}

export interface VisitsOverview {
  today: VisitTotals;
  week: VisitTotals;
  range: VisitTotals;
  daily: Map<string, VisitTotals>;
  topPaths: { path: string; views: number; visitors: number }[];
  topReferrers: { referrer: string; views: number; visitors: number }[];
}

@Injectable()
export class VisitsService {
  private readonly logger = new Logger(VisitsService.name);

  constructor(private readonly database: DatabaseService) {}

  /** Returns whether the view was stored. Never throws, like the request log. */
  record(view: PageView): boolean {
    try {
      const { db } = this.database;
      const duplicate = db
        .prepare('SELECT 1 FROM visits WHERE visitor = ? AND path = ? AND ts > ? LIMIT 1')
        .get(view.visitor, view.path, view.ts - DEDUPE_MS);
      if (duplicate) return false;

      db.prepare('INSERT INTO visits (ts, path, referrer, visitor) VALUES (?, ?, ?, ?)').run(
        view.ts,
        view.path,
        view.referrer,
        view.visitor,
      );
      return true;
    } catch (err) {
      this.logger.error(`Не удалось записать посещение: ${(err as Error).message}`);
      return false;
    }
  }

  overview(window: DayWindow): VisitsOverview {
    const { db } = this.database;
    const totals = (since: number) =>
      db
        .prepare('SELECT COUNT(*) AS views, COUNT(DISTINCT visitor) AS visitors FROM visits WHERE ts >= ?')
        .get(since) as unknown as VisitTotals;

    const daily = db
      .prepare(
        `SELECT ${DAY_SQL} AS day, COUNT(*) AS views, COUNT(DISTINCT visitor) AS visitors
           FROM visits WHERE ts >= ? GROUP BY day`,
      )
      .all(window.offsetMs, window.sinceTs) as unknown as ({ day: string } & VisitTotals)[];

    return {
      today: totals(window.todayTs),
      week: totals(window.weekTs),
      range: totals(window.sinceTs),
      daily: new Map(daily.map(({ day, views, visitors }) => [day, { views, visitors }])),
      topPaths: db
        .prepare(
          `SELECT path, COUNT(*) AS views, COUNT(DISTINCT visitor) AS visitors
             FROM visits WHERE ts >= ? GROUP BY path ORDER BY views DESC LIMIT 10`,
        )
        .all(window.sinceTs) as unknown as VisitsOverview['topPaths'],
      topReferrers: db
        .prepare(
          `SELECT referrer, COUNT(*) AS views, COUNT(DISTINCT visitor) AS visitors
             FROM visits WHERE ts >= ? AND referrer IS NOT NULL
            GROUP BY referrer ORDER BY views DESC LIMIT 10`,
        )
        .all(window.sinceTs) as unknown as VisitsOverview['topReferrers'],
    };
  }

  pruneOlderThan(ts: number): number {
    return Number(this.database.db.prepare('DELETE FROM visits WHERE ts < ?').run(ts).changes);
  }
}
