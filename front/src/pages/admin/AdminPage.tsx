import { LogOut } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import Button from "../../common/components/Button";
import { cn } from "../../lib/cn";
import AdminLayout from "./components/AdminLayout";
import CalculationsTab, { type CalculationFilter } from "./components/CalculationsTab";
import OverviewTab, { RANGE_OPTIONS, type RangeValue } from "./components/OverviewTab";
import RequestsTab, { type RequestFilter } from "./components/RequestsTab";
import { useAdminSession } from "./session/adminSession";

const TABS = [
  { value: "overview", label: "Обзор" },
  { value: "calculations", label: "Расчёты" },
  { value: "requests", label: "Запросы" },
] as const;
type Tab = (typeof TABS)[number]["value"];

function oneOf<T extends string>(value: string | null, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

function positivePage(value: string | null): number {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : 1;
}

/**
 * The tab and its filters live in the URL, so a refresh, the back button from a calculation and
 * a pasted link all land on the same view.
 */
export default function AdminPage() {
  const { logout } = useAdminSession();
  const [params, setParams] = useSearchParams();
  const tab = oneOf<Tab>(params.get("tab"), TABS.map((t) => t.value), "overview");

  function update(patch: Record<string, string | number | undefined>) {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        for (const [key, value] of Object.entries(patch)) {
          if (value === undefined || value === "" || value === 1 || value === "all") next.delete(key);
          else next.set(key, String(value));
        }
        return next;
      },
      { replace: true },
    );
  }

  const toolbar = (
    <div className="flex flex-wrap items-center gap-3">
      <div role="tablist" aria-label="Разделы" className="inline-flex rounded-md border border-border bg-surface p-0.5">
        {TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            role="tab"
            aria-selected={t.value === tab}
            // Each tab starts clean: the filters of one mean nothing to another.
            onClick={() => setParams(t.value === "overview" ? {} : { tab: t.value })}
            className={cn(
              "rounded px-3.5 py-1.5 font-mono text-[12.5px] transition",
              t.value === tab ? "bg-surface-2 text-foreground" : "text-muted-faint hover:text-foreground",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      <Button variant="ghost" leftIcon={<LogOut className="h-3.5 w-3.5" />} onClick={() => void logout()}>
        Выйти
      </Button>
    </div>
  );

  return (
    <AdminLayout toolbar={toolbar}>
      {tab === "overview" && (
        <OverviewTab
          days={oneOf<RangeValue>(params.get("days"), RANGE_OPTIONS.map((o) => o.value), "30")}
          onDaysChange={(days) => update({ days: days === "30" ? undefined : days })}
        />
      )}
      {tab === "calculations" && (
        <CalculationsTab
          page={positivePage(params.get("page"))}
          status={oneOf<CalculationFilter>(params.get("status"), ["all", "ok", "error"], "all")}
          onChange={update}
        />
      )}
      {tab === "requests" && (
        <RequestsTab
          // Remounted per search so the box shows what the URL says after back/forward.
          key={params.get("q") ?? ""}
          page={positivePage(params.get("page"))}
          status={oneOf<RequestFilter>(params.get("status"), ["all", "2xx", "3xx", "4xx", "5xx"], "all")}
          search={params.get("q") ?? ""}
          includeAdmin={params.get("admin") === "1"}
          onChange={({ search, includeAdmin, ...rest }) =>
            update({
              ...rest,
              ...(search !== undefined && { q: search }),
              ...(includeAdmin !== undefined && { admin: includeAdmin ? "1" : undefined }),
            })
          }
        />
      )}
    </AdminLayout>
  );
}
