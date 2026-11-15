/**
 * Everything "Ask Amumata" knows: the system's own info pages, flattened into
 * searchable entries. Built from the same data the pages show, so it is always
 * up to date. System knowledge only — no patient or session data.
 */

import { DEFENSE_QA } from "./defenseQA";
import { HOW_STEPS, READ_WITH_CARE } from "./howEmotionsWork";
import { MODEL_EVALUATIONS, READING_TIPS } from "../../settings/data/evaluationResults";
import { guideSections } from "../../settings/data/guideContent";
import { INTERVIEW_FEATURES } from "../../settings/data/interviewFeatures";
import { SYSTEM_UPDATES } from "../../settings/data/systemUpdates";

export type KnowledgeSource =
  | "Defense Q&A"
  | "Guide"
  | "What's New"
  | "Model Evaluation"
  | "How emotions work"
  | "Interview room";

export interface KnowledgeEntry {
  id: string;
  source: KnowledgeSource;
  title: string;
  text: string;
  /** Extra words that should match a search (not shown). */
  keywords?: string[];
}

const pct = (value: number): string => `${(value * 100).toFixed(2)}%`;

function fromDefenseQA(): KnowledgeEntry[] {
  return DEFENSE_QA.map((qa) => ({
    id: `qa:${qa.id}`,
    source: "Defense Q&A",
    title: qa.question,
    text: [qa.answer, qa.keyNumbers?.length ? `Key numbers: ${qa.keyNumbers.join(", ")}.` : ""].filter(Boolean).join("\n"),
    keywords: [qa.category, ...(qa.tags ?? [])],
  }));
}

function fromGuide(): KnowledgeEntry[] {
  return guideSections.flatMap((section) =>
    section.items.map((item) => ({
      id: `guide:${item.id}`,
      source: "Guide" as const,
      title: `${section.title}: ${item.title}`,
      text: item.content,
      keywords: item.tags,
    })),
  );
}

function fromUpdates(): KnowledgeEntry[] {
  return SYSTEM_UPDATES.map((update, index) => ({
    id: `update:${update.date}:${index}`,
    source: "What's New",
    title: `${update.date}: ${update.title}`,
    text: [
      ...update.groups.map((group) => `${group.area}:\n${group.changes.map((c) => `- ${c}`).join("\n")}`),
      update.deploySteps?.length ? `Live server steps:\n${update.deploySteps.map((s) => `- ${s}`).join("\n")}` : "",
    ]
      .filter(Boolean)
      .join("\n"),
  }));
}

function fromEvaluations(): KnowledgeEntry[] {
  const models = MODEL_EVALUATIONS.map((m) => ({
    id: `eval:${m.key}`,
    source: "Model Evaluation" as const,
    title: `${m.name} — test results`,
    text: [
      `${m.name}: ${m.backbone}, input ${m.input}. ${m.inFusion ? "Part of the session result." : "Not part of the session result."}`,
      `Accuracy ${pct(m.accuracy)}, macro F1 ${m.macroF1.toFixed(3)}, ${m.testSamples} test samples.`,
      `Per emotion F1: ${m.perClass.map((c) => `${c.label} ${c.f1.toFixed(3)}`).join(", ")}.`,
      `Data: ${m.datasets}.`,
      `Split: ${m.split}.`,
      `Training: ${m.training}`,
      ...m.notes,
    ].join("\n"),
    keywords: [m.key, "accuracy", "evaluation", "results"],
  }));
  const tips: KnowledgeEntry = {
    id: "eval:reading-tips",
    source: "Model Evaluation",
    title: "How to read the evaluation numbers",
    text: READING_TIPS.map((t) => `${t.term}: ${t.meaning}`).join("\n"),
  };
  return [...models, tips];
}

function fromHowEmotionsWork(): KnowledgeEntry[] {
  const steps = HOW_STEPS.map((step, index) => ({
    id: `how:${index + 1}`,
    source: "How emotions work" as const,
    title: step.title,
    text: [...step.plain, `Example: ${step.example}`].join("\n"),
    keywords: step.model ? [step.model] : undefined,
  }));
  const care: KnowledgeEntry = {
    id: "how:read-with-care",
    source: "How emotions work",
    title: "Things to keep in mind when reading the results",
    text: READ_WITH_CARE.join("\n"),
  };
  return [...steps, care];
}

function fromInterviewFeatures(): KnowledgeEntry[] {
  return INTERVIEW_FEATURES.flatMap((group) =>
    group.features.map((feature) => ({
      id: `room:${group.stage}:${feature.name}`,
      source: "Interview room" as const,
      title: `${feature.name} (${group.stage.toLowerCase()})`,
      text: [feature.what, feature.how ? `How: ${feature.how}` : ""].filter(Boolean).join("\n"),
    })),
  );
}

export function buildKnowledge(): KnowledgeEntry[] {
  return [
    ...fromDefenseQA(),
    ...fromEvaluations(),
    ...fromHowEmotionsWork(),
    ...fromInterviewFeatures(),
    ...fromUpdates(),
    ...fromGuide(),
  ];
}
