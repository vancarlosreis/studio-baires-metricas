import { countryFlag, countryName } from "@/lib/queries/demographics";

function formatNumber(n: number): string {
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return n.toString();
}

/**
 * Tabela editorial pra top entries de cidades/países.
 */
export function DemographicsTable({
  title,
  subtitle,
  entries,
  type = "city",
  total,
}: {
  title: string;
  subtitle?: string;
  entries: Array<{ key: string; value: number }>;
  type?: "city" | "country";
  total?: number;
}) {
  return (
    <div className="rounded-2xl border border-ink/10 bg-paper">
      <div className="border-b border-ink/10 px-6 py-4">
        <h3 className="headline-display text-xl text-ink">{title}</h3>
        {subtitle && (
          <p className="mt-0.5 text-xs text-ink-soft">{subtitle}</p>
        )}
      </div>

      {entries.length === 0 ? (
        <div className="p-8 text-center text-sm italic text-ink-soft">
          Sem dados
        </div>
      ) : (
        <table className="w-full">
          <thead>
            <tr className="text-left">
              <th className="px-6 py-3 text-[10px] font-semibold uppercase tracking-wider text-ink-soft">
                {type === "city" ? "Cidade" : "País"}
              </th>
              <th className="px-6 py-3 text-right text-[10px] font-semibold uppercase tracking-wider text-ink-soft">
                Pessoas
              </th>
              {total !== undefined && total > 0 && (
                <th className="px-6 py-3 text-right text-[10px] font-semibold uppercase tracking-wider text-ink-soft">
                  %
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => {
              const pct =
                total !== undefined && total > 0
                  ? ((e.value / total) * 100).toFixed(1)
                  : null;
              return (
                <tr
                  key={e.key}
                  className="border-t border-ink/5 hover:bg-cream/30"
                >
                  <td className="truncate px-6 py-3 text-sm text-ink">
                    {type === "country" ? (
                      <span>
                        <span className="mr-2">{countryFlag(e.key)}</span>
                        <span className="font-semibold">{countryName(e.key)}</span>
                        <span className="ml-2 text-xs text-ink-soft">
                          {e.key.toUpperCase()}
                        </span>
                      </span>
                    ) : (
                      <span className="font-semibold">{e.key}</span>
                    )}
                  </td>
                  <td className="px-6 py-3 text-right font-semibold text-ink">
                    {formatNumber(e.value)}
                  </td>
                  {pct !== null && (
                    <td className="px-6 py-3 text-right text-xs text-ink-soft">
                      {pct}%
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
