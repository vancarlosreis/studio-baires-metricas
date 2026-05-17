import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import {
  getIgAccountByHandle,
  listAccountSnapshots,
  listMediaWithInsights,
  countMediaByType,
  getAccountInitials,
} from "@/lib/queries/ig-accounts";
import { syncAccountFormAction } from "@/app/actions/sync";
import { EvolutionChart, type EvolutionDataPoint } from "@/components/evolution-chart";
import { MediaGrid } from "@/components/media-grid";

const PRODUCT_TYPE_FROM_TAB: Record<string, string | undefined> = {
  posts: "FEED",
  reels: "REELS",
};

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

type Params = Promise<{ handle: string }>;
type SearchParams = Promise<{ aba?: string }>;

export default async function AccountDetailPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { handle } = await params;
  const sParams = await searchParams;
  const supabase = await createClient();

  const account = await getIgAccountByHandle(supabase, handle);
  if (!account) notFound();

  const activeTab = sParams.aba ?? "tudo";
  const productType = PRODUCT_TYPE_FROM_TAB[activeTab];

  const [snapshots, media, mediaCounts] = await Promise.all([
    listAccountSnapshots(supabase, account.id, 30),
    listMediaWithInsights(supabase, account.id, { limit: 48, productType }),
    countMediaByType(supabase, account.id),
  ]);

  // Snapshot mais recente (último do array, que está em asc)
  const latest = snapshots[snapshots.length - 1];

  // Pontos pros gráficos
  const followersData: EvolutionDataPoint[] = snapshots.map((s) => ({
    date: s.snapshot_date,
    value: s.followers_count,
  }));
  const reachData: EvolutionDataPoint[] = snapshots.map((s) => ({
    date: s.snapshot_date,
    value: s.reach,
  }));
  const engagedData: EvolutionDataPoint[] = snapshots.map((s) => ({
    date: s.snapshot_date,
    value: s.accounts_engaged,
  }));

  const initials = getAccountInitials(account);
  const displayName = account.ig_account_name || account.ig_username;

  return (
    <div className="mx-auto max-w-7xl px-6 py-12 sm:px-10">
      {/* Voltar */}
      <Link
        href="/dashboard"
        className="text-sm font-semibold text-ink-soft underline-offset-4 hover:text-ink hover:underline"
      >
        ← Voltar
      </Link>

      {/* Header da conta */}
      <header className="mt-6 flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-5">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-ink text-cream">
            {account.ig_profile_picture_url ? (
              <Image
                src={account.ig_profile_picture_url}
                alt={displayName}
                width={80}
                height={80}
                className="h-full w-full object-cover"
                unoptimized
              />
            ) : (
              <span className="text-xl font-semibold">{initials}</span>
            )}
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-soft">
              {account.account_type === "BUSINESS"
                ? "Empresa"
                : account.account_type === "MEDIA_CREATOR"
                  ? "Criador"
                  : "Conta"}
            </p>
            <h1 className="headline-display mt-1 text-4xl text-ink sm:text-5xl">
              {displayName}
            </h1>
            <p className="text-base text-ink-soft">@{account.ig_username}</p>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          <form action={syncAccountFormAction}>
            <input type="hidden" name="igAccountId" value={account.id} />
            <input
              type="hidden"
              name="returnTo"
              value={`/dashboard/contas/${handle}`}
            />
            <button
              type="submit"
              className="inline-flex h-10 items-center rounded-full bg-forest px-5 text-sm font-semibold text-cream transition-colors hover:bg-forest-soft"
            >
              Sincronizar agora ↻
            </button>
          </form>
          <span className="text-xs text-ink-soft">
            Última sync <span className="italic">{timeAgo(account.last_synced_at)}</span>
          </span>
        </div>
      </header>

      {/* KPIs principais */}
      <section className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Seguidores" value={formatNumber(latest?.followers_count)} />
        <Kpi
          label="Alcance (7d)"
          value={formatNumber(latest?.reach)}
          accent="forest"
        />
        <Kpi
          label="Engajamento (7d)"
          value={formatNumber(latest?.accounts_engaged)}
          accent="forest"
        />
        <Kpi
          label="Interações (7d)"
          value={formatNumber(latest?.total_interactions)}
          accent="burgundy"
        />
      </section>

      {/* Gráficos */}
      <section className="mt-12 grid gap-6 lg:grid-cols-2">
        <ChartCard
          title="Seguidores"
          subtitle="Evolução nos últimos 30 dias"
        >
          <EvolutionChart data={followersData} color="ink" />
        </ChartCard>
        <ChartCard title="Alcance" subtitle="Últimos 30 snapshots">
          <EvolutionChart data={reachData} color="forest" />
        </ChartCard>
        <ChartCard title="Contas engajadas" subtitle="Últimos 30 snapshots">
          <EvolutionChart data={engagedData} color="burgundy" />
        </ChartCard>
        <ChartCard title="Posts publicados" subtitle="Total acumulado">
          <EvolutionChart
            data={snapshots.map((s) => ({
              date: s.snapshot_date,
              value: s.media_count,
            }))}
            color="ink"
          />
        </ChartCard>
      </section>

      {/* Grid de mídias */}
      <section className="mt-16">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <h2 className="headline-display text-3xl text-ink">
              Últimas <span className="italic">mídias</span>
            </h2>
            <p className="mt-1 text-sm text-ink-soft">
              {media.length === 0
                ? "Nenhuma mídia sincronizada nesse filtro"
                : `Mostrando ${media.length} ${media.length === 1 ? "mídia" : "mídias"}`}
            </p>
          </div>
        </div>

        {/* Tabs de filtro */}
        <div className="mb-6 flex flex-wrap gap-2">
          <TabLink
            href={`/dashboard/contas/${handle}`}
            active={activeTab === "tudo"}
            label="Tudo"
            count={mediaCounts.TOTAL}
          />
          <TabLink
            href={`/dashboard/contas/${handle}?aba=posts`}
            active={activeTab === "posts"}
            label="Posts"
            count={mediaCounts.FEED}
          />
          <TabLink
            href={`/dashboard/contas/${handle}?aba=reels`}
            active={activeTab === "reels"}
            label="Reels"
            count={mediaCounts.REELS}
          />
        </div>

        <MediaGrid items={media} />
      </section>
    </div>
  );
}

