/**
 * AI reports should hold lists of strings, but the LLM sometimes returns one
 * sentence, null or objects instead — and reports already saved that way would
 * crash a page that calls .map() on them. These turn any such value into a list.
 */
export function asTextList(value: unknown): string[] {
  if (value === null || value === undefined) return [];
  const items = Array.isArray(value) ? value : [value];
  return items
    .map((item) => {
      if (item && typeof item === "object") {
        return Object.values(item as Record<string, unknown>)
          .filter((v) => v !== null && v !== undefined && v !== "")
          .map(String)
          .join(" — ");
      }
      return item === null || item === undefined ? "" : String(item);
    })
    .map((text) => text.trim())
    .filter(Boolean);
}

/** A copy of the report with the given fields as lists of strings. */
export function withTextLists<T extends object>(report: T, fields: readonly (keyof T)[]): T {
  const copy = { ...report };
  for (const field of fields) {
    copy[field] = asTextList(report[field]) as T[keyof T];
  }
  return copy;
}
