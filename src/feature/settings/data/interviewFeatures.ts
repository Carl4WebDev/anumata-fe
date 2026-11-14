/**
 * What the patient's interview room does, for the therapist to refer to in
 * Settings. Describes the current behaviour (What's New lists the changes).
 * Keep in sync with src/feature/interview/ when the room changes.
 */

export interface InterviewFeature {
  name: string;
  what: string;
  /** Who controls it, or when it happens. */
  how?: string;
}

export interface FeatureGroup {
  stage: string;
  features: InterviewFeature[];
}

export const INTERVIEW_FEATURES: FeatureGroup[] = [
  {
    stage: "Before the interview",
    features: [
      {
        name: "Consent page",
        what: "Explains what is recorded, how many questions there are, and where the voice goes for live captions. The patient must agree before starting.",
      },
      {
        name: "AI wake-up",
        what: "Opening the link starts waking the AI; it is kept awake during the interview so the analysis starts as soon as the patient finishes.",
        how: "Automatic, invisible to the patient.",
      },
      {
        name: "Camera and microphone check",
        what: "The start screen asks the patient to say hello to test the microphone; during the interview, hints appear if the face isn't visible, too far or too dark.",
      },
      {
        name: "Comfort options",
        what: "Larger text, slower voice, and “More time to think” (waits 7 s instead of 3 s of silence before moving on).",
        how: "The patient switches them on the start screen or in the top bar; remembered on their device.",
      },
      {
        name: "Resume after a refresh",
        what: "If the page reloads or the tab crashes, the patient can continue from the interrupted question; earlier answers are kept.",
      },
    ],
  },
  {
    stage: "Starting",
    features: [
      {
        name: "Warm-up",
        what: "Amumata greets the patient by name and asks two light questions (“How are you doing today?”), with a short reply to each. Not part of the analysis.",
      },
      {
        name: "Language",
        what: "English, Tagalog or Bisaya — detected from the first answers. Questions are spoken and shown in that language, with the original underneath. Saved (therapist-reviewed) translations appear instantly; others are translated by the AI. If the patient switches language for two answers in a row, Amumata follows.",
      },
      {
        name: "Reassurance",
        what: "Before starting: no right or wrong answers, only the therapist sees the answers, say as much or as little as they like, skip or rest any time.",
      },
      {
        name: "Mood check (before)",
        what: "“How are you feeling right now?” with five faces (very bad … very good), or Skip. Not recorded as an answer.",
      },
    ],
  },
  {
    stage: "During each question",
    features: [
      {
        name: "Spoken questions and live captions",
        what: "Amumata reads each question aloud; the patient's words appear as they speak.",
      },
      {
        name: "Hands-free",
        what: "After an answer and a pause, Amumata says it's moving on with a short countdown; talking again continues the answer. No answer at all → it asks before moving on.",
        how: "On by default; the patient can turn it off and use buttons instead.",
      },
      {
        name: "Voice commands",
        what: "“Repeat / ulitin / usba” to hear the question again, “wait / teka / kadali” for more time, “break / pahinga / pahulay” for a break, “next / tapos na / sunod” to finish the answer.",
      },
      {
        name: "Follow-up questions",
        what: "If the therapist wrote a follow-up for a question, Amumata asks it once when the answer is short (under 40 words). The reply is part of the same answer.",
        how: "Set by the therapist in Question Sets.",
      },
      {
        name: "Sensitive questions",
        what: "Before a question marked sensitive, Amumata says it is more personal and okay to skip; it also checks in sooner if the patient struggles.",
        how: "Set by the therapist in Question Sets (“Sensitive question”).",
      },
      {
        name: "Feeling words",
        what: "“Hard to put into words? Tap how you feel”: sad, worried, scared, angry, tired, lonely, okay, hopeful (up to 3 per question). Saved as the patient's own report.",
      },
      {
        name: "Gentle check-ins",
        what: "If the patient seems to struggle, Amumata asks “Okay ka pa ba mopadayon?” and offers continue, a break, or skip, highlighting the feeling words. Triggered by: no answer for 13 s (10 s if sensitive); a short “I don't know / ambot / ewan ko”; or head down (yuko) or a blank stare (tulala) while silent. Camera cues never count on their own.",
        how: "Automatic; at most once per question and 3 per interview; never after the crisis card appears.",
      },
      {
        name: "Breaks",
        what: "Recording, timer and hands-free pause until the patient says “ready” or presses the button; the question is asked again.",
      },
      {
        name: "Skipping",
        what: "Moving on without answering marks the question as skipped; it is left out of the session's emotion mix, risk level and spikes.",
      },
    ],
  },
  {
    stage: "Presence and privacy",
    features: [
      {
        name: "Amumata's presence",
        what: "A calm, breathing light that ripples while speaking and responds to the patient's voice — so they talk to someone, not to their own reflection.",
      },
      {
        name: "Small self-view",
        what: "The patient's own video is small in the corner and can be hidden. Recording continues either way.",
      },
      {
        name: "Calm recording label",
        what: "“Recording for your therapist” (or “Paused” on a break) instead of a red light and running clock.",
      },
      {
        name: "On-device face checks",
        what: "Face position, head-down and stillness are measured on the patient's own device; only the recordings and photos for the analysis are uploaded.",
      },
      {
        name: "Live viewing by the therapist",
        what: "The therapist can watch the interview as it happens: the patient's camera and microphone, the current question, live captions, and check-ins, breaks and crisis alerts. The therapist is invisible and silent, and live viewing isn't recorded.",
        how: "One click on “Watch live” (Interview Links) or on the “… started the interview” notification. The live video is a lighter copy (about 360p, 20 frames per second) so it stays smooth on phones and slow connections; the recording for the analysis keeps full quality.",
      },
    ],
  },
  {
    stage: "Safety",
    features: [
      {
        name: "Crisis words",
        what: "Words that may mean self-harm (in English, Tagalog or Bisaya) show a calm help card with tap-to-call hotlines, and send the therapist one urgent alert. Within about 10 seconds a popup asks the therapist “Do you want to watch the interview live now?” — one click opens the live view. The interview carries on.",
      },
      {
        name: "Help lines at the end",
        what: "The results page always lists NCMH 1553, Hopeline, In Touch, Tawag Paglaum – Centro Bisaya, and 911 for emergencies.",
      },
    ],
  },
  {
    stage: "Ending",
    features: [
      {
        name: "Mood check (after)",
        what: "“And now that we're done — how are you feeling?” with the same five faces.",
      },
      {
        name: "Warm goodbye",
        what: "Thanks the patient (“Sharing how you feel takes courage”) and says when they'll see the therapist next, if an appointment is booked.",
      },
      {
        name: "Results page",
        what: "A general emotional summary, “What happens next” with the next appointment date, and the help lines.",
      },
    ],
  },
  {
    stage: "What you see afterwards (Session Review)",
    features: [
      {
        name: "Per question",
        what: "Transcript, the face / voice / words readings with “Measured in this answer” details, feeling words tapped, follow-up asked, check-ins offered (why, and what the patient chose), and skipped questions.",
      },
      {
        name: "Per session",
        what: "Overall emotion, risk level and spikes (skipped questions left out), the patient's own mood before and after, and the AI report.",
      },
    ],
  },
];
