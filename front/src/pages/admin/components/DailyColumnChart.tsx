import { useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";
import { cn } from "../../../lib/cn";
import { formatInteger } from "../../../lib/formatNumber";
import { formatDay } from "../format";
import { BASELINE_COLOR, GRID_COLOR } from "../palette";
import { niceTicks } from "./niceTicks";

export interface ChartSeries {
  label: string;
  color: string;
}

export interface DailyColumnChartProps {
  /** Accessible name; the card's title says the same to sighted readers. */
  label: string;
  /** YYYY-MM-DD, oldest first. */
  days: string[];
  /** Stacked bottom to top. One series draws no legend: the title already names it. */
  series: ChartSeries[];
  /** values[day][series]. */
  values: number[][];
  /** Tooltip lines that are not drawn, e.g. unique visitors under the views. */
  extra?: (day: number) => { label: string; value: number }[];
  /** A refetch is in flight: hold the previous render, faded, rather than flashing. */
  dimmed?: boolean;
  /** One line above a single-series plot, where a legend would be: keeps side-by-side plots level. */
  note?: string;
}

const HEIGHT = 200;
const MARGIN = { top: 20, right: 4, bottom: 24, left: 40 };
const MAX_BAR = 24;
const SEGMENT_GAP = 2;
const RADIUS = 4;
const FALLBACK_WIDTH = 640;
const MIN_LABEL_SPACING = 44;
/** "27.11" in 10px mono, halved. */
const LABEL_HALF_WIDTH = 16;

function formatTick(value: number): string {
  return value >= 10_000 ? `${formatInteger(value / 1000)}k` : formatInteger(value);
}

/** A column segment with a rounded data end and a square foot on the baseline. */
function columnPath(x: number, y: number, w: number, h: number, r: number): string {
  if (r <= 0) return `M${x},${y}h${w}v${h}h${-w}Z`;
  return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
}

function useWidth() {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(FALLBACK_WIDTH);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setWidth(el.clientWidth || FALLBACK_WIDTH);
    update();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return [ref, width] as const;
}

/**
 * Columns per day, stacked when there are several series. Hover or arrow keys show the day's
 * figures; every figure is also in the table view under the charts.
 */
export default function DailyColumnChart({
  label,
  days,
  series,
  values,
  extra,
  dimmed,
  note,
}: DailyColumnChartProps) {
  const [ref, width] = useWidth();
  const [active, setActive] = useState<number | null>(null);

  const n = days.length;
  const plotW = Math.max(1, width - MARGIN.left - MARGIN.right);
  const plotH = HEIGHT - MARGIN.top - MARGIN.bottom;
  const totals = values.map((row) => row.reduce((a, b) => a + b, 0));
  const ticks = niceTicks(Math.max(0, ...totals));
  const top = ticks[ticks.length - 1];
  const slot = plotW / Math.max(1, n);
  const barW = Math.max(1, Math.min(MAX_BAR, slot * 0.6));
  const y = (v: number) => MARGIN.top + plotH - (v / top) * plotH;
  const center = (i: number) => MARGIN.left + i * slot + slot / 2;

  const labelEvery = Math.max(1, Math.ceil(n / Math.max(1, Math.floor(plotW / MIN_LABEL_SPACING))));
  // Selective direct label: only the peak, and only when one series makes it unambiguous.
  const peak = series.length === 1 && Math.max(...totals) > 0 ? totals.lastIndexOf(Math.max(...totals)) : -1;

  function onKeyDown(event: KeyboardEvent) {
    const current = active ?? n - 1;
    const next =
      event.key === "ArrowLeft"
        ? current - 1
        : event.key === "ArrowRight"
          ? current + 1
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? n - 1
              : null;
    if (next === null) return;
    event.preventDefault();
    setActive(Math.min(n - 1, Math.max(0, next)));
  }

  const tooltipOnRight = active !== null && center(active) < width / 2;

  return (
    <div className={cn("transition-opacity", dimmed && "opacity-50")}>
      {note && series.length === 1 && <p className="mb-3 text-[12px] text-muted-faint">{note}</p>}
      {series.length > 1 && (
        <ul className="mb-3 flex flex-wrap gap-4 text-[12px] text-muted">
          {series.map((s) => (
            <li key={s.label} className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ background: s.color }} />
              {s.label}
            </li>
          ))}
        </ul>
      )}

      <div ref={ref} className="relative">
        <svg
          width={width}
          height={HEIGHT}
          role="group"
          aria-label={`${label}. Стрелки влево и вправо — по дням`}
          tabIndex={0}
          className="block rounded outline-none focus-visible:ring-1 focus-visible:ring-border-strong"
          onPointerLeave={() => setActive(null)}
          onFocus={() => setActive((a) => a ?? n - 1)}
          onBlur={() => setActive(null)}
          onKeyDown={onKeyDown}
        >
          {ticks.map((tick) => (
            <g key={tick}>
              <line
                x1={MARGIN.left}
                x2={width - MARGIN.right}
                y1={y(tick)}
                y2={y(tick)}
                stroke={tick === 0 ? BASELINE_COLOR : GRID_COLOR}
                strokeWidth={1}
                shapeRendering="crispEdges"
              />
              <text
                x={MARGIN.left - 8}
                y={y(tick)}
                dy="0.32em"
                textAnchor="end"
                className="fill-muted-faint font-mono text-[10px]"
              >
                {formatTick(tick)}
              </text>
            </g>
          ))}

          {active !== null && (
            <rect
              x={MARGIN.left + active * slot}
              y={MARGIN.top}
              width={slot}
              height={plotH}
              fill="rgba(255,255,255,0.04)"
            />
          )}

          {values.map((row, i) => {
            let cumulative = 0;
            const topSeries = row.reduce((last, v, s) => (v > 0 ? s : last), -1);
            return (
              <g key={days[i]} style={active === i ? { filter: "brightness(1.25)" } : undefined}>
                {row.map((v, s) => {
                  if (v <= 0) return null;
                  const first = cumulative === 0;
                  const yTop = y(cumulative + v);
                  const h = y(cumulative) - yTop - (first ? 0 : SEGMENT_GAP);
                  cumulative += v;
                  if (h <= 0) return null;
                  const r = s === topSeries ? Math.min(RADIUS, barW / 2, h) : 0;
                  return (
                    <path
                      key={s}
                      d={columnPath(center(i) - barW / 2, yTop, barW, h, r)}
                      fill={series[s].color}
                    />
                  );
                })}
              </g>
            );
          })}

          {peak >= 0 && (
            <text
              x={center(peak)}
              y={y(totals[peak]) - 6}
              textAnchor="middle"
              className="fill-muted font-mono text-[10.5px]"
            >
              {formatInteger(totals[peak])}
            </text>
          )}

          {days.map((day, i) =>
            (n - 1 - i) % labelEvery === 0 ? (
              <text
                key={day}
                // A centred label at the right edge would be cut off: pin it to the edge instead.
                x={center(i) + LABEL_HALF_WIDTH > width ? width : center(i)}
                y={HEIGHT - 6}
                textAnchor={center(i) + LABEL_HALF_WIDTH > width ? "end" : "middle"}
                className="fill-muted-faint font-mono text-[10px]"
              >
                {formatDay(day)}
              </text>
            ) : null,
          )}

          {/* Hit targets: the whole day's slot, far bigger than a thin column. */}
          {days.map((day, i) => (
            <rect
              key={day}
              x={MARGIN.left + i * slot}
              y={MARGIN.top}
              width={slot}
              height={plotH}
              fill="transparent"
              onPointerEnter={() => setActive(i)}
            />
          ))}
        </svg>

        <div aria-live="polite" className="sr-only">
          {active !== null &&
            `${formatDay(days[active])}: ${series
              .map((s, k) => `${s.label} ${values[active][k]}`)
              .concat((extra?.(active) ?? []).map((e) => `${e.label} ${e.value}`))
              .join(", ")}`}
        </div>

        {active !== null && (
          <div
            aria-hidden
            className="pointer-events-none absolute z-10 min-w-[140px] rounded-md border border-border bg-surface-2 px-3 py-2 shadow-lg"
            style={{
              top: MARGIN.top,
              left: tooltipOnRight ? center(active) + barW / 2 + 10 : center(active) - barW / 2 - 10,
              transform: tooltipOnRight ? undefined : "translateX(-100%)",
            }}
          >
            <div className="mb-1 font-mono text-[11px] text-muted-faint">{formatDay(days[active])}</div>
            {series.map((s, k) => (
              <div key={s.label} className="flex items-center gap-2 text-[12px]">
                <span className="h-0.5 w-3 rounded-full" style={{ background: s.color }} />
                <span className="font-semibold text-foreground">{formatInteger(values[active][k])}</span>
                <span className="text-muted">{s.label}</span>
              </div>
            ))}
            {extra?.(active).map((e) => (
              <div key={e.label} className="flex items-center gap-2 text-[12px]">
                <span className="w-3" />
                <span className="font-semibold text-foreground">{formatInteger(e.value)}</span>
                <span className="text-muted">{e.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
