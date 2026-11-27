import type { ReactNode } from "react";
import { ArrowLeft, Download } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import Button from "../../common/components/Button";
import Panel from "../../common/components/Panel";
import PanelTitle from "../../common/components/PanelTitle";
import { ROUTES } from "../../router/routes";
import {
  DEFAULT_COLOR_HIGH,
  DEFAULT_COLOR_LOW,
  DEFAULT_COLOR_MID_HIGH,
  DEFAULT_COLOR_MID_LOW,
  DEFAULT_SPATIAL_STEP_MICRONS,
  type SpectrumResult,
} from "../../types/spectra";
import ResultView from "../result/components/ResultView";
import { adminApi, adminArchiveUrl, adminFileUrl } from "./api/adminApi";
import AdminLayout from "./components/AdminLayout";
import { CalculationStatusChip } from "./components/StatusChip";
import { useAdminData } from "./hooks/useAdminData";
import { formatBytes, formatDateTime, formatDuration } from "./format";
import type { CalculationDetail } from "./types";

const BACK = { to: `${ROUTES.admin}?tab=calculations`, label: "К расчётам" };

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="mb-1 text-[11px] uppercase tracking-[.06em] text-muted-faint">{label}</dt>
      <dd className="break-words font-mono text-[12.5px] text-foreground">{children}</dd>
    </div>
  );
}

function Swatch({ color, fallback }: { color: string | undefined; fallback: string }) {
  return (
    <span
      title={color ?? `${fallback} (по умолчанию)`}
      className="inline-block h-3.5 w-3.5 rounded-sm border border-border"
      style={{ background: color ?? fallback }}
    />
  );
}

/** Everything the client sent and what came of it — the "request" half of the archive. */
function RequestPanel({ calc }: { calc: CalculationDetail }) {
  const { params } = calc;
  const defaultColors = [params.colorLow, params.colorMidLow, params.colorMidHigh, params.colorHigh].every(
    (c) => c === undefined,
  );

  return (
    <Panel className="mb-5 p-[26px]">
      <PanelTitle
        right={
          calc.archiveAvailable ? (
            <a href={adminArchiveUrl(calc.id)} download>
              <Button variant="ghost" leftIcon={<Download className="h-3.5 w-3.5" />}>
                Исходный архив
              </Button>
            </a>
          ) : (
            <span className="font-mono text-[11.5px] text-muted-faint">архив удалён по сроку хранения</span>
          )
        }
      >
        Запрос
      </PanelTitle>

      <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Время">{formatDateTime(calc.ts)}</Field>
        <Field label="Статус">
          <CalculationStatusChip status={calc.status} />
          {calc.httpStatus !== null && <span className="ml-2 text-muted-faint">HTTP {calc.httpStatus}</span>}
        </Field>
        <Field label="Длительность">{formatDuration(calc.durationMs)}</Field>
        <Field label="IP">{calc.ip ?? "—"}</Field>
        <Field label="Архив">
          {calc.fileName} <span className="text-muted-faint">· {formatBytes(calc.fileBytes)}</span>
        </Field>
        <Field label="Интервал">
          {params.from}–{params.to} см⁻¹
        </Field>
        <Field label="Шаг сетки">
          {params.step ?? DEFAULT_SPATIAL_STEP_MICRONS} мкм
          {params.step === undefined && <span className="text-muted-faint"> (по умолчанию)</span>}
        </Field>
        <Field label="Цвета">
          <span className="inline-flex items-center gap-1 align-middle">
            <Swatch color={params.colorLow} fallback={DEFAULT_COLOR_LOW} />
            <Swatch color={params.colorMidLow} fallback={DEFAULT_COLOR_MID_LOW} />
            <Swatch color={params.colorMidHigh} fallback={DEFAULT_COLOR_MID_HIGH} />
            <Swatch color={params.colorHigh} fallback={DEFAULT_COLOR_HIGH} />
          </span>
          {defaultColors && <span className="ml-2 text-muted-faint">по умолчанию</span>}
        </Field>
        <div className="sm:col-span-2 lg:col-span-4">
          <Field label="Браузер">{calc.userAgent ?? "—"}</Field>
        </div>
        {calc.error && (
          <div className="sm:col-span-2 lg:col-span-4">
            <Field label="Ошибка">{calc.error}</Field>
          </div>
        )}
      </dl>
    </Panel>
  );
}

/** Download links go through the admin API: it renders them again once /files has expired. */
function withAdminFiles(id: string, result: SpectrumResult): SpectrumResult {
  return {
    ...result,
    files: {
      heatmapPng: adminFileUrl(id, "heatmap.png"),
      reportPdf: adminFileUrl(id, "report.pdf"),
      matrixCsv: adminFileUrl(id, "matrix.csv"),
      metaJson: adminFileUrl(id, "result.json"),
    },
  };
}

export default function AdminCalculationPage() {
  const { id = "" } = useParams();
  const { data, error } = useAdminData(`calculation:${id}`, () => adminApi.calculation(id));

  if (data?.result) {
    return (
      <ResultView
        result={withAdminFiles(data.id, data.result)}
        back={BACK}
        details={<RequestPanel calc={data} />}
      />
    );
  }

  return (
    <AdminLayout>
      <Link
        to={BACK.to}
        className="mb-[22px] inline-flex items-center gap-1.5 font-mono text-[12.5px] text-muted transition hover:text-accent"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        {BACK.label}
      </Link>
      {data && <RequestPanel calc={data} />}
      {data && (
        <p className="font-mono text-[12.5px] text-muted-faint">
          {data.status === "running" ? "Расчёт ещё идёт." : "Результата нет: расчёт завершился ошибкой."}
        </p>
      )}
      {!data && <p className="font-mono text-[12.5px] text-muted-faint">{error ?? "Загрузка…"}</p>}
    </AdminLayout>
  );
}
