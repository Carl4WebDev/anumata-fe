import type { LiveTalkItem } from "../../../shared/api/liveApi";
import type { LocalizedLine } from "./rapportUtils";

/**
 * The therapist steps in during a live interview: they can pause the questions
 * and send messages, which Amumata shows and reads aloud. What the patient says
 * or types meanwhile goes to the therapist as a reply — it is not part of any
 * answer, and the recording for the analysis is paused.
 */

export const TALK_TEXT: Record<
  "title" | "paused" | "replyHint" | "placeholder" | "send" | "notSent" | "you" | "pausedSpoken" | "resumeSpoken" | "steppedAway",
  LocalizedLine
> = {
  title: { en: "Your therapist", tl: "Ang iyong therapist", ceb: "Ang imong therapist" },
  paused: {
    en: "The questions are paused — your therapist is talking with you.",
    tl: "Nakahinto muna ang mga tanong — kinakausap ka ng iyong therapist.",
    ceb: "Gihunong sa ang mga pangutana — nakig-istorya nimo ang imong therapist.",
  },
  replyHint: {
    en: "Answer out loud, or type here.",
    tl: "Sumagot nang malakas, o mag-type dito.",
    ceb: "Tubaga og kusog, o i-type dinhi.",
  },
  placeholder: { en: "Type a reply…", tl: "Mag-type ng sagot…", ceb: "I-type ang imong tubag…" },
  send: { en: "Send", tl: "Ipadala", ceb: "Ipadala" },
  notSent: {
    en: "Not connected — your reply wasn't sent. Please try again.",
    tl: "Walang koneksyon — hindi naipadala ang sagot mo. Subukan ulit.",
    ceb: "Walay koneksyon — wala naipadala ang imong tubag. Sulayi pag-usab.",
  },
  you: { en: "You", tl: "Ikaw", ceb: "Ikaw" },
  pausedSpoken: {
    en: "Your therapist would like to talk with you. Let's pause the questions for now.",
    tl: "Gusto kang kausapin ng iyong therapist. Ihihinto muna natin ang mga tanong.",
    ceb: "Gusto kang istoryahon sa imong therapist. Hunongon sa nato ang mga pangutana.",
  },
  resumeSpoken: {
    en: "Thank you. Let's go back to where we were.",
    tl: "Salamat. Balikan natin kung saan tayo huminto.",
    ceb: "Salamat. Balikan nato kung asa ta mihunong.",
  },
  steppedAway: {
    en: "Your therapist has stepped away. Let's continue.",
    tl: "Umalis muna ang iyong therapist. Ituloy natin.",
    ceb: "Mibiya sa ang imong therapist. Padayonon nato.",
  },
};

/** Therapist messages, i.e. what the patient should see and hear. */
export const isTherapistMessage = (t: LiveTalkItem): boolean => t.sender === "therapist" && t.kind === "message" && Boolean(t.body);

/** Therapist messages not yet handled (e.g. not yet read aloud), oldest first. */
export function newTherapistMessages(talk: readonly LiveTalkItem[], handled: ReadonlySet<string>): LiveTalkItem[] {
  return talk.filter((t) => isTherapistMessage(t) && !t.seenAt && !handled.has(t.ref));
}

/** The latest pause / resume was the server resuming because the therapist left. */
export function resumedBecauseTherapistLeft(talk: readonly LiveTalkItem[]): boolean {
  const last = [...talk].reverse().find((t) => t.kind === "pause" || t.kind === "resume");
  return Boolean(last?.kind === "resume" && last.auto);
}
