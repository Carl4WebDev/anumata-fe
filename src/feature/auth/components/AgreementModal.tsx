import { useEffect } from "react";
import { ShieldCheck, X } from "lucide-react";
import { AGREEMENT_SECTIONS, TERMS_VERSION } from "../agreement";

interface AgreementModalProps {
  onClose: () => void;
  /** "I agree" — ticks the consent checkbox and closes. */
  onAgree: () => void;
}

/** Full Terms of Use, Privacy Notice and Responsible Use Agreement. */
export default function AgreementModal({ onClose, onAgree }: AgreementModalProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="agreement-title"
        className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-6 py-4">
          <div>
            <h2 id="agreement-title" className="flex items-center gap-2 text-lg font-semibold text-slate-900">
              <ShieldCheck size={20} className="text-teal-600" /> Amumata User Agreement
            </h2>
            <p className="text-xs text-slate-500">Terms of Use · Privacy Notice · Responsible Use · Version {TERMS_VERSION}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600" aria-label="Close agreement">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-4">
          {AGREEMENT_SECTIONS.map((section) => (
            <section key={section.title}>
              <h3 className="mb-2 text-sm font-semibold text-slate-900">{section.title}</h3>
              <ul className="space-y-1.5">
                {section.points.map((point) => (
                  <li key={point} className="flex gap-2 text-sm leading-relaxed text-slate-600">
                    <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-slate-400" />
                    {point}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-200 px-6 py-4">
          <button onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">
            Close
          </button>
          <button onClick={onAgree} className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700">
            I agree
          </button>
        </div>
      </div>
    </div>
  );
}
