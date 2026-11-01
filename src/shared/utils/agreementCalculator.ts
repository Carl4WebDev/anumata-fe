/**
 * Agreement scoring for multimodal fusion results.
 *
 * Agreement = how many AVAILABLE modalities agree with the final fusion emotion.
 * Coverage = how many of the 3 total modalities contributed evidence.
 *
 * These are separate concepts:
 *   - Agreement: do the available models agree?
 *   - Coverage: how much of the system participated?
 *
 * ============================================================
 * KNOWN ISSUE: This module works correctly, but the fusion confidence
 * displayed alongside agreement is WRONG due to a bug in
 * SessionsProvider.tsx (emotionPct uses max of individual confidences
 * instead of actual fusion confidence).
 *
 * Fix SessionsProvider.tsx first, then this module's output will
 * be displayed with the correct confidence value.
 *
 * Also: when a modality is unavailable (e.g., LER when STT fails),
 * the agreement calculation correctly handles it. But the UI should
 * prominently show "X/3 modalities available" — check AgreementBar.tsx.
 * ============================================================
 */

export interface AgreementResult {
  score: number;        // 0, 33, 66, or 100
  agreeing: string[];   // model names that agree
  disagreeing: string[];// model names that disagree
  unavailable: string[];// model names with no data
  label: string;        // human-readable label
  color: string;        // Tailwind color class
  barColor: string;     // Tailwind bg color for progress bar
  availableCount: number; // how many modalities had data (0-3)
  totalCount: number;     // always 3
}

export function calculateAgreement(
  ferEmotion: string | null | undefined,
  serEmotion: string | null | undefined,
  lerEmotion: string | null | undefined,
  fusionEmotion: string,
): AgreementResult {
  const models: { name: string; emotion: string | null | undefined }[] = [
    { name: "FER", emotion: ferEmotion },
    { name: "SER", emotion: serEmotion },
    { name: "LER", emotion: lerEmotion },
  ];

  const available = models.filter((m) => m.emotion && m.emotion !== "Unknown" && m.emotion !== "NoFace");
  const agreeing = available.filter((m) => m.emotion?.toLowerCase() === fusionEmotion.toLowerCase());
  const disagreeing = available.filter((m) => m.emotion?.toLowerCase() !== fusionEmotion.toLowerCase());
  const unavailable = models.filter((m) => !m.emotion || m.emotion === "Unknown" || m.emotion === "NoFace");

  let score: number;
  let label: string;
  let color: string;
  let barColor: string;

  if (available.length === 0) {
    score = 0;
    label = "No Data";
    color = "text-slate-500";
    barColor = "bg-slate-300";
  } else if (available.length === 1) {
    score = 100;
    label = "Limited Evidence";
    color = "text-amber-700";
    barColor = "bg-amber-400";
  } else if (agreeing.length === available.length) {
    score = 100;
    label = available.length < 3 ? "Agreement" : "Full Agreement";
    color = available.length < 3 ? "text-emerald-700" : "text-emerald-700";
    barColor = "bg-emerald-500";
  } else if (agreeing.length > disagreeing.length) {
    score = 66;
    label = "Strong Agreement";
    color = "text-emerald-600";
    barColor = "bg-emerald-400";
  } else {
    score = 33;
    label = "Mixed Evidence";
    color = "text-amber-600";
    barColor = "bg-amber-400";
  }

  return {
    score,
    agreeing: agreeing.map((m) => m.name),
    disagreeing: disagreeing.map((m) => m.name),
    unavailable: unavailable.map((m) => m.name),
    label,
    color,
    barColor,
    availableCount: available.length,
    totalCount: 3,
  };
}
