import { useState } from "react";

const OTHER = "__other__";

interface ChoiceInputProps {
  value: string;
  onChange: (value: string) => void;
  /** Preset choices shown in the dropdown. */
  options: readonly string[];
  placeholder?: string;
  /** Placeholder for the free-text box shown after picking "Other". */
  otherPlaceholder?: string;
  maxLength?: number;
  className?: string;
  ariaLabel?: string;
}

/**
 * Dropdown of common choices with an "Other…" entry that reveals a text box,
 * so typical values are one click and anything else can still be typed.
 */
export default function ChoiceInput({
  value,
  onChange,
  options,
  placeholder = "Select…",
  otherPlaceholder = "Type your own",
  maxLength = 255,
  className = "",
  ariaLabel,
}: ChoiceInputProps) {
  // A starting value that isn't a preset (e.g. editing old data) opens in "Other" mode.
  const [custom, setCustom] = useState(value !== "" && !options.includes(value));

  return (
    <div className="space-y-2">
      <select
        value={custom ? OTHER : value}
        aria-label={ariaLabel}
        onChange={(e) => {
          if (e.target.value === OTHER) {
            setCustom(true);
            onChange("");
          } else {
            setCustom(false);
            onChange(e.target.value);
          }
        }}
        className={className}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
        <option value={OTHER}>Other (type your own)…</option>
      </select>
      {custom && (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={otherPlaceholder}
          maxLength={maxLength}
          autoFocus
          aria-label={ariaLabel ? `${ariaLabel} (custom)` : undefined}
          className={className}
        />
      )}
    </div>
  );
}
