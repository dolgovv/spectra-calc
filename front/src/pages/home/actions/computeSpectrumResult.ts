import { API_BASE } from "../../../config";
import type { SpectrumInterval, SpectrumResult } from "../../../types/spectra";

export interface ComputeSpectrumResultParams {
  file: File;
  interval: SpectrumInterval;
  /** Heatmap axis step in µm; omitted defers to the backend's default (100). */
  step?: number;
  /** Gradient colours ("#rrggbb") at 0/33/67/100% of intensity; omitted defer to the backend's magma defaults. */
  colorLow?: string;
  colorMidLow?: string;
  colorMidHigh?: string;
  colorHigh?: string;
}

/**
 * Uploads the archive + interval to the backend and returns the computed result (matrix, stats,
 * and URLs of the generated heatmap PNG / PDF report / CSV). Throws an Error with the server's
 * message on failure (validation, queue overload, etc.).
 */
export async function computeSpectrumResult({
  file,
  interval,
  step,
  colorLow,
  colorMidLow,
  colorMidHigh,
  colorHigh,
}: ComputeSpectrumResultParams): Promise<SpectrumResult> {
  const form = new FormData();
  form.append("archive", file);
  form.append("from", String(interval.from));
  form.append("to", String(interval.to));
  if (step !== undefined) form.append("step", String(step));
  if (colorLow !== undefined) form.append("colorLow", colorLow);
  if (colorMidLow !== undefined) form.append("colorMidLow", colorMidLow);
  if (colorMidHigh !== undefined) form.append("colorMidHigh", colorMidHigh);
  if (colorHigh !== undefined) form.append("colorHigh", colorHigh);

  let response: Response;
  try {
    response = await fetch(`${API_BASE}/api/calculate`, {
      method: "POST",
      body: form,
    });
  } catch {
    throw new Error("Ошибка сервера.");
  }

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response));
  }
  return (await response.json()) as SpectrumResult;
}

async function extractErrorMessage(response: Response): Promise<string> {
  try {
    const body = await response.json();
    const message = (body as { message?: string | string[] }).message;
    if (Array.isArray(message)) return message.join("; ");
    if (message) return message;
  } catch {
    // fall through to a status-based message
  }
  if (response.status === 429) return "Сервис перегружен, попробуйте позже.";
  return `Ошибка сервера (${response.status})`;
}
