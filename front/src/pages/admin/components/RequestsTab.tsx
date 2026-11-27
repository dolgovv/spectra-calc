import { useState, type FormEvent } from "react";
import { Search } from "lucide-react";
import Panel from "../../../common/components/Panel";
import PanelTitle from "../../../common/components/PanelTitle";
import { formatInteger } from "../../../lib/formatNumber";
import { adminApi } from "../api/adminApi";
import { useAdminData } from "../hooks/useAdminData";
import { formatBytes, formatDateTime, formatDuration } from "../format";
import type { StatusClass } from "../types";
import { DataTable, EmptyRow, Td, Th } from "./DataTable";
import Pagination from "./Pagination";
import SegmentedControl from "./SegmentedControl";
import { HttpStatusChip } from "./StatusChip";

export const PAGE_SIZE = 50;
const SUMMARY_DAYS = 7;

export type RequestFilter = "all" | StatusClass;

export interface RequestsTabProps {
  page: number;
  status: RequestFilter;
  search: string;
  /** The admin panel's own API calls, hidden by default: every admin page view makes several. */
  includeAdmin: boolean;
  onChange: (next: { page?: number; status?: RequestFilter; search?: string; includeAdmin?: boolean }) => void;
}

function RouteSummaryPanel({ includeAdmin }: { includeAdmin: boolean }) {
  const { data, error } = useAdminData(`summary:${includeAdmin}`, () =>
    adminApi.requestSummary(SUMMARY_DAYS, includeAdmin),
  );

  return (
    <Panel className="mb-5 p-[22px]">
      <PanelTitle>Эндпоинты за {SUMMARY_DAYS} дней</PanelTitle>
      {error && <p className="font-mono text-[12px] text-red-400">{error}</p>}
      <DataTable>
        <thead>
          <tr>
            <Th>Метод</Th>
            <Th>Маршрут</Th>
            <Th align="right">Запросов</Th>
            <Th align="right">Ошибок</Th>
            <Th align="right">Среднее</Th>
            <Th align="right">Максимум</Th>
            <Th align="right">Последний</Th>
          </tr>
        </thead>
        <tbody>
          {data?.length === 0 && <EmptyRow colSpan={7}>Запросов пока нет</EmptyRow>}
          {data?.map((r) => (
            <tr key={`${r.method} ${r.route}`}>
              <Td mono>{r.method}</Td>
              <Td mono className="break-all">{r.route}</Td>
              <Td mono align="right">{formatInteger(r.count)}</Td>
              <Td mono align="right" className={r.errors > 0 ? "text-foreground" : "text-muted-faint"}>
                {formatInteger(r.errors)}
              </Td>
              <Td mono align="right">{formatDuration(r.avgMs)}</Td>
              <Td mono align="right">{formatDuration(r.maxMs)}</Td>
              <Td mono align="right" className="whitespace-nowrap text-muted">{formatDateTime(r.lastTs)}</Td>
            </tr>
          ))}
        </tbody>
      </DataTable>
    </Panel>
  );
}

export default function RequestsTab({ page, status, search, includeAdmin, onChange }: RequestsTabProps) {
  const [draft, setDraft] = useState(search);
  const { data, loading, error } = useAdminData(`requests:${page}:${status}:${search}:${includeAdmin}`, () =>
    adminApi.requests({
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
      status: status === "all" ? undefined : status,
      search: search || undefined,
      includeAdmin,
    }),
  );

  function submitSearch(event: FormEvent) {
    event.preventDefault();
    onChange({ search: draft.trim(), page: 1 });
  }

  return (
    <>
      <RouteSummaryPanel includeAdmin={includeAdmin} />

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <SegmentedControl
          label="Код ответа"
          value={status}
          options={[
            { value: "all", label: "Все" },
            { value: "2xx", label: "2xx" },
            { value: "3xx", label: "3xx" },
            { value: "4xx", label: "4xx" },
            { value: "5xx", label: "5xx" },
          ]}
          onChange={(next) => onChange({ status: next, page: 1 })}
        />
        <form onSubmit={submitSearch} className="flex items-center gap-2" role="search">
          <input
            type="search"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="путь содержит…"
            aria-label="Поиск по пути"
            className="w-[220px] rounded-md border border-border bg-surface px-3 py-1.5 font-mono text-[12px] text-foreground outline-none transition placeholder:text-muted-faint focus:border-accent"
          />
          <button
            type="submit"
            aria-label="Найти"
            className="inline-flex h-[30px] w-[30px] items-center justify-center rounded-md border border-border text-muted transition hover:border-foreground hover:text-foreground"
          >
            <Search className="h-3.5 w-3.5" />
          </button>
        </form>
        <label className="inline-flex cursor-pointer items-center gap-2 font-mono text-[12px] text-muted">
          <input
            type="checkbox"
            checked={includeAdmin}
            onChange={(e) => onChange({ includeAdmin: e.target.checked, page: 1 })}
            className="h-3.5 w-3.5 accent-accent"
          />
          запросы админки
        </label>
        {error && <span className="font-mono text-[12px] text-red-400">{error}</span>}
      </div>

      <Panel className={loading && data ? "p-[22px] opacity-60 transition-opacity" : "p-[22px] transition-opacity"}>
        <DataTable>
          <thead>
            <tr>
              <Th>Время</Th>
              <Th>Метод</Th>
              <Th>Путь</Th>
              <Th>Код</Th>
              <Th align="right">Ответ за</Th>
              <Th align="right">Размер</Th>
              <Th>IP</Th>
              <Th>Браузер</Th>
            </tr>
          </thead>
          <tbody>
            {data?.items.length === 0 && <EmptyRow colSpan={8}>Ничего не найдено</EmptyRow>}
            {!data && !error && <EmptyRow colSpan={8}>Загрузка…</EmptyRow>}
            {data?.items.map((r) => (
              <tr key={r.id}>
                <Td mono className="whitespace-nowrap text-muted">{formatDateTime(r.ts)}</Td>
                <Td mono>{r.method}</Td>
                <Td mono className="min-w-[200px] max-w-[420px] break-all">{r.path}</Td>
                <Td><HttpStatusChip status={r.status} /></Td>
                <Td mono align="right" className="whitespace-nowrap">{formatDuration(r.durationMs)}</Td>
                <Td mono align="right" className="whitespace-nowrap">{formatBytes(r.bytesOut)}</Td>
                <Td mono className="whitespace-nowrap text-muted">{r.ip ?? "—"}</Td>
                <Td className="max-w-[220px] truncate text-[12px] text-muted-faint">
                  <span title={r.userAgent ?? undefined}>{r.userAgent ?? "—"}</span>
                </Td>
              </tr>
            ))}
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
