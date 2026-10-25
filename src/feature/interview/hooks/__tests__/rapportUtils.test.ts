import { describe, it, expect } from "vitest";
import {
  detectRapportCategory,
  pickAcknowledgment,
  detectResponseLanguage,
  fillName,
  languageLabel,
  RAPPORT_QUESTIONS,
  INTRO_LINES,
  PERMISSION_LINES,
  type RapportCategory,
  type ResponseLanguage,
} from "../rapportUtils";

describe("detectRapportCategory", () => {
  describe("positive responses", () => {
    it("matches 'good' keyword", () => {
      expect(detectRapportCategory("I'm good")).toBe("good");
    });

    it("matches 'fine' keyword", () => {
      expect(detectRapportCategory("I'm fine")).toBe("good");
    });

    it("matches 'okay' keyword", () => {
      expect(detectRapportCategory("I'm okay")).toBe("good");
    });

    it("matches 'great' keyword", () => {
      expect(detectRapportCategory("I'm great")).toBe("good");
    });

    it("matches 'well' keyword", () => {
      expect(detectRapportCategory("I'm doing well")).toBe("good");
    });

    it("matches Bisaya 'maayo'", () => {
      expect(detectRapportCategory("maayo man ko")).toBe("good");
    });
  });

  describe("tired responses", () => {
    it("matches 'tired' keyword", () => {
      expect(detectRapportCategory("I'm tired")).toBe("tired");
    });

    it("matches 'exhausted' keyword", () => {
      expect(detectRapportCategory("I feel exhausted")).toBe("tired");
    });

    it("matches 'drained' keyword", () => {
      expect(detectRapportCategory("I'm drained")).toBe("tired");
    });

    it("matches Bisaya 'kapoy'", () => {
      expect(detectRapportCategory("kapoy lang gamay")).toBe("tired");
    });
  });

  describe("nervous responses", () => {
    it("matches 'nervous' keyword", () => {
      expect(detectRapportCategory("I'm nervous")).toBe("nervous");
    });

    it("matches 'anxious' keyword", () => {
      expect(detectRapportCategory("I feel anxious")).toBe("nervous");
    });

    it("matches 'worried' keyword", () => {
      expect(detectRapportCategory("I'm worried")).toBe("nervous");
    });

    it("matches Tagalog 'kaba'", () => {
      expect(detectRapportCategory("kaba ako ngayon")).toBe("nervous");
    });
  });

  describe("sad responses", () => {
    it("matches 'sad' keyword", () => {
      expect(detectRapportCategory("I'm sad")).toBe("sad");
    });

    it("matches 'down' keyword", () => {
      expect(detectRapportCategory("I'm feeling down")).toBe("sad");
    });

    it("matches 'lonely' keyword", () => {
      expect(detectRapportCategory("I feel lonely")).toBe("sad");
    });

    it("matches Tagalog 'malungkot'", () => {
      expect(detectRapportCategory("malungkot ako ngayon")).toBe("sad");
    });
  });

  describe("uncertainty responses", () => {
    it("matches 'don't know' phrase", () => {
      expect(detectRapportCategory("I don't know")).toBe("unknown");
    });

    it("matches 'not sure' phrase", () => {
      expect(detectRapportCategory("I'm not sure")).toBe("unknown");
    });

    it("matches Bisaya 'ambot'", () => {
      expect(detectRapportCategory("ambot lang")).toBe("unknown");
    });
  });

  describe("negation handling", () => {
    it("does not match 'good' when negated", () => {
      expect(detectRapportCategory("I'm not good")).not.toBe("good");
    });

    it("does not match 'fine' when negated", () => {
      expect(detectRapportCategory("I'm not fine")).not.toBe("good");
    });

    it("does not match 'tired' when negated", () => {
      expect(detectRapportCategory("I'm not tired")).not.toBe("tired");
    });

    it("handles 'don't feel good'", () => {
      expect(detectRapportCategory("I don't feel good")).not.toBe("good");
    });

    it("handles 'never good'", () => {
      expect(detectRapportCategory("I'm never good")).not.toBe("good");
    });
  });

  describe("neutral fallback", () => {
    it("handles empty input", () => {
      expect(detectRapportCategory("")).toBe("neutral");
    });

    it("handles whitespace-only input", () => {
      expect(detectRapportCategory("   ")).toBe("neutral");
    });

    it("returns neutral for ambiguous input", () => {
      expect(detectRapportCategory("The weather is nice today")).toBe("neutral");
    });

    it("returns neutral for unknown topics", () => {
      expect(detectRapportCategory("I went to the store yesterday")).toBe("neutral");
    });
  });
});

