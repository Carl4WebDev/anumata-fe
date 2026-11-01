/**
 * Centralized emotion-to-color mapping for consistent styling across the app.
 */

interface EmotionColor {
  bg: string;
  text: string;
  border: string;
  fill: string;
  ring: string;
}

const EMOTION_COLORS: Record<string, EmotionColor> = {
  happy:    { bg: "bg-green-50",  text: "text-green-700",  border: "border-green-200",  fill: "#22c55e", ring: "ring-green-300" },
  sad:      { bg: "bg-blue-50",   text: "text-blue-700",   border: "border-blue-200",   fill: "#3b82f6", ring: "ring-blue-300" },
  angry:    { bg: "bg-red-50",    text: "text-red-700",    border: "border-red-200",    fill: "#ef4444", ring: "ring-red-300" },
  neutral:  { bg: "bg-slate-50",  text: "text-slate-700",  border: "border-slate-200",  fill: "#64748b", ring: "ring-slate-300" },
};

const DEFAULT_COLOR: EmotionColor = {
  bg: "bg-slate-50", text: "text-slate-700", border: "border-slate-200", fill: "#64748b", ring: "ring-slate-300",
};

export function getEmotionColor(emotion: string | null | undefined): EmotionColor {
  if (!emotion) return DEFAULT_COLOR;
  return EMOTION_COLORS[emotion.toLowerCase()] ?? DEFAULT_COLOR;
}

export function getEmotionFill(emotion: string | null | undefined): string {
  return getEmotionColor(emotion).fill;
}

export { EMOTION_COLORS, DEFAULT_COLOR };
