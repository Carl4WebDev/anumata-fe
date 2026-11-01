// Deterministic rapport helpers: language detection, question wording, and
// acknowledgment picking. No LLM — keyword/state based so the welcome phase
// works even when the AI service is down.

export type ResponseLanguage = "en" | "tl" | "ceb";
export type RapportCategory = "good" | "tired" | "nervous" | "sad" | "unknown" | "neutral";

const NEGATION_PATTERN = /\b(not|don'?t|doesn'?t|isn'?t|aren'?t|wasn'?t|weren'?t|never|no|hardly|barely|dili|wala|hindi)\b/i;

// English + Filipino + Bisaya keywords
const KEYWORD_MAP: Record<Exclude<RapportCategory, "neutral">, string[]> = {
  good: ["good", "fine", "okay", "great", "well", "alright", "maayo", "maayo man", "okay ra", "sige", "mabuti", "ayos"],
  tired: ["tired", "exhausted", "drained", "sleepy", "fatigued", "kapoy", "gikapoy", "puyat", "pagod", "hapoy"],
  nervous: ["nervous", "anxious", "worried", "scared", "uneasy", "kulba", "gikulba", "nerbiyos", "kabalaka", "takot", "kaba", "nabalaka"],
  sad: ["sad", "down", "bad", "lonely", "upset", "depressed", "masulob-on", "malungkot", "lungot", "masulob", "gikalain", "gikasubo"],
  unknown: ["don't know", "not sure", "idk", "maybe", "unsure", "i guess", "ambot", "dili ko kabalo", "hindi ko alam", "di ko sure", "ewan"],
};

// Language evidence markers. Checked with padded substring matching.
const CEB_MARKERS = [
  "maayo", "ambot", "dili", "gika", "gikulba", "masulob", "lungot", "kapoy",
  "kuan", "diay", "bitaw", "hala", "sa imong", "sa ako", "wala man", "lang ta", "mao ra",
];
const TL_MARKERS = [
  "hindi", "mabuti", "malungkot", "pagod", "puyat", "ewan", "kumusta", "salamat",
  "opo", "bakit", "kasi", "naman", "talaga", "medyo", "gusto", "ko po", "ako po", "ngayon", "lang tayo",
];
const EN_MARKERS = [
  " i ", " you ", " my ", " the ", " is ", " am ", " are ", " today", " think",
  " feel", " know", " want", " because", " don", " just", " really", " going",
];

// TTS/BCP-47 locale per response language ("ceb" has no browser voice — the
// Filipino voice is the closest available).
export const TTS_LOCALE: Record<ResponseLanguage, string> = {
  en: "en-US",
  tl: "fil-PH",
  ceb: "fil-PH",
};

export function languageLabel(code: string): string {
  const base = code.toLowerCase();
  if (base.startsWith("ceb")) return "Bisaya";
  if (base === "tl" || base.startsWith("fil")) return "Tagalog";
  if (base.startsWith("en")) return "English";
  return code;
}

/**
 * Pick the patient's base language. Mixed Tagalog/Bisaya + English resolves to
 * the local language (its acknowledgment reads naturally to a mixed speaker).
 * Whisper's detected code breaks ties; text markers override stale codes.
 */
export function detectResponseLanguage(input: string, whisperLang?: string): ResponseLanguage {
  const text = ` ${input.toLowerCase()} `;
  const code = (whisperLang || "").toLowerCase();

  const hasCeb = CEB_MARKERS.some((m) => text.includes(m));
  const hasTl = TL_MARKERS.some((m) => text.includes(m));
  const hasEn = EN_MARKERS.some((m) => text.includes(m));

  if (code.startsWith("ceb") || (hasCeb && !hasTl)) return "ceb";
  if (code === "tl" || code.startsWith("fil") || hasTl) return "tl";
  if (code.startsWith("en") || hasEn) return "en";
  return "en";
}

/**
 * Match a rapport response to a category.
 * Checks uncertainty phrases first, then negations, then keywords.
 * Does not infer clinical conditions or claim emotion understanding.
 */
export function detectRapportCategory(input: string): RapportCategory {
  const text = input.toLowerCase().trim();
  if (!text) return "neutral";

  // Uncertainty phrases first — "don't know", "not sure" contain negation words
  // but are semantically uncertainty, not negation of a mood.
  for (const keyword of KEYWORD_MAP.unknown) {
    if (keyword.includes(" ")) {
      if (text.includes(keyword)) return "unknown";
    } else {
      const regex = new RegExp(`\\b${keyword}\\b`, "i");
      if (regex.test(text)) return "unknown";
    }
  }

  // Negations — "not good" is not "good".
  if (NEGATION_PATTERN.test(text)) {
    return "neutral";
  }

  for (const [category, keywords] of Object.entries(KEYWORD_MAP)) {
    for (const keyword of keywords) {
      if (keyword.length > 4 || keyword.includes(" ")) {
        if (text.includes(keyword)) return category as RapportCategory;
      } else {
        const regex = new RegExp(`\\b${keyword}\\b`, "i");
        if (regex.test(text)) return category as RapportCategory;
      }
    }
  }

  return "neutral";
}

