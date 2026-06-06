import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Shield, Camera, Mic, FileText, AlertTriangle } from "lucide-react";

export default function ConsentPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState("");

  const handleProceed = () => {
    if (!agreed) {
      setError("You must agree to the terms before proceeding.");
      return;
    }
    setError("");
    // Navigate to the interview room (next task in the flow)
    navigate(`/interview/${token}/room`);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F1F5F9] px-4 py-8">
      <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-md border border-slate-200 md:p-8">
        {/* Header */}
        <div className="mb-6 flex items-center gap-3 justify-center">
          <div className="w-12 h-12 rounded-2xl bg-cyan-500 flex items-center justify-center text-xl font-bold text-white">
            A
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Amumata</h1>
            <p className="text-sm text-slate-500">AI-Assisted Emotional Pre-Evaluation</p>
          </div>
        </div>

        <div className="mb-6 text-center">
          <h2 className="text-2xl font-bold text-slate-900">Informed Consent</h2>
          <p className="mt-2 text-sm text-slate-500">Please read carefully before proceeding.</p>
        </div>

        {/* What happens */}
        <div className="space-y-4 mb-6">
          <div className="flex gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-50">
              <Camera size={18} className="text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-900">Camera Access</p>
              <p className="text-xs text-slate-500">
                Your facial expressions will be analyzed in real time to detect emotional indicators.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-50">
              <Mic size={18} className="text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-900">Microphone Access</p>
              <p className="text-xs text-slate-500">
                Your voice will be recorded and analyzed for speech tone and emotional patterns.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-50">
              <FileText size={18} className="text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-900">Structured Interview</p>
              <p className="text-xs text-slate-500">
                You will be asked 6 standardized questions. Answer naturally and take your time.
              </p>
            </div>
          </div>
        </div>

        {/* Privacy notice */}
        <div className="mb-6 rounded-xl border-l-4 border-blue-500 bg-blue-50 p-4">
          <div className="flex gap-2 items-start">
            <Shield size={18} className="text-blue-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-blue-800 mb-1">Data Privacy (RA 10173)</p>
              <p className="text-xs text-blue-700 leading-relaxed">
                Your data is collected solely for emotional pre-evaluation purposes.
                All recordings and analysis results are kept confidential and will only
                be shared with your assigned therapist. You may request deletion of your
                data at any time.
              </p>
            </div>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="mb-6 rounded-xl border border-orange-200 bg-orange-50 p-4">
          <div className="flex gap-2 items-start">
            <AlertTriangle size={18} className="text-orange-600 shrink-0 mt-0.5" />
            <p className="text-xs text-orange-700 leading-relaxed">
              <strong>Disclaimer:</strong> This system does not provide a clinical diagnosis.
              It detects emotional indicators and generates a pre-evaluation report
              for your therapist to review. The final diagnosis and treatment plan
              will be determined by a licensed mental health professional.
            </p>
          </div>
        </div>

        {/* Checkbox */}
        <label className="mb-6 flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-1 h-5 w-5 shrink-0 accent-blue-600"
          />
          <span className="text-sm text-slate-700">
            I understand how my data will be used, I consent to camera and microphone
            access, and I agree to proceed with the AI-assisted interview.
          </span>
        </label>

        {error && <p className="mb-4 text-center text-sm text-red-600">{error}</p>}

        <button
          onClick={handleProceed}
          disabled={!agreed}
          className="w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          I Agree — Start Interview
        </button>

        <p className="mt-4 text-center text-xs text-slate-400">
          Interview token: {token}
        </p>
      </div>
    </div>
  );
}
