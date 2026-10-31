import { useSyncExternalStore } from "react";
import { WifiOff } from "lucide-react";

const subscribe = (onChange: () => void) => {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
};

/** Say plainly when the connection drops, and what still works. */
export default function OfflineBanner() {
  const online = useSyncExternalStore(subscribe, () => navigator.onLine, () => true);
  if (online) return null;
  return (
    <div role="status" className="mb-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
      <WifiOff size={16} className="mt-0.5 shrink-0" />
      <span>
        You're offline. Showing what was already loaded — changes can't be saved until the connection is back.
      </span>
    </div>
  );
}
