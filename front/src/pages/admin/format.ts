const dateTime = new Intl.DateTimeFormat("ru-RU", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

/** 1764259533000 → "27.11.2026, 19:05:33" in the admin's own time zone. */
export function formatDateTime(ts: number): string {
  return dateTime.format(ts);
}

/** "2026-11-27" → "27.11". */
export function formatDay(day: string): string {
  const [, month, date] = day.split("-");
  return `${date}.${month}`;
}

const BYTE_UNITS = ["Б", "КБ", "МБ", "ГБ", "ТБ"];

/** 9_437_184 → "9.0 МБ". Periods, like the rest of the UI's measured values. */
export function formatBytes(bytes: number | null): string {
  if (bytes === null) return "—";
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < BYTE_UNITS.length - 1) {
    value /= 1024;
    unit++;
  }
  return unit === 0 ? `${value} Б` : `${value.toFixed(1)} ${BYTE_UNITS[unit]}`;
}

/** 840 → "840 мс", 2400 → "2.4 с". */
export function formatDuration(ms: number | null): string {
  if (ms === null) return "—";
  if (ms < 1000) return `${Math.round(ms)} мс`;
  return `${(ms / 1000).toFixed(1)} с`;
}

/** 0 is how the backend spells "kept forever". */
export function formatRetention(days: number): string {
  return days > 0 ? `${days} дн.` : "бессрочно";
}
