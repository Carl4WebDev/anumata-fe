import { useState } from "react";
import { X } from "lucide-react";

const CONCERNS = [
  "Family Concerns",
  "Romantic Relationship",
  "Academic Stress",
  "Self Worth",
  "Anxiety",
  "Depression",
  "Other",
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { name: string; age: number; gender: string; concern: string }) => Promise<{ ok: boolean; error?: string } | undefined>;
  existingNames?: string[];
}

export default function AddPatientModal({ isOpen, onClose, onSave, existingNames = [] }: Props) {
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [concern, setConcern] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name.trim() || !age || !gender || !concern) {
      setError("All fields are required");
      return;
    }

    const nameExists = existingNames.some(
      (existing) => existing.toLowerCase().trim() === name.toLowerCase().trim()
    );
    if (nameExists) {
      setError("A patient with this name already exists.");
      return;
    }

    const ageNum = parseInt(age, 10);
    if (isNaN(ageNum) || ageNum < 10 || ageNum > 100) {
      setError("Please enter a valid age (10-100)");
      return;
    }

    setSubmitting(true);
    const result = await onSave({ name: name.trim(), age: ageNum, gender, concern });
    setSubmitting(false);

    if (result?.ok) {
      setName("");
      setAge("");
      setGender("");
      setConcern("");
      onClose();
    } else if (result?.error) {
      setError(result.error);
    }
  };

  const handleClose = () => {
    setError("");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl md:p-8">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900">Add New Patient</h2>
          <button onClick={handleClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Full Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Juan Dela Cruz"
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Age</label>
              <input
                type="number"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="24"
                min={10}
                max={100}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Gender</label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              >
                <option value="">Select...</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Interview Topic</label>
            <select
              value={concern}
              onChange={(e) => setConcern(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Select topic...</option>
              {CONCERNS.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-center text-sm text-red-700">
              {error}
            </div>
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
              disabled={submitting}
              className="flex-1 rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting ? "Adding..." : "Add Patient"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
