/**
 * Generates human-readable explanations from fusion results.
 * This is purely algorithmic — no LLM calls.
 */

interface ModelInfo {
  emotion: string | null | undefined;
  available: boolean;
}

export function generateExplanation(
  fusionEmotion: string,
  fer: ModelInfo,
  ser: ModelInfo,
  ler: ModelInfo,
): string {
  const available = [fer, ser, ler].filter((m) => m.available);
  const names = ["facial expression", "voice tone", "language"];
  const availableNames = names.filter((_, i) => [fer, ser, ler][i].available);
  const unavailableNames = names.filter((_, i) => ![fer, ser, ler][i].available);

  // All unavailable
  if (available.length === 0) {
    return "No AI model data is available for this question. The fusion result is based on default values.";
  }

  const agreeing = available.filter(
    (m) => m.emotion?.toLowerCase() === fusionEmotion.toLowerCase(),
  );
  const disagreeing = available.filter(
    (m) => m.emotion?.toLowerCase() !== fusionEmotion.toLowerCase(),
  );

  const parts: string[] = [];

  // Unavailable modalities
  if (unavailableNames.length > 0) {
    parts.push(
      `${unavailableNames.join(" and ")} data ${unavailableNames.length === 1 ? "is" : "are"} unavailable — analysis is based on ${availableNames.join(" and ")}.`,
    );
  }

  // Agreement description
  if (agreeing.length === available.length && available.length >= 2) {
    parts.push(
      `All available modalities (${availableNames.join(", ")}) consistently indicate ${fusionEmotion.toLowerCase()}.`,
    );
  } else if (agreeing.length >= 2) {
    const agreeNames = agreeing.map((m) => names[[fer, ser, ler].indexOf(m)]);
    const disNames = disagreeing.map((m) => names[[fer, ser, ler].indexOf(m)]);
    parts.push(
      `${agreeNames.join(" and ")} indicate ${fusionEmotion.toLowerCase()}, while ${disNames.join(" and ")} ${disNames.length === 1 ? "suggests" : "suggest"} a different emotion. The dominant indication is ${fusionEmotion.toLowerCase()}.`,
    );
  } else if (agreeing.length === 1 && available.length >= 2) {
    parts.push(
      `The modalities disagree. Only ${names[[fer, ser, ler].indexOf(agreeing[0])]} supports ${fusionEmotion.toLowerCase()}. Therapist review is recommended.`,
    );
  } else if (available.length === 1) {
    parts.push(
      `The fusion result is based on a single modality (${availableNames[0]}). Interpret with caution.`,
    );
  }

  return parts.join(" ") || `The fusion engine determined ${fusionEmotion.toLowerCase()} as the dominant emotion.`;
}
