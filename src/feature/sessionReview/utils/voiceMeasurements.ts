import type { AudioDetails } from "../../../shared/types/session";

/** True when the details hold real measurements of the answer's recording (not older/empty data). */
export function hasVoiceMeasurements(details: unknown): details is AudioDetails {
  const d = details as Partial<AudioDetails> | null;
  return !!d && typeof d.loudness_db === "number" && typeof d.pause_count === "number";
}

/** "205 Hz, -24 dBFS, 140 words/min" — the patient's usual voice, or null if unknown. */
export function describeBaseline(baseline: AudioDetails["baseline"]): string | null {
  if (!baseline) return null;
  const parts = [
    baseline.pitch_mean_hz != null ? `${baseline.pitch_mean_hz} Hz` : null,
    baseline.loudness_db != null ? `${baseline.loudness_db} dBFS` : null,
    baseline.words_per_minute != null ? `${baseline.words_per_minute} words/min` : null,
  ].filter(Boolean);
  return parts.length ? parts.join(", ") : null;
}
