# Session Review Page Redesign

**Date:** 2026-07-18
**Scope:** Wire up 8 unused components, fix type system, rewrite SessionReviewPage
**Status:** Approved (refined)

## Problem

The SessionReviewPage is a 433-line monolith that only uses 3 of 12 available components. Eight components and two hooks were built for a planned refactor but never wired up. The components import types (`QuestionData`, `ModelEvidence`, `SessionOverviewData`) from `useSessionComputed.ts` that are never exported, causing compilation failures.

## Design Principles

### 1. Multimodal AI Pipeline Is the Centerpiece

The Session Review page must visually communicate the actual AI processing pipeline. For every interview response, the therapist should understand exactly how the final emotion was produced. The pipeline itself is one of the primary contributions of the thesis and must be visible:

```
Question → Transcript → SER → FER → LER → Fusion Engine → AI Explanation → Therapist Notes
```

### 2. Fusion Is the Primary Result

FER, SER, LER are supporting evidence. Fusion is the final multimodal decision. Fusion must visually stand out because it combines all three AI models. Never present FER, SER, LER, and Fusion as equal.

### 3. Evidence First, Conclusion Second

The therapist should always see why the AI produced its conclusion before seeing the conclusion itself. Each model displays its emotion, confidence, probability distribution, and reasoning. Only after presenting these does Fusion appear.

### 4. AI Explanation Must Be Explainable

Explanations are generated from structured evidence (via `fusionExplanation.ts`), not hallucinated by Qwen. Each model's contribution is traceable. Qwen may summarize this evidence in natural language, but the base explanation is always structured.

### 5. Risk Level Must Explain Itself

Every risk level displays supporting evidence bullets (e.g., "repeated anger indicators", "elevated speech intensity", "persistent negative language"). Never display risk without explanation.

### 6. Confidence Transparency

Always distinguish model confidence from final fusion confidence. Never display "Angry 100%" unless the fusion confidence is actually 100%. Display "Final Emotion: Angry / Fusion Confidence: 78%".

### 7. Agreement Visualization

Show whether the models agree. Display agreement as "High" (all agree), "Majority" (2/3), or "Low" (disagree) with which models agree/disagree.

### 8. Progressive Disclosure

Default page is simple. Therapist expands a question to reveal SER details, FER details, LER details, Fusion reasoning, AI explanation, and per-question therapist notes. Do not overwhelm immediately.

### 9. Therapist Workflow

The page follows this order:
1. Session Overview (sticky header)
2. Timeline (emotional progression)
3. Question Navigation (floating dots)
4. Question 1, Question 2, ... (evidence → fusion → explanation → notes)
5. AI Session Summary (Qwen, at bottom)
6. Session-level Therapist Notes

The therapist reviews evidence before reading the AI summary.

### 10. AI Summary vs Therapist Interpretation

The Qwen section is renamed "AI Session Summary". It displays: "Based on: Fusion results, Transcript, Emotional progression". It includes a notice: "Assistive AI Summary — This summary is intended to support therapist review and is not a clinical diagnosis." Never make the AI appear to replace the therapist.

### 11. Preserve Current Design Language

Keep the current clean UI. Improve information hierarchy, explainability, therapist workflow, multimodal evidence presentation, fusion visualization, and confidence reporting without making the interface cluttered.

## Current State

### Working (keep as-is)
- `shared/components/CollapsibleSection.tsx`
- `shared/components/ConfidenceBadge.tsx`
- `shared/components/EmotionTag.tsx`
- `shared/utils/emotionColors.ts`
- `shared/utils/agreementCalculator.ts`
- `shared/utils/fusionExplanation.ts`
- `sessionReview/hooks/usePerQuestionNotes.ts`
- `sessionReview/components/QuestionCard.tsx`
- `sessionReview/components/ModelSubCard.tsx`
- `sessionReview/components/FusionResultCard.tsx`
- `sessionReview/components/AgreementBar.tsx`
- `sessionReview/components/AIExplanation.tsx`
- `sessionReview/components/PerQuestionNotes.tsx`
- `sessionReview/components/SessionOverviewCard.tsx`
- `sessionReview/components/QuestionMiniNav.tsx`
- `sessionReview/components/QwenReportSection.tsx`

### Broken (needs fix)
- `sessionReview/hooks/useSessionComputed.ts` — missing type exports, incomplete data computation
- `sessionReview/pages/SessionReviewPage.tsx` — monolith, doesn't use available components

