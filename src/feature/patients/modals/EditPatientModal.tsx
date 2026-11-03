import { useState } from "react";
import { X } from "lucide-react";
import ContactFields from "../components/ContactFields";

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
  initial: {
    f_name: string;
    m_name: string | null;
    l_name: string;
    age: number;
    gender: string;
    primary_concern: string;
    contact_number: string | null;
    email: string | null;
    reminder_consent: boolean;
  };
  onSave: (data: {
    f_name: string;
    m_name?: string;
    l_name: string;
    age: number;
    gender: string;
    primary_concern: string;
    /** "" clears it. */
    contact_number: string;
    email: string;
    reminder_consent: boolean;
  }) => Promise<{ ok: boolean; error?: string }>;
}

export default function EditPatientModal({ isOpen, onClose, initial, onSave }: Props) {
  const [fName, setFName] = useState(initial.f_name);
  const [mName, setMName] = useState(initial.m_name ?? "");
  const [lName, setLName] = useState(initial.l_name);
  const [age, setAge] = useState(String(initial.age));
  const [gender, setGender] = useState(initial.gender);
  const [concern, setConcern] = useState(initial.primary_concern);
  const [contact, setContact] = useState({
    contactNumber: initial.contact_number ?? "",
    email: initial.email ?? "",
    reminderConsent: initial.reminder_consent,
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!fName.trim() || !lName.trim() || !age || !gender || !concern) {
      setError("All fields are required");
      return;
    }

    const ageNum = parseInt(age, 10);
    if (isNaN(ageNum) || ageNum < 10 || ageNum > 100) {
      setError("Please enter a valid age (10-100)");
      return;
    }

    setSubmitting(true);
    const result = await onSave({
      f_name: fName.trim(),
      m_name: mName.trim(),
      l_name: lName.trim(),
      age: ageNum,
      gender,
      primary_concern: concern,
      contact_number: contact.contactNumber.trim(),
      email: contact.email.trim(),
      reminder_consent: contact.reminderConsent && Boolean(contact.email.trim()),
    });
    setSubmitting(false);

    if (result.ok) {
      onClose();
    } else if (result.error) {
      setError(result.error);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl md:p-8">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900">Edit Patient</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">First Name</label>
              <input
                type="text"
                value={fName}
                onChange={(e) => setFName(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Last Name</label>
              <input
                type="text"
                value={lName}
                onChange={(e) => setLName(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Middle Name <span className="text-slate-400">(optional)</span></label>
            <input
              type="text"
              value={mName}
              onChange={(e) => setMName(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Age</label>
              <input
                type="number"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                min={10}
                max={100}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Gender</label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
              >
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
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
            >
              {CONCERNS.includes(concern) ? (
                CONCERNS.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))
              ) : (
                <>
                  <option value={concern}>{concern}</option>
                  {CONCERNS.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </>
              )}
            </select>
          </div>

          <ContactFields value={contact} onChange={setContact} />

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-center text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-slate-200 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 rounded-lg bg-teal-600 py-3 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:opacity-50"
            >
              {submitting ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