function Kpi({
  label,
  value,
  accent = "ink",
}: {
  label: string;
  value: string;
  accent?: "ink" | "forest" | "burgundy";
}) {
  const color =
    accent === "forest"
      ? "text-forest"
      : accent === "burgundy"
        ? "text-burgundy"
        : "text-ink";
  return (
    <div className="rounded-2xl border border-ink/10 bg-paper p-6">
      <div className="text-xs font-semibold uppercase tracking-wider text-ink-soft">
        {label}
      </div>
      <div className={`headline-display mt-2 text-5xl ${color}`}>{value}</div>
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-ink/10 bg-paper p-6">
      <h3 className="headline-display text-xl text-ink">{title}</h3>
      {subtitle && <p className="text-xs text-ink-soft">{subtitle}</p>}
      <div className="mt-4">{children}</div>
    </div>
  );
}

function TabLink({
  href,
  active,
  label,
  count,
}: {
  href: string;
  active: boolean;
  label: string;
  count: number | undefined;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex h-9 items-center gap-2 rounded-full px-4 text-sm font-semibold transition-colors ${
        active
          ? "bg-ink text-cream"
          : "border border-ink/15 bg-paper text-ink hover:border-ink/40"
      }`}
    >
      {label}
      {count !== undefined && (
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
            active ? "bg-cream/20 text-cream" : "bg-ink/10 text-ink-soft"
          }`}
        >
          {count}
        </span>
      )}
    </Link>
  );
}
