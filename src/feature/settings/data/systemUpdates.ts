/**
 * "What's new": changes to the system, newest first. Add a new entry at the top
 * for each update. Therapists (Settings) see only the groups that affect their
 * work; the admin page shows everything, including the server steps.
 */

export interface UpdateGroup {
  area: string;
  changes: string[];
  /** "admin": technical or admin-only — shown on the admin page, hidden from therapists. */
  audience?: "admin";
}

export interface SystemUpdate {
  date: string; // YYYY-MM-DD
  title: string;
  groups: UpdateGroup[];
  /** One-time steps needed before the update works on the live server (admin page only). */
  deploySteps?: string[];
}

export const SYSTEM_UPDATES: SystemUpdate[] = [
  {
    date: "2026-11-14",
    title: "Crisis alerts ask you to watch live",
    groups: [
      {
        area: "Notifications",
        changes: [
          "When a patient says words that may mean thoughts of self-harm, a popup appears on your screen right away: “Do you want to watch the interview live now?” — with Watch live now, Open the patient's page, or Later.",
          "The urgent notification in the bell also has a Watch live button. A desktop alert (if allowed) opens the live view too.",
          "Notifications now arrive within about 10 seconds (was 20).",
        ],
      },
      {
        area: "Interview room (patient side)",
        changes: [
          "More ways of saying it are recognized in English, Tagalog and Bisaya — e.g. “gusto na nako patayon akong sarili”, “ayaw na nako mabuhi”, “mas mabuti pang mamatay na lang ako”, “I want to unalive myself”.",
          "Everyday phrases are still not flagged (e.g. “patayin mo ang ilaw”, “dili na mabuhi ang tanom”).",
        ],
      },
      {
        area: "Crisis detection (technical)",
        audience: "admin",
        changes: [
          "Detection runs in the patient's browser: the phrase list plus word patterns (verb forms of patay / samad / hikog / pakamatay with sarili / kaugalingon, gusto … mamatay, ayaw na … mabuhi, etc.). No AI call, so it's instant.",
          "Still one urgent alert per interview. The popup isn't shown if the therapist is already watching that interview live.",
        ],
      },
    ],
    deploySteps: ["Deploy the backend (new alert wording) and the frontend. No SQL needed."],
  },
  {
    date: "2026-11-14",
    title: "Better Tagalog and Bisaya questions",
    groups: [
      {
        area: "Question sets",
        changes: [
          "New “Translations” button on each question set: see the Tagalog and Bisaya version of every question and follow-up, edit them, and mark them as reviewed.",
          "All standardized questions come with a draft Tagalog and Bisaya translation, marked “Draft — please review”. Your reviewed version is the one your patients hear.",
          "Questions without a saved translation are still translated by the AI during the interview. That translation is saved, so it appears in Translations for you to review, and the next patient gets it instantly.",
        ],
      },
      {
        area: "Interview room (patient side)",
        changes: [
          "Translated questions appear instantly when a saved translation exists — no waiting for the AI.",
          "If the patient switches language mid-interview (e.g. from English to Bisaya), Amumata follows after two answers in a row in the new language. Very short answers (under 3 words) don't count.",
        ],
      },
      {
        area: "Translations (technical)",
        audience: "admin",
        changes: [
          "New table question_translations, keyed by the English text, so it works for standardized, custom and AI-built questions and follow-ups.",
          "Which translation is used: reviewed before draft before AI (machine); the therapist's own before the shared one.",
          "The patient's room can only ask for translations of its own interview's questions (rate limited), so the AI translator can't be used for other text.",
          "The 306 drafts (153 questions × 2 languages) were prepared by AI and still need a native speaker's review.",
        ],
      },
    ],
    deploySteps: [
      "Run migrations/manual/add_question_translations.sql on the Render database.",
      "Then run migrations/manual/add_standardized_question_translations.sql (the draft translations).",
      "Then deploy the backend and frontend.",
    ],
  },
  {
    date: "2026-11-14",
    title: "Watch your patient's interview live",
    groups: [
      {
        area: "Interview links",
        changes: [
          "When a patient opens their interview, you get a notification “… started the interview” — one click opens the live view.",
          "Interview links with the patient in the room show a red “Watch live” button.",
          "The live view shows the patient's camera and microphone (unmute with one click), the current question, live captions, and check-ins, breaks and crisis alerts as they happen.",
          "The patient can't see or hear you, and live viewing isn't recorded. The AI analysis still runs after the interview.",
          "The live video is kept light (about 360p, 20 frames per second) so it stays smooth on phones and slow connections; on a weak connection the picture gets softer instead of freezing.",
          "If a phrase couldn't be turned into a caption (speech-to-text was busy), the live view says so — listen with sound on for those parts.",
        ],
      },
      {
        area: "Live viewing (technical)",
        audience: "admin",
        changes: [
          "WebRTC: video goes directly between the patient's and the therapist's browsers. The backend only introduces them (WebSocket at /ws/live) and relays progress.",
          "Only the therapist who owns the interview link can watch; finished or expired links can't go live; other websites are refused.",
          "The live copy is capped at about 360p, 20 fps and 600 kbps with “maintain framerate”; the recording for the AI keeps full quality.",
          "Caption gaps: the room reports how many phrases of the current question failed to transcribe; the live view shows the count. Failures come from speech-to-text load (e.g. Whisper on a busy laptop), not from live viewing.",
          "Testing on one laptop (both windows, backend and AI service) is slower than real use; test with the patient on a phone and the deployed AI on Modal.",
        ],
      },
    ],
    deploySteps: [
      "Deploy the backend (it now includes the ws package) and the frontend. No SQL needed.",
      "Optional, for patients on strict mobile or Wi-Fi networks: set TURN_URLS, TURN_USERNAME and TURN_CREDENTIAL on Render (e.g. a free Metered or Cloudflare TURN account).",
    ],
  },
  {
    date: "2026-11-14",
    title: "A more accurate face-emotion model",
    groups: [
      {
        area: "Session review",
        changes: [
          "Face readings (FER) come from a new model: 77% accurate on its test set, up from 61%, and trained with Filipino (Davao) faces as well.",
          "It is still weakest at telling sad from neutral faces, so read those together with the voice result.",
        ],
      },
      {
        area: "Face model (FER)",
        audience: "admin",
        changes: [
          "Retrained on a cleaned dataset: FER2013 + RAF-DB + CK+ with 155 Davao photos; duplicates, blank images, conflicting labels and test-image copies removed; all faces grayscale.",
          "Test set 7,640 images: accuracy 77.15%, macro F1 0.746 (previous model: 61.15% on the old test set, 54.27% on this one). Davao photos alone: 65.22% (23 photos).",
          "The AI service now makes the face crop grayscale before classifying, as in training.",
          "Previous model kept as src/ai/models/fer_best_model_old_61pct.pth; its evaluation files are in docs/evaluation/fer/previous_61pct/.",
        ],
      },
      {
        area: "Administrator",
        audience: "admin",
        changes: [
          "New Defense Q&A tab: likely thesis-panel questions in 10 categories, with the system's real numbers — searchable, filterable by category and by “numbers to remember”.",
          "What's New on the System tab can now be searched and filtered (therapists see, admin only, needs server steps).",
        ],
      },
    ],
    deploySteps: [
      "Upload the new model to Modal: modal volume put anumata-models src/ai/models/fer_best_model.pth /fer_best_model.pth --force",
      "Redeploy the AI service (grayscale change): modal deploy src/ai/modal_app.py",
      "Deploy the frontend (updated Model Evaluation numbers).",
    ],
  },
  {
    date: "2026-11-13",
    title: "PRC license verification",
    groups: [
      {
        area: "Accounts",
        changes: [
          "Registering asks for your profession (Psychologist, Psychometrician, Guidance Counselor, Psychiatrist or Social Worker), your PRC license number and the name on your PRC ID.",
          "Your license is checked against the PRC verification service by the Amumata administrator. You can keep using Amumata while it's being checked.",
          "Until it's verified, a banner and one notification a day remind you. If the details didn't match, the reminder says why.",
          "Settings has a new “PRC License” card showing the status. Changing your details sends them for checking again.",
        ],
      },
      {
        area: "Administrator",
        audience: "admin",
        changes: [
          "A new admin page lists therapist accounts with their license details and verification status. It shows account details and counts only — never patient information.",
          "The admin can mark a license verified or not matched (with a reason), and deactivate or reactivate an account. Every action is logged.",
          "An Overview tab shows the system's status (database, AI service and each model) and how Amumata is used: interviews sent and completed, AI analyses ready or failed, average time to results, and interviews per week — counts only.",
          "A System tab holds everything about the system: every update with its server steps, System Info, Model Evaluation, Interview Room Features and the AI Model & Project Guide. Therapists' Settings now keeps only what affects their work, and their What's New lists only changes to their work.",
        ],
      },
    ],
    deploySteps: [
      "Run migrations/manual/add_admin_and_license_verification.sql on the Render database.",
      "Register the admin account, then run: UPDATE users SET role = 'ADMIN' WHERE email = '…';",
      "Then deploy the backend and frontend.",
    ],
  },
  {
    date: "2026-11-03",
    title: "Gentle check-ins when a patient struggles, and patient contacts",
    groups: [
      {
        area: "Appointments and patients",
        changes: [
          "Patients can have a mobile number and an email for appointment reminders (optional): in Book appointment → New patient, Add Patient, and Edit on the patient's page.",
          "When booking for an existing patient, the form shows their saved contacts — or that none is saved yet.",
          "A new patient's concern can be “Other (type your own)…”, with a box to specify it.",
          "Booking messages now say when: “Patient added and appointment booked for Nov 3, 1:00 PM.”",
        ],
      },
      {
        area: "Interview room (patient side)",
        changes: [
          "If a patient seems to struggle with a question, Amumata gently asks “Okay ka pa ba mopadayon?” and offers three choices: continue, take a break, or skip. The feeling words light up as a way to answer.",
          "A check-in happens when the patient: gives no answer for a while; says a short “I don't know / ambot / ewan ko”; or keeps the head down (yuko) or stares without moving (tulala) while silent. Camera cues never count on their own.",
          "At most once per question and 3 times per interview; never while the crisis help card is showing.",
          "Head-down and stillness are measured on the patient's own device from the face position — nothing extra is uploaded.",
        ],
      },
      {
        area: "Question sets",
        changes: [
          "A question can be marked “Sensitive question” (Add, Edit, AI builder). Amumata says a gentle line before it and checks in sooner if the patient struggles.",
        ],
      },
      {
        area: "Session review",
        changes: [
          "Each question shows when a check-in was offered, why (e.g. “head down while silent”), and what the patient chose.",
          "Questions the patient skipped are marked “Skipped by patient” and left out of the session's emotion mix, risk level and spikes.",
        ],
      },
    ],
    deploySteps: [
      "Run migrations/manual/add_patient_contacts_and_reminders.sql on the Render database.",
      "Then deploy the backend and frontend.",
    ],
  },
  {
    date: "2026-11-02",
    title: "Appointments, a calmer interview room, and model evaluation",
    groups: [
      {
        area: "Appointments",
        changes: [
          "Each appointment card shows the patient's pre-session interview (status, risk level, crisis flag) with a link to it.",
          "Changing working hours or blocking a period warns you first if booked appointments would be affected.",
          "Recurring sessions: book weekly or every 2 weeks (2–12 sessions); dates that aren't free are listed so you can book the rest. Cancel one session or all following.",
          "Session types with their own length (e.g. Consultation 30 min), plus an optional break after each session.",
          "Undo Completed / No-show / Cancelled within 15 minutes.",
          "A patient with appointments or interviews can't be deleted — archive them instead, so their history is kept.",
        ],
      },
      {
        area: "Interview room (patient side)",
        changes: [
          "Amumata appears as a calm, animated presence; the patient's own video is small and can be hidden (recording continues).",
          "Optional follow-up per question, written by the therapist, asked once after a short answer.",
          "Mood check before and after the interview: “How are you feeling right now?” with five faces.",
          "Feeling words to tap during each question (sad, worried, scared, angry, tired, lonely, okay, hopeful).",
          "“More time to think” option: waits 7 s instead of 3 s before moving on.",
          "Reassurance before starting: no right or wrong answers, only the therapist sees them, skip or rest anytime.",
          "A calm “Recording for your therapist” label instead of the red light and timer.",
          "A warmer goodbye that names the next appointment, and help lines (NCMH 1553, Hopeline, In Touch, Tawag Paglaum) on the results page.",
          "The AI starts waking up when the patient opens their link and is kept awake during the interview, so the analysis starts right away.",
        ],
      },
      {
        area: "Session review",
        changes: [
          "Face and Words cards now show “Measured in this answer”, like the Voice card (photos checked, expression changes, likelihood vs the patient's usual).",
          "Session overview shows the patient's own mood before and after.",
          "Each question shows the feeling words the patient tapped and the follow-up that was asked.",
        ],
      },
      {
        area: "Question sets",
        changes: ["Follow-ups can be added when creating a set (Add, AI builder) and when editing it."],
      },
      {
        area: "Model evaluation",
        audience: "admin",
        changes: [
          "The models' real test-set results (accuracy, precision, recall, F1, confusion matrices) are now in Admin → System → Model Evaluation and in anumata-be/docs/evaluation/.",
          "The AI guide's “missing evidence” entries were updated with the documented training data and settings.",
          "New backend command npm run eval:self-report compares the AI with patients' own report.",
        ],
      },
    ],
    deploySteps: [
      "Run migrations/manual/add_appointment_series.sql on the Render database.",
      "Run migrations/manual/add_session_types_and_break.sql on the Render database.",
      "Then deploy the backend and frontend.",
    ],
  },
];

