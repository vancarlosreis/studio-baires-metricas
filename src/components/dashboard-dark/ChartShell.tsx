type Props = {
  title: string;
  subtitle?: string;
  className?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
};

export function ChartShell({ title, subtitle, className = "", action, children }: Props) {
  return (
    <div className={`dark-card flex flex-col p-5 ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-white">{title}</h3>
          {subtitle && <p className="mt-0.5 text-xs text-white/50">{subtitle}</p>}
        </div>
        {action}
      </div>
      <div className="mt-4 flex-1">{children}</div>
    </div>
  );
}

export function SectionTitle({
  eyebrow,
  title,
}: {
  eyebrow: string;
  title: string;
}) {
  return (
    <div className="mb-4 mt-8">
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/50">
        {eyebrow}
      </p>
      <h2 className="mt-1 text-2xl font-bold text-white">{title}</h2>
    </div>
  );
}
