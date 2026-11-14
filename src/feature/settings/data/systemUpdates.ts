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
