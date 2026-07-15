const integerFormatter = new Intl.NumberFormat('ru-RU');

/** "58420" -> "58 420" (ru-RU space grouping). */
export function formatInteger(value: number): string {
  return integerFormatter.format(Math.round(value));
}

/**
 * Percent values keep a period decimal separator even in the Russian UI
 * (scientific-notation convention) — do not use Intl('ru-RU') here, it
 * would render a comma instead ("21,2").
 */
export function formatPercent(value: number, digits = 1): string {
  return value.toFixed(digits);
}
