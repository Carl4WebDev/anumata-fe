/**
 * "What's new" in Settings: changes to the system, newest first. Add a new
 * entry at the top for each update.
 */

export interface UpdateGroup {
  area: string;
  changes: string[];
}

export interface SystemUpdate {
  date: string; // YYYY-MM-DD
  title: string;
  groups: UpdateGroup[];
  /** One-time steps needed before the update works on the live server. */
  deploySteps?: string[];
}

export const SYSTEM_UPDATES: SystemUpdate[] = [
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
        changes: [
          "The models' real test-set results (accuracy, precision, recall, F1, confusion matrices) are now in Settings → Model Evaluation and in anumata-be/docs/evaluation/.",
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