type AckPools = Record<ResponseLanguage, [string, string]>;

const ACK_POOLS: Record<RapportCategory, AckPools> = {
  good: {
    en: [
      "That's good to hear. We can take this one step at a time.",
      "Glad to hear that. We'll go at whatever pace feels comfortable.",
    ],
    tl: [
      "Mabuti naman. Dahan-dahan lang tayo.",
      "Iyan ay magandang marinig. Sa sarili mong bilis lang tayo.",
    ],
    ceb: [
      "Maayo na nga nadungog. Hinay-hinay lang ta.",
      "Maayo man diay. Sa imong paspas lang ta.",
    ],
  },
  tired: {
    en: [
      "It sounds like today might have taken a lot out of you. We don't have to rush.",
      "Thank you for telling me. There's no need to rush here.",
    ],
    tl: [
      "Mukhang pagod ka ngayon. Hindi tayo magmamadali.",
      "Salamat sa pagsabi. Walang pagmamadali dito.",
    ],
    ceb: [
      "Murag kapoy ka karon. Dili ta magdali.",
      "Salamat sa pagsulti. Walay pagdali dinhi.",
    ],
  },
  nervous: {
    en: [
      "That's understandable. There's no pressure. We can go at your pace.",
      "It's okay to feel that way. Take all the time you need.",
    ],
    tl: [
      "Naiintindihan ko. Walang pressure. Sa sarili mong bilis lang.",
      "Ayos lang na makaramdam niyan. Maglaan ka ng oras.",
    ],
    ceb: [
      "Sabtan ko. Walay pressure. Sa imong paspas lang.",
      "Normal ra na nga bation. Ayaw og kabalaka.",
    ],
  },
  sad: {
    en: [
      "I'm sorry to hear that. Thank you for sharing. We can take this slowly.",
      "Thank you for opening up about that. We'll take it slowly.",
    ],
    tl: [
      "Nakakalungkot na marinig iyon. Salamat sa pagbabahagi. Dahan-dahan lang tayo.",
      "Salamat sa pagbukas ng loob. Unti-unti lang tayo.",
    ],
    ceb: [
      "Nasubo ko sa nadungog. Salamat sa pagpakigbahin. Hinay-hinay lang ta.",
      "Salamat sa pag-abli sa imong gibati. Hinay-hinay lang ta.",
    ],
  },
  unknown: {
    en: [
      "That's completely okay. You don't have to figure everything out right now.",
      "That's fine. There are no wrong answers here.",
    ],
    tl: [
      "Ayos lang iyon. Hindi mo kailangang malaman ang lahat ngayon.",
      "Ayos lang. Walang maling sagot dito.",
    ],
    ceb: [
      "Ayos ra na. Dili nimo kinahanglan mahibal-an ang tanan karon.",
      "Okay ra. Walay sayop nga tubag dinhi.",
    ],
  },
  neutral: {
    en: [
      "Thank you for sharing that. We can go at whatever pace feels comfortable.",
      "Thank you. We'll take it at your pace.",
    ],
    tl: [
      "Salamat sa pagbabahagi. Sa sarili mong bilis lang tayo.",
      "Salamat dito. Dahan-dahan lang tayo.",
    ],
    ceb: [
      "Salamat sa pagpakigbahin. Sa imong paspas lang ta.",
      "Salamat niini. Hinay-hinay lang ta.",
    ],
  },
};

/**
 * Deterministic acknowledgment picker. `rotation` is how many acknowledgments
 * were already given this session — variants cycle so the welcome phase never
 * repeats the same line back-to-back.
 */
export function pickAcknowledgment(
  category: RapportCategory,
  lang: ResponseLanguage,
  rotation: number
): string {
  const pool = ACK_POOLS[category][lang];
  return pool[Math.abs(rotation) % pool.length];
}

export interface LocalizedLine {
  en: string;
  tl: string;
  ceb: string;
}

export const INTRO_LINES: Record<ResponseLanguage, string> = {
  en: "Hi {name}, I'm Amumata. Just two quick questions before we begin.",
  tl: "Kumusta {name}, ako si Amumata. Dalawang maikling tanong lang bago tayo magsimula.",
  ceb: "Kumusta {name}, ako si Amumata. Duha ka mubo nga pangutana lang sa dili pa ta magsugod.",
};

export const RAPPORT_QUESTIONS: LocalizedLine[] = [
  {
    en: "How are you doing today?",
    tl: "Kumusta ka ngayon?",
    ceb: "Kumusta man ka karon?",
  },
  {
    en: "Is there anything on your mind before we begin?",
    tl: "Mayroon ka bang nasa isip bago tayo magsimula?",
    ceb: "Aduna ba kay nahunahunaan sa dili pa ta magsugod?",
  },
];

export const PERMISSION_LINES: Record<ResponseLanguage, string> = {
  en: "Thank you. Ready to start the interview?",
  tl: "Salamat. Handa ka nang magsimula?",
  ceb: "Salamat. Andam ka nang magsugod?",
};

/** Fill the {name} placeholder in intro lines. */
export function fillName(line: string, name: string): string {
  return line.replace("{name}", name || "there");
}
