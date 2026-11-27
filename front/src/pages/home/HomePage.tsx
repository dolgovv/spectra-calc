import { useState } from "react";
import { useNavigate } from "react-router-dom";
import PageShell from "../../common/components/PageShell";
import HeroSection from "./components/HeroSection";
import UploadCard from "./components/UploadCard";
import { validateZipFile } from "./actions/validateZipFile";
import { computeSpectrumResult } from "./actions/computeSpectrumResult";
import { saveResultToSession } from "../../lib/resultStorage";
import { ROUTES } from "../../router/routes";
import {
  DEFAULT_COLOR_HIGH,
  DEFAULT_COLOR_LOW,
  DEFAULT_COLOR_MID_HIGH,
  DEFAULT_COLOR_MID_LOW,
  DEFAULT_INTERVAL,
  DEFAULT_SPATIAL_STEP_MICRONS,
  type SpectrumInterval,
} from "../../types/spectra";

export default function HomePage() {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [interval, setIntervalValue] =
    useState<SpectrumInterval>(DEFAULT_INTERVAL);
  const [step, setStep] = useState<number>(DEFAULT_SPATIAL_STEP_MICRONS);
  const [colorLow, setColorLow] = useState<string>(DEFAULT_COLOR_LOW);
  const [colorMidLow, setColorMidLow] = useState<string>(DEFAULT_COLOR_MID_LOW);
  const [colorMidHigh, setColorMidHigh] = useState<string>(DEFAULT_COLOR_MID_HIGH);
  const [colorHigh, setColorHigh] = useState<string>(DEFAULT_COLOR_HIGH);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  function handleFileSelected(selected: File) {
    const validation = validateZipFile(selected);
    if (!validation.valid) {
      setFile(null);
      setFileError(validation.error ?? "Некорректный файл");
      return;
    }
    setFile(selected);
    setFileError(null);
  }

  async function handleSubmit() {
    if (!file || fileError) return;
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const result = await computeSpectrumResult({
        file,
        interval,
        step,
        colorLow,
        colorMidLow,
        colorMidHigh,
        colorHigh,
      });
      saveResultToSession(result);
      navigate(ROUTES.result, { state: { result } });
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Не удалось выполнить расчёт.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <PageShell background className="pb-[90px]">
      <HeroSection />
      <UploadCard
        file={file}
        fileError={fileError}
        interval={interval}
        step={step}
        colorLow={colorLow}
        colorMidLow={colorMidLow}
        colorMidHigh={colorMidHigh}
        colorHigh={colorHigh}
        isSubmitting={isSubmitting}
        onFileSelected={handleFileSelected}
        onIntervalChange={setIntervalValue}
        onStepChange={setStep}
        onColorLowChange={setColorLow}
        onColorMidLowChange={setColorMidLow}
        onColorMidHighChange={setColorMidHigh}
        onColorHighChange={setColorHigh}
        onSubmit={handleSubmit}
      />
      {submitError && (
        <p className="mt-4 text-center font-mono text-[12.5px] text-red-400">
          {submitError}
        </p>
      )}
    </PageShell>
  );
}