describe("pickAcknowledgment", () => {
  const categories: RapportCategory[] = ["good", "tired", "nervous", "sad", "unknown", "neutral"];
  const languages: ResponseLanguage[] = ["en", "tl", "ceb"];

  it("rotates variants — second pick differs from the first", () => {
    for (const category of categories) {
      for (const lang of languages) {
        const first = pickAcknowledgment(category, lang, 0);
        const second = pickAcknowledgment(category, lang, 1);
        expect(second).not.toBe(first);
      }
    }
  });

  it("cycles back to the first variant", () => {
    expect(pickAcknowledgment("good", "en", 2)).toBe(pickAcknowledgment("good", "en", 0));
  });

  it("English first variants keep the tested phrasings", () => {
    expect(pickAcknowledgment("good", "en", 0)).toContain("good to hear");
    expect(pickAcknowledgment("tired", "en", 0)).toContain("taken a lot out of you");
    expect(pickAcknowledgment("nervous", "en", 0)).toContain("no pressure");
    expect(pickAcknowledgment("sad", "en", 0)).toContain("sorry to hear");
    expect(pickAcknowledgment("unknown", "en", 0)).toContain("completely okay");
    expect(pickAcknowledgment("neutral", "en", 0)).toContain("Thank you for sharing");
  });

  it("answers Tagalog and Bisaya speakers in their language", () => {
    for (const category of categories) {
      for (const rotation of [0, 1]) {
        expect(pickAcknowledgment(category, "tl", rotation)).toMatch(/Salamat|Ayos|Mabuti|Naiintindihan|Nakakalungkot|Mukhang|Iyan/);
        expect(pickAcknowledgment(category, "ceb", rotation)).toMatch(/Salamat|Ayos|Maayo|Sabtan|Nasubo|Murag|Normal|Okay/);
      }
    }
  });

  describe("no clinical inference in any variant", () => {
    it("never claims clinical understanding", () => {
      for (const category of categories) {
        for (const lang of languages) {
          for (const rotation of [0, 1]) {
            const ack = pickAcknowledgment(category, lang, rotation);
            expect(ack).not.toMatch(/diagnos/i);
            expect(ack).not.toMatch(/disorder/i);
            expect(ack.toLowerCase()).not.toContain("condition");
            expect(ack).not.toContain("understand how you feel");
            expect(ack).not.toContain("I know exactly");
          }
        }
      }
    });
  });
});

describe("detectResponseLanguage", () => {
  it("detects English", () => {
    expect(detectResponseLanguage("I'm fine, thank you")).toBe("en");
  });

  it("detects Tagalog", () => {
    expect(detectResponseLanguage("hindi ko alam, pagod ako ngayon")).toBe("tl");
  });

  it("detects Bisaya", () => {
    expect(detectResponseLanguage("ambot lang, kapoy man ko")).toBe("ceb");
  });

  it("resolves mixed Bisaya + English to Bisaya", () => {
    expect(detectResponseLanguage("maayo man ko, I'm fine today")).toBe("ceb");
  });

  it("resolves mixed Tagalog + English to Tagalog", () => {
    expect(detectResponseLanguage("kumusta, I'm okay today")).toBe("tl");
  });

  it("uses the Whisper code when text has no markers", () => {
    expect(detectResponseLanguage("mm hmm", "ceb")).toBe("ceb");
    expect(detectResponseLanguage("mm hmm", "tl")).toBe("tl");
    expect(detectResponseLanguage("mm hmm", "en")).toBe("en");
  });

  it("text markers override a stale Whisper code", () => {
    expect(detectResponseLanguage("maayo man ko", "en")).toBe("ceb");
    expect(detectResponseLanguage("pagod ako", "en")).toBe("tl");
  });
});

describe("question and prompt wording", () => {
  it("offers all three languages for every rapport question", () => {
    for (const q of RAPPORT_QUESTIONS) {
      expect(q.en).toBeTruthy();
      expect(q.tl).toBeTruthy();
      expect(q.ceb).toBeTruthy();
    }
  });

  it("keeps the welcome phase short — two questions only", () => {
    expect(RAPPORT_QUESTIONS).toHaveLength(2);
  });

  it("short intro and permission lines exist per language", () => {
    for (const lang of ["en", "tl", "ceb"] as const) {
      expect(INTRO_LINES[lang]).toContain("{name}");
      expect(PERMISSION_LINES[lang]).toBeTruthy();
    }
  });

  it("fills the name placeholder", () => {
    expect(fillName("Hi {name}, welcome", "ANA")).toBe("Hi ANA, welcome");
    expect(fillName("Hi {name}, welcome", "")).toBe("Hi there, welcome");
  });

  it("labels language codes for display", () => {
    expect(languageLabel("tl")).toBe("Tagalog");
    expect(languageLabel("ceb")).toBe("Bisaya");
    expect(languageLabel("en")).toBe("English");
    expect(languageLabel("ja")).toBe("ja");
  });
});
