# Session Review Page Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire up 8 unused components, fix the type system, and rewrite SessionReviewPage to present the multimodal AI pipeline as the centerpiece of the therapist review workflow.

**Architecture:** Fix `useSessionComputed` to export proper types and compute full `QuestionData`/`ModelEvidence`/`SessionOverviewData` shapes. Rewrite `SessionReviewPage` to compose existing components in therapist workflow order. Polish UI hierarchy, explainability, and confidence transparency in Phase 2.

**Tech Stack:** React 18, TypeScript, Tailwind CSS v4, Vite, lucide-react, react-router-dom

---

## File Map

### Files to Modify (Phase 1)
| File | Change |
|------|--------|
| `src/feature/sessionReview/hooks/useSessionComputed.ts` | Export types, compute full data shapes |
| `src/feature/sessionReview/pages/SessionReviewPage.tsx` | Rewrite to use all components |
| `src/feature/sessionReview/components/SpikeContextPanel.tsx` | Add "Jump to Question" button |
| `src/feature/sessionReview/components/EmotionTimelineHeatmap.tsx` | Add multi-bar mode |

### Files to Modify (Phase 2)
| File | Change |
|------|--------|
| `src/feature/sessionReview/components/QuestionCard.tsx` | Collapse evidence, improve pipeline layout |
| `src/feature/sessionReview/components/SessionOverviewCard.tsx` | Add risk reasons |
| `src/feature/sessionReview/components/QwenReportSection.tsx` | Rename to AI Session Summary, add disclaimer |
| `src/feature/sessionReview/components/FusionResultCard.tsx` | Improve agreement visualization |
| `src/shared/components/ConfidenceBadge.tsx` | Label "Fusion Confidence" variant |

### Files NOT Modified (already correct)
- `shared/components/CollapsibleSection.tsx`
- `shared/components/EmotionTag.tsx`
- `shared/utils/emotionColors.ts`
- `shared/utils/agreementCalculator.ts`
- `shared/utils/fusionExplanation.ts`
- `sessionReview/hooks/usePerQuestionNotes.ts`
- `sessionReview/components/ModelSubCard.tsx`
- `sessionReview/components/AgreementBar.tsx`
- `sessionReview/components/AIExplanation.tsx`
- `sessionReview/components/PerQuestionNotes.tsx`
- `sessionReview/components/QuestionMiniNav.tsx`
- `sessionReview/components/EvidencePanel.tsx`

---

## Phase 1: Foundation (compile + data flow)

### Task 1: Fix `useSessionComputed.ts` — export types and compute full data shapes

**Files:**
- Modify: `src/feature/sessionReview/hooks/useSessionComputed.ts`

This is the core data layer. Every other component depends on the types and computed data from this hook. Fix it first.

- [ ] **Step 1: Read the current file**

Read `src/feature/sessionReview/hooks/useSessionComputed.ts` to understand the current structure. It currently returns `{ perQuestion, avgAgreement, dominantEmotion, highestSpike, hasFer, hasSer, hasLer, hasReport, questionCount }` where `perQuestion` entries are `{ index, response, spike, isSpike }`.

- [ ] **Step 2: Rewrite the hook with exported types and full data computation**

Replace the entire file with:

