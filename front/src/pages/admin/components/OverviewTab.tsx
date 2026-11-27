import Panel from "../../../common/components/Panel";
import PanelTitle from "../../../common/components/PanelTitle";
import { formatInteger } from "../../../lib/formatNumber";
import { adminApi } from "../api/adminApi";
import { useAdminData } from "../hooks/useAdminData";
import { formatBytes, formatDay, formatDuration, formatRetention } from "../format";
import { ERROR_COLOR, OK_COLOR, VIEWS_COLOR } from "../palette";
import type { AdminOverview } from "../types";
import DailyColumnChart from "./DailyColumnChart";
import { DataTable, EmptyRow, Td, Th } from "./DataTable";
import SegmentedControl from "./SegmentedControl";
import StatTile from "./StatTile";

export const RANGE_OPTIONS = [
  { value: "7", label: "7 дней" },
  { value: "30", label: "30 дней" },
  { value: "90", label: "90 дней" },
] as const;
export type RangeValue = (typeof RANGE_OPTIONS)[number]["value"];

export interface OverviewTabProps {
  days: RangeValue;
  onDaysChange: (days: RangeValue) => void;
}

function TopList({
  title,
  rows,
  empty,
}: {
  title: string;
  rows: { name: string; views: number; visitors: number }[];
  empty: string;
}) {
  return (
    <Panel className="p-[26px]">
      <PanelTitle>{title}</PanelTitle>
      <DataTable>
        <thead>
          <tr>
            <Th />
            <Th align="right">Просмотры</Th>
            <Th align="right">Посетители</Th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && <EmptyRow colSpan={3}>{empty}</EmptyRow>}
          {rows.map((row) => (
            <tr key={row.name}>
              <Td mono className="break-all">
                {row.name}
              </Td>
              <Td align="right" mono>
                {formatInteger(row.views)}
              </Td>
              <Td align="right" mono>
                {formatInteger(row.visitors)}
              </Td>
            </tr>
          ))}
        </tbody>
      </DataTable>
    </Panel>
  );
}

function Overview({ data, dimmed }: { data: AdminOverview; dimmed: boolean }) {
  const { visits, calculations, daily, storage, retention } = data;
  const days = daily.map((d) => d.date);
  const rangeCalcs = calculations.range.ok + calculations.range.error;
  const period = `за ${data.days} дн.`;

  return (
    <>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile
          label={`Просмотры ${period}`}
          value={formatInteger(visits.range.views)}
          detail={`сегодня ${formatInteger(visits.today.views)}`}
        />
        <StatTile
          label={`Посетители ${period}`}
          value={formatInteger(visits.range.visitors)}
          detail={`сегодня ${formatInteger(visits.today.visitors)}`}
        />
        <StatTile
          label={`Расчёты ${period}`}
          value={formatInteger(rangeCalcs)}
          detail={`с ошибкой ${formatInteger(calculations.range.error)} · сегодня ${formatInteger(
            calculations.today.ok + calculations.today.error,
          )}`}
        />
        <StatTile
          label="Среднее время расчёта"
          value={formatDuration(calculations.range.avgDurationMs)}
          detail="успешные, с загрузкой и рендером"
        />
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Panel className="p-[26px]">
          <PanelTitle>Просмотры по дням</PanelTitle>
          <DailyColumnChart
            label="Просмотры по дням"
            days={days}
            series={[{ label: "просмотры", color: VIEWS_COLOR }]}
            values={daily.map((d) => [d.views])}
            extra={(i) => [{ label: "посетители", value: daily[i].visitors }]}
            note="Страницы сайта, без ботов и самой админки"
            dimmed={dimmed}
          />
        </Panel>
        <Panel className="p-[26px]">
          <PanelTitle>Расчёты по дням</PanelTitle>
          <DailyColumnChart
            label="Расчёты по дням"
            days={days}
            series={[
              { label: "успешные", color: OK_COLOR },
              { label: "с ошибкой", color: ERROR_COLOR },
            ]}
            values={daily.map((d) => [d.calcOk, d.calcError])}
            dimmed={dimmed}
          />
        </Panel>
      </div>

      <details className="mt-3 font-mono text-[12px] text-muted-faint">
        <summary className="cursor-pointer select-none py-1 transition hover:text-foreground">
          Таблица по дням
        </summary>
        <Panel className="mt-2 p-[22px]">
          <DataTable>
            <thead>
              <tr>
                <Th>День</Th>
                <Th align="right">Просмотры</Th>
                <Th align="right">Посетители</Th>
                <Th align="right">Расчёты</Th>
                <Th align="right">С ошибкой</Th>
              </tr>
            </thead>
            <tbody>
              {[...daily].reverse().map((d) => (
                <tr key={d.date}>
                  <Td mono>{formatDay(d.date)}</Td>
                  <Td align="right" mono>{formatInteger(d.views)}</Td>
                  <Td align="right" mono>{formatInteger(d.visitors)}</Td>
                  <Td align="right" mono>{formatInteger(d.calcOk + d.calcError)}</Td>
                  <Td align="right" mono>{formatInteger(d.calcError)}</Td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        </Panel>
      </details>

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-3">
        <TopList
          title="Страницы"
          rows={data.topPaths.map((p) => ({ name: p.path, ...p }))}
          empty="Просмотров пока нет"
        />
        <TopList
          title="Источники переходов"
          rows={data.topReferrers.map((r) => ({ name: r.referrer, ...r }))}
          empty="Переходов с других сайтов нет"
        />
        <Panel className="p-[26px]">
          <PanelTitle>Хранилище</PanelTitle>
          <DataTable>
            <tbody>
              <tr>
                <Td className="text-muted">Исходные архивы</Td>
                <Td align="right" mono>
                  {formatInteger(storage.archives)} · {formatBytes(storage.archiveBytes)}
                </Td>
              </tr>
              <tr>
                <Td className="text-muted">База данных</Td>
                <Td align="right" mono>{formatBytes(storage.databaseBytes)}</Td>
              </tr>
              <tr>
                <Td className="text-muted">Срок хранения архивов</Td>
                <Td align="right" mono>{formatRetention(retention.archiveDays)}</Td>
              </tr>
              <tr>
                <Td className="text-muted">Срок хранения логов</Td>
                <Td align="right" mono>{formatRetention(retention.logDays)}</Td>
              </tr>
            </tbody>
          </DataTable>
          <p className="mt-3 text-[12px] leading-relaxed text-muted-faint">
            Записи о расчётах и их результаты хранятся бессрочно, PNG/PDF/CSV собираются из них
            заново.
          </p>
        </Panel>
      </div>
    </>
  );
}

export default function OverviewTab({ days, onDaysChange }: OverviewTabProps) {
  const { data, loading, error } = useAdminData(`overview:${days}`, () =>
    adminApi.overview(Number(days)),
  );

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <SegmentedControl
          label="Период"
          value={days}
          options={[...RANGE_OPTIONS]}
          onChange={onDaysChange}
        />
        {error && <span className="font-mono text-[12px] text-red-400">{error}</span>}
      </div>
      {data ? (
        <Overview data={data} dimmed={loading} />
      ) : (
        !error && <p className="font-mono text-[12.5px] text-muted-faint">Загрузка…</p>
      )}
    </>
  );
}
