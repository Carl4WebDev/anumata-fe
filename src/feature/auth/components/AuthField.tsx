interface AuthFieldProps {
  id: string;
  label: string;
  /** Muted text after the label, e.g. "(optional)". */
  hint?: string;
  children: React.ReactNode;
}

/** Labelled form field for the login and register forms. */
export default function AuthField({ id, label, hint, children }: AuthFieldProps) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
        {hint && <span className="ml-1 font-normal text-slate-400">{hint}</span>}
      </label>
      {children}
    </div>
  );
}
