import { memo } from "react";
import { getEmotionColor } from "../utils/emotionColors";

interface EmotionTagProps {
  emotion: string | null | undefined;
  size?: "sm" | "md";
}

function EmotionTag({ emotion, size = "md" }: EmotionTagProps) {
  const display = emotion || "Unknown";
  const colors = getEmotionColor(display);
  const sizeClasses = size === "sm" ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-xs";

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${colors.bg} ${colors.text} ${colors.border} border ${sizeClasses}`}
    >
      {display}
    </span>
  );
}

export default memo(EmotionTag);
