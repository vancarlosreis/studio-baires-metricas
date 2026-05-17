import Link from "next/link";
import Image from "next/image";
import { syncAccountFormAction } from "@/app/actions/sync";
import {
  getAccountInitials,
  type IgAccountWithLatestSnapshot,
} from "@/lib/queries/ig-accounts";

function formatNumber(n: number | null | undefined): string {
  if (n == null) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1)}k`;
  return n.toString();
}

function timeAgo(iso: string | null): string {
  if (!iso) return "nunca";
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.floor(ms / 60_000);
  if (min < 1) return "agora";
  if (min < 60) return `${min}min atrás`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h atrás`;
  const d = Math.floor(h / 24);
  return `${d}d atrás`;
}

export function AccountCard({
  account,
}: {
  account: IgAccountWithLatestSnapshot;
}) {
  const snap = account.latest_snapshot;
  const initials = getAccountInitials(account);
  const displayName = account.ig_account_name || account.ig_username;
  const handle = `@${account.ig_username}`;

  return (
    <div className="group block rounded-2xl border border-ink/10 bg-paper p-6 transition-all hover:border-ink/30 hover:shadow-md">
      <Link
        href={`/dashboard/contas/${account.ig_username}`}
        className="block"
      >
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-ink text-cream">
            {account.ig_profile_picture_url ? (
              <Image
                src={account.ig_profile_picture_url}
                alt={displayName}
                width={48}
                height={48}
                className="h-full w-full object-cover"
                unoptimized
              />
            ) : (
              <span className="text-sm font-semibold">{initials}</span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-base font-semibold text-ink">
              {displayName}
            </div>
            <div className="truncate text-sm text-ink-soft">{handle}</div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-2 border-t border-ink/10 pt-4">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-soft">
              Seguidores
            </div>
            <div className="headline-display mt-1 text-2xl text-ink">
              {formatNumber(snap?.followers_count)}
            </div>
          </div>
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-soft">
              Alcance
            </div>
            <div className="headline-display mt-1 text-2xl text-ink">
              {formatNumber(snap?.reach)}
            </div>
          </div>
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-soft">
              Posts
            </div>
            <div className="headline-display mt-1 text-2xl text-ink">
              {formatNumber(snap?.media_count)}
            </div>
          </div>
        </div>
      </Link>

      <div className="mt-4 flex items-center justify-between border-t border-ink/10 pt-3">
        <span className="text-xs text-ink-soft">
          Sincronizado <span className="italic">{timeAgo(account.last_synced_at)}</span>
        </span>
        <form action={syncAccountFormAction}>
          <input type="hidden" name="igAccountId" value={account.id} />
          <button
            type="submit"
            className="text-xs font-semibold text-forest underline-offset-2 hover:underline"
          >
            Sincronizar agora ↻
          </button>
        </form>
      </div>
    </div>
  );
}
