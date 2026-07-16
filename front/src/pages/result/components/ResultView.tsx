import type { ReactNode } from 'react';
import ResultHeader from './ResultHeader';
import HeatmapCard from './HeatmapCard';
import StatsCard from './StatsCard';
import TextOutputBox from './TextOutputBox';
import ParametersCard from './ParametersCard';
import type { SpectrumResult } from '../../../types/spectra';

export interface ResultViewProps {
  result: SpectrumResult;
  /** Optional strip above the header — used by the example page to flag the demo data. */
  notice?: ReactNode;
}

/**
 * Presentation of a calculation result. Shared by the live result page (data from the backend)
 * and the example page (bundled fixture), so both stay identical as the layout evolves.
 */
export default function ResultView({ result, notice }: ResultViewProps) {
  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      {notice}
      <ResultHeader result={result} />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <HeatmapCard result={result} />
        </div>
        <div className="flex flex-col gap-6">
          <StatsCard interval={result.interval} stats={result.stats} />
          <TextOutputBox result={result} />
          <ParametersCard result={result} />
        </div>
      </div>
    </main>
  );
}
