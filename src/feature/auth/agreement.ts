/**
 * User agreement shown at registration: Terms of Use, Privacy Notice (Data
 * Privacy Act of 2012, RA 10173) and Responsible Use Agreement.
 *
 * TERMS_VERSION must match the backend (src/modules/users/application/
 * termsVersion.js). Bump both whenever this text changes, so new accounts
 * accept the current wording.
 */
export const TERMS_VERSION = "2026-11-01";

export interface AgreementSection {
  title: string;
  points: string[];
}

export const AGREEMENT_SECTIONS: AgreementSection[] = [
  {
    title: "1. Terms of Use",
    points: [
      "Amumata is for licensed or supervised mental-health practitioners (psychologists, counselors, therapists) and staff they authorize.",
      "Keep your login credentials private. You are responsible for all activity under your account; tell the administrator immediately if you suspect unauthorized access.",
      "Use Amumata only for its intended purpose: supporting the emotional pre-evaluation of your own patients.",
      "Do not attempt to access other users' data, disrupt the service, or reverse-engineer the AI models.",
    ],
  },
  {
    title: "2. Privacy Notice (Data Privacy Act of 2012, RA 10173)",
    points: [
      "Data collected: your account details; patient information you enter; and, during interviews, the patient's video frames, voice recordings, transcripts, and the AI analysis results.",
      "Purpose: to run the interview, produce the emotional analysis, and let you review it. Data is not sold or used for advertising.",
      "Access: patient records and interview results are visible only to the account that owns them.",
      "Security: passwords are stored encrypted (hashed), access requires login, and data is kept on the system's protected database.",
      "Live captions: unless your administrator turns this off, the patient's web browser sends their voice to Google (Chrome) or Microsoft (Edge) to show their words on screen during the interview. The recordings and the emotion analysis stay on Amumata's own server. Patients are told this on the consent page.",
      "Your rights as a data subject — to be informed, to access, correct, or erase your data, and to object to processing — can be exercised through the system administrator.",
      "Records are kept while your account is active or as required for the patient's care, then deleted on request.",
    ],
  },
  {
    title: "3. Responsible Use Agreement",
    points: [
      "Amumata provides decision support only. Its emotion results are NOT a clinical diagnosis and must always be reviewed and interpreted by a qualified professional.",
      "Before an interview, obtain the patient's informed consent to be recorded and analysed, and explain how the results will be used.",
      "Keep all patient information confidential, consistent with your professional code of ethics and the Data Privacy Act.",
      "Amumata is not an emergency service. If a patient may be at risk of harm, follow your crisis protocol immediately (Philippines: NCMH Crisis Hotline 1553; Hopeline 0917-558-4673).",
      "Report any incorrect, biased, or harmful AI output to the administrator so it can be reviewed.",
    ],
  },
];
