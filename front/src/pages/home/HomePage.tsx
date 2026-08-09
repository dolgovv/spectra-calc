import { useState } from "react";
import { useNavigate } from "react-router-dom";
import PageShell from "../../common/components/PageShell";
import HeroSection from "./components/HeroSection";
import UploadCard from "./components/UploadCard";
import { validateZipFile } from "./actions/validateZipFile";
import { computeSpectrumResult } from "./actions/computeSpectrumResult";
import { saveResultToSession } from "../../lib/resultStorage";
import { ROUTES } from "../../router/routes";
import { DEFAULT_INTERVAL, type SpectrumInterval } from "../../types/spectra";

export default function HomePage() {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [interval, setIntervalValue] =
    useState<SpectrumInterval>(DEFAULT_INTERVAL);
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
      const result = await computeSpectrumResult({ file, interval });
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
        isSubmitting={isSubmitting}
        onFileSelected={handleFileSelected}
        onIntervalChange={setIntervalValue}
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
