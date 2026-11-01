import { Link } from "react-router-dom";
import { ArrowLeft, FileText, ScanFace, ShieldCheck, Video } from "lucide-react";

const HIGHLIGHTS = [
  { icon: Video, title: "Guided video interviews", text: "Patients answer by voice, with live captions, in English, Tagalog, or Bisaya." },
  { icon: ScanFace, title: "Face, voice, and language analysis", text: "Emotional indicators from three AI models, combined per answer." },
  { icon: FileText, title: "Results for your review", text: "Structured pre-evaluation insights — decision support, never a diagnosis." },
];

interface AuthLayoutProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}

/**
 * Shared shell for the login and register pages: Amumata brand panel on the
 * left (desktop), form card on the right; compact logo header on phones.
 */
export default function AuthLayout({ title, subtitle, children }: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen bg-[#F1F5F9]">
      {/* Brand panel (desktop) */}
      <aside className="relative hidden w-[42%] flex-col justify-between overflow-hidden bg-linear-to-br from-teal-600 via-teal-700 to-slate-900 p-10 text-white lg:flex xl:p-14">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-16 h-80 w-80 rounded-full bg-teal-300/10 blur-3xl" />

        <Link to="/" className="relative flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-lg font-bold text-teal-700 shadow-lg">A</div>
          <div>
            <p className="text-xl font-bold">Amumata</p>
            <p className="text-xs text-teal-100">AI-assisted emotional pre-evaluation</p>
          </div>
        </Link>

        <div className="relative">
          <h2 className="text-3xl font-bold leading-tight xl:text-4xl">
            Understand your patients <span className="text-teal-200">before the first session.</span>
          </h2>
          <ul className="mt-8 space-y-5">
            {HIGHLIGHTS.map(({ icon: Icon, title: heading, text }) => (
              <li key={heading} className="flex gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/20">
                  <Icon size={20} />
                </div>
                <div>
                  <p className="font-semibold">{heading}</p>
                  <p className="text-sm leading-relaxed text-teal-100/90">{text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative flex items-start gap-3 rounded-2xl bg-white/10 p-4 ring-1 ring-white/15">
          <ShieldCheck size={20} className="mt-0.5 shrink-0 text-teal-200" />
          <p className="text-sm leading-relaxed text-teal-50">
            Patient data stays private to your account and is handled in line with the Data Privacy Act of 2012 (RA 10173).
          </p>
        </div>
      </aside>

      {/* Form */}
      <main className="flex flex-1 items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-lg">
          {/* Compact brand header (mobile / tablet) */}
          <Link to="/" className="mb-6 flex items-center justify-center gap-3 lg:hidden">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-500 text-lg font-bold text-white">A</div>
            <div>
              <p className="text-xl font-bold text-slate-900">Amumata</p>
              <p className="text-xs text-slate-500">AI-assisted emotional pre-evaluation</p>
            </div>
          </Link>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="mb-6">
              <Link to="/" className="mb-4 hidden items-center gap-1 text-sm text-slate-500 transition hover:text-teal-700 lg:inline-flex">
                <ArrowLeft size={14} /> Back to home
              </Link>
              <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
              <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
            </div>
            {children}
          </div>

          <p className="mt-6 text-center text-xs text-slate-400">
            Amumata provides decision support for professionals. It does not provide a clinical diagnosis.
          </p>
        </div>
      </main>
    </div>
  );
}
