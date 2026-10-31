import type { Dispatch, SetStateAction } from "react";

/** A change to a list, and how to undo exactly that change. */
export interface ListChange<T> {
  apply: (prev: T[]) => T[];
  revert: (prev: T[]) => T[];
}

/** Remove matching items; undo puts them back where they were. */
export function removeItems<T>(match: (item: T) => boolean): ListChange<T> {
  let removed: { item: T; index: number }[] = [];
  return {
    apply: (prev) => {
      removed = prev.flatMap((item, index) => (match(item) ? [{ item, index }] : []));
      return prev.filter((item) => !match(item));
    },
    revert: (prev) => {
      const next = [...prev];
      for (const { item, index } of removed) next.splice(Math.min(index, next.length), 0, item);
      return next;
    },
  };
}

/** Patch matching items; undo restores only the patched fields. */
export function patchItems<T extends object>(match: (item: T) => boolean, patch: Partial<T>): ListChange<T> {
  const before = new Map<T, Partial<T>>();
  const keys = Object.keys(patch) as (keyof T)[];
  return {
    apply: (prev) =>
      prev.map((item) => {
        if (!match(item)) return item;
        const next = { ...item, ...patch };
        before.set(next, Object.fromEntries(keys.map((k) => [k, item[k]])) as Partial<T>);
        return next;
      }),
    revert: (prev) => prev.map((item) => (before.has(item) ? { ...item, ...before.get(item) } : item)),
  };
}

/**
 * Optimistic update: show the result first, then ask the server.
 * If the server says no, the change is undone and the error rethrown.
 */
export async function optimistic<T>(
  setState: Dispatch<SetStateAction<T[]>>,
  change: ListChange<T>,
  request: () => Promise<unknown>,
): Promise<void> {
  setState(change.apply);
  try {
    await request();
  } catch (err) {
    setState(change.revert);
    throw err;
  }
}
