/**
 * Ready-made lines the therapist can send when stepping in, in the patient's
 * language. Tapping one puts it in the message box to edit or send.
 */

export type TalkLanguage = "en" | "tl" | "ceb";

export interface QuickLine {
  label: string;
  text: Record<TalkLanguage, string>;
}

export const QUICK_LINES: QuickLine[] = [
  {
    label: "I'm here",
    text: {
      en: "I'm here with you. Take your time.",
      tl: "Nandito ako para sa iyo. Dahan-dahan lang.",
      ceb: "Ania ko para nimo. Hinay-hinay lang.",
    },
  },
  {
    label: "Are you safe?",
    text: {
      en: "Are you safe right now?",
      tl: "Ligtas ka ba ngayon?",
      ceb: "Luwas ba ka karon?",
    },
  },
  {
    label: "I'll call you",
    text: {
      en: "I'll call you now. Please keep your phone near you.",
      tl: "Tatawagan kita ngayon. Pakilapit ang iyong telepono.",
      ceb: "Tawgan tika karon. Palihug duola ang imong telepono.",
    },
  },
  {
    label: "Short break",
    text: {
      en: "Let's take a short break. Breathe slowly with me.",
      tl: "Magpahinga muna tayo sandali. Huminga tayo nang dahan-dahan.",
      ceb: "Mopahulay sa ta kadiyot. Ginhawa ta og hinay.",
    },
  },
  {
    label: "Continue when ready",
    text: {
      en: "Thank you for sharing. We can continue when you're ready.",
      tl: "Salamat sa pagbabahagi. Puwede nating ituloy kapag handa ka na.",
      ceb: "Salamat sa pagpaambit. Mapadayon nato kung andam na ka.",
    },
  },
];

export const LANGUAGE_NAME: Record<TalkLanguage, string> = { en: "English", tl: "Tagalog", ceb: "Bisaya" };