```ts
import { useMemo } from "react";
import type { MappedSession } from "../../../../shared/types/session";
import type { AgreementResult } from "../../../../shared/utils/agreementCalculator";
import { calculateAgreement } from "../../../../shared/utils/agreementCalculator";
import { generateExplanation } from "../../../../shared/utils/fusionExplanation";

export interface ModelEvidence {
  model: "FER" | "SER" | "LER";
  available: boolean;
  emotion: string | null;
  confidence: number;
  probabilities: Record<string, number> | null;
  details: Record<string, unknown> | null;
  languageDetected?: string | null;
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
  languageDetected: string | null;
  frameImage: string | null;
}

export interface SessionOverviewData {
  overallEmotion: string;
  overallConfidence: number;
  overallAgreement: number;
  riskLevel: string;
  riskReasons: string[];
  highestSpikeIndex: number | null;
  modelsUsed: { fer: boolean; ser: boolean; ler: boolean };
  reportStatus: "available" | "unavailable";
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
  details: Record<string, unknown> | null | undefined,
  languageDetected?: string | null,
): ModelEvidence {
  const available = confidence > 0;
  return {
    model,
    available,
    emotion: available ? (emotion ?? null) : null,
    confidence: available ? confidence : 0,
    probabilities: available ? (probabilities ?? null) : null,
    details: available ? (details ?? null) : null,
    ...(model === "LER" ? { languageDetected: languageDetected ?? null } : {}),
  };
}

export function useSessionComputed(session: MappedSession | null | undefined) {
  return useMemo(() => {
    if (!session) return null;

    const responses = session.responses || [];
    const spikes = session.spikes || [];

    // Per-question data
    const perQuestion: QuestionData[] = responses.map((r, i) => {
      const spike = spikes.find((s) => s.question_index === i);
      const isSpike = !!spike;

      const ferEmotion = r.fer_confidence > 0 ? (r.emotion ?? null) : null;
      const serEmotion = r.ser_confidence > 0 ? (r.emotion ?? null) : null;
      const lerEmotion = r.ler_emotion ?? null;

      const fer = buildModelEvidence("FER", r.fer_confidence, ferEmotion, null, r.facial_details);
      const ser = buildModelEvidence("SER", r.ser_confidence, serEmotion, null, r.audio_details);
      const ler = buildModelEvidence("LER", r.ler_confidence, lerEmotion, r.ler_probabilities, null, r.language_detected);

      const fusionEmotion = (r.emotion || "neutral").charAt(0).toUpperCase() + (r.emotion || "neutral").slice(1);
      const fusionConfidence = (r.emotionPct || 0) / 100;

      const agreement = calculateAgreement(
        fer.emotion,
        ser.emotion,
        ler.emotion,
        fusionEmotion,
      );

      const explanation = generateExplanation(fusionEmotion, fer, ser, ler);

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
        languageDetected: r.language_detected ?? null,
        frameImage: r.frame_image ?? null,
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
    const hasReport = !!(session as any).report;

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
      highestSpikeIndex: highestSpike?.question_index ?? null,
      modelsUsed: { fer: hasFer, ser: hasSer, ler: hasLer },
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
```

- [ ] **Step 3: Verify it compiles**

Run: `cd C:\Users\Admin\Desktop\projects\thesis\anumata-fe && npx vite build 2>&1 | head -30`

Expected: Build succeeds (or errors only in files that import from this hook but pass wrong props — those will be fixed in later tasks).

- [ ] **Step 4: Commit**

```bash
git add src/feature/sessionReview/hooks/useSessionComputed.ts
git commit -m "feat: export types and compute full data shapes in useSessionComputed"
```

---

### Task 2: Rewrite `SessionReviewPage.tsx` — wire up all components

**Files:**
- Modify: `src/feature/sessionReview/pages/SessionReviewPage.tsx`

This is the main page. Replace the 433-line monolith with a component that composes all existing components in therapist workflow order.

- [ ] **Step 1: Read the current file**

Read `src/feature/sessionReview/pages/SessionReviewPage.tsx` to understand the current structure and imports.

- [ ] **Step 2: Rewrite the page**

Replace the entire file with:

