import { useState } from "react";
import { X } from "lucide-react";
import { PATIENT_CONCERNS as CONCERNS } from "../../../shared/constants/choices";
import type { AddPatientInput } from "../../context/patients/PatientsContext";
import ContactFields from "../components/ContactFields";
import { EMPTY_CONTACT } from "../components/contactValue";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: AddPatientInput) => Promise<{ ok: boolean; error?: string } | undefined>;
  existingNames?: string[];
}

export default function AddPatientModal({ isOpen, onClose, onSave, existingNames = [] }: Props) {
  const [fName, setFName] = useState("");
  const [mName, setMName] = useState("");
  const [lName, setLName] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [concern, setConcern] = useState("");
  const [contact, setContact] = useState(EMPTY_CONTACT);
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

    const fullName = `${fName.trim()} ${lName.trim()}`.toLowerCase();
    const nameExists = existingNames.some(
      (existing) => existing.toLowerCase().trim() === fullName
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
    const result = await onSave({
      f_name: fName.trim(),
      m_name: mName.trim() || undefined,
      l_name: lName.trim(),
      age: ageNum,
      gender,
      concern,
      contact_number: contact.contactNumber.trim() || undefined,
      email: contact.email.trim() || undefined,
    });
    setSubmitting(false);

    if (result?.ok) {
      setFName("");
      setMName("");
      setLName("");
      setAge("");
      setGender("");
      setConcern("");
      setContact(EMPTY_CONTACT);
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
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl md:p-8">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900">Add New Patient</h2>
          <button onClick={handleClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
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
                placeholder="Juan"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Last Name</label>
              <input
                type="text"
                value={lName}
                onChange={(e) => setLName(e.target.value)}
                placeholder="Dela Cruz"
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
              placeholder="Santos"
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
                placeholder="24"
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
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
            >
              <option value="">Select topic...</option>
              {CONCERNS.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
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
              onClick={handleClose}
              className="flex-1 rounded-xl border border-slate-200 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 rounded-lg bg-teal-600 py-3 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:opacity-50"
            >
              {submitting ? "Adding..." : "Add Patient"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}