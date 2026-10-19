import { useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Search, Users } from "lucide-react";
import { usePatients } from "../../context/patients/usePatients";
import AddPatientModal from "../modals/AddPatientModal";
import LoadingSpinner from "../../../shared/components/LoadingSpinner";
import EmptyState from "../../../shared/components/EmptyState";
import { useToast } from "../../../shared/context/ToastContext";

export default function PatientsPage() {
  const { patients, addPatient, loading, error } = usePatients();
  const { success } = useToast();
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);

  const filtered = patients.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleSave = async (patient: Parameters<typeof addPatient>[0]) => {
    const result = await addPatient(patient);
    if (result?.ok) {
      success("Patient added successfully.");
    }
    return result;
  };

  if (loading) {
    return <LoadingSpinner message="Loading patients..." />;
  }

  return (
    <div className="space-y-6 md:space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 md:text-4xl">Patients</h1>
          <p className="mt-1 text-sm text-slate-500">Manage patients and interview history.</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-teal-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-teal-700"
        >
          <Plus size={18} />
          Add Patient
        </button>
      </div>

      {/* Error */}
      {error && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Search */}
      <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <Search size={18} className="shrink-0 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search patients..."
          aria-label="Search patients"
          className="w-full text-sm outline-none"
        />
      </div>

      {/* Table — desktop */}
      <div className="hidden rounded-xl border border-slate-200 bg-white shadow-sm md:block">
        <table className="w-full">
          <thead className="bg-slate-50">
            <tr>
              <th scope="col" className="p-4 text-left text-sm font-medium text-slate-500">Name</th>
              <th scope="col" className="p-4 text-left text-sm font-medium text-slate-500">Sessions</th>
              <th scope="col" className="p-4 text-left text-sm font-medium text-slate-500">Risk</th>
              <th scope="col" className="p-4 text-left text-sm font-medium text-slate-500">Last Interview</th>
              <th scope="col" className="p-4 text-left text-sm font-medium text-slate-500">Action</th>
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
                <td className="p-4 text-sm text-slate-500">{patient.sessions}</td>
                <td className="p-4">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      patient.risk === "High"
                        ? "bg-red-50 text-red-700"
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
                  <Link to={`/patients/${patient.id}`} className="text-sm font-medium text-teal-600 hover:underline">
                    View
                  </Link>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="p-8">
                  <EmptyState
                    icon={Users}
                    title={search ? "No patients match your search" : "No patients yet"}
                    description={search ? "Try a different search term." : "Add your first patient to get started."}
                    action={
                      !search ? (
                        <button
                          onClick={() => setShowModal(true)}
                          className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 transition-colors"
                        >
                          <Plus size={16} />
                          Add Patient
                        </button>
                      ) : undefined
                    }
                  />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Cards — mobile */}
      <div className="space-y-3 md:hidden">
        {filtered.map((patient) => (
          <div key={patient.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium">{patient.name}</p>
                <p className="text-xs text-slate-400">{patient.age} &middot; {patient.gender}</p>
              </div>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                  patient.risk === "High"
                    ? "bg-red-50 text-red-600"
                    : patient.risk === "Moderate"
                      ? "bg-amber-50 text-amber-700"
                      : patient.risk === "Low"
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-slate-100 text-slate-600"
                }`}
              >
                {patient.risk}
              </span>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <span className="text-xs text-slate-400">{patient.sessions} sessions &middot; {patient.lastInterview}</span>
              <Link to={`/patients/${patient.id}`} className="text-sm font-medium text-teal-600">
                View
              </Link>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <EmptyState
            icon={Users}
            title={search ? "No patients match your search" : "No patients yet"}
            description={search ? "Try a different search term." : "Add your first patient to get started."}
          />
        )}
      </div>

      {/* Modal */}
      <AddPatientModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSave={handleSave}
        existingNames={patients.map((p) => p.name)}
      />
    </div>
  );
}
