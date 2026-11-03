import { useMemo } from "react";
import type { MappedSession } from "../../../shared/types/session";
import type { AgreementResult } from "../../../shared/utils/agreementCalculator";
import { calculateAgreement } from "../../../shared/utils/agreementCalculator";
import { generateExplanation } from "../../../shared/utils/fusionExplanation";
import {
  countWords,
  percentOf,
  usualPercent,
  type FaceMeasures,
  type WordMeasures,
} from "../utils/faceAndWordMeasurements";

export interface ModelEvidence {
  model: "FER" | "SER" | "LER";
  available: boolean;
  emotion: string | null;
  confidence: number;
  probabilities: Record<string, number> | null;
  details: Record<string, unknown> | null;
  languageDetected?: string | null;
  /** "Measured in this answer" numbers for the face (FER) and word (LER) cards. */
  faceMeasures?: FaceMeasures;
  wordMeasures?: WordMeasures;
}

export interface QuestionData {
  index: number;
  question: string;
  answer: string;
  fusionEmotion: string;
  fusionConfidence: number;
  agreement: AgreementResult;
  explanation: string;
  fer: ModelEvidence;
  ser: ModelEvidence;
  ler: ModelEvidence;
  isSpike: boolean;
  /** The therapist's follow-up, when it was asked after a short answer. */
  followUpAsked: string | null;
  /** Feeling words the patient tapped during this question. */
  feelingsTapped: string[];
  languageDetected: string | null;
  frameImage: string | null;
  evidenceFrames: {
    frame_image: string;
    fer_emotion: string | null;
    fer_confidence: number;
  }[] | null;
}

export interface SessionOverviewData {
  overallEmotion: string;
  overallConfidence: number;
  overallAgreement: number;
  riskLevel: string;
  riskReasons: string[];
  highestSpikeIndex: number | null;
  modelsUsed: { fer: boolean; ser: boolean; ler: boolean };
  /** The faces the patient tapped before / after the interview (1–5), if asked. */
  selfReport: { mood_before: number | null; mood_after: number | null } | null;
  reportStatus: "available" | "generating" | "unavailable" | "failed";
  questionCount: number;
  completedAnalyses: number;
  patientName: string;
  templateName: string;
  date: string;
  duration: string;
}

function buildModelEvidence(
  model: "FER" | "SER" | "LER",
  confidence: number,
  emotion: string | null | undefined,
  probabilities: Record<string, number> | null | undefined,
  details: object | null | undefined,
  languageDetected?: string | null,
): ModelEvidence {
  const available = confidence > 0;
  return {
    model,
    available,
    emotion: available ? (emotion ?? null) : null,
    confidence: available ? confidence : 0,
    probabilities: available ? (probabilities ?? null) : null,
    details: available ? ((details ?? null) as Record<string, unknown> | null) : null,
    ...(model === "LER" ? { languageDetected: languageDetected ?? null } : {}),
  };
}

/**
 * Memoized data derivation from MappedSession.
 * Computes per-question fusion data, overall agreement, and dominant emotion.
 */
