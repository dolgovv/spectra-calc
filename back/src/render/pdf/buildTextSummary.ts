import type { SpectrumComputation } from '../../common/types/spectra.types';

const nf = new Intl.NumberFormat('ru-RU');

/** Plaintext summary (Sr, category, mean, …) shared by the PDF, the bot reply and the API. */
export function buildTextSummary(c: SpectrumComputation): string {
  const s = c.stats;
  return [
    `Интервал: ${c.interval.from}–${c.interval.to} см⁻¹`,
    `Средняя интенсивность (μ): ${nf.format(Math.round(s.meanIntensity))} отн. ед.`,
    `Стандартное отклонение (σ): ${nf.format(Math.round(s.stdDeviation))} отн. ед.`,
    `Отн. стандартное отклонение (Sr): ${s.relStdDeviationPercent.toFixed(1)} %`,
    `Категория равномерности: ${s.categoryLabel}`,
    `Обработано точек: ${s.pointsProcessed}`,
    `Обработано файлов: ${s.filesProcessed}`,
  ].join('\n');
}