```tsx
import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Save } from "lucide-react";
import { useSessions } from "../../context/sessions/useSessions";
import type { MappedSession, EmotionalSpike } from "../../../shared/types/session";
import { useSessionComputed } from "../hooks/useSessionComputed";
import { usePerQuestionNotes } from "../hooks/usePerQuestionNotes";
import SessionOverviewCard from "../components/SessionOverviewCard";
import EmotionTimelineHeatmap from "../components/EmotionTimelineHeatmap";
import QuestionMiniNav from "../components/QuestionMiniNav";
import SpikeContextPanel from "../components/SpikeContextPanel";
import QuestionCard from "../components/QuestionCard";
import QwenReportSection from "../components/QwenReportSection";

export default function SessionReviewPage() {
  const { id } = useParams();
  const { getSessionById, fetchSessionById, updateNotes } = useSessions();
  const cachedSession = getSessionById(Number(id));
  const [session, setSession] = useState<MappedSession | null>(cachedSession);

  const [notes, setNotes] = useState(session?.notes ?? "");
  const [saved, setSaved] = useState(false);
  const [selectedSpike, setSelectedSpike] = useState<EmotionalSpike | null>(null);

  // Computed data from session
  const computed = useSessionComputed(session);
  const { getNote, updateNote } = usePerQuestionNotes(session?.id);

  // Sync notes when session data arrives
  useEffect(() => {
    if (session) setNotes(session.notes ?? "");
  }, [session]);

  // Fetch full session data if cached version is incomplete
  useEffect(() => {
    if (cachedSession && cachedSession.responses.length > 0) {
      setSession(cachedSession);
      return;
    }
    fetchSessionById(Number(id)).then((full) => {
      if (full) setSession(full);
    });
  }, [id, cachedSession, fetchSessionById]);

  if (!session || !computed) {
    return (
      <div className="space-y-4">
        <Link to="/patients" className="inline-flex items-center gap-2 text-sm text-blue-600 hover:underline">
          <ArrowLeft size={16} />
          Back to Patients
        </Link>
        <p className="text-slate-500">Session not found.</p>
      </div>
    );
  }

  const handleSaveNotes = () => {
    updateNotes(session.id, notes);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const spikeIndices = session.spikes.map((s) => s.question_index);

  // Emotion distribution colors
  const emotionBarColors: Record<string, string> = {
    sad: "bg-blue-500",
    happy: "bg-green-500",
    angry: "bg-red-500",
    neutral: "bg-slate-400",
  };

  return (
    <div className="space-y-6 md:space-y-8">
      {/* Back link + header */}
      <div>
        <Link
          to={`/patients/${session.patientId}`}
          className="mb-2 inline-flex items-center gap-2 text-sm text-blue-600 hover:underline"
        >
          <ArrowLeft size={16} />
          Back to Patient
        </Link>
        <h1 className="text-2xl font-bold text-slate-900 md:text-4xl">Session Review</h1>
        <p className="mt-1 text-sm text-slate-500">
          {session.patientName} — {session.templateName} — {session.date}
        </p>
      </div>

      {/* 1. Session Overview */}
      <SessionOverviewCard data={computed.overview} />

      {/* 2. Timeline + Question Navigation */}
      <div className="relative">
        <EmotionTimelineHeatmap
          points={session.responses.map((r, i) => ({
            questionIndex: i,
            emotion: (r.emotion || "neutral").charAt(0).toUpperCase() + (r.emotion || "neutral").slice(1),
            confidence: (r.emotionPct || 0) / 100,
            isSpike: session.spikes.some((s) => s.question_index === i),
          }))}
          onSpikeClick={(index) => {
            const spike = session.spikes.find((s) => s.question_index === index);
            if (spike) setSelectedSpike(spike);
          }}
        />
        <QuestionMiniNav questionCount={session.responses.length} spikeIndices={spikeIndices} />
      </div>

      {/* 3. Spike Context (if selected) */}
      {selectedSpike && (
        <SpikeContextPanel
          spike={selectedSpike}
          transcript={session.responses}
          onClose={() => setSelectedSpike(null)}
        />
      )}

      {/* 4. Per-question cards */}
      <div className="space-y-4">
        {computed.perQuestion.map((q) => (
          <QuestionCard
            key={q.index}
            data={q}
            note={getNote(q.index)}
            onNoteChange={updateNote}
          />
        ))}
      </div>

      {/* 5. AI Session Summary */}
      <QwenReportSection report={(session as any).report ?? null} />

      {/* 6. Emotion Distribution */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
        <h2 className="mb-4 text-lg font-semibold md:text-xl">Emotion Distribution</h2>
        <div className="space-y-3">
          {Object.entries(session.emotions)
            .sort(([, a], [, b]) => (b as number) - (a as number))
            .map(([label, pct]) => (
              <div key={label}>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="capitalize text-slate-700">{label}</span>
                  <span className="text-slate-500">{pct as number}%</span>
                </div>
                <div className="h-2.5 w-full rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full ${emotionBarColors[label] ?? "bg-slate-400"}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* 7. Detected Indicators */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
        <h2 className="mb-3 text-lg font-semibold md:text-xl">Detected Indicators</h2>
        <div className="flex flex-wrap gap-2">
          {session.indicators.map((ind: string) => (
            <span key={ind} className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
              {ind}
            </span>
          ))}
        </div>
      </div>

      {/* 8. Emotional Event Report */}
      {session.emotionalEvents && session.emotionalEvents.length > 0 && (
        <div className="rounded-2xl border border-blue-200 bg-blue-50/30 p-4 shadow-sm md:p-6">
          <h2 className="mb-4 text-lg font-semibold text-blue-900 md:text-xl">Emotional Event Report</h2>
          <p className="mb-4 text-xs text-slate-500 italic">
            This report identifies moments during the interview where notable emotional responses were detected.
            All observations are generated by AI analysis and should be interpreted by a qualified professional.
          </p>
          <div className="space-y-4">
            {session.emotionalEvents.map((event) => {
              const intensityColor =
                event.intensity_level === "High"
                  ? "border-red-300 bg-red-50"
                  : event.intensity_level === "Moderate"
                    ? "border-yellow-300 bg-yellow-50"
                    : "border-slate-200 bg-white";
              const emotionBadge =
                event.dominant_emotion === "Sad"
                  ? "bg-blue-100 text-blue-700"
                  : event.dominant_emotion === "Angry"
                    ? "bg-red-100 text-red-700"
                    : event.dominant_emotion === "Happy"
                      ? "bg-green-100 text-green-700"
                      : "bg-slate-100 text-slate-700";
              return (
                <div key={event.event_number} className={`rounded-xl border-l-4 p-4 ${intensityColor}`}>
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-slate-800">Emotional Event #{event.event_number}</h3>
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${emotionBadge}`}>
                        {event.dominant_emotion}
                      </span>
                      <span className="text-xs text-slate-500">{event.emotion_confidence}%</span>
                    </div>
                  </div>
                  <div className="mb-3 grid gap-3 text-sm md:grid-cols-2">
                    <div>
                      <p className="mb-1 text-xs font-medium text-slate-500">Time</p>
                      <p className="text-slate-700">{event.timestamp}</p>
                    </div>
                    <div>
                      <p className="mb-1 text-xs font-medium text-slate-500">Intensity Level</p>
                      <p className={`font-medium ${
                        event.intensity_level === "High"
                          ? "text-red-600"
                          : event.intensity_level === "Moderate"
                            ? "text-yellow-600"
                            : "text-slate-600"
                      }`}>
                        {event.intensity_level}
                      </p>
                    </div>
                  </div>
                  <div className="mb-3">
                    <p className="mb-1 text-xs font-medium text-slate-500">Question</p>
                    <p className="text-sm text-slate-700">{event.question}</p>
                  </div>
                  <div className="mb-3">
                    <p className="mb-1 text-xs font-medium text-slate-500">Transcript</p>
                    <p className="text-sm italic text-slate-600">"{event.transcript}"</p>
                  </div>
                  <div className="mb-3 grid gap-3 md:grid-cols-2">
                    <div>
                      <p className="mb-0.5 text-xs font-medium text-slate-500">Speech Indicators</p>
                      <p className="text-xs text-slate-600">{event.speech_indicators}</p>
                    </div>
                    <div>
                      <p className="mb-0.5 text-xs font-medium text-slate-500">Facial Indicators</p>
                      <p className="text-xs text-slate-600">{event.facial_indicators}</p>
                    </div>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-3">
                    <p className="mb-1 text-xs font-medium text-slate-500">Summary</p>
                    <p className="text-xs leading-relaxed text-slate-600">{event.summary}</p>
                  </div>
                </div>
              );
            })}
          </div>
          {/* Session Highlights */}
          {session.sessionHighlights && (
            <div className="mt-6 rounded-xl border border-blue-200 bg-white p-4">
              <h3 className="mb-3 text-sm font-semibold text-blue-800">Session Emotional Highlights</h3>
              <div className="grid gap-3 text-sm md:grid-cols-2">
                <div>
                  <p className="text-xs text-slate-500">Total Emotional Events Detected</p>
                  <p className="font-semibold text-slate-800">{session.sessionHighlights.total_events}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Most Frequent Emotion</p>
                  <p className="font-semibold text-slate-800">{session.sessionHighlights.most_frequent_emotion}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Highest Intensity Event</p>
                  <p className="font-semibold text-slate-800">
                    {session.sessionHighlights.highest_intensity_event
                      ? `Event #${session.sessionHighlights.highest_intensity_event}`
                      : "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Questions With Emotional Responses</p>
                  <p className="font-semibold text-slate-800">
                    {session.sessionHighlights.questions_with_responses?.join(", ") || "None"}
                  </p>
                </div>
              </div>
              <div className="mt-3 rounded-lg bg-blue-50 p-3">
                <p className="text-xs font-medium text-blue-700">Overall Summary</p>
                <p className="mt-1 text-xs leading-relaxed text-blue-800">
                  {session.sessionHighlights.overall_summary}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 9. Session-level Therapist Notes */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold md:text-xl">Therapist Notes</h2>
          <button
            onClick={handleSaveNotes}
            className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-blue-700"
          >
            <Save size={12} />
            {saved ? "Saved!" : "Save"}
          </button>
        </div>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add your clinical notes here..."
          rows={6}
          className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none"
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify it compiles**

Run: `cd C:\Users\Admin\Desktop\projects\thesis\anumata-fe && npx vite build 2>&1 | head -30`

Expected: Build succeeds. If there are type errors in the components (e.g., `QuestionCard` expecting types that don't match), those will be fixed in Phase 2 tasks.

- [ ] **Step 4: Commit**

```bash
git add src/feature/sessionReview/pages/SessionReviewPage.tsx
git commit -m "feat: rewrite SessionReviewPage to wire up all existing components"
```

---

### Task 3: Fix `SpikeContextPanel.tsx` — add jump-to-question

**Files:**
- Modify: `src/feature/sessionReview/components/SpikeContextPanel.tsx`

- [ ] **Step 1: Add "Jump to Question" button**

Add a button next to the "Back to spikes" button that scrolls to the question card. Modify the header section of `SpikeContextPanel.tsx`:

In the `<div className="flex items-center justify-between mb-4">` section, add a "Jump to Question" button before the close button:

```tsx
<div className="flex items-center gap-2">
  <button
    onClick={() => {
      const el = document.getElementById(`question-${spikeIdx}`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }}
    className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 transition-colors"
  >
    Jump to Q{spikeIdx + 1}
  </button>
  <button onClick={onClose} className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 transition-colors">
    <ArrowLeft size={14} />
    Back to spikes
  </button>
</div>
```

- [ ] **Step 2: Verify it compiles**

Run: `cd C:\Users\Admin\Desktop\projects\thesis\anumata-fe && npx vite build 2>&1 | head -30`

Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/feature/sessionReview/components/SpikeContextPanel.tsx
git commit -m "feat: add jump-to-question button in SpikeContextPanel"
```

---

### Task 4: Fix `EmotionTimelineHeatmap.tsx` — add multi-bar mode

**Files:**
- Modify: `src/feature/sessionReview/components/EmotionTimelineHeatmap.tsx`

- [ ] **Step 1: Add `showModelBars` prop**

Add an optional `showModelBars` prop to the component interface and update the rendering. The multi-bar mode shows 4 thin bars per question (FER/SER/LER/Fusion) instead of one.

Update the interface:

```ts
interface EmotionTimelineHeatmapProps {
  points: TimelinePoint[];
  onSpikeClick?: (index: number) => void;
  showModelBars?: boolean;
}
```

Update the function signature:

```ts
export default function EmotionTimelineHeatmap({ points, onSpikeClick, showModelBars = false }: EmotionTimelineHeatmapProps) {
```

This is a preparation step. The multi-bar rendering will be implemented in Phase 2 if needed. For now, the prop exists but defaults to `false`, preserving existing behavior.

- [ ] **Step 2: Verify it compiles**

Run: `cd C:\Users\Admin\Desktop\projects\thesis\anumata-fe && npx vite build 2>&1 | head -30`

Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/feature/sessionReview/components/EmotionTimelineHeatmap.tsx
git commit -m "feat: add showModelBars prop to EmotionTimelineHeatmap"
```

---

### Task 5: Verify Phase 1 — full build + visual check

**Files:** None (verification only)

- [ ] **Step 1: Run full build**

Run: `cd C:\Users\Admin\Desktop\projects\thesis\anumata-fe && npx vite build`

Expected: Build succeeds with no TypeScript errors.

- [ ] **Step 2: Start dev server and verify visual**

Run: `cd C:\Users\Admin\Desktop\projects\thesis\anumata-fe && npx vite`

Navigate to a session review page (`/sessions/:id`) and verify:
1. SessionOverviewCard renders at top with correct data
2. EmotionTimelineHeatmap shows emotion bars
3. QuestionMiniNav dots appear on the right edge
4. QuestionCard renders for each question with FER/SER/LER sub-cards
5. FusionResultCard shows agreement bar and explanation
6. PerQuestionNotes textarea appears per question
7. QwenReportSection renders at bottom
8. Emotion Distribution, Indicators, Events, Notes sections render

- [ ] **Step 3: Commit any fixes**

If any visual issues are found, fix them and commit.

---

## Phase 2: UI hierarchy + explainability polish

### Task 6: Update `QuestionCard.tsx` — collapse evidence, improve pipeline layout

**Files:**
- Modify: `src/feature/sessionReview/components/QuestionCard.tsx`

- [ ] **Step 1: Read the current file**

Read `src/feature/sessionReview/components/QuestionCard.tsx` to understand the current structure.

- [ ] **Step 2: Wrap AI Evidence in CollapsibleSection**

Import `CollapsibleSection` and wrap the AI Evidence grid in a collapsible section that starts collapsed:

```tsx
import CollapsibleSection from "../../../shared/components/CollapsibleSection";
```

Replace the AI Evidence section with:

```tsx
{/* AI Evidence — collapsible */}
<CollapsibleSection
  title="AI Evidence"
  defaultOpen={false}
  className="mb-4"
  titleClassName="text-xs font-semibold text-slate-600 uppercase tracking-wide"
>
  <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-3">
    <ModelSubCard evidence={data.ser} />
    <ModelSubCard evidence={data.fer} />
    <ModelSubCard evidence={data.ler} />
  </div>
</CollapsibleSection>
```

- [ ] **Step 3: Add pipeline flow indicator**

Add a visual separator between the Transcript and AI Evidence sections, and between AI Evidence and Fusion Result, to communicate the pipeline flow:

```tsx
{/* Pipeline flow indicator */}
<div className="flex items-center gap-2 my-3">
  <div className="h-px flex-1 bg-slate-200" />
  <span className="text-[10px] text-slate-400 uppercase tracking-wider">AI Analysis</span>
  <div className="h-px flex-1 bg-slate-200" />
</div>
```

Add a similar separator before the Fusion Result:

```tsx
<div className="flex items-center gap-2 my-3">
  <div className="h-px flex-1 bg-indigo-200" />
  <span className="text-[10px] text-indigo-400 uppercase tracking-wider">Fusion Result</span>
  <div className="h-px flex-1 bg-indigo-200" />
</div>
```

- [ ] **Step 4: Verify it compiles**

Run: `cd C:\Users\Admin\Desktop\projects\thesis\anumata-fe && npx vite build 2>&1 | head -30`

Expected: Build succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/feature/sessionReview/components/QuestionCard.tsx
git commit -m "feat: collapse AI evidence by default, add pipeline flow indicators"
```

---

### Task 7: Update `SessionOverviewCard.tsx` — add risk reasons

**Files:**
- Modify: `src/feature/sessionReview/components/SessionOverviewCard.tsx`

- [ ] **Step 1: Add risk reasons display**

After the risk level badge, add a section that displays `data.riskReasons` as bullet points:

```tsx
{/* Risk Level with reasons */}
<div className="space-y-1 md:col-span-2">
  <div className="flex items-center gap-1.5 text-xs text-slate-500">
    <Shield size={12} />
    <span>Risk Level</span>
  </div>
  <span className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium ${riskStyle}`}>
    {data.riskLevel}
  </span>
  {data.riskReasons && data.riskReasons.length > 0 && (
    <ul className="mt-1.5 space-y-0.5">
      {data.riskReasons.map((reason, i) => (
        <li key={i} className="flex items-start gap-1.5 text-[11px] text-slate-500">
          <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-slate-400" />
          {reason}
        </li>
      ))}
    </ul>
  )}
</div>
```

- [ ] **Step 2: Add completed analyses display**

Add a new grid item showing `completedAnalyses`:

```tsx
{/* Completed Analyses */}
<div className="space-y-1">
  <span className="text-xs text-slate-500">AI Analyses</span>
  <span className="text-sm font-semibold text-slate-800">
    {data.completedAnalyses} / {data.questionCount}
  </span>
</div>
```

- [ ] **Step 3: Verify it compiles**

Run: `cd C:\Users\Admin\Desktop\projects\thesis\anumata-fe && npx vite build 2>&1 | head -30`

Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/feature/sessionReview/components/SessionOverviewCard.tsx
git commit -m "feat: add risk reasons and completed analyses to SessionOverviewCard"
```

---

### Task 8: Update `QwenReportSection.tsx` — rename to AI Session Summary

**Files:**
- Modify: `src/feature/sessionReview/components/QwenReportSection.tsx`

- [ ] **Step 1: Update header and add disclaimer**

Change the header from "AI Report" to "AI Session Summary". Add a disclaimer section after the header:

Replace the header section in both the null and non-null return paths:

For the null case:
```tsx
<h3 className="text-sm font-semibold text-slate-700">AI Session Summary</h3>
```

For the non-null case:
```tsx
<div className="flex items-center gap-2 mb-4">
  <FileText size={16} className="text-blue-600" />
  <h3 className="text-sm font-semibold text-slate-800">AI Session Summary</h3>
  <span className="text-[10px] text-slate-400 ml-auto">Generated by Qwen 3:4B</span>
</div>

{/* Disclaimer */}
<div className="mb-4 rounded-lg bg-amber-50 border border-amber-200 p-3">
  <p className="text-[11px] font-medium text-amber-800">Assistive AI Summary</p>
  <p className="text-[10px] text-amber-700 mt-0.5">
    Based on: Fusion results, Transcript, Emotional progression.
    This summary is intended to support therapist review and is not a clinical diagnosis.
  </p>
</div>
```

- [ ] **Step 2: Update the footer disclaimer**

Change the existing footer disclaimer to be more prominent:

```tsx
<p className="text-[10px] text-slate-400 mt-4 italic">
  This summary is AI-generated and intended as a supportive tool for therapist review. It does not constitute a clinical diagnosis. The therapist makes the final clinical judgment.
</p>
```

- [ ] **Step 3: Verify it compiles**

Run: `cd C:\Users\Admin\Desktop\projects\thesis\anumata-fe && npx vite build 2>&1 | head -30`

Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/feature/sessionReview/components/QwenReportSection.tsx
git commit -m "feat: rename to AI Session Summary with disclaimer"
```

---

### Task 9: Update `FusionResultCard.tsx` — improve agreement visualization

**Files:**
- Modify: `src/feature/sessionReview/components/FusionResultCard.tsx`

- [ ] **Step 1: Add per-model agreement indicators**

After the AgreementBar, add a visual showing which models agree/disagree:

```tsx
{/* Per-model agreement indicators */}
{agreement.agreeing.length > 0 || agreement.disagreeing.length > 0 ? (
  <div className="mt-2 flex flex-wrap gap-1.5">
    {agreement.agreeing.map((model) => (
      <span key={model} className="flex items-center gap-1 text-[10px] text-green-700 bg-green-50 px-1.5 py-0.5 rounded">
        <CheckCircle size={10} />
        {model}
      </span>
    ))}
    {agreement.disagreeing.map((model) => (
      <span key={model} className="flex items-center gap-1 text-[10px] text-red-700 bg-red-50 px-1.5 py-0.5 rounded">
        <XCircle size={10} />
        {model}
      </span>
    ))}
  </div>
) : null}
```

Import `CheckCircle` and `XCircle` from lucide-react.

- [ ] **Step 2: Label confidence as "Fusion Confidence"**

Change the confidence label from generic to specific:

```tsx
<div className="mb-3 flex items-center gap-3">
  <EmotionTag emotion={fusionEmotion} size="md" />
  <div className="space-y-0.5">
    <span className="text-[10px] text-slate-500">Fusion Confidence</span>
    <ConfidenceBadge value={fusionConfidence} size="md" />
  </div>
</div>
```

- [ ] **Step 3: Verify it compiles**

Run: `cd C:\Users\Admin\Desktop\projects\thesis\anumata-fe && npx vite build 2>&1 | head -30`

Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/feature/sessionReview/components/FusionResultCard.tsx
git commit -m "feat: improve agreement visualization and confidence labeling in FusionResultCard"
```

---

### Task 10: Final verification — full build + visual check

**Files:** None (verification only)

- [ ] **Step 1: Run full build**

Run: `cd C:\Users\Admin\Desktop\projects\thesis\anumata-fe && npx vite build`

Expected: Build succeeds with no TypeScript errors.

- [ ] **Step 2: Visual verification checklist**

Start dev server and navigate to a session review page. Verify:

1. SessionOverviewCard shows risk level with reason bullets
2. SessionOverviewCard shows completed analyses count
3. QuestionCard AI Evidence section starts collapsed
4. QuestionCard shows pipeline flow indicators
5. FusionResultCard shows "Fusion Confidence" label
6. FusionResultCard shows per-model agreement indicators (checkmarks/X)
7. QwenReportSection header says "AI Session Summary"
8. QwenReportSection shows disclaimer
9. SpikeContextPanel has "Jump to Question" button
10. QuestionMiniNav dots scroll to correct question
11. PerQuestionNotes saves to localStorage
12. All existing sections (Distribution, Indicators, Events, Notes) still work

- [ ] **Step 3: Commit any final fixes**

If any issues are found, fix them and commit.