### Needs minor update
- `sessionReview/components/SpikeContextPanel.tsx` — add "Jump to Question" button
- `sessionReview/components/EmotionTimelineHeatmap.tsx` — add multi-bar mode

## Implementation Phases

### Phase 1: Foundation (compile + data flow)

Goal: Get the page compiling with all components wired up and data flowing correctly.

#### 1.1 `useSessionComputed.ts` — Fix types and data computation

**Export these types:**

```ts
export interface ModelEvidence {
  model: "FER" | "SER" | "LER";
  available: boolean;
  emotion: string | null;
  confidence: number;        // 0-1
  probabilities: Record<string, number> | null;
  details: Record<string, unknown> | null;
  languageDetected?: string | null;
}

export interface QuestionData {
  index: number;
  question: string;
  answer: string;
  fusionEmotion: string;
  fusionConfidence: number;  // 0-1
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
  highestSpikeIndex: number | null;
  modelsUsed: { fer: boolean; ser: boolean; ler: boolean };
  reportStatus: "available" | "unavailable";
  questionCount: number;
  completedAnalyses: number;  // questions with at least one model result
  patientName: string;
  templateName: string;
  date: string;
  duration: string;
}
```

**Compute `perQuestion` as `QuestionData[]`:**

For each response:
- `fusionEmotion` = `response.emotion` (already combined from API)
- `fusionConfidence` = `response.emotionPct / 100`
- Build `ModelEvidence` for FER from `response.fer_confidence`, `response.facial_details`
- Build `ModelEvidence` for SER from `response.ser_confidence`, `response.audio_details`
- Build `ModelEvidence` for LER from `response.ler_confidence`, `response.ler_emotion`, `response.ler_probabilities`, `response.language_detected`
- Call `calculateAgreement(fer.emotion, ser.emotion, ler.emotion, fusionEmotion)`
- Call `generateExplanation(fusionEmotion, fer, ser, ler)`

**Compute `overview` as `SessionOverviewData`:**

From session-level fields: `patientName`, `templateName`, `date`, `duration`, `riskLevel`, `dominantEmotion`, `avgAgreement`, `highestSpike`, model availability, report status, `completedAnalyses` (count of responses with at least one model confidence > 0).

#### 1.2 `SessionReviewPage.tsx` — Rewrite

Replace the 433-line monolith with a component that wires up all existing components.

**Data flow:**
- `useSessionComputed(session)` returns `{ perQuestion, overview, avgAgreement, ... }`
- `usePerQuestionNotes(session.id)` returns `{ getNote, updateNote }`
- `perQuestion` passed to `QuestionCard` as `data`
- `overview` passed to `SessionOverviewCard` as `data`

**Layout order (therapist workflow):**
```
1. Back link + header
2. SessionOverviewCard (sticky, replaces inline summary cards)
3. EmotionTimelineHeatmap + QuestionMiniNav
4. SpikeContextPanel (if spike selected)
5. Per-question QuestionCards (each with ModelSubCard x3, FusionResultCard, PerQuestionNotes)
6. QwenReportSection (AI Session Summary)
7. Emotion Distribution
8. Detected Indicators
9. Emotional Event Report
10. Session-level Therapist Notes
```

#### 1.3 `SpikeContextPanel.tsx` — Add jump-to-question

Add a "Jump to Question" button that scrolls to the question card.

#### 1.4 `EmotionTimelineHeatmap.tsx` — Add multi-bar mode

Add optional `showModelBars` prop. When true, show 4 thin bars per question (FER/SER/LER/Fusion). Default false.

### Phase 2: UI hierarchy + explainability polish

Goal: Improve information hierarchy, pipeline visualization, confidence displays, and interactions. Only begin after Phase 1 compiles and all data flows correctly.

#### 2.1 Question Card pipeline visualization

Each QuestionCard must visually communicate the AI pipeline flow:

