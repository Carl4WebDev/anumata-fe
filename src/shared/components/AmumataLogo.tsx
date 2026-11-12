import { useId } from "react";

interface AmumataLogoProps {
  /** Width and height in pixels. */
  size?: number;
  /** "color": teal tile, white mark. "white": white tile, teal mark — for teal backgrounds. */
  variant?: "color" | "white";
  className?: string;
}

/**
 * The Amumata mark: an "A" whose crossbar is a gentle curve — a smile, or a
 * sound wave — for a system that listens. Same drawing as public/favicon.svg.
 */
export default function AmumataLogo({ size = 40, variant = "color", className = "" }: AmumataLogoProps) {
  const gradientId = `amumata-logo-${useId().replace(/:/g, "")}`;
  const white = variant === "white";
  const mark = white ? "#0f766e" : "#ffffff";

  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={`shrink-0 ${className}`}
      role="img"
      aria-label="Amumata logo"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2dd4bf" />
          <stop offset="1" stopColor="#0f766e" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="15" fill={white ? "#ffffff" : `url(#${gradientId})`} />
      <path
        d="M17.5 47 L32 16.5 L46.5 47"
        fill="none"
        stroke={mark}
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M23 35.5 Q32 42.5 41 35.5" fill="none" stroke={mark} strokeWidth="4.5" strokeLinecap="round" />
    </svg>
  );
}
