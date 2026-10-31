import type { ResponseLanguage } from "./rapportUtils";

/** What Amumata says to steer a hands-free turn, in each language. */
export type ConversationLine =
  | "confirmDone"
  | "confirmDoneLast"
  | "confirmSilent"
  | "keepGoing"
  | "movingOn"
  | "warmupNudge"
  | "notReady"
  | "readyNudge";

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
};

/** Spoken hint shown under the captions, so patients know they can talk to Amumata. */
export const VOICE_TIPS: Record<ResponseLanguage, string> = {
  en: "Pause for 3 seconds when you're done · say “repeat” to hear the question again · “wait” for more time",
  tl: "Huminto ng 3 segundo kapag tapos na · “ulitin” para marinig ulit · “teka” kung kailangan mo pa ng oras",
  ceb: "Hunong og 3 segundos kung human na · “usba” aron madungog pag-usab · “kadali” kung kinahanglan pa nimo og oras",
};
