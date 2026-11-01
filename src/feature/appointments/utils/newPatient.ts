/** New-patient fields captured while booking; same rules as the Add Patient form. */
export interface NewPatientDraft {
  f_name: string;
  m_name: string;
  l_name: string;
  age: string;
  gender: string;
  concern: string;
}

export const EMPTY_PATIENT: NewPatientDraft = { f_name: "", m_name: "", l_name: "", age: "", gender: "", concern: "" };

export const MIN_PATIENT_AGE = 10;
export const MAX_PATIENT_AGE = 100;

export function isPatientDraftComplete(p: NewPatientDraft): boolean {
  const age = Number(p.age);
  return Boolean(
    p.f_name.trim() &&
      p.l_name.trim() &&
      p.gender &&
      p.concern &&
      p.age !== "" &&
      Number.isInteger(age) &&
      age >= MIN_PATIENT_AGE &&
      age <= MAX_PATIENT_AGE,
  );
}
