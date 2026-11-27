import type { ReactNode } from "react";
import { cn } from "../../../lib/cn";

/**
 * The admin's tables: hairline rows, mono figures aligned in columns. Scrolls sideways on its
 * own when narrow, so the page never does.
 */
export function DataTable({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("overflow-x-auto", className)}>
      <table className="w-full border-collapse text-left text-[12.5px] [font-variant-numeric:tabular-nums]">
        {children}
      </table>
    </div>
  );
}

export function Th({ children, align = "left" }: { children?: ReactNode; align?: "left" | "right" }) {
  return (
    <th
      className={cn(
        "whitespace-nowrap border-b border-border px-3 py-2.5 font-mono text-[11px] font-normal uppercase tracking-[.06em] text-muted-faint first:pl-0 last:pr-0",
        align === "right" && "text-right",
      )}
    >
      {children}
    </th>
  );
}

export function Td({
  children,
  align = "left",
  mono = false,
  className,
}: {
  children?: ReactNode;
  align?: "left" | "right";
  mono?: boolean;
  className?: string;
}) {
  return (
    <td
      className={cn(
        "border-b border-border px-3 py-2.5 align-top text-foreground first:pl-0 last:pr-0",
        align === "right" && "text-right",
        mono && "font-mono text-[12px]",
        className,
      )}
    >
      {children}
    </td>
  );
}

/** Shown in place of rows: nothing recorded yet, or the filter matched nothing. */
export function EmptyRow({ colSpan, children }: { colSpan: number; children: ReactNode }) {
  return (
    <tr>
      <td colSpan={colSpan} className="py-8 text-center font-mono text-[12.5px] text-muted-faint">
        {children}
      </td>
    </tr>
  );
}