```
┌─────────────────────────────────────────────┐
│ Q1: "How are you feeling today?"            │
│ Spike badge (if applicable)                 │
├─────────────────────────────────────────────┤
│ Transcript                                  │
│ "I'm feeling a bit stressed about school..."│
│ Language: Filipino | Detected: Tagalog      │
├─────────────────────────────────────────────┤
│ AI Evidence (collapsible, default collapsed)│
│ ┌─────────────────────────────────────────┐ │
│ │ SER — Voice Tone                        │ │
│ │ Emotion: Angry  Confidence: 91%         │ │
│ │ [probability bars]                      │ │
│ │ Description: High vocal intensity...    │ │
│ └─────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────┐ │
│ │ FER — Facial Expression                 │ │
│ │ [captured frame thumbnail]              │ │
│ │ Emotion: Angry  Confidence: 48%         │ │
│ │ [probability bars]                      │ │
│ │ Description: Downward gaze...           │ │
│ └─────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────┐ │
│ │ LER — Language Analysis                 │ │
│ │ Emotion: Negative  Confidence: 84%      │ │
│ │ Keywords: stressed, failing, tired      │ │
│ │ [probability bars]                      │ │
│ └─────────────────────────────────────────┘ │
├─────────────────────────────────────────────┤
│ Fusion Result (always visible, highlighted) │
│ Final Emotion: Angry                        │
│ Fusion Confidence: 78%                      │
│ Agreement: High (SER ✓  FER ✓  LER ✗)     │
│ [AgreementBar]                              │
├─────────────────────────────────────────────┤
│ AI Explanation (from structured evidence)   │
│ "Speech analysis detected increased vocal   │
│ intensity. Language analysis identified     │
│ repeated negative wording regarding         │
│ academic stress. Facial analysis observed    │
│ a downward gaze and lip compression. The    │
│ fusion engine weighted speech highest       │
│ because it had the strongest confidence."   │
├─────────────────────────────────────────────┤
│ Therapist Notes (per-question, localStorage)│
│ [textarea]                                  │
└─────────────────────────────────────────────┘
```

Key points:
- **AI Evidence section starts collapsed** (progressive disclosure)
- **Fusion Result is always visible** and visually distinct (indigo border, highlighted)
- **Confidence badges show model confidence** for FER/SER/LER
- **Fusion confidence is separate** from model confidence
- **Agreement bar shows which models agree** with the fusion result

#### 2.2 Risk Level explanation

`SessionOverviewCard` must display risk level with supporting evidence:

```
Risk Level: Moderate
Reason:
  • Repeated anger indicators across 3 questions
  • Elevated speech intensity in Q2, Q4
  • Persistent negative language patterns
```

The reason is derived from:
- `session.emotional_spikes` — spike count and emotions
- `session.emotional_events` — event intensity levels
- Per-question agreement patterns — frequent disagreement = higher risk

Add `riskReasons: string[]` to `SessionOverviewData`.

#### 2.3 AI Session Summary improvements

Rename `QwenReportSection` header to "AI Session Summary". Add a disclaimer:

```
Assistive AI Summary
Generated using Qwen 3:4B
Based on: Fusion results, Transcript, Emotional progression

This summary is intended to support therapist review and is not a clinical diagnosis.
```

#### 2.4 Agreement visualization in FusionResultCard

Ensure `FusionResultCard` shows:
- Which models agree (checkmark) and disagree (X)
- Agreement label (High/Majority/Low)
- Brief reason when agreement is low (e.g., "SER and FER disagree")

#### 2.5 Confidence transparency

In `ConfidenceBadge` and `EmotionTag`, ensure:
- Model confidence shows as percentage (e.g., "91%")
- Fusion confidence is labeled "Fusion Confidence" not just "Confidence"
- Never show "100%" unless the value is actually 1.0

## Verification

### Phase 1
1. `npx vite build` — no TypeScript errors
2. Visual: SessionOverviewCard renders at top with correct data
3. Visual: QuestionCard renders for each question with FER/SER/LER sub-cards
4. Visual: FusionResultCard shows agreement bar and explanation
5. Visual: PerQuestionNotes saves to localStorage
6. Visual: QuestionMiniNav dots scroll to correct question
7. Visual: SpikeContextPanel "Jump to Question" scrolls correctly
8. Visual: QwenReportSection renders at bottom
9. Visual: Existing sections (Distribution, Indicators, Events, Notes) still work

### Phase 2
10. Visual: AI Evidence section starts collapsed, Fusion Result always visible
11. Visual: Risk Level shows reason bullets
12. Visual: AI Session Summary has disclaimer
13. Visual: Agreement bar shows agreeing/disagreeing models
14. Visual: Confidence labels distinguish model vs fusion
15. Visual: Pipeline flow is clear in QuestionCard layout
