import { Link } from "react-router-dom";
import {
  Video,
  Brain,
  FileText,
  Shield,
  TrendingUp,
  MessageSquare,
  ChevronRight,
  ArrowRight,
  Activity,
  LineChart,
} from "lucide-react";

const steps = [
  { num: "01", label: "Therapist creates an interview", tag: "Setup", color: "bg-blue-50 text-blue-600" },
  { num: "02", label: "Client opens the interview link", tag: "Start", color: "bg-teal-50 text-teal-600" },
  { num: "03", label: "AI asks standardized questions", tag: "Interview", color: "bg-blue-50 text-blue-600" },
  { num: "04", label: "Client responds through video and audio", tag: "Capture", color: "bg-teal-50 text-teal-600" },
  { num: "05", label: "FER, SER, and LER analyze each response", tag: "Analysis", color: "bg-blue-50 text-blue-600" },
  { num: "06", label: "Multimodal fusion combines emotional evidence", tag: "Fusion", color: "bg-teal-50 text-teal-600" },
  { num: "07", label: "System generates a structured pre-evaluation report", tag: "Report", color: "bg-blue-50 text-blue-600" },
  { num: "08", label: "Therapist reviews emotional indicators and patterns", tag: "Review", color: "bg-teal-50 text-teal-600" },
];

