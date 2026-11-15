import type { LiveMessage } from "../../../shared/types/session";

export interface SteppedInSummary {
  pauses: number;
  fromTherapist: number;
  fromPatient: number;
  /** Therapist messages the patient's screen never showed. */
  unseen: number;
  /** Questions (0-based) where the therapist stepped in, in order. */
  questions: number[];
  /** Stepped in before the questions began (warm-up). */
  beforeQuestions: boolean;
}

/** What happened when the therapist stepped in, in numbers. */
export function summarizeSteppedIn(messages: readonly LiveMessage[]): SteppedInSummary {
  const texts = messages.filter((m) => m.kind === "message");
  const fromTherapist = texts.filter((m) => m.sender === "therapist");
  const indices = messages.map((m) => m.questionIndex);
  return {
    pauses: messages.filter((m) => m.kind === "pause").length,
    fromTherapist: fromTherapist.length,
    fromPatient: texts.length - fromTherapist.length,
    unseen: fromTherapist.filter((m) => !m.seenAt).length,
    questions: [...new Set(indices.filter((i): i is number => i !== null))].sort((a, b) => a - b),
    beforeQuestions: indices.some((i) => i === null),
  };
}

/** "Q3" or "Warm-up" for where the patient was. */
export const whereLabel = (questionIndex: number | null): string => (questionIndex === null ? "Warm-up" : `Q${questionIndex + 1}`);

/** One line of the conversation as shown in the report. */
export function describeLine(m: LiveMessage): string {
  if (m.kind === "pause") return "You paused the questions";
  if (m.kind === "resume") {
    if (m.sender === "patient") return "Resumed automatically — the patient was ready and no reply came within 1 minute";
    return m.body?.startsWith("Resumed automatically") ? "Resumed automatically — you closed the live view" : "You resumed the interview";
  }
  return m.body ?? "";
}
