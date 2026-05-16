type Trend = "up" | "down" | "neutral";

export function KpiCard({
  label,
  value,
  hint,
  trend = "neutral",
  accent = "ink",
}: {
  label: string;
  value: string;
  hint?: string;
  trend?: Trend;
  accent?: "ink" | "forest" | "burgundy";
}) {
  const accentColor =
    accent === "forest"
      ? "text-forest"
      : accent === "burgundy"
      ? "text-burgundy"
      : "text-ink";

  const trendIcon =
    trend === "up" ? "↑" : trend === "down" ? "↓" : "→";
  const trendColor =
    trend === "up"
      ? "text-forest"
      : trend === "down"
      ? "text-burgundy"
      : "text-ink-soft";

  return (
    <div className="rounded-2xl border border-ink/10 bg-paper p-6 shadow-sm">
      <div className="text-xs font-semibold uppercase tracking-wider text-ink-soft">
        {label}
      </div>
      <div className="mt-3 flex items-baseline justify-between gap-2">
        <span className={`headline-display text-5xl ${accentColor}`}>
          {value}
        </span>
        {hint && (
          <span className={`text-sm font-semibold ${trendColor}`}>
            {trendIcon} {hint}
          </span>
        )}
      </div>
    </div>
  );
}
