/** The number of pages for `total` items (at least 1). */
export const pageCountOf = (total: number, pageSize: number): number => Math.max(1, Math.ceil(total / pageSize));

/** Pages to show as buttons: the first, the last, and the ones around the current page, with gaps as null. */
export function visiblePages(page: number, pageCount: number): (number | null)[] {
  const wanted = new Set([1, pageCount, page - 1, page, page + 1].filter((p) => p >= 1 && p <= pageCount));
  const sorted = [...wanted].sort((a, b) => a - b);
  return sorted.flatMap((p, i) => (i > 0 && p - sorted[i - 1] > 1 ? [null, p] : [p]));
}
