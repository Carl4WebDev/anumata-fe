import { describe, test, expect } from "vitest";
import { detectCrisis, CRISIS_HOTLINES, CRISIS_TEXT } from "../crisisDetection";

describe("detectCrisis", () => {
  test.each([
    // English
    "Sometimes I want to kill myself.",
    "I don't want to live anymore",
    "I've thought about suicide",
    "Everyone would be better off if I was dead, I'm better off dead",
    "I keep hurting myself when it gets bad",
    "I just want to end it all",
    // Tagalog / Taglish
    "Gusto ko nang mamatay",
    "Minsan naiisip kong magpakamatay",
    "Ayoko nang mabuhay",
    "Sana mamatay na lang ako",
    "Sinasaktan ko ang sarili ko kapag galit ako",
    // Bisaya
    "Gusto na ko mamatay",
    "Naghunahuna ko nga maghikog",
    "Ayaw na ko mabuhi",
    "Gusto nakong samaran akong kaugalingon, samaran nako akong kaugalingon",
    // Variations caught by word patterns
    "Gusto na nako patayon akong sarili",
    "Usahay gusto nako patyon na lang akong kaugalingon",
    "Naa koy plano nga mohikog",
    "Ayaw na nako mabuhi",
    "Dili na ko gusto mabuhi",
    "Mas maayo pa nga mamatay na lang ko",
    "Tapuson na nako akong kinabuhi",
    "Papatayin ko na lang ang sarili ko",
    "Nagpakamatay na sana ako noon",
    "Gustong-gusto ko nang mamatay",
    "Mas mabuti pang mamatay na lang ako",
    "Ayoko na talagang mabuhay",
    "Sometimes I want to unalive myself",
  ])("flags: '%s'", (text) => {
    expect(detectCrisis(text)).toBe(true);
  });

  test.each([
    "I'm dying to see my family again",
    "Patay na patay ako sa kanya",
    "Namatay ang lola ko noong isang taon",
    "Muntik na akong mamatay sa tawa",
    "I killed it at work today",
    "My life is busy but okay",
    "Namatay akong selpon",
    "Dili na mabuhi ang akong tanom",
    "Gipatay nako ang suga sa kwarto",
    "Patayin mo ang ilaw",
    "Ganahan ko mobalik sa eskwelahan",
    "Gusto ko lang matulog nang maaga",
    "",
  ])("does not flag everyday speech: '%s'", (text) => {
    expect(detectCrisis(text)).toBe(false);
  });

  test("catches a phrase split across captions once joined", () => {
    expect(detectCrisis("gusto ko nang")).toBe(false);
    expect(detectCrisis(["gusto ko nang", "mamatay"].join(" "))).toBe(true);
  });
});

describe("crisis card content", () => {
  test("every line exists in all three languages", () => {
    for (const line of Object.values(CRISIS_TEXT)) {
      expect(line.en && line.tl && line.ceb).toBeTruthy();
    }
  });

  test("lists the national crisis hotline (NCMH 1553) with tap-to-call numbers", () => {
    expect(CRISIS_HOTLINES[0].numbers[0]).toEqual({ label: "1553", tel: "1553" });
    for (const line of CRISIS_HOTLINES) {
      for (const n of line.numbers) expect(n.tel).toMatch(/^\+?\d+$/);
    }
  });
});
