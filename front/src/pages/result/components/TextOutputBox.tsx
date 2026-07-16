import { buildTextOutput } from '../actions/buildTextOutput';
import type { SpectrumResult } from '../../../types/spectra';

export interface TextOutputBoxProps {
  result: SpectrumResult;
}

/** Terminal-style readout: phosphor-green labels with the measured values accented. */
export default function TextOutputBox({ result }: TextOutputBoxProps) {
  return (
    <div className="rounded-panel bg-console px-5 py-[18px] font-mono text-[12.5px] leading-[1.85] text-[#AEE7C9]">
      <span className="mb-2.5 block text-[10.5px] uppercase tracking-[.1em] text-[#5C8A72]">
        Текстовый вывод
      </span>
      {buildTextOutput(result).map((line) => (
        <div key={line.label}>
          {line.label}: <span className={line.highlight ? 'text-accent' : undefined}>{line.value}</span>
          {line.suffix && ` ${line.suffix}`}
        </div>
      ))}
    </div>
  );
}
