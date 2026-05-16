import Link from "next/link";

export type AccountMock = {
  id: string;
  handle: string;
  name: string;
  followers: number;
  growth30d: number;
  reach30d: number;
  initials: string;
};

function formatNumber(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`;
  return n.toString();
}

export function AccountCard({ account }: { account: AccountMock }) {
  const isPositive = account.growth30d >= 0;
  return (
    <Link
      href={`/dashboard/contas/${account.handle.replace("@", "")}`}
      className="group block rounded-2xl border border-ink/10 bg-paper p-6 transition-all hover:border-ink/30 hover:shadow-md"
    >
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-ink text-cream">
          <span className="text-sm font-semibold">{account.initials}</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-base font-semibold text-ink">
            {account.name}
          </div>
          <div className="truncate text-sm text-ink-soft">
            {account.handle}
          </div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-3 gap-2 border-t border-ink/10 pt-4">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-soft">
            Seguidores
          </div>
          <div className="headline-display mt-1 text-2xl text-ink">
            {formatNumber(account.followers)}
          </div>
        </div>
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-soft">
            Crescimento
          </div>
          <div
            className={`headline-display mt-1 text-2xl ${
              isPositive ? "text-forest" : "text-burgundy"
            }`}
          >
            {isPositive ? "+" : ""}
            {account.growth30d}%
          </div>
        </div>
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-soft">
            Alcance
          </div>
          <div className="headline-display mt-1 text-2xl text-ink">
            {formatNumber(account.reach30d)}
          </div>
        </div>
      </div>
    </Link>
  );
}
