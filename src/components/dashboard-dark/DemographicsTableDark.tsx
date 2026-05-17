import { countryFlag, countryName } from "@/lib/queries/demographics";

type Entry = { key: string; value: number };

type Props = {
  title: string;
  subtitle?: string;
  entries: Entry[];
  type: "city" | "country";
  total: number;
};

function fmt(n: number) {
  return new Intl.NumberFormat("pt-BR").format(n);
}

export function DemographicsTableDark({
  title,
  subtitle,
  entries,
  type,
  total,
}: Props) {
  return (
    <div className="dark-card p-5">
      <div className="mb-4 flex items-start justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold text-white">{title}</h3>
          {subtitle && <p className="mt-0.5 text-xs text-white/50">{subtitle}</p>}
        </div>
        {total > 0 && (
          <span className="text-xs text-white/40">
            {fmt(total)} total
          </span>
        )}
      </div>

      {entries.length === 0 ? (
        <p className="py-4 text-center text-sm text-white/40">
          Sem dados disponíveis
        </p>
      ) : (
        <ul className="space-y-2">
          {entries.map((e) => {
            const pct = total > 0 ? (e.value / total) * 100 : 0;
            const display =
              type === "country"
                ? `${countryFlag(e.key)} ${countryName(e.key)}`
                : e.key;
            return (
              <li key={e.key} className="space-y-1">
                <div className="flex items-baseline justify-between text-xs">
                  <span className="truncate text-white/90">{display}</span>
                  <span className="text-white/60">
                    {fmt(e.value)} <span className="text-white/40">({pct.toFixed(1)}%)</span>
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.04]">
                  <div
                    className="dark-bg-grad-purple-pink h-full"
                    style={{ width: `${Math.min(100, pct)}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
