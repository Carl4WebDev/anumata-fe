import { describe, test, expect } from "vitest";
import { mergeTalk, type LiveTalkItem } from "../../../shared/api/liveApi";
import { isTherapistMessage, newTherapistMessages, resumedBecauseTherapistLeft } from "./therapistTalk";

const item = (ref: string, over: Partial<LiveTalkItem> = {}): LiveTalkItem => ({
  ref,
  sender: "therapist",
  kind: "message",
  body: `msg ${ref}`,
  at: "2026-11-15T10:00:00Z",
  seenAt: null,
  ...over,
});

describe("therapist talk", () => {
  test("only therapist messages with text are shown to the patient", () => {
    expect(isTherapistMessage(item("a"))).toBe(true);
    expect(isTherapistMessage(item("b", { sender: "patient" }))).toBe(false);
    expect(isTherapistMessage(item("c", { kind: "pause", body: null }))).toBe(false);
  });

  test("new messages: not yet handled and not already seen (e.g. before a reload)", () => {
    const talk = [item("a", { seenAt: "2026-11-15T10:01:00Z" }), item("b"), item("c"), item("d", { sender: "patient" })];
    expect(newTherapistMessages(talk, new Set(["c"])).map((t) => t.ref)).toEqual(["b"]);
  });

  test("knows when the last resume came from the therapist leaving", () => {
    const pause = item("p", { kind: "pause", body: null });
    expect(resumedBecauseTherapistLeft([pause, item("r", { kind: "resume", body: null })])).toBe(false);
    expect(resumedBecauseTherapistLeft([pause, item("r", { kind: "resume", auto: true }), item("m")])).toBe(true);
  });

  test("merging adds new items, updates known ones, and keeps the last 50", () => {
    const one = mergeTalk([], item("a"));
    expect(mergeTalk(one, item("a", { seenAt: "x" }))).toEqual([item("a", { seenAt: "x" })]);
    let many: LiveTalkItem[] = [];
    for (let i = 0; i < 55; i += 1) many = mergeTalk(many, item(`m${i}`));
    expect(many).toHaveLength(50);
    expect(many[0].ref).toBe("m5");
  });
});
