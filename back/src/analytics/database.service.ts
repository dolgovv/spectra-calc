import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import type { AppConfig } from '../config/configuration';

export const DB_FILE_NAME = 'spectra.db';

/**
 * Times are epoch milliseconds throughout: days are bucketed at query time in the admin's own
 * time zone, so nothing stored depends on the server's TZ.
 */
const SCHEMA = `
  CREATE TABLE IF NOT EXISTS requests (
    id          INTEGER PRIMARY KEY,
    ts          INTEGER NOT NULL,
    method      TEXT    NOT NULL,
    path        TEXT    NOT NULL,
    route       TEXT    NOT NULL,
    status      INTEGER NOT NULL,
    duration_ms REAL    NOT NULL,
    ip          TEXT,
    user_agent  TEXT,
    bytes_in    INTEGER,
    bytes_out   INTEGER
  );
  CREATE INDEX IF NOT EXISTS requests_ts ON requests (ts);

  CREATE TABLE IF NOT EXISTS visits (
    id       INTEGER PRIMARY KEY,
    ts       INTEGER NOT NULL,
    path     TEXT    NOT NULL,
    referrer TEXT,
    visitor  TEXT    NOT NULL
  );
  CREATE INDEX IF NOT EXISTS visits_ts ON visits (ts);
  CREATE INDEX IF NOT EXISTS visits_visitor ON visits (visitor, ts);

  CREATE TABLE IF NOT EXISTS calculations (
    id          TEXT    PRIMARY KEY,
    ts          INTEGER NOT NULL,
    ip          TEXT,
    user_agent  TEXT,
    file_name   TEXT    NOT NULL,
    file_bytes  INTEGER NOT NULL,
    params      TEXT    NOT NULL,
    status      TEXT    NOT NULL,
    http_status INTEGER,
    error       TEXT,
    duration_ms REAL,
    grid_size   INTEGER,
    sr          REAL,
    category    TEXT,
    result      TEXT
  );
  CREATE INDEX IF NOT EXISTS calculations_ts ON calculations (ts);
`;

/**
 * The admin database: one SQLite file under DATA_ROOT, via the built-in node:sqlite, so there is
 * no native dependency to build in the image.
 *
 * Opened eagerly and allowed to throw: an unwritable DATA_ROOT should fail the container's start
 * (and with it the CI smoke test), not surface later as silently missing statistics.
 */
@Injectable()
export class DatabaseService implements OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);
  readonly db: DatabaseSync;
  readonly path: string;

  constructor(config: ConfigService<AppConfig, true>) {
    const root = config.get('dataRoot', { infer: true });
    mkdirSync(root, { recursive: true });
    this.path = join(root, DB_FILE_NAME);
    this.db = new DatabaseSync(this.path);
    // WAL: the admin's reads do not block the writes every request makes.
    this.db.exec('PRAGMA journal_mode = WAL; PRAGMA synchronous = NORMAL; PRAGMA busy_timeout = 2000;');
    this.db.exec(SCHEMA);
    this.logger.log(`База админки: ${this.path}`);
  }

  onModuleDestroy(): void {
    if (this.db.isOpen) this.db.close();
  }
}
