import { ChevronLeft, ChevronRight } from "lucide-react";
import { formatInteger } from "../../../lib/formatNumber";

export interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onChange: (page: number) => void;
}

export default function Pagination({ page, pageSize, total, onChange }: PaginationProps) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const first = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const last = Math.min(total, page * pageSize);
  const button =
    "inline-flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted transition hover:border-foreground hover:text-foreground disabled:pointer-events-none disabled:opacity-30";

  return (
    <div className="mt-4 flex items-center justify-between gap-3 font-mono text-[12px] text-muted-faint">
      <span>
        {formatInteger(first)}–{formatInteger(last)} из {formatInteger(total)}
      </span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          className={button}
          aria-label="Предыдущая страница"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="min-w-[60px] text-center">
          {page} / {pages}
        </span>
        <button
          type="button"
          className={button}
          aria-label="Следующая страница"
          disabled={page >= pages}
          onClick={() => onChange(page + 1)}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