const features = [
  {
    icon: Video,
    title: "Facial Expression Recognition",
    desc: "Analyzes recorded facial expressions and identifies emotional states such as happy, sad, angry, and neutral.",
  },
  {
    icon: MessageSquare,
    title: "Speech Emotion Recognition",
    desc: "Analyzes vocal characteristics and speech patterns to identify emotional cues from the client's recorded response.",
  },
  {
    icon: Brain,
    title: "Language Emotion Recognition",
    desc: "Analyzes the transcribed response for language-based emotional cues.",
  },
  {
    icon: TrendingUp,
    title: "Multimodal Emotion Fusion",
    desc: "Combines FER, SER, and LER results while considering modality availability, confidence, and disagreement between models.",
  },
  {
    icon: Activity,
    title: "Emotional Spike Detection",
    desc: "Identifies notable emotional shifts and high-confidence emotional signals that may require therapist attention.",
  },
  {
    icon: FileText,
    title: "AI-Assisted Pre-Evaluation Report",
    desc: "Generates structured session summaries, key emotional findings, areas for attention, suggested therapist focus, and follow-up questions.",
  },
  {
    icon: LineChart,
    title: "Emotional Progress Tracking",
    desc: "View emotional patterns and detected indicators across completed sessions to help therapists identify changes and recurring emotional patterns over time.",
  },
  {
    icon: Shield,
    title: "Privacy-Aware Design",
    desc: "Designed with privacy and data protection considerations in mind, with AI-assisted outputs intended to support therapist review rather than replace professional judgment.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#F1F5F9]">
      {/* Top Nav */}
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 md:px-8">
          <Link to="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-500 text-lg font-bold text-white">
              A
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900">Anumata</h1>
              <p className="hidden text-xs text-slate-500 sm:block">AI-assisted emotional pre-evaluation</p>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="rounded-xl px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
            >
              Login
            </Link>
            <Link
              to="/login"
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 pb-16 pt-12 md:px-8 md:pb-24 md:pt-20">
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <div>
            <span className="mb-4 inline-block rounded-full bg-blue-50 px-4 py-1.5 text-xs font-semibold text-blue-600">
              Facial Expression &bull; Speech Emotion &bull; Language Analysis
            </span>
            <h1 className="text-3xl font-bold leading-tight text-slate-900 md:text-5xl lg:text-[3.5rem]">
              AI-assisted emotional pre-evaluation{" "}
              <span className="text-blue-600">for therapists</span>.
            </h1>
            <p className="mt-5 max-w-lg text-base leading-relaxed text-slate-600 md:text-lg">
              Anumata guides clients through standardized therapist-informed questions, records their
              responses, analyzes facial expressions, speech emotion, and language-based emotional cues,
              and generates structured pre-evaluation insights for therapist review.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                to="/login"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                Start Prototype
                <ArrowRight size={16} />
              </Link>
              <a
                href="#how-it-works"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                View Interview Flow
              </a>
            </div>
          </div>

          {/* Visual Card */}
          <div className="hidden lg:block">
            <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-lg">
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-2xl">
                  <Video size={24} className="text-blue-600" />
                </div>
                <div>
                  <p className="font-semibold text-slate-900">Interview Room</p>
                  <p className="text-sm text-slate-500">Question 2 of 4</p>
                </div>
                <div className="ml-auto flex items-center gap-2">
                  <span className="h-3 w-3 animate-pulse rounded-full bg-red-500" />
                  <span className="text-xs font-medium text-red-500">Recording</span>
                </div>
              </div>

              <div className="mb-6 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 p-12 text-center">
                <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-slate-200 text-3xl">
                  🙂
                </div>
                <p className="text-sm text-slate-500">Camera Preview</p>
              </div>

              <div className="rounded-xl border-l-4 border-blue-500 bg-blue-50 p-4">
                <p className="text-sm font-medium text-blue-900">
                  Can you tell me about a situation with your family that has been affecting you recently?
                </p>
              </div>

              <div className="mt-6 flex gap-2">
                {[45, 60, 80, 55, 70, 40, 65, 50].map((h, i) => (
                  <div key={i} className="flex-1 rounded-full bg-slate-100">
                    <div
                      className="rounded-full bg-gradient-to-t from-blue-600 to-teal-400 transition-all"
                      style={{ height: `${h}px` }}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Core Flow */}
      <section id="how-it-works" className="border-y border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-16 md:px-8 md:py-24">
          <div className="mb-12 text-center">
            <h2 className="text-2xl font-bold text-slate-900 md:text-3xl">Core Flow</h2>
            <p className="mt-3 text-slate-500">How Anumata works from interview setup to therapist review.</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((step) => (
              <div
                key={step.num}
                className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-[#F1F5F9] p-5 transition hover:shadow-md"
              >
                <span className="text-2xl font-bold text-slate-300">{step.num}</span>
                <span className="flex-1 text-sm font-medium text-slate-700">{step.label}</span>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${step.color}`}>
                  {step.tag}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-[#F1F5F9]">
        <div className="mx-auto max-w-6xl px-4 py-16 md:px-8 md:py-24">
          <div className="mb-12 text-center">
            <h2 className="text-2xl font-bold text-slate-900 md:text-3xl">Key Features</h2>
            <p className="mt-3 text-slate-500">
              Combining facial expression, speech tone, and language analysis for emotional pre-evaluation.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md"
                >
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50">
                    <Icon size={22} className="text-blue-600" />
                  </div>
                  <h3 className="mb-2 text-base font-semibold text-slate-900">{feature.title}</h3>
                  <p className="text-sm leading-relaxed text-slate-500">{feature.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* What Anumata Outputs */}
      <section className="border-y border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-16 md:px-8 md:py-24">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 md:text-3xl">
                Not a diagnosis. A head start.
              </h2>
              <p className="mt-4 text-base leading-relaxed text-slate-600">
                Anumata does not provide clinical diagnoses. It detects emotional indicators,
                flags spikes, and generates AI-assisted guidance for the therapist to review — so
                the first real session starts with structured data, not cold questions.
              </p>
              <div className="mt-8 space-y-4">
                {[
                  { label: "Emotional Distribution", value: "Per-session breakdown of detected emotions across all questions" },
                  { label: "Emotional Spikes", value: "Notable shifts and high-confidence signals flagged for review" },
                  { label: "Areas for Attention", value: "AI-identified patterns that may warrant therapist focus" },
                  { label: "Suggested Follow-Up Questions", value: "Contextual questions generated to guide the next session" },
                  { label: "Evidence Quality", value: "Modality availability and confidence indicators per question" },
                ].map((item) => (
                  <div key={item.label} className="flex items-start gap-3">
                    <ChevronRight size={16} className="mt-0.5 shrink-0 text-blue-600" />
                    <div>
                      <p className="text-sm font-medium text-slate-700">{item.label}</p>
                      <p className="text-sm text-slate-500">{item.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Sample Output Card */}
            <div className="rounded-3xl border border-slate-200 bg-[#F1F5F9] p-6 md:p-8">
              <div className="mb-6 flex items-center justify-between">
                <h3 className="font-semibold text-slate-900">Pre-Evaluation Report</h3>
                <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                  2 Spikes Detected
                </span>
              </div>

              <div className="mb-5 space-y-3">
                {[
                  { label: "Sad", pct: 58, color: "bg-blue-500" },
                  { label: "Neutral", pct: 22, color: "bg-slate-400" },
                  { label: "Angry", pct: 12, color: "bg-red-500" },
                  { label: "Happy", pct: 8, color: "bg-green-500" },
                ].map((e) => (
                  <div key={e.label}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span className="text-slate-700">{e.label}</span>
                      <span className="text-slate-500">{e.pct}%</span>
                    </div>
                    <div className="h-2.5 w-full rounded-full bg-slate-200">
                      <div className={`h-full rounded-full ${e.color}`} style={{ width: `${e.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>

              <div className="mb-4 rounded-xl border-l-4 border-amber-400 bg-amber-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-600">Areas for Attention</p>
                <p className="mt-1 text-sm text-amber-800">
                  Persistent sad affect across sessions. Elevated anger indicator in Q4 with modality disagreement.
                </p>
              </div>

              <div className="mb-4 rounded-xl border-l-4 border-blue-400 bg-blue-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Suggested Therapist Focus</p>
                <p className="mt-1 text-sm text-blue-800">
                  Explore family-related stressors. Assess anger expression patterns.
                </p>
              </div>

              <div className="rounded-xl border-l-4 border-teal-400 bg-teal-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-teal-600">Suggested Follow-Up</p>
                <p className="mt-1 text-sm text-teal-800">
                  "Can you describe what typically triggers your frustration?"
                </p>
              </div>

              <div className="mt-4 flex items-center gap-2 text-xs text-slate-400">
                <span className="inline-block h-2 w-2 rounded-full bg-green-400" />
                3/3 modalities available for this session
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Disclaimer */}
      <section className="bg-[#F1F5F9]">
        <div className="mx-auto max-w-6xl px-4 py-12 md:px-8">
          <div className="rounded-2xl border border-orange-200 bg-orange-50 p-6 md:p-8">
            <h3 className="mb-2 font-semibold text-orange-800">Important Disclaimer</h3>
            <p className="text-sm leading-relaxed text-orange-700">
              Anumata is an AI-assisted emotional pre-evaluation tool designed to support — not replace
              — qualified mental health professionals. It does not provide clinical diagnosis. Results
              are preliminary emotional indicators intended for professional review and interpretation.
              This system was designed with RA 10173 (Data Privacy Act of 2012) in mind. Client data is
              handled with confidentiality as a core design consideration.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 md:flex-row md:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500 text-sm font-bold text-white">
              A
            </div>
            <span className="text-sm font-medium text-slate-700">Anumata</span>
          </div>
          <p className="text-center text-xs text-slate-400">
            AI-Assisted Emotional State Pre-Evaluation System &bull; Davao City &bull; 2026
          </p>
          <Link to="/login" className="text-sm font-medium text-blue-600 hover:underline">
            Therapist Login
          </Link>
        </div>
      </footer>
    </div>
  );
}
