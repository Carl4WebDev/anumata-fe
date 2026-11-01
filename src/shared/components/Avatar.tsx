import { useState } from "react";

interface AvatarProps {
  name: string;
  src?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const sizeClasses: Record<string, string> = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-16 w-16 text-lg",
  xl: "h-24 w-24 text-2xl",
};

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

/**
 * Round patient/user avatar. Falls back to initials on a tinted circle
 * when no image is set or the image fails to load.
 */
export default function Avatar({ name, src, size = "md", className = "" }: AvatarProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const dim = sizeClasses[size] ?? sizeClasses.md;
  const imgFailed = src != null && failedSrc === src;

  if (src && !imgFailed) {
    return (
      <img
        src={src}
        alt={name}
        onError={() => setFailedSrc(src)}
        className={`${dim} shrink-0 rounded-full border border-slate-200 object-cover ${className}`}
      />
    );
  }

  return (
    <div
      aria-label={name}
      className={`${dim} flex shrink-0 items-center justify-center rounded-full border border-teal-100 bg-teal-50 font-semibold text-teal-700 ${className}`}
    >
      {getInitials(name)}
    </div>
  );
}
