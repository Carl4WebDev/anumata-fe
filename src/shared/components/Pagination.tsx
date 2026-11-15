import { ChevronLeft, ChevronRight } from "lucide-react";
import { pageCountOf, visiblePages } from "../utils/pagination";

interface PaginationProps {
  /** Current page, 1-based. */
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  /** What is being counted, plural ("patients"). */
  itemLabel?: string;
}

/**
 * "Showing 11–20 of 34 patients" with Previous / page numbers / Next.
 * Hidden when everything fits on one page.
 */
export default function Pagination({ page, pageSize, total, onPageChange, itemLabel = "items" }: PaginationProps) {
  const pageCount = pageCountOf(total, pageSize);
  if (pageCount <= 1) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  const btn = "flex h-9 min-w-9 items-center justify-center rounded-lg border px-2.5 text-sm font-medium transition disabled:opacity-40";

  return (
    <nav aria-label="Pages" className="flex flex-col items-center justify-between gap-3 sm:flex-row">
      <p className="text-sm text-slate-500">
        Showing {from}–{to} of {total} {itemLabel}
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          aria-label="Previous page"
          className={`${btn} border-slate-200 bg-white text-slate-600 hover:bg-slate-50`}
        >
          <ChevronLeft size={16} />
        </button>
        {visiblePages(page, pageCount).map((p, i) =>
          p === null ? (
            <span key={`gap-${i}`} className="px-1 text-sm text-slate-400">
              …
            </span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              aria-label={`Page ${p}`}
              aria-current={p === page ? "page" : undefined}
              className={`${btn} ${p === page ? "border-teal-600 bg-teal-600 text-white" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}
            >
              {p}
            </button>
          ),
        )}
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= pageCount}
          aria-label="Next page"
          className={`${btn} border-slate-200 bg-white text-slate-600 hover:bg-slate-50`}
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </nav>
  );
}
