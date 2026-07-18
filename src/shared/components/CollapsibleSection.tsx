import { useState, useCallback, type ReactNode } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

interface CollapsibleSectionProps {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
  className?: string;
  titleClassName?: string;
}

export default function CollapsibleSection({
  title,
  defaultOpen = false,
  children,
  className = "",
  titleClassName = "",
}: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  const toggle = useCallback(() => setOpen((p) => !p), []);

  return (
    <div className={className}>
      <button
        onClick={toggle}
        className={`flex w-full items-center justify-between text-left ${titleClassName}`}
        aria-expanded={open}
        aria-controls={`collapsible-${title.replace(/\s/g, "-").toLowerCase()}`}
      >
        <span>{title}</span>
        {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>
      {open && (
        <div id={`collapsible-${title.replace(/\s/g, "-").toLowerCase()}`} role="region">
          {children}
        </div>
      )}
    </div>
  );
}