export type UpdatesAudience = "therapist" | "admin";

/** Admin filter: everything, what therapists also see, admin-only changes, or updates with server steps. */
export type UpdatesFilter = "all" | "therapist" | "admin" | "steps";

/**
 * Narrow the updates by a search (every word must appear in a change, its area
 * or the update title) and a filter. Updates left without changes are dropped.
 */
export function filterUpdates(updates: SystemUpdate[], { search = "", filter = "all" }: { search?: string; filter?: UpdatesFilter }): SystemUpdate[] {
  const words = search.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const hit = (...texts: string[]) => {
    const haystack = texts.join(" ").toLowerCase();
    return words.every((w) => haystack.includes(w));
  };
  return updates
    .filter((u) => filter !== "steps" || (u.deploySteps?.length ?? 0) > 0)
    .map((u) => ({
      ...u,
      groups: u.groups
        .filter((g) => (filter === "admin" ? g.audience === "admin" : filter === "therapist" ? g.audience !== "admin" : true))
        .map((g) => ({ ...g, changes: g.changes.filter((c) => hit(c, g.area, u.title, ...(u.deploySteps ?? []))) }))
        .filter((g) => g.changes.length > 0),
    }))
    .filter((u) => u.groups.length > 0);
}

/**
 * The updates a reader should see. Therapists: only groups that affect their work,
 * no server steps, and no entries left empty. Admin: everything.
 */
export function updatesFor(audience: UpdatesAudience, updates: SystemUpdate[] = SYSTEM_UPDATES): SystemUpdate[] {
  if (audience === "admin") return updates;
  return updates
    .map((u) => ({ ...u, groups: u.groups.filter((g) => g.audience !== "admin"), deploySteps: undefined }))
    .filter((u) => u.groups.length > 0);
}
