import Card from "../../../common/components/Card";
import Dropzone from "./Dropzone";
import IntervalSlider from "./IntervalSlider";
import IntervalNumberInputs from "./IntervalNumberInputs";
import StartButton from "./StartButton";
import type { SpectrumInterval } from "../../../types/spectra";
import {
  DEFAULT_INTERVAL_MAX,
  DEFAULT_INTERVAL_MIN,
} from "../../../types/spectra";

export interface UploadCardProps {
  file: File | null;
  fileError: string | null;
  interval: SpectrumInterval;
  isSubmitting: boolean;
  onFileSelected: (file: File) => void;
  onIntervalChange: (interval: SpectrumInterval) => void;
  onSubmit: () => void;
}

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
    <Card className="mx-auto max-w-2xl p-6 mb-6">
      <Dropzone file={file} error={fileError} onFileSelected={onFileSelected} />

      <div className="my-6 border-t border-border" />

      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-medium">Интервал спектра (см⁻¹)</span>
        <span className="text-sm font-medium text-accent">
          {interval.from} &ndash; {interval.to}
        </span>
      </div>
      <IntervalSlider
        min={DEFAULT_INTERVAL_MIN}
        max={DEFAULT_INTERVAL_MAX}
        value={interval}
        onChange={onIntervalChange}
      />
      <div className="mt-6">
        <IntervalNumberInputs
          min={DEFAULT_INTERVAL_MIN}
          max={DEFAULT_INTERVAL_MAX}
          value={interval}
          onChange={onIntervalChange}
        />
      </div>

      <div className="mt-8">
        <StartButton
          disabled={!file || !!fileError || isSubmitting}
          loading={isSubmitting}
          onClick={onSubmit}
        />
      </div>
    </Card>
  );
}
