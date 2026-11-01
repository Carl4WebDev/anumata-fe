import { describe, test, expect } from "vitest";
import { optimistic, patchItems, removeItems } from "../optimistic";

/** A tiny stand-in for React state. */
function fakeState<T>(initial: T[]) {
  let value = initial;
  const history: T[][] = [];
  const set = (next: T[] | ((prev: T[]) => T[])) => {
    value = typeof next === "function" ? next(value) : next;
    history.push(value);
  };
  return { get: () => value, set, history };
}

type Item = { id: number; status: string };
const items: Item[] = [
  { id: 1, status: "Pending" },
  { id: 2, status: "Pending" },
  { id: 3, status: "Done" },
];

describe("optimistic updates", () => {
  test("shows the change before the server replies", async () => {
    const state = fakeState(items);
    let reply!: () => void;
    const pending = optimistic(state.set, removeItems((i) => i.id === 2), () => new Promise<void>((r) => (reply = r)));
    expect(state.get().map((i) => i.id)).toEqual([1, 3]); // already gone
    reply();
    await pending;
    expect(state.get().map((i) => i.id)).toEqual([1, 3]);
  });

  test("a refused removal puts the item back in its place", async () => {
    const state = fakeState(items);
    await expect(
      optimistic(state.set, removeItems((i) => i.id === 2), () => Promise.reject(new Error("nope"))),
    ).rejects.toThrow("nope");
    expect(state.get()).toEqual(items);
  });

  test("a refused patch restores only what it changed", async () => {
    const state = fakeState(items);
    const done = optimistic(state.set, patchItems<Item>((i) => i.id === 1, { status: "Done" }), () => Promise.reject(new Error("x")));
    expect(state.get()[0].status).toBe("Done");
    // Something else changed meanwhile (e.g. a refresh) — that must survive.
    state.set((prev) => prev.map((i) => (i.id === 3 ? { ...i, status: "Archived" } : i)));
    await done.catch(() => {});
    expect(state.get().map((i) => i.status)).toEqual(["Pending", "Pending", "Archived"]);
  });
});
