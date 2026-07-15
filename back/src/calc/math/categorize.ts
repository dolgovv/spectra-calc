import { CATEGORY_LABELS_RU, SR_THRESHOLDS } from '../../common/constants';
import type { CategoryKey } from '../../common/types/spectra.types';

export function categorize(sr: number): { category: CategoryKey; categoryLabel: string } {
  let category: CategoryKey;
  if (sr < SR_THRESHOLDS.excellent) category = 'excellent';
  else if (sr < SR_THRESHOLDS.acceptable) category = 'acceptable';
  else if (sr < SR_THRESHOLDS.satisfactory) category = 'satisfactory';
  else category = 'unacceptable';

  return { category, categoryLabel: CATEGORY_LABELS_RU[category] };
}
