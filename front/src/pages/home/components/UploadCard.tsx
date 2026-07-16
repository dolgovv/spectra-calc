import Panel from '../../../common/components/Panel';
import PanelTitle, { PanelIndex } from '../../../common/components/PanelTitle';
import Dropzone from './Dropzone';
import IntervalRuler from './IntervalRuler';
import IntervalNumberInputs from './IntervalNumberInputs';
import StartButton from './StartButton';
import type { SpectrumInterval } from '../../../types/spectra';
import { DEFAULT_INTERVAL_MAX, DEFAULT_INTERVAL_MIN } from '../../../types/spectra';

export interface UploadCardProps {
  file: File | null;
  fileError: string | null;
  interval: SpectrumInterval;
  isSubmitting: boolean;
  onFileSelected: (file: File) => void;
  onIntervalChange: (interval: SpectrumInterval) => void;
  onSubmit: () => void;
}

/** The two numbered steps of the form: 01 the archive, 02 the interval and submit. */
export default function UploadCard({
  file,
  fileError,
  interval,
  isSubmitting,
  onFileSelected,
  onIntervalChange,
  onSubmit,
}: UploadCardProps) {
  return (
    <>
      <Panel className="p-[30px]">
        <PanelTitle right={<PanelIndex>01 / архив</PanelIndex>}>Данные</PanelTitle>
        <Dropzone file={file} error={fileError} onFileSelected={onFileSelected} />
      </Panel>

      <Panel className="mt-[18px] p-[30px]">
        <PanelTitle right={<PanelIndex>02 / шкала</PanelIndex>}>Интервал спектра (см⁻¹)</PanelTitle>

        <div className="flex items-baseline justify-between gap-3">
          <span className="text-[13px] text-muted">выбранный диапазон</span>
          <span className="whitespace-nowrap font-mono text-xl font-semibold text-accent">
            {interval.from} – {interval.to}
            <span className="ml-1 text-xs font-normal text-muted-faint">см⁻¹</span>
          </span>
        </div>

        <IntervalRuler
          min={DEFAULT_INTERVAL_MIN}
          max={DEFAULT_INTERVAL_MAX}
          value={interval}
          onChange={onIntervalChange}
        />

        <IntervalNumberInputs
          min={DEFAULT_INTERVAL_MIN}
          max={DEFAULT_INTERVAL_MAX}
          value={interval}
          onChange={onIntervalChange}
        />

        <StartButton
          disabled={!file || !!fileError || isSubmitting}
          loading={isSubmitting}
          onClick={onSubmit}
        />
      </Panel>
    </>
  );
}
