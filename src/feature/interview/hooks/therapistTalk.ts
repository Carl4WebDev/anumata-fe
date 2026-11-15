import type { LiveTalkItem } from "../../../shared/api/liveApi";
import type { LocalizedLine } from "./rapportUtils";

/**
 * The therapist steps in during a live interview: they can pause the questions
 * and send messages, which Amumata shows and reads aloud. What the patient says
 * or types meanwhile goes to the therapist as a reply — it is not part of any
 * answer, and the recording for the analysis is paused.
 */

export const TALK_TEXT: Record<
  | "title"
  | "paused"
  | "replyHint"
  | "placeholder"
  | "send"
  | "notSent"
  | "you"
  | "pausedSpoken"
  | "resumeSpoken"
  | "steppedAway"
  | "ready"
  | "readySent"
  | "readyResumed"
  | "stop"
  | "stopConfirm",
  LocalizedLine
> = {
  ready: { en: "I'm ready to continue", tl: "Handa na akong ituloy", ceb: "Andam na ko mopadayon" },
  readySent: {
    en: "Your therapist has been told you're ready. We'll continue in a moment.",
    tl: "Naabisuhan na ang iyong therapist na handa ka na. Itutuloy natin sandali.",
    ceb: "Gipahibalo na ang imong therapist nga andam ka na. Mopadayon ta kadiyot.",
  },
  readyResumed: {
    en: "Let's continue. Your therapist can still see and message you.",
    tl: "Ituloy na natin. Nakikita ka pa rin ng iyong therapist at puwede ka niyang padalhan ng mensahe.",
    ceb: "Padayon na ta. Makita ka gihapon sa imong therapist ug mahimo ka niyang padad-an og mensahe.",
  },
  stop: { en: "Stop for today", tl: "Huminto na muna ngayon", ceb: "Mohunong na sa karon" },
  stopConfirm: {
    en: "Tap again to stop — your answers so far are saved",
    tl: "Pindutin ulit para huminto — naka-save ang mga sagot mo",
    ceb: "Pindota pag-usab aron mohunong — na-save ang imong mga tubag",
  },
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

/**
 * Why the questions resumed (the latest resume): the therapist resumed, the
 * therapist closed the live view, or the patient was ready and no one responded.
 */
export function resumeReason(talk: readonly LiveTalkItem[]): "therapist" | "left" | "ready" {
  const last = [...talk].reverse().find((t) => t.kind === "pause" || t.kind === "resume");
  if (last?.kind !== "resume" || !last.auto) return "therapist";
  return last.sender === "patient" ? "ready" : "left";
}

/** What Amumata says when the questions resume, for each reason. */
export const RESUME_LINE = { therapist: TALK_TEXT.resumeSpoken, left: TALK_TEXT.steppedAway, ready: TALK_TEXT.readyResumed } as const;