export function useSessionComputed(session: MappedSession | null | undefined) {
  return useMemo(() => {
    if (!session) return null;

    const responses = session.responses || [];
    const spikes = session.spikes || [];
    // Every answer's readings, so one answer can be compared with the patient's usual this session.
    const allFer = responses.map((r) => (r.fer_confidence > 0 ? r.fer_probabilities : null));
    const allLer = responses.map((r) => (r.ler_confidence > 0 ? r.ler_probabilities : null));

    // Per-question data
    const perQuestion: QuestionData[] = responses.map((r, i) => {
      const spike = spikes.find((s) => s.questionIndex === i);
      const isSpike = !!spike;

      const ferEmotion = r.fer_confidence > 0 ? (r.fer_emotion ?? r.emotion ?? null) : null;
      const serEmotion = r.ser_confidence > 0 ? (r.ser_emotion ?? r.emotion ?? null) : null;
      const lerEmotion = r.ler_emotion ?? null;

      const fer = buildModelEvidence("FER", r.fer_confidence, ferEmotion, r.fer_probabilities, r.facial_details);
      const ser = buildModelEvidence("SER", r.ser_confidence, serEmotion, r.ser_probabilities, r.audio_details);
      const ler = buildModelEvidence("LER", r.ler_confidence, lerEmotion, r.ler_probabilities, null, r.language_detected);
      if (fer.available && fer.emotion) {
        fer.faceMeasures = {
          frames: r.face_frames ?? null,
          percent: percentOf(r.fer_probabilities, fer.emotion),
          usualPercent: usualPercent(allFer, fer.emotion),
        };
      }
      if (ler.available && ler.emotion) {
        ler.wordMeasures = {
          wordCount: countWords(r.answer),
          percent: percentOf(r.ler_probabilities, ler.emotion),
          usualPercent: usualPercent(allLer, ler.emotion),
        };
      }

      const fusionEmotion = (r.emotion || "neutral").charAt(0).toUpperCase() + (r.emotion || "neutral").slice(1);
      const fusionConfidence = (r.emotionPct || 0) / 100;

      // LER excluded from agreement/explanation — experimental, not part of fusion
      const agreement = calculateAgreement(
        fer.emotion,
        ser.emotion,
        null,
        fusionEmotion,
      );

      const explanation = generateExplanation(fusionEmotion, fer, ser, null);

      return {
        index: i,
        question: r.question,
        answer: r.answer,
        fusionEmotion,
        fusionConfidence,
        agreement,
        explanation,
        fer,
        ser,
        ler,
        isSpike,
        followUpAsked: r.follow_up_asked ?? null,
        feelingsTapped: r.feelings_tapped ?? [],
        languageDetected: r.language_detected ?? null,
        frameImage: r.frame_image ?? null,
        evidenceFrames: r.evidence_frames ?? null,
      };
    });

    // Overall agreement (average of per-question agreements)
    const agreements = perQuestion.map((q) => q.agreement.score);
    const avgAgreement = agreements.length > 0
      ? Math.round(agreements.reduce((a, b) => a + b, 0) / agreements.length)
      : 0;

    // Dominant emotion
    const emotionCounts: Record<string, number> = {};
    responses.forEach((r) => {
      const e = (r.emotion || "neutral").toLowerCase();
      emotionCounts[e] = (emotionCounts[e] || 0) + 1;
    });
    const dominantEmotion = Object.entries(emotionCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "neutral";

    // Highest spike
    const highestSpike = spikes.length > 0
      ? spikes.reduce((max, s) => (s.intensity > max.intensity ? s : max), spikes[0])
      : null;

    // Models used
    const hasFer = responses.some((r) => r.fer_confidence > 0);
    const hasSer = responses.some((r) => r.ser_confidence > 0);
    const hasLer = responses.some((r) => r.ler_confidence > 0);

    // Completed analyses
    const completedAnalyses = responses.filter(
      (r) => r.fer_confidence > 0 || r.ser_confidence > 0 || r.ler_confidence > 0,
    ).length;

    // Report status
    const hasReport = !!session.report;

    // Risk reasons
    const riskReasons: string[] = [];
    if (spikes.length > 0) {
      const spikeEmotions = [...new Set(spikes.map((s) => s.emotion))];
      riskReasons.push(`Emotional spikes detected: ${spikes.length} (${spikeEmotions.join(", ")})`);
    }
    const events = session.emotionalEvents || [];
    const highEvents = events.filter((e) => e.intensity_level === "High");
    if (highEvents.length > 0) {
      riskReasons.push(`${highEvents.length} high-intensity emotional event(s)`);
    }
    const lowAgreementCount = perQuestion.filter((q) => q.agreement.score <= 33).length;
    if (lowAgreementCount > 0) {
      riskReasons.push(`Model disagreement in ${lowAgreementCount} question(s)`);
    }
    if (dominantEmotion === "angry" || dominantEmotion === "sad") {
      riskReasons.push(`Dominant emotion is ${dominantEmotion}`);
    }

    // Overview
    const overview: SessionOverviewData = {
      overallEmotion: dominantEmotion.charAt(0).toUpperCase() + dominantEmotion.slice(1),
      overallConfidence: avgAgreement / 100,
      overallAgreement: avgAgreement,
      riskLevel: session.riskLevel || "Low",
      riskReasons,
      highestSpikeIndex: highestSpike?.questionIndex ?? null,
      modelsUsed: { fer: hasFer, ser: hasSer, ler: hasLer },
      selfReport: session.selfReport ?? null,
      reportStatus: hasReport ? "available" : "unavailable",
      questionCount: responses.length,
      completedAnalyses,
      patientName: session.patientName || "Unknown",
      templateName: session.templateName || "Unknown",
      date: session.date || "",
      duration: session.duration || "",
    };

    return {
      perQuestion,
      overview,
      avgAgreement,
      dominantEmotion,
      highestSpike,
      hasFer,
      hasSer,
      hasLer,
      hasReport,
      questionCount: responses.length,
    };
  }, [session]);
}
