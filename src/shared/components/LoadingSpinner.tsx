import { Loader2 } from "lucide-react";

interface LoadingSpinnerProps {
  message?: string;
  size?: number;
}

export default function LoadingSpinner({ message = "Loading...", size = 24 }: LoadingSpinnerProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12" role="status" aria-live="polite">
      <Loader2 size={size} className="animate-spin text-teal-600 mb-3" />
      <p className="text-sm text-slate-500">{message}</p>
    </div>
  );
}
