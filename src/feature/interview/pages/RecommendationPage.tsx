import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import {
  Heart,
  AlertTriangle,
  Phone,
  Shield,
  ChevronRight,
  ArrowLeft,
} from "lucide-react";
import { Link } from "react-router-dom";

interface ResultData {
  token: string;
  patientName: string;
  templateName: string;
  duration: number;
  completedAt: string;
}

// Simulated recommendation based on risk level
const RISK_LEVEL = "Moderate";
const INDICATORS = ["Sadness", "Mild anxiety"];

const RECOMMENDATIONS: Record<string, { heading: string; color: string; steps: { icon: typeof Heart; title: string; desc: string }[] }> = {
  Low: {
    heading: "Low Risk — Self-Care & Monitoring",
    color: "bg-green-50 border-green-200 text-green-800",
    steps: [
      { icon: Heart, title: "Practice self-care", desc: "Continue healthy habits: sleep, exercise, social connection, and mindfulness." },
      { icon: Shield, title: "Monitor your feelings", desc: "Pay attention to changes in your emotional state. Journaling can help." },
      { icon: ChevronRight, title: "Follow up if needed", desc: "If feelings persist or worsen, consider scheduling a session with your therapist." },
    ],
  },
  Moderate: {
    heading: "Moderate Risk — Professional Consultation Recommended",
    color: "bg-yellow-50 border-yellow-200 text-yellow-800",
    steps: [
      { icon: Heart, title: "Continue self-care", desc: "Maintain healthy routines while waiting for your therapist session." },
      { icon: AlertTriangle, title: "Seek consultation", desc: "Consider scheduling a session with a mental health professional to discuss your results." },
      { icon: Shield, title: "Stay connected", desc: "Reach out to trusted friends or family. You don't have to go through this alone." },
      { icon: ChevronRight, title: "Avoid major decisions", desc: "When emotionally overwhelmed, postpone important life decisions until you feel more stable." },
    ],
  },
  High: {
    heading: "High Risk — Immediate Professional Consultation Strongly Recommended",
    color: "bg-red-50 border-red-200 text-red-800",
    steps: [
      { icon: Phone, title: "Contact a professional immediately", desc: "Reach out to a mental health professional or visit the nearest hospital." },
      { icon: Phone, title: "Crisis hotlines", desc: "In the Philippines: Hopeline (0917-558-4673), In Touch (0917-800-1123), Tawag Paglaum (0939-936-5233)." },
      { icon: Shield, title: "Tell someone you trust", desc: "Let a friend, family member, or colleague know what you are going through." },
      { icon: Heart, title: "You are not alone", desc: "Seeking help is a sign of strength. Professional support is available." },
    ],
  },
};

export default function RecommendationPage() {
  const { token } = useParams();
  const [result, setResult] = useState<ResultData | null>(null);

  useEffect(() => {
    if (!token) return;
    const stored = localStorage.getItem(`amumata_result_${token}`);
    if (stored) setResult(JSON.parse(stored));
  }, [token]);

  const recommendation = RECOMMENDATIONS[RISK_LEVEL] ?? RECOMMENDATIONS["Moderate"];

  return (
    <div className="min-h-screen bg-[#F1F5F9] px-4 py-8">
      <div className="mx-auto max-w-3xl">
        {/* Back link */}
        <Link
          to={`/interview/${token}/results`}
          className="mb-6 inline-flex items-center gap-2 text-sm text-blue-600 hover:underline"
        >
          <ArrowLeft size={16} />
          Back to Results
        </Link>

        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">Recommendation</h1>
          {result && (
            <p className="mt-2 text-sm text-slate-500">
              For: {result.patientName}
            </p>
          )}
        </div>

        {/* Risk Banner */}
        <div className={`mb-6 rounded-2xl border p-6 ${recommendation.color}`}>
          <h2 className="text-lg font-bold">{recommendation.heading}</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {INDICATORS.map((ind) => (
              <span
                key={ind}
                className="rounded-full bg-white/60 px-3 py-1 text-xs font-semibold"
              >
                {ind}
              </span>
            ))}
          </div>
        </div>

        {/* Steps */}
        <div className="mb-6 space-y-4">
          {recommendation.steps.map((step, i) => {
            const Icon = step.icon;
            return (
              <div
                key={i}
                className="flex gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-50">
                  <Icon size={20} className="text-blue-600" />
                </div>
                <div>
                  <p className="font-semibold text-slate-900">{step.title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-slate-500">{step.desc}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Crisis box for High risk */}
        {RISK_LEVEL === "High" && (
          <div className="mb-6 rounded-2xl border-2 border-red-200 bg-red-50 p-6">
            <div className="flex items-start gap-3">
              <Phone size={24} className="shrink-0 text-red-600" />
              <div>
                <p className="font-bold text-red-800">Crisis Helplines (Philippines)</p>
                <ul className="mt-2 space-y-1 text-sm text-red-700">
                  <li>Hopeline: 0917-558-4673</li>
                  <li>In Touch Crisis Line: 0917-800-1123</li>
                  <li>Tawag Paglaum: 0939-936-5233</li>
                  <li>National Center for Mental Health: 0917-899-8727</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Disclaimer */}
        <div className="mb-6 rounded-2xl border border-orange-200 bg-orange-50 p-5">
          <p className="text-sm text-orange-700">
            <strong>Disclaimer:</strong> This recommendation is AI-generated based on
            emotional pre-evaluation data. It is not a clinical diagnosis. Always
            consult a licensed mental health professional for proper assessment and
            treatment.
          </p>
        </div>

        {/* Footer info */}
        <p className="text-center text-xs text-slate-400">
          Amumata — AI-Assisted Emotional Pre-Evaluation System &bull; Davao City, 2025
        </p>
      </div>
    </div>
  );
}
