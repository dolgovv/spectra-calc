export const DAY_MS = 86_400_000;

/**
 * Days are bucketed in the admin's time zone, passed as minutes east of UTC (MSK = 180): the
 * server runs in UTC, where a Moscow day would split at 03:00.
 */
export interface DayWindow {
  /** Epoch ms of the local midnight that starts the window. */
  sinceTs: number;
  /** Epoch ms of today's local midnight. */
  todayTs: number;
  /** Epoch ms of the local midnight six days before today. */
  weekTs: number;
  /** Every day of the window, oldest first, as YYYY-MM-DD. */
  days: string[];
  /** Offset to add to a timestamp before taking its UTC date, in ms. */
  offsetMs: number;
}

export function dayKey(ts: number, offsetMs: number): string {
  return new Date(ts + offsetMs).toISOString().slice(0, 10);
}

export function dayWindow(days: number, tzOffsetMinutes: number, now = Date.now()): DayWindow {
  const offsetMs = tzOffsetMinutes * 60_000;
  const todayTs = Math.floor((now + offsetMs) / DAY_MS) * DAY_MS - offsetMs;
  const sinceTs = todayTs - (days - 1) * DAY_MS;
  return {
    sinceTs,
    todayTs,
    weekTs: todayTs - 6 * DAY_MS,
    days: Array.from({ length: days }, (_, i) => dayKey(sinceTs + i * DAY_MS, offsetMs)),
    offsetMs,
  };
}

/** SQL for a row's local day; binds one parameter, the window's offsetMs. */
export const DAY_SQL = "strftime('%Y-%m-%d', (ts + ?) / 1000, 'unixepoch')";
