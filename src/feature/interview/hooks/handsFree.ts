/**
 * Hands-free turn timing: when to check in with the patient, and when to move
 * on. Pure — the page polls it with the current listening clock.
 */

export interface TurnTiming {
  /** Silence after the patient has spoken before the AI checks in. */
  answeredSilenceMs: number;
  /** Silence when nothing was said at all before the AI checks in. */
  noAnswerSilenceMs: number;
  /** How long to wait for a reply to the check-in before moving on. */
  confirmTimeoutMs: number;
  /**
   * "confirm" = ask "are you done?" after the patient speaks (formal questions);
   * "proceed" = move on directly after they finish (quick warm-up questions).
   */
  afterAnswer: "confirm" | "proceed";
}

// After an answer, 3 s of silence → Amumata says she's moving on and shows a
// short countdown; talking during it continues the answer. Nothing said yet →
// a longer wait, so the patient has time to think.
export const QUESTION_TIMING: TurnTiming = {
  answeredSilenceMs: 3000,
  noAnswerSilenceMs: 15000,
  confirmTimeoutMs: 3000,
  afterAnswer: "confirm",
};

// "More time to think" (comfort option): people pause longer when something is
// hard to say, so wait 7 s before the notice and give a longer countdown.
export const RELAXED_QUESTION_TIMING: TurnTiming = {
  ...QUESTION_TIMING,
  answeredSilenceMs: 7000,
  noAnswerSilenceMs: 25000,
  confirmTimeoutMs: 5000,
};

/** Timing for the formal questions, with or without "More time to think". */
export function questionTiming(moreTime: boolean): TurnTiming {
  return moreTime ? RELAXED_QUESTION_TIMING : QUESTION_TIMING;
}

export const WARMUP_TIMING: TurnTiming = {
  answeredSilenceMs: 2500,
  noAnswerSilenceMs: 20000,
  confirmTimeoutMs: 9000,
  afterAnswer: "proceed",
};

export interface TurnClock {
  now: number;
  /** Silence counted from here: last voice, or when listening (re)started. */
  silenceSince: number;
  /** The patient has said something this turn. */
  hasAnswer: boolean;
  /** The patient is talking right now. */
  voiceActive: boolean;
  /** Phrases still being transcribed — never decide before they land. */
  pendingTranscripts: number;
  /** When the check-in question finished, if one was asked. */
  confirmAskedAt: number | null;
}

/** "proceed" = answer done; "ask_confirm" = check in; "auto_proceed" = no reply to the check-in. */
export type TurnAction = "wait" | "ask_confirm" | "proceed" | "auto_proceed";

export function decideTurn(clock: TurnClock, timing: TurnTiming): TurnAction {
  if (clock.voiceActive || clock.pendingTranscripts > 0) return "wait";

  if (clock.confirmAskedAt !== null) {
    return clock.now - clock.confirmAskedAt >= timing.confirmTimeoutMs ? "auto_proceed" : "wait";
  }

  const silent = clock.now - clock.silenceSince;
  if (clock.hasAnswer) {
    if (silent < timing.answeredSilenceMs) return "wait";
    return timing.afterAnswer === "confirm" ? "ask_confirm" : "proceed";
  }
  return silent >= timing.noAnswerSilenceMs ? "ask_confirm" : "wait";
}
