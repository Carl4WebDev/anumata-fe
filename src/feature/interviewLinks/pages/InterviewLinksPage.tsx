import { useState } from "react";
import { Link2, Copy, Check, Trash2, ExternalLink } from "lucide-react";
import { useInterviewLinks } from "../../context/interviewLinks/useInterviewLinks";
import GenerateLinkModal from "../modals/GenerateLinkModal";
import LoadingSpinner from "../../../shared/components/LoadingSpinner";
import EmptyState from "../../../shared/components/EmptyState";
import { useToast } from "../../../shared/context/ToastContext";

export default function InterviewLinksPage() {
  const { links, generateLink, removeLink, loading, error } = useInterviewLinks();
  const { success } = useToast();
  const [showModal, setShowModal] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const handleCopy = async (token: string, id: number) => {
    const url = `${window.location.origin}/interview/${token}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const textArea = document.createElement("textarea");
      textArea.value = url;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
    }
    setCopiedId(id);
    success("Interview link copied to clipboard.");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleGenerate = async (data: Parameters<typeof generateLink>[0]) => {
    const result = await generateLink(data);
    if (result?.ok) {
      success("Interview link created successfully.");
      setShowModal(false);
    }
  };

  const handleDelete = async (id: number) => {
    await removeLink(id);
    success("Interview link deleted.");
  };

  if (loading) {
    return <LoadingSpinner message="Loading interview links..." />;
  }

  return (
    <div className="space-y-6 md:space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 md:text-4xl">Interview Links</h1>
          <p className="mt-1 text-sm text-slate-500">Generate and send AI interview links to clients.</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          <Link2 size={18} />
          Generate Link
        </button>
      </div>

      {/* Error */}
      {error && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Table — desktop */}
      <div className="hidden rounded-2xl border border-slate-200 bg-white shadow-sm md:block">
        <table className="w-full">
          <thead className="bg-slate-50">
            <tr>
              <th scope="col" className="p-4 text-left text-sm font-medium text-slate-500">Patient</th>
              <th scope="col" className="p-4 text-left text-sm font-medium text-slate-500">Template</th>
              <th scope="col" className="p-4 text-left text-sm font-medium text-slate-500">Status</th>
              <th scope="col" className="p-4 text-left text-sm font-medium text-slate-500">Created</th>
              <th scope="col" className="p-4 text-left text-sm font-medium text-slate-500">Actions</th>
            </tr>
          </thead>
          <tbody>
            {links.map((link) => (
              <tr key={link.id} className="border-t border-slate-100">
                <td className="p-4 font-medium">{link.patientName}</td>
                <td className="p-4 text-sm text-slate-500">{link.templateName}</td>
                <td className="p-4">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      link.status === "Completed"
                        ? "bg-green-50 text-green-600"
                        : link.status === "In Progress"
                          ? "bg-blue-50 text-blue-600"
                          : "bg-yellow-50 text-yellow-600"
                    }`}
                  >
                    {link.status}
                  </span>
                </td>
                <td className="p-4 text-sm text-slate-500">{link.createdAt}</td>
                <td className="p-4">
                  <div className="flex items-center gap-2">
                    <a
                      href={`/interview/${link.token}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-blue-50 hover:text-blue-600"
                      aria-label={`Open interview link for ${link.patientName}`}
                    >
                      <ExternalLink size={16} />
                    </a>
                    <button
                      onClick={() => handleCopy(link.token, link.id)}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-blue-50 hover:text-blue-600"
                      aria-label="Copy link"
                    >
                      {copiedId === link.id ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                    </button>
                    <button
                      onClick={() => handleDelete(link.id)}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500"
                      aria-label={`Delete interview link for ${link.patientName}`}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {links.length === 0 && (
              <tr>
                <td colSpan={5} className="p-8">
                  <EmptyState
                    icon={Link2}
                    title="No interview links yet"
                    description="Generate an interview link to send to a client for AI-assisted emotional pre-evaluation."
                    action={
                      <button
                        onClick={() => setShowModal(true)}
                        className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
                      >
                        <Link2 size={16} />
                        Generate Link
                      </button>
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
        {links.map((link) => (
          <div key={link.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium">{link.patientName}</p>
                <p className="text-xs text-slate-400">{link.templateName}</p>
              </div>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                  link.status === "Completed"
                    ? "bg-green-50 text-green-600"
                    : link.status === "In Progress"
                      ? "bg-blue-50 text-blue-600"
                      : "bg-yellow-50 text-yellow-600"
                }`}
              >
                {link.status}
              </span>
            </div>
            <p className="mt-2 text-xs text-slate-400">Created: {link.createdAt}</p>
            <div className="mt-3 flex items-center gap-2">
              <a
                href={`/interview/${link.token}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
              >
                <ExternalLink size={12} />
                Open
              </a>
              <button
                onClick={() => handleCopy(link.token, link.id)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
              >
                {copiedId === link.id ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
                {copiedId === link.id ? "Copied!" : "Copy"}
              </button>
              <button
                onClick={() => handleDelete(link.id)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500"
                aria-label={`Delete interview link for ${link.patientName}`}
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
        {links.length === 0 && (
          <EmptyState
            icon={Link2}
            title="No interview links yet"
            description="Generate an interview link to send to a client."
          />
        )}
      </div>

      {/* Modal */}
      <GenerateLinkModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onGenerate={handleGenerate}
      />
    </div>
  );
}
