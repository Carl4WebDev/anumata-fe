/**
 * Spoken commands during the interview, in English, Tagalog and Bisaya.
 *
 * Only short utterances count as commands — an answer that happens to contain
 * "next" or "okay" ("okay so next week my mother...") is never mistaken for
 * one: every word must belong to the command's vocabulary, and at least one
 * must be a clear command word.
 */

export type VoiceCommand = "yes" | "no" | "repeat";

const MAX_COMMAND_WORDS = 6;

// Whole-utterance phrases checked first; they beat the word rules below
// (e.g. "wala na" = "nothing more" = done, but "wala pa" = "not yet").
const PHRASES: Record<VoiceCommand, string[]> = {
  yes: [
    "wala na", "wala na po", "wala na ko", "wala nay lain", "yun lang", "yun na", "iyon lang", "iyon na",
    "mao ra", "mao ra to", "mao rato", "mao na", "mao na to", "mao to", "thats all", "thats it", "im done",
    "i am done", "no more", "nothing else", "nothing more", "go ahead", "lets go", "tara na",
  ],
  no: ["not yet", "wala pa", "hindi pa", "dili pa", "wait lang", "one moment", "hold on", "just a moment", "isa pa ka minuto"],
  repeat: [
    "ano ulit", "ano yun", "unsa to", "unsa man to", "what was the question", "come again", "say that again",
    "say again", "one more time", "isa pa",
  ],
};

// Polite / filler words ignored by the word rules.
const FILLERS = new Set(["po", "na", "lang", "ra", "please", "ko", "ako", "man", "ba", "uh", "um", "ah", "eh", "ahh", "hmm", "so", "ta", "kami"]);

interface WordRule {
  strong: string[];
  vocab: string[];
}

const WORDS: Record<VoiceCommand, WordRule> = {
  yes: {
    strong: [
      "yes", "yeah", "yep", "yup", "sure", "okay", "ok", "done", "next", "ready", "finished", "proceed", "continue",
      "oo", "uu", "opo", "oho", "sige", "tapos", "ayos", "game", "human", "sunod", "tama", "handa", "andam",
    ],
    vocab: ["i", "im", "am", "all", "it", "thats", "that", "go", "ahead", "now", "question", "we", "can", "na", "ani", "nako"],
  },
  no: {
    strong: ["no", "nope", "not", "wait", "hold", "hindi", "teka", "sandali", "dili", "kadali", "hulat", "hulata", "wala"],
    vocab: ["yet", "on", "pa", "a", "moment", "minute", "second", "one", "more", "time", "i", "im", "need", "still", "talking", "done"],
  },
  repeat: {
    strong: ["repeat", "again", "ulit", "ulitin", "pakiulit", "usba", "balika", "pardon"],
    vocab: ["say", "the", "question", "that", "please", "can", "you", "what", "sorry", "isa", "pa", "ang", "tanong", "pangutana"],
  },
};

/** Lowercase, drop punctuation, collapse spaces ("I'm done." → "im done"). */
export function normalizeUtterance(text: string): string {
  return text
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/-/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function matchesWords(tokens: string[], rule: WordRule): boolean {
  if (tokens.length === 0) return false;
  const allowed = new Set([...rule.strong, ...rule.vocab]);
  return tokens.every((t) => allowed.has(t)) && tokens.some((t) => rule.strong.includes(t));
}

// Words that clearly mean "I've finished answering". Casual yeses ("oo",
// "okay", "sige") are real answers to many questions, so while the patient is
// answering only these move on; casual yeses count only after a check-in.
const DONE_WORDS = new Set(["done", "next", "finished", "finish", "tapos", "human", "sunod", "proceed"]);
const DONE_PHRASES = new Set([
  "wala na", "wala na po", "wala na ko", "wala nay lain", "yun lang", "yun na", "iyon lang", "iyon na",
  "mao ra", "mao ra to", "mao rato", "mao na", "mao na to", "thats all", "thats it", "im done", "i am done",
  "no more", "nothing else", "nothing more",
]);

/** A short utterance that explicitly ends the answer ("I'm done", "next", "tapos na"). */
export function isExplicitDone(text: string): boolean {
  if (parseVoiceCommand(text) !== "yes") return false;
  const normalized = normalizeUtterance(text);
  const tokens = normalized.split(" ");
  const trimmed = [...tokens];
  while (trimmed.length > 1 && FILLERS.has(trimmed[trimmed.length - 1])) trimmed.pop();
  return DONE_PHRASES.has(normalized) || DONE_PHRASES.has(trimmed.join(" ")) || tokens.some((t) => DONE_WORDS.has(t));
}

/** The command in a short utterance, or null when it's ordinary speech. */
export function parseVoiceCommand(text: string): VoiceCommand | null {
  const normalized = normalizeUtterance(text);
  if (!normalized) return null;
  const tokens = normalized.split(" ");
  if (tokens.length > MAX_COMMAND_WORDS) return null;

  // Whole phrases first (also with trailing politeness like "po").
  const withoutTrailingFillers = [...tokens];
  while (withoutTrailingFillers.length > 1 && FILLERS.has(withoutTrailingFillers[withoutTrailingFillers.length - 1])) {
    withoutTrailingFillers.pop();
  }
  for (const candidate of [normalized, withoutTrailingFillers.join(" ")]) {
    for (const command of ["no", "repeat", "yes"] as VoiceCommand[]) {
      if (PHRASES[command].includes(candidate)) return command;
    }
  }

  const words = tokens.filter((t) => !FILLERS.has(t));
  // "No" first: "not yet done" / "hindi pa tapos" means keep going.
  for (const command of ["no", "repeat", "yes"] as VoiceCommand[]) {
    if (matchesWords(words, WORDS[command])) return command;
  }
  return null;
}
