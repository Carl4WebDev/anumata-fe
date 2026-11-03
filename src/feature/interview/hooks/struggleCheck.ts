import type { LocalizedLine } from "./rapportUtils";
import type { Posture } from "./postureCheck";

/**
 * When a patient seems to struggle with a question, Amumata gently asks if
 * they're okay to continue (keep going / take a break / skip). Fixed rules —
 * the same for every patient — based on behaviour, never on what the AI
 * thinks they feel:
 *
 *  - "said_hard": they said it's hard ("I don't know", "lisod", "ewan ko")
 *  - "head_down" / "still": head down or a blank stare, while silent
 *  - "no_answer": no answer for a long while
 *
 * At most once per question and MAX_CHECK_INS per interview. Questions the
 * therapist marked "sensitive" get the check-in sooner.
 */

export type CheckInReason = "no_answer" | "said_hard" | "head_down" | "still";
export type CheckInOutcome = "continued" | "break" | "skipped";

export const MAX_CHECK_INS = 3;

// After saying it's hard, give them a moment before asking.
const AFTER_HARD_WORDS_MS = 2500;
// Head down / stare for this long …
const HEAD_DOWN_MS = 4000;
const STILL_MS = 6000;
// … while silent for this long (sooner for sensitive questions).
const POSTURE_SILENCE_MS = { normal: 8000, sensitive: 6000 };
// No answer at all: ask before the generic "move on?" at 15 s.
const NO_ANSWER_MS = { normal: 13000, sensitive: 10000 };

export interface CheckInSituation {
  now: number;
  /** When the patient last spoke, or when listening started — whichever is later. */
  silenceSince: number;
  /** Has the patient said anything since the question was asked? */
  hasAnswer: boolean;
  voiceActive: boolean;
  pendingTranscripts: number;
  /** When they last said something like "I don't know / lisod", this question. */
  hardWordsAt: number | null;
  posture: Posture;
  sensitive: boolean;
  /** Already checked in on this question? */
  askedThisQuestion: boolean;
  checkInsSoFar: number;
}

/** The reason to check in now, or null. */
export function decideCheckIn(s: CheckInSituation): CheckInReason | null {
  if (s.askedThisQuestion || s.checkInsSoFar >= MAX_CHECK_INS) return null;
  if (s.voiceActive || s.pendingTranscripts > 0) return null;
  const silentMs = s.now - s.silenceSince;
  const level = s.sensitive ? "sensitive" : "normal";

  if (s.hardWordsAt !== null && s.now - s.hardWordsAt >= AFTER_HARD_WORDS_MS && silentMs >= AFTER_HARD_WORDS_MS) {
    return "said_hard";
  }
  if (!s.hasAnswer && silentMs >= POSTURE_SILENCE_MS[level]) {
    if (s.posture.headDownMs >= HEAD_DOWN_MS) return "head_down";
    if (s.posture.stillMs >= STILL_MS) return "still";
  }
  if (!s.hasAnswer && silentMs >= NO_ANSWER_MS[level]) return "no_answer";
  return null;
}

// Phrases meaning "I can't answer this", in English, Tagalog and Bisaya. Not words like "lisod" or
// "mahirap" alone: "lisod ang kinabuhi" (life is hard) is an answer, not trouble answering.
const HARD_PHRASES = [
  "i don't know",
  "i dont know",
  "i'm not sure",
  "hard to say",
  "hard to answer",
  "i can't answer",
  "i don't want to talk",
  "hindi ko alam",
  "di ko alam",
  "ewan ko",
  "ewan",
  "mahirap sabihin",
  "mahirap sagutin",
  "ayokong pag-usapan",
  "wala ko kabalo",
  "wa ko kabalo",
  "dili ko kabalo",
  "ambot",
  "lisod isulti",
  "lisod tubagon",
  "di ko gusto hisgotan",
];

// Only a short reply on its own counts — "I don't know why he left" is part of an answer.
const MAX_WORDS = 6;

/** Is this phrase a short "I can't answer / I don't know"? */
export function soundsHardToAnswer(text: string): boolean {
  const cleaned = text.toLowerCase().replace(/[’]/g, "'").replace(/[^\p{L}\p{N}' -]/gu, " ").replace(/\s+/g, " ").trim();
  if (!cleaned || cleaned.split(" ").length > MAX_WORDS) return false;
  const t = ` ${cleaned} `;
  return HARD_PHRASES.some((p) => t.includes(` ${p} `));
}

/** What Amumata says when checking in: keep going, a break, or skip — and the feeling words as help. */
export const CHECK_IN_LINE: LocalizedLine = {
  en: "Are you okay to continue? Take your time. If it's hard to put into words, you can tap how you feel below, say “break” to rest, or “next” to skip this one.",
  tl: "Okay ka pa ba na magpatuloy? Dahan-dahan lang. Kung mahirap sabihin, puwede mong piliin ang nararamdaman mo sa ibaba, sabihin ang “pahinga” para magpahinga, o “tapos na” para laktawan ito.",
  ceb: "Okay ka pa ba mopadayon? Hinay-hinay lang. Kung lisod isulti, pwede nimo pilion ang imong gibati sa ubos, isulti ang “pahulay” aron mopahulay, o “sunod” aron laktawan kini.",
};

/** The three choices shown as buttons with the check-in. */
export const CHECK_IN_ACTIONS: Record<"continue" | "break" | "skip", LocalizedLine> = {
  continue: { en: "I'm okay — continue", tl: "Okay lang ako — ituloy", ceb: "Okay ra ko — padayon" },
  break: { en: "Take a break", tl: "Magpahinga muna", ceb: "Mopahulay sa" },
  skip: { en: "Skip this question", tl: "Laktawan ang tanong", ceb: "Laktawan ang pangutana" },
};

/** Said when the patient answers the check-in with "yes / I'm okay". */
export const CHECK_IN_OKAY: LocalizedLine = {
  en: "Okay. Take your time — I'm listening.",
  tl: "Sige. Dahan-dahan lang — nakikinig ako.",
  ceb: "Sige. Hinay-hinay lang — naminaw ko.",
};

/** Said before a question the therapist marked as sensitive. */
export const SENSITIVE_INTRO: LocalizedLine = {
  en: "This next question is more personal. Take your time, and it's okay to skip it.",
  tl: "Mas personal ang susunod na tanong. Dahan-dahan lang, at okay lang na laktawan ito.",
  ceb: "Mas personal ang sunod nga pangutana. Hinay-hinay lang, ug okay ra nga laktawan kini.",
};

/** The sensitive mark of each question (false when not marked), from the interview link's questions. */
export function sensitiveFlagsOf(questions: unknown[]): boolean[] {
  return questions.map((q) => typeof q === "object" && q !== null && (q as { sensitive?: unknown }).sensitive === true);
}

/** Why a check-in happened, for the therapist. */
export const CHECK_IN_REASON_LABELS: Record<CheckInReason, string> = {
  no_answer: "no answer for a while",
  said_hard: "said it was hard to answer",
  head_down: "head down while silent",
  still: "stayed very still while silent",
};

export const CHECK_IN_OUTCOME_LABELS: Record<CheckInOutcome, string> = {
  continued: "chose to continue",
  break: "took a break",
  skipped: "skipped the question",
};
