const NEGATION_PATTERN = /\b(not|don'?t|doesn'?t|isn'?t|aren'?t|wasn'?t|weren'?t|never|no|hardly|barely)\b/i;

const RAPPORT_RESPONSES: Record<string, string> = {
  good: "That's good to hear. We can take this one step at a time.",
  tired: "It sounds like today might have taken a lot out of you. We don't have to rush.",
  nervous: "That's understandable. There's no pressure. We can go at your pace.",
  sad: "I'm sorry to hear that. Thank you for sharing. We can take this slowly.",
  unknown: "That's completely okay. You don't have to figure everything out right now.",
  default: "Thank you for sharing that. We can go at whatever pace feels comfortable.",
};

const KEYWORD_MAP: Record<string, string[]> = {
  good: ["good", "fine", "okay", "great", "well", "alright"],
  tired: ["tired", "exhausted", "drained", "sleepy", "fatigued"],
  nervous: ["nervous", "anxious", "worried", "scared", "uneasy"],
  sad: ["sad", "down", "bad", "lonely", "upset", "depressed"],
  unknown: ["don't know", "not sure", "idk", "maybe", "unsure", "i guess"],
};

/**
 * Match patient's rapport response to an acknowledgment.
 * Checks negations first, then specific keywords, then falls back to default.
 * Does not infer clinical conditions or claim emotion understanding.
 */
export function matchRapportResponse(input: string): string {
  const text = input.toLowerCase().trim();
  if (!text) return RAPPORT_RESPONSES.default;

  // Check uncertainty phrases first — "don't know", "not sure" contain negation words
  // but are semantically uncertainty, not negation of a mood
  for (const keyword of KEYWORD_MAP.unknown) {
    if (keyword.includes(" ")) {
      if (text.includes(keyword)) return RAPPORT_RESPONSES.unknown;
    } else {
      const regex = new RegExp(`\\b${keyword}\\b`, "i");
      if (regex.test(text)) return RAPPORT_RESPONSES.unknown;
    }
  }

  // Check negations — "not good" should not match "good"
  if (NEGATION_PATTERN.test(text)) {
    for (const keywords of KEYWORD_MAP.good) {
      if (text.includes(keywords)) {
        return RAPPORT_RESPONSES.default;
      }
    }
    return RAPPORT_RESPONSES.default;
  }

  // Check keywords in order of specificity
  for (const [category, keywords] of Object.entries(KEYWORD_MAP)) {
    for (const keyword of keywords) {
      // Use word boundary for single-word keywords to avoid substring matches
      if (keyword.length > 4 || keyword.includes(" ")) {
        // Multi-word or long keyword: substring match is safe
        if (text.includes(keyword)) return RAPPORT_RESPONSES[category];
      } else {
        // Short keyword: require word boundary
        const regex = new RegExp(`\\b${keyword}\\b`, "i");
        if (regex.test(text)) return RAPPORT_RESPONSES[category];
      }
    }
  }

  return RAPPORT_RESPONSES.default;
}