import type { LocalizedLine, ResponseLanguage } from "./rapportUtils";

/** What Amumata says to steer a hands-free turn, in each language. */
export type ConversationLine =
  | "confirmDone"
  | "confirmDoneLast"
  | "confirmSilent"
  | "keepGoing"
  | "movingOn"
  | "warmupNudge"
  | "notReady"
  | "readyNudge"
  | "breakStart"
  | "breakEnd"
  | "resumeWelcome";

export const CONVERSATION_LINES: Record<ConversationLine, Record<ResponseLanguage, string>> = {
  confirmDone: {
    en: "Moving on to the next question — keep talking if you're not done.",
    tl: "Lilipat na tayo sa susunod na tanong — magsalita lang kung hindi ka pa tapos.",
    ceb: "Mobalhin na ta sa sunod nga pangutana — padayon lang og sulti kung wala pa ka nahuman.",
  },
  confirmDoneLast: {
    en: "That was the last question — finishing up. Keep talking if you're not done.",
    tl: "Iyon na ang huling tanong — tatapusin na natin. Magsalita lang kung hindi ka pa tapos.",
    ceb: "Mao na kana ang katapusang pangutana — tapuson na nato. Padayon lang og sulti kung wala pa ka nahuman.",
  },
  confirmSilent: {
    en: "Take your time. Would you like to move on to the next question?",
    tl: "Walang pagmamadali. Gusto mo na bang lumipat sa susunod na tanong?",
    ceb: "Ayaw kabalaka, hinay-hinay lang. Gusto na ba nimo mobalhin sa sunod nga pangutana?",
  },
  keepGoing: {
    en: "Okay, take your time.",
    tl: "Sige, dahan-dahan lang.",
    ceb: "Sige, hinay-hinay lang.",
  },
  movingOn: {
    en: "Okay, let's move on.",
    tl: "Sige, lumipat na tayo.",
    ceb: "Sige, mobalhin na ta.",
  },
  warmupNudge: {
    en: "Take your time. You can answer whenever you're ready.",
    tl: "Walang pagmamadali. Sumagot ka lang kapag handa ka na.",
    ceb: "Ayaw kabalaka. Tubag lang kung andam na ka.",
  },
  notReady: {
    en: "Okay. Just say yes when you're ready to begin.",
    tl: "Sige. Sabihin mo lang ang oo kapag handa ka na.",
    ceb: "Sige. Ingna lang ang oo kung andam na ka.",
  },
  readyNudge: {
    en: "Say yes when you're ready to start the interview.",
    tl: "Sabihin ang oo kapag handa ka nang magsimula.",
    ceb: "Ingna ang oo kung andam na ka nga magsugod.",
  },
  breakStart: {
    en: "Of course, take a break. Say “ready” or press the button when you want to continue.",
    tl: "Sige, magpahinga ka muna. Sabihin ang “handa na” o pindutin ang button kapag gusto mo nang magpatuloy.",
    ceb: "Sige, pahulay sa usa. Ingna ang “andam na” o pindota ang button kung gusto na nimo mopadayon.",
  },
  breakEnd: {
    en: "Welcome back. Here's the question again.",
    tl: "Maligayang pagbabalik. Narito ulit ang tanong.",
    ceb: "Maayong pagbalik. Ania na usab ang pangutana.",
  },
  resumeWelcome: {
    en: "Welcome back. Let's continue where we left off.",
    tl: "Maligayang pagbabalik. Ituloy natin kung saan tayo huminto.",
    ceb: "Maayong pagbalik. Padayonon nato kung asa ta mihunong.",
  },
};

/** Shown when the device has no voice for the patient's language, so Amumata speaks English. */
export const VOICE_FALLBACK_NOTE: LocalizedLine = {
  en: "",
  tl: "Ingles ang boses ni Amumata sa device na ito — nasa wika mo ang nakasulat.",
  ceb: "Iningles ang tingog ni Amumata niini nga device — naa sa imong pinulongan ang nakasulat.",
};

/** Short thanks after an answer, rotated so Amumata doesn't repeat herself. */
export const ANSWER_ACKNOWLEDGMENTS: LocalizedLine[] = [
  {
    en: "Thank you for sharing that.",
    tl: "Salamat sa pagbabahagi mo niyan.",
    ceb: "Salamat sa pagpaambit nimo ana.",
  },
  {
    en: "I appreciate you telling me.",
    tl: "Salamat sa pagsasabi mo sa akin.",
    ceb: "Salamat sa pagsulti nimo nako.",
  },
  {
    en: "Thank you. That's helpful to know.",
    tl: "Salamat. Malaking tulong iyan.",
    ceb: "Salamat. Dako kana nga tabang.",
  },
  {
    en: "Thank you for being open with me.",
    tl: "Salamat sa pagiging bukas mo.",
    ceb: "Salamat sa imong pagkabukas.",
  },
];

export const HALFWAY_LINE: LocalizedLine = {
  en: "Thank you. We're halfway there — you're doing well.",
  tl: "Salamat. Kalahati na tayo — ang galing mo.",
  ceb: "Salamat. Katunga na ta — maayo kaayo ang imong gibuhat.",
};

// Shorter interviews don't need a "halfway" moment.
const HALFWAY_MIN_QUESTIONS = 6;

/**
 * What Amumata says between an answer and the next question, or null for
 * nothing (after a silent turn she has already said "let's move on").
 */
export function transitionLine({
  answeredIndex,
  total,
  answered,
  lang,
}: {
  answeredIndex: number;
  total: number;
  answered: boolean;
  lang: ResponseLanguage;
}): string | null {
  if (!answered) return null;
  if (total >= HALFWAY_MIN_QUESTIONS && answeredIndex + 1 === Math.floor(total / 2)) return HALFWAY_LINE[lang];
  return ANSWER_ACKNOWLEDGMENTS[answeredIndex % ANSWER_ACKNOWLEDGMENTS.length][lang];
}

const CLOSING_LINES: Record<ResponseLanguage, { named: string; plain: string }> = {
  en: {
    named: "Thank you so much, {name}. You did really well. I'm saving your answers now.",
    plain: "Thank you so much. You did really well. I'm saving your answers now.",
  },
  tl: {
    named: "Maraming salamat, {name}. Ang galing mo. Sine-save ko na ang mga sagot mo.",
    plain: "Maraming salamat. Ang galing mo. Sine-save ko na ang mga sagot mo.",
  },
  ceb: {
    named: "Daghang salamat, {name}. Maayo kaayo ang imong gibuhat. Gi-save na nako ang imong mga tubag.",
    plain: "Daghang salamat. Maayo kaayo ang imong gibuhat. Gi-save na nako ang imong mga tubag.",
  },
};

/** Amumata's goodbye after the last question. */
export function closingLine(name: string, lang: ResponseLanguage): string {
  const trimmed = name.trim();
  const { named, plain } = CLOSING_LINES[lang];
  return trimmed ? named.replace("{name}", trimmed) : plain;
}

/** Spoken hint shown under the captions, so patients know they can talk to Amumata. */
export const VOICE_TIPS: Record<ResponseLanguage, string> = {
  en: "Pause for 3 seconds when you're done · say “repeat” to hear the question again · “wait” for more time",
  tl: "Huminto ng 3 segundo kapag tapos na · “ulitin” para marinig ulit · “teka” kung kailangan mo pa ng oras",
  ceb: "Hunong og 3 segundos kung human na · “usba” aron madungog pag-usab · “kadali” kung kinahanglan pa nimo og oras",
};
