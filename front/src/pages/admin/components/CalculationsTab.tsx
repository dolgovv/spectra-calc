import { Download } from "lucide-react";
import { Link } from "react-router-dom";
import Panel from "../../../common/components/Panel";
import { formatPercent } from "../../../lib/formatNumber";
import { adminCalculationPath } from "../../../router/routes";
import { adminApi, adminArchiveUrl } from "../api/adminApi";
import { useAdminData } from "../hooks/useAdminData";
import { formatBytes, formatDateTime, formatDuration } from "../format";
import type { CalculationRecord } from "../types";
import { DataTable, EmptyRow, Td, Th } from "./DataTable";
import Pagination from "./Pagination";
import SegmentedControl from "./SegmentedControl";
import { CalculationStatusChip } from "./StatusChip";

export const PAGE_SIZE = 50;

export type CalculationFilter = "all" | "ok" | "error";

export interface CalculationsTabProps {
  page: number;
  status: CalculationFilter;
  onChange: (next: { page?: number; status?: CalculationFilter }) => void;
}

function Row({ calc }: { calc: CalculationRecord }) {
  const { params } = calc;
  return (
    <tr>
      <Td mono className="whitespace-nowrap text-muted">
        {formatDateTime(calc.ts)}
      </Td>
      <Td className="min-w-[220px] max-w-[360px]">
        <Link
          to={adminCalculationPath(calc.id)}
          className="break-all text-foreground underline decoration-border underline-offset-4 transition hover:text-accent hover:decoration-accent"
        >
          {calc.fileName}
        </Link>
        <div className="mt-0.5 font-mono text-[11.5px] text-muted-faint">{formatBytes(calc.fileBytes)}</div>
        {calc.error && <div className="mt-1 text-[12px] text-muted">{calc.error}</div>}
      </Td>
      <Td mono className="whitespace-nowrap">
        {params.from}–{params.to}
        {params.step !== undefined && <div className="text-[11.5px] text-muted-faint">шаг {params.step} мкм</div>}
      </Td>
      <Td mono align="right">
        {calc.gridSize ? `${calc.gridSize}×${calc.gridSize}` : "—"}
      </Td>
      <Td mono align="right" className="whitespace-nowrap">
        {calc.sr !== null ? `${formatPercent(calc.sr * 100)} %` : "—"}
      </Td>
      <Td mono align="right" className="whitespace-nowrap">
        {formatDuration(calc.durationMs)}
      </Td>
      <Td mono className="whitespace-nowrap text-muted">
        {calc.ip ?? "—"}
      </Td>
      <Td>
        <CalculationStatusChip status={calc.status} />
      </Td>
      <Td align="right">
        {calc.archiveAvailable ? (
          <a
            href={adminArchiveUrl(calc.id)}
            download
            className="inline-flex items-center gap-1 whitespace-nowrap font-mono text-[12px] text-muted transition hover:text-accent"
          >
            <Download className="h-3.5 w-3.5" />
            ZIP
          </a>
        ) : (
          <span className="font-mono text-[11.5px] text-muted-faint" title="Удалён по сроку хранения">
            удалён
          </span>
        )}
      </Td>
    </tr>
  );
}

export default function CalculationsTab({ page, status, onChange }: CalculationsTabProps) {
  const { data, loading, error } = useAdminData(`calculations:${page}:${status}`, () =>
    adminApi.calculations({
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
      status: status === "all" ? undefined : status,
    }),
  );

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <SegmentedControl
          label="Статус"
          value={status}
          options={[
            { value: "all", label: "Все" },
            { value: "ok", label: "Успешные" },
            { value: "error", label: "С ошибкой" },
          ]}
          onChange={(next) => onChange({ status: next, page: 1 })}
        />
        {error && <span className="font-mono text-[12px] text-red-400">{error}</span>}
      </div>

      <Panel className={loading && data ? "p-[22px] opacity-60 transition-opacity" : "p-[22px] transition-opacity"}>
        <DataTable>
          <thead>
            <tr>
              <Th>Время</Th>
              <Th>Архив</Th>
              <Th>Интервал, см⁻¹</Th>
              <Th align="right">Сетка</Th>
              <Th align="right">Sr</Th>
              <Th align="right">Длительность</Th>
              <Th>IP</Th>
              <Th>Статус</Th>
              <Th align="right">Исходник</Th>
            </tr>
          </thead>
          <tbody>
            {data?.items.length === 0 && <EmptyRow colSpan={9}>Расчётов пока нет</EmptyRow>}
            {!data && !error && <EmptyRow colSpan={9}>Загрузка…</EmptyRow>}
            {data?.items.map((calc) => <Row key={calc.id} calc={calc} />)}
          </tbody>
        </DataTable>
        {data && (
          <Pagination
            page={page}
            pageSize={PAGE_SIZE}
            total={data.total}
            onChange={(next) => onChange({ page: next })}
          />
        )}
      </Panel>
    </>
  );
}
