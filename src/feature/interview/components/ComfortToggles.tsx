import { ALargeSmall, Hourglass, Snail } from "lucide-react";

interface ComfortTogglesProps {
  largeText: boolean;
  slowVoice: boolean;
  moreTime: boolean;
  onToggleLargeText: () => void;
  onToggleSlowVoice: () => void;
  onToggleMoreTime: () => void;
  /** "light" = start screen (labelled buttons); "dark" = interview top bar (compact). */
  variant: "light" | "dark";
}

const STYLES = {
  light: {
    base: "flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition",
    on: "border-teal-600 bg-teal-50 text-teal-700",
    off: "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
  },
  dark: {
    base: "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition",
    on: "bg-teal-600 text-white",
    off: "bg-white/10 text-slate-300 hover:bg-white/20",
  },
};

/** Larger text / slower voice / more time to think — comfort options the patient can switch any time. */
export default function ComfortToggles({
  largeText,
  slowVoice,
  moreTime,
  onToggleLargeText,
  onToggleSlowVoice,
  onToggleMoreTime,
  variant,
}: ComfortTogglesProps) {
  const style = STYLES[variant];
  const options = [
    { label: "Larger text", on: largeText, onClick: onToggleLargeText, Icon: ALargeSmall },
    { label: "Slower voice", on: slowVoice, onClick: onToggleSlowVoice, Icon: Snail },
    { label: "More time to think", on: moreTime, onClick: onToggleMoreTime, Icon: Hourglass },
  ];
  return (
    <>
      {options.map(({ label, on, onClick, Icon }) => (
        <button
          key={label}
          type="button"
          onClick={onClick}
          aria-pressed={on}
          aria-label={label}
          title={label}
          className={`${style.base} ${on ? style.on : style.off}`}
        >
          <Icon size={variant === "light" ? 16 : 14} />
          {/* The top bar is tight on phones: icon only there. */}
          <span className={variant === "dark" ? "hidden sm:inline" : ""}>{label}</span>
        </button>
      ))}
    </>
  );
}
