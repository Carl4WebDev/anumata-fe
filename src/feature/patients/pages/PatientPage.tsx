import { useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Search } from "lucide-react";
import { usePatients } from "../../context/patients/usePatients";
import AddPatientModal from "../modals/AddPatientModal";

export default function PatientsPage() {
  const { patients, addPatient } = usePatients();
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);

  const filtered = patients.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 md:space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 md:text-4xl">Patients</h1>
          <p className="mt-1 text-sm text-slate-500">Manage therapist clients and interview history.</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          <Plus size={18} />
          Add Patient
        </button>
      </div>

      {/* Search */}
      <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <Search size={18} className="shrink-0 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search patients..."
          className="w-full text-sm outline-none"
        />
      </div>

      {/* Table — desktop */}
      <div className="hidden rounded-2xl border border-slate-200 bg-white shadow-sm md:block">
        <table className="w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className="p-4 text-left text-sm font-medium text-slate-500">Name</th>
              <th className="p-4 text-left text-sm font-medium text-slate-500">Concern</th>
              <th className="p-4 text-left text-sm font-medium text-slate-500">Sessions</th>
              <th className="p-4 text-left text-sm font-medium text-slate-500">Risk</th>
              <th className="p-4 text-left text-sm font-medium text-slate-500">Last Interview</th>
              <th className="p-4 text-left text-sm font-medium text-slate-500">Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((patient) => (
              <tr key={patient.id} className="border-t border-slate-100">
                <td className="p-4">
                  <div>
                    <span className="font-medium">{patient.name}</span>
                    <p className="text-xs text-slate-400">{patient.age} &middot; {patient.gender}</p>
                  </div>
                </td>
                <td className="p-4 text-sm text-slate-500">{patient.concern}</td>
                <td className="p-4 text-sm text-slate-500">{patient.sessions}</td>
                <td className="p-4">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      patient.risk === "High"
                        ? "bg-red-50 text-red-600"
                        : patient.risk === "Moderate"
                          ? "bg-yellow-50 text-yellow-600"
                          : patient.risk === "Low"
                            ? "bg-green-50 text-green-600"
                            : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {patient.risk}
                  </span>
                </td>
                <td className="p-4 text-sm text-slate-500">{patient.lastInterview}</td>
                <td className="p-4">
                  <Link to={`/patients/${patient.id}`} className="text-sm font-medium text-blue-600 hover:underline">
                    View
                  </Link>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-sm text-slate-400">
                  No patients found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Cards — mobile */}
      <div className="space-y-3 md:hidden">
        {filtered.map((patient) => (
          <div key={patient.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium">{patient.name}</p>
                <p className="text-xs text-slate-400">{patient.age} &middot; {patient.gender} &middot; {patient.concern}</p>
              </div>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                  patient.risk === "High"
                    ? "bg-red-50 text-red-600"
                    : patient.risk === "Moderate"
                      ? "bg-yellow-50 text-yellow-600"
                      : patient.risk === "Low"
                        ? "bg-green-50 text-green-600"
                        : "bg-slate-100 text-slate-500"
                }`}
              >
                {patient.risk}
              </span>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <span className="text-xs text-slate-400">{patient.sessions} sessions &middot; {patient.lastInterview}</span>
              <Link to={`/patients/${patient.id}`} className="text-sm font-medium text-blue-600">
                View
              </Link>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="py-8 text-center text-sm text-slate-400">No patients found.</p>
        )}
      </div>

      {/* Modal */}
      <AddPatientModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSave={addPatient}
      />
    </div>
  );
}
