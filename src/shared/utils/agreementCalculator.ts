/**
 * Agreement scoring for multimodal fusion results.
 *
 * Agreement = how many modalities agree with the final fusion emotion.
 *   3/3 agree = 100%
 *   2/3 agree = 66.67%
 *   1/3 agree = 33.33%
 *   0/3 (all different) = 33.33% (same as 1/3 — all disagree)
 */

export interface AgreementResult {
  score: number;        // 0, 33, 66, or 100
  agreeing: string[];   // model names that agree
  disagreeing: string[];// model names that disagree
  unavailable: string[];// model names with no data
  label: string;        // human-readable label
  color: string;        // Tailwind color class
  barColor: string;     // Tailwind bg color for progress bar
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
  } else if (agreeing.length === available.length) {
    score = 100;
    label = "Full Agreement";
    color = "text-green-700";
    barColor = "bg-green-500";
  } else if (agreeing.length >= 2 || (available.length === 2 && agreeing.length === 1)) {
    score = 66;
    label = "Majority Agreement";
    color = "text-amber-700";
    barColor = "bg-amber-500";
  } else {
    score = 33;
    label = "Low Agreement";
    color = "text-red-700";
    barColor = "bg-red-500";
  }

  return {
    score,
    agreeing: agreeing.map((m) => m.name),
    disagreeing: disagreeing.map((m) => m.name),
    unavailable: unavailable.map((m) => m.name),
    label,
    color,
    barColor,
  };
}
