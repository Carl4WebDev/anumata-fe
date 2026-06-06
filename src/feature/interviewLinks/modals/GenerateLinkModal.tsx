import { useState } from "react";
import { X, Check, Copy } from "lucide-react";
import { usePatients } from "../../context/patients/usePatients";
import { useQuestionSets } from "../../context/questionSets/useQuestionSets";
import { storeLink } from "../../../shared/utils/interviewStore";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (data: { patientId: number; patientName: string; templateName: string }) => { ok: boolean; data: { token: string } };
}

export default function GenerateLinkModal({ isOpen, onClose, onGenerate }: Props) {
  const { patients } = usePatients();
  const { questionSets } = useQuestionSets();

  const [patientId, setPatientId] = useState("");
  const [templateName, setTemplateName] = useState("");
  const [error, setError] = useState("");
  const [generated, setGenerated] = useState<{ url: string; patientName: string; templateName: string } | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!patientId || !templateName) {
      setError("Please select a patient and a template");
      return;
    }

    const patient = patients.find((p) => p.id === Number(patientId));
    if (!patient) return;

    const template = questionSets.find((qs) => qs.name === templateName);
    const res = onGenerate({ patientId: patient.id, patientName: patient.name, templateName });
    if (res?.ok) {
      const url = `${window.location.origin}/interview/${res.data.token}`;
      setGenerated({ url, patientName: patient.name, templateName });

      // Persist to localStorage so public interview pages can access it
      storeLink({
        token: res.data.token,
        patientName: patient.name,
        templateName,
        questions: template?.questions ?? [],
        createdAt: new Date().toISOString(),
      });
    }
  };

  const handleCopy = async () => {
    if (!generated) return;
    try {
      await navigator.clipboard.writeText(generated.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = generated.url;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleClose = () => {
    setPatientId("");
    setTemplateName("");
    setError("");
    setGenerated(null);
    setCopied(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl md:p-8">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900">
            {generated ? "Link Generated" : "Generate Interview Link"}
          </h2>
          <button onClick={handleClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>

        {generated ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Patient</p>
              <p className="font-medium">{generated.patientName}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Template</p>
              <p className="font-medium">{generated.templateName}</p>
            </div>
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
              <p className="mb-2 text-sm font-medium text-blue-700">Interview Link</p>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={generated.url}
                  readOnly
                  className="w-full rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm text-slate-700"
                />
                <button
                  onClick={handleCopy}
                  className="shrink-0 rounded-lg bg-blue-600 p-2.5 text-white transition hover:bg-blue-700"
                  title="Copy link"
                >
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                </button>
              </div>
              {copied && <p className="mt-2 text-xs text-green-600">Copied to clipboard!</p>}
            </div>
            <p className="text-xs text-slate-400">
              Send this link to the client. They will see a consent page before starting the interview.
            </p>
            <button
              onClick={handleClose}
              className="w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              Done
            </button>
          </div>
        ) : (
          <form className="space-y-4" onSubmit={handleGenerate}>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Select Patient</label>
              <select
                value={patientId}
                onChange={(e) => setPatientId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              >
                <option value="">Choose a patient...</option>
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Select Template</label>
              <select
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              >
                <option value="">Choose a template...</option>
                {questionSets.map((qs) => (
                  <option key={qs.id} value={qs.name}>{qs.name} ({qs.questions.length} questions)</option>
                ))}
              </select>
            </div>

            {error && <p className="text-center text-sm text-red-600">{error}</p>}

            {patients.length === 0 && (
              <p className="text-center text-sm text-slate-400">Add a patient first to generate a link.</p>
            )}
            {questionSets.length === 0 && (
              <p className="text-center text-sm text-slate-400">Create a question template first.</p>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 rounded-xl border border-slate-200 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={patients.length === 0 || questionSets.length === 0}
                className="flex-1 rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
              >
                Generate Link
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
