import { notFound } from "next/navigation";
import Link from "next/link";
import { TrendingUp } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  getIgAccountByHandle,
  listAccountSnapshots,
  listMediaWithInsights,
  countMediaByType,
  getAccountInitials,
} from "@/lib/queries/ig-accounts";
import {
  getLatestDemographics,
  topEntries,
  sumValues,
  sortAgeBuckets,
  genderLabel,
} from "@/lib/queries/demographics";
import {
  getMediaAggregates,
  getMediaByDayOfWeek,
  getSnapshotNearDate,
} from "@/lib/queries/aggregates";
import { resolvePeriod, previousPeriod } from "@/lib/period";
import { Sidebar } from "@/components/dashboard-dark/Sidebar";
import { Topbar } from "@/components/dashboard-dark/Topbar";
import { KpiCard } from "@/components/dashboard-dark/KpiCard";
import { KpiCompareCard, KpiEmptyCard } from "@/components/dashboard-dark/KpiCompareCard";
import { ChartShell, SectionTitle } from "@/components/dashboard-dark/ChartShell";
import { EvolutionChartDark } from "@/components/dashboard-dark/charts/EvolutionChartDark";
import { DonutChartDark, DonutLegendDark, type DonutSlice } from "@/components/dashboard-dark/charts/DonutChartDark";
import { BarChartDark, type BarPoint } from "@/components/dashboard-dark/charts/BarChartDark";
import { HourlyHeatmapDark } from "@/components/dashboard-dark/charts/HourlyHeatmapDark";
import { MediaGridDark } from "@/components/dashboard-dark/MediaGridDark";
import {
  MediaTableDark,
  type MediaSortKey,
  type MediaSortOrd,
} from "@/components/dashboard-dark/MediaTableDark";
import { DemographicsTableDark } from "@/components/dashboard-dark/DemographicsTableDark";

const NEON = {
  purple: "#8B5CF6",
  pink: "#EC4899",
  blue: "#3B82F6",
  cyan: "#22D3EE",
  amber: "#F59E0B",
};

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

function fmtCompact(n: number | null | undefined): string {
  if (n == null) return "—";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toLocaleString("pt-BR");
}

type Params = Promise<{ handle: string }>;
type SearchParams = Promise<{
  aba?: string;
  periodo?: string;
  de?: string;
  ate?: string;
  vis?: string; // "cards" (default) | "lista"
  sort?: string; // chave de ordenação da tabela
  ord?: string; // "asc" | "desc"
  cmp?: string; // "off" desabilita comparação com período anterior
}>;

export default async function AccountDetailDarkPage({
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

  const PRODUCT_TYPE_FROM_TAB: Record<string, string | undefined> = {
    posts: "FEED",
    reels: "REELS",
  };

  const activeTab = sParams.aba ?? "tudo";
  const productType = PRODUCT_TYPE_FROM_TAB[activeTab];
  const period = resolvePeriod(sParams.periodo, sParams.de, sParams.ate);
  const previous = previousPeriod(period);

  // Toggle Cards/Lista + ordenação da tabela (validados com whitelist)
  const vis: "cards" | "lista" = sParams.vis === "lista" ? "lista" : "cards";
  const ALLOWED_SORT: MediaSortKey[] = [
    "views",
    "reach",
    "interactions",
    "engagement",
    "likes",
    "comments",
    "saves",
    "shares",
    "profile_visits",
    "follows",
    "posted_at",
  ];
  const sortKey: MediaSortKey = (ALLOWED_SORT as string[]).includes(
    sParams.sort ?? "",
  )
    ? (sParams.sort as MediaSortKey)
    : "reach";
  const sortOrd: MediaSortOrd = sParams.ord === "asc" ? "asc" : "desc";
  const compare = sParams.cmp !== "off";

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [
    snapshots,
    allMedia,
    mediaCounts,
    demographics,
    feedAggCurrent,
    feedAggPrev,
    reelsAggCurrent,
    reelsAggPrev,
    dayOfWeekStats,
    snapshotBeforePeriod,
  ] = await Promise.all([
    listAccountSnapshots(supabase, account.id, 365),
    listMediaWithInsights(supabase, account.id, { limit: 100, productType }),
    countMediaByType(supabase, account.id),
    getLatestDemographics(supabase, account.id),
    getMediaAggregates(supabase, account.id, "FEED", period.start, period.end),
    getMediaAggregates(supabase, account.id, "FEED", previous.start, previous.end),
    getMediaAggregates(supabase, account.id, "REELS", period.start, period.end),
    getMediaAggregates(supabase, account.id, "REELS", previous.start, previous.end),
    getMediaByDayOfWeek(supabase, account.id, period.start, period.end),
    getSnapshotNearDate(supabase, account.id, previous.end),
  ]);

  const media = allMedia.filter((m) => {
    const t = new Date(m.posted_at).getTime();
    return t >= period.start.getTime() && t <= period.end.getTime();
  });

  const inPeriodSnapshots = snapshots.filter((s) => {
    const t = new Date(s.snapshot_date + "T12:00:00").getTime();
    return t >= period.start.getTime() && t <= period.end.getTime();
  });
  const latest = inPeriodSnapshots[inPeriodSnapshots.length - 1] ?? snapshots[snapshots.length - 1];
  const prev = snapshotBeforePeriod;

  // Demographics
  const genderFollower = demographics.follower?.gender;
  const genderDonut: DonutSlice[] = genderFollower
    ? [
        { label: genderLabel("F"), value: genderFollower["F"] ?? 0, color: NEON.pink },
        { label: genderLabel("M"), value: genderFollower["M"] ?? 0, color: NEON.purple },
        { label: genderLabel("U"), value: genderFollower["U"] ?? 0, color: "#6B7280" },
      ].filter((s) => s.value > 0)
    : [];

  const ageBars: BarPoint[] = sortAgeBuckets(demographics.follower?.age).map((b) => ({
    label: b.key,
    value: b.value,
  }));

  const dayOfWeekBars: BarPoint[] = dayOfWeekStats.map((d) => ({
    label: d.label,
    value: d.avgInteractions,
  }));

  const topCitiesFollower = topEntries(demographics.follower?.city, 10);
  const topCountriesFollower = topEntries(demographics.follower?.country, 6);
  const topCitiesReached = topEntries(demographics.reached?.city, 10);

  const onlineFollowers = latest?.online_followers as Record<string, number> | null;

  // Reach evolution
  const chartSnapshots = inPeriodSnapshots.length > 0 ? inPeriodSnapshots : snapshots;
  const reachData = chartSnapshots.map((s) => ({
    date: s.snapshot_date,
    value: s.reach,
  }));

  // Followers evolution (cumulative if column exists)
  const followersData = chartSnapshots.map((s) => ({
    date: s.snapshot_date,
    value: s.followers_count,
  }));

  // Format distribution from media counts
  const formatBuckets: DonutSlice[] = [
    mediaCounts.FEED ? { label: "Feed", value: mediaCounts.FEED, color: NEON.blue } : null,
    mediaCounts.REELS ? { label: "Reels", value: mediaCounts.REELS, color: NEON.pink } : null,
    mediaCounts.STORY ? { label: "Stories", value: mediaCounts.STORY, color: NEON.amber } : null,
  ].filter((x): x is DonutSlice => x !== null);

  // KPIs principais com sparkline a partir dos snapshots
  const reachSpark = chartSnapshots.slice(-12).map((s) => s.reach ?? 0);
  const followersSpark = chartSnapshots.slice(-12).map((s) => s.followers_count ?? 0);
  const interactionsSpark = chartSnapshots.slice(-12).map((s) => s.total_interactions ?? 0);
  const viewsSpark = chartSnapshots.slice(-12).map((s) => s.views ?? 0);

  function trend(curr?: number | null, p?: number | null): { delta: number; direction: "up" | "down" } | null {
    if (curr == null || p == null || p === 0) return null;
    const delta = ((curr - p) / p) * 100;
    return { delta, direction: delta >= 0 ? "up" : "down" };
  }

  const initials = getAccountInitials(account);
  const displayName = account.ig_account_name || account.ig_username;
  const accountTypeLabel =
    account.account_type === "BUSINESS"
      ? "Empresa"
      : account.account_type === "MEDIA_CREATOR"
        ? "Criador"
        : "Conta";

  const userInitials = (user?.user_metadata?.full_name ?? user?.email ?? "U")
    .split(/[\s.@]+/)
    .slice(0, 2)
    .map((p: string) => p[0]?.toUpperCase() ?? "")
    .join("");
  const userAvatar = (user?.user_metadata?.avatar_url ?? user?.user_metadata?.picture ?? null) as string | null;

  return (
    <div className="grid grid-cols-[80px_minmax(0,1fr)] gap-6">
      <Sidebar initials={userInitials || "DG"} avatarUrl={userAvatar} />

      <main className="flex min-w-0 flex-col gap-6 pb-10">
        <Topbar
          username={account.ig_username}
          displayName={displayName}
          profilePictureUrl={account.ig_profile_picture_url}
          initials={initials}
          accountTypeLabel={accountTypeLabel}
          lastSyncedLabel={timeAgo(account.last_synced_at)}
          igAccountId={account.id}
        />

        {/* KPI row */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            label="Seguidores"
            value={fmtCompact(latest?.followers_count)}
            trend={trend(latest?.followers_count, prev?.followers_count)}
            icon="users"
            accent="purple"
            sparkline={followersSpark}
          />
          <KpiCard
            label="Alcance"
            value={fmtCompact(latest?.reach)}
            trend={trend(latest?.reach, prev?.reach)}
            icon="eye"
            accent="blue"
            sparkline={reachSpark}
          />
          <KpiCard
            label="Interações"
            value={fmtCompact(latest?.total_interactions)}
            trend={trend(latest?.total_interactions, prev?.total_interactions)}
            icon="activity"
            accent="pink"
            sparkline={interactionsSpark}
          />
          <KpiCard
            label="Visualizações"
            value={fmtCompact(latest?.views)}
            trend={trend(latest?.views, prev?.views)}
            icon="trending-up"
            accent="cyan"
            sparkline={viewsSpark}
          />
        </section>

        {/* Gradient banner CTA */}
        <section className="dark-card relative overflow-hidden p-6">
          <div className="dark-bg-grad-banner absolute inset-0" />
          <div className="relative flex flex-wrap items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/10 backdrop-blur">
                <TrendingUp size={20} className="text-white" />
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.2em] text-white/70">
                  Studio Baires · Insights
                </p>
                <h3 className="mt-1 text-2xl font-bold text-white">
                  Dados de <span className="italic">{period.label.toLowerCase()}</span>
                </h3>
                <p className="mt-1 text-sm text-white/70">
                  Comparados ao período anterior. Sincronize a conta pra atualizar os números.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Charts row */}
        <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <ChartShell
            title="Alcance diário"
            subtitle="Snapshots da conta no período"
            className="lg:col-span-2"
          >
            <EvolutionChartDark data={reachData} height={260} />
          </ChartShell>
          <ChartShell title="Distribuição de formato" subtitle="Mídia publicada na conta">
            <DonutChartDark
              data={formatBuckets}
              height={220}
              centerValue={String(mediaCounts.TOTAL ?? 0)}
              centerLabel="Posts"
            />
            <DonutLegendDark data={formatBuckets} />
          </ChartShell>
        </section>

        <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <ChartShell
            title="Melhor dia para postar"
            subtitle="Engajamento médio por dia da semana"
          >
            <BarChartDark data={dayOfWeekBars} emptyLabel="Sem posts no período" />
          </ChartShell>
          <ChartShell
            title="Melhor horário para postar"
            subtitle="Seguidores online por hora"
          >
            <HourlyHeatmapDark data={onlineFollowers} />
          </ChartShell>
        </section>

        {/* Audiência por idade + gênero */}
        <SectionTitle eyebrow="Audiência" title="Quem te segue." />
        <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <ChartShell
            title="Audiência por idade"
            subtitle="Distribuição de seguidores · IG não cruza idade × gênero"
          >
            <BarChartDark data={ageBars} emptyLabel="Sem dados de demografia" />
          </ChartShell>
          <ChartShell
            title="Seguidores por gênero"
            subtitle={`${sumValues(genderFollower).toLocaleString("pt-BR")} pessoas`}
          >
            <DonutChartDark
              data={genderDonut}
              height={220}
              centerValue={fmtCompact(sumValues(genderFollower))}
              centerLabel="Total"
            />
            <DonutLegendDark data={genderDonut} />
          </ChartShell>
        </section>

        {/* Geografia */}
        <SectionTitle eyebrow="Geografia" title="De onde vem o público." />
        <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <DemographicsTableDark
            title="Cidades (seguidores)"
            subtitle="Top 10"
            entries={topCitiesFollower}
            type="city"
            total={sumValues(demographics.follower?.city)}
          />
          <DemographicsTableDark
            title="Países (seguidores)"
            subtitle="Top 6"
            entries={topCountriesFollower}
            type="country"
            total={sumValues(demographics.follower?.country)}
          />
          <DemographicsTableDark
            title="Cidades alcançadas"
            subtitle="Top 10 no período"
            entries={topCitiesReached}
            type="city"
            total={sumValues(demographics.reached?.city)}
          />
        </section>

        {/* Posts do feed */}
        <SectionTitle eyebrow="Posts" title="Performance do feed." />
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCompareCard
              compare={compare}
            label="Posts publicados"
            value={feedAggCurrent.count}
            previous={feedAggPrev.count}
          />
          <KpiCompareCard
              compare={compare}
            label="Alcance dos posts"
            value={feedAggCurrent.reach}
            previous={feedAggPrev.reach}
            start={period.start}
            end={period.end}
          />
          <KpiCompareCard
              compare={compare}
            label="Interações"
            value={feedAggCurrent.total_interactions}
            previous={feedAggPrev.total_interactions}
          />
          <KpiCompareCard
              compare={compare}
            label="Curtidas"
            value={feedAggCurrent.likes}
            previous={feedAggPrev.likes}
          />
        </section>
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCompareCard
              compare={compare}
            label="Comentários"
            value={feedAggCurrent.comments}
            previous={feedAggPrev.comments}
          />
          <KpiCompareCard
              compare={compare}
            label="Salvamentos"
            value={feedAggCurrent.saves}
            previous={feedAggPrev.saves}
          />
          <KpiCompareCard
              compare={compare}
            label="Compartilhamentos"
            value={feedAggCurrent.shares}
            previous={feedAggPrev.shares}
          />
          <KpiCompareCard
              compare={compare}
            label="Visualizações do feed"
            value={feedAggCurrent.views}
            previous={feedAggPrev.views}
          />
        </section>

        {/* Reels */}
        <SectionTitle eyebrow="Reels" title="Performance dos reels." />
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCompareCard
              compare={compare}
            label="Reels publicados"
            value={reelsAggCurrent.count}
            previous={reelsAggPrev.count}
          />
          <KpiCompareCard
              compare={compare}
            label="Alcance dos reels"
            value={reelsAggCurrent.reach}
            previous={reelsAggPrev.reach}
            start={period.start}
            end={period.end}
          />
          <KpiCompareCard
              compare={compare}
            label="Interações nos reels"
            value={reelsAggCurrent.total_interactions}
            previous={reelsAggPrev.total_interactions}
          />
          <KpiCompareCard
              compare={compare}
            label="Visualizações dos reels"
            value={reelsAggCurrent.views}
            previous={reelsAggPrev.views}
          />
        </section>

        {/* Stories placeholder */}
        <SectionTitle eyebrow="Stories" title="Stories (em breve)." />
        <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <KpiEmptyCard
            label="Número de stories"
            helpText="Sync de stories ainda não implementado. Stories expiram em 24h — requer cron a cada 4–6h."
          />
          <KpiEmptyCard
            label="Visualizações de stories"
            helpText="Disponível após implementar sync de stories."
          />
          <KpiEmptyCard
            label="Alcance dos stories"
            helpText="Disponível após implementar sync de stories."
          />
        </section>

        {/* Tabs e Mídia */}
        <SectionTitle eyebrow="Conteúdo" title="Posts no período." />
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            <TabLink
              href={buildContentHref(handle, sParams, { aba: undefined })}
              active={activeTab === "tudo"}
              label="Tudo"
              count={mediaCounts.TOTAL}
            />
            <TabLink
              href={buildContentHref(handle, sParams, { aba: "posts" })}
              active={activeTab === "posts"}
              label="Posts"
              count={mediaCounts.FEED}
            />
            <TabLink
              href={buildContentHref(handle, sParams, { aba: "reels" })}
              active={activeTab === "reels"}
              label="Reels"
              count={mediaCounts.REELS}
            />
          </div>
          <ViewToggle handle={handle} sParams={sParams} vis={vis} />
        </div>
        <p className="mb-3 text-xs text-white/40">
          {media.length === 0
            ? "Nenhuma mídia no período selecionado"
            : vis === "lista"
              ? `${media.length} ${media.length === 1 ? "mídia" : "mídias"} no período · clique nas colunas pra ordenar`
              : `${media.length} ${media.length === 1 ? "mídia" : "mídias"} · top 12 exibidas`}
        </p>
        {vis === "lista" ? (
          <MediaTableDark
            items={media}
            sort={sortKey}
            ord={sortOrd}
            basePath={`/dashboard/contas/${handle}`}
            baseParams={{
              aba: sParams.aba,
              periodo: sParams.periodo,
              de: sParams.de,
              ate: sParams.ate,
              vis: "lista",
            }}
          />
        ) : (
          <MediaGridDark items={media} />
        )}
      </main>

    </div>
  );
}

function buildContentHref(
  handle: string,
  sParams: { periodo?: string; de?: string; ate?: string; vis?: string; sort?: string; ord?: string },
  overrides: { aba?: string | undefined },
): string {
  const params = new URLSearchParams();
  if (overrides.aba !== undefined) {
    params.set("aba", overrides.aba);
  } else if (overrides.aba === undefined && Object.prototype.hasOwnProperty.call(overrides, "aba")) {
    // explicitly clear
  }
  if (sParams.periodo) params.set("periodo", sParams.periodo);
  if (sParams.de) params.set("de", sParams.de);
  if (sParams.ate) params.set("ate", sParams.ate);
  if (sParams.vis) params.set("vis", sParams.vis);
  if (sParams.sort) params.set("sort", sParams.sort);
  if (sParams.ord) params.set("ord", sParams.ord);
  const q = params.toString();
  return `/dashboard/contas/${handle}${q ? `?${q}` : ""}`;
}

function ViewToggle({
  handle,
  sParams,
  vis,
}: {
  handle: string;
  sParams: { aba?: string; periodo?: string; de?: string; ate?: string; sort?: string; ord?: string };
  vis: "cards" | "lista";
}) {
  function hrefFor(target: "cards" | "lista") {
    const params = new URLSearchParams();
    if (sParams.aba) params.set("aba", sParams.aba);
    if (sParams.periodo) params.set("periodo", sParams.periodo);
    if (sParams.de) params.set("de", sParams.de);
    if (sParams.ate) params.set("ate", sParams.ate);
    if (target === "lista") params.set("vis", "lista");
    // se for cards, omite vis (default)
    if (target === "lista" && sParams.sort) params.set("sort", sParams.sort);
    if (target === "lista" && sParams.ord) params.set("ord", sParams.ord);
    const q = params.toString();
    return `/dashboard/contas/${handle}${q ? `?${q}` : ""}`;
  }
  return (
    <div className="inline-flex items-center gap-1 rounded-full border border-white/[0.06] bg-surface/60 p-1">
      <Link
        href={hrefFor("cards")}
        scroll={false}
        className={`inline-flex h-7 items-center gap-1.5 rounded-full px-3 text-xs font-medium transition ${
          vis === "cards"
            ? "bg-surface-2 text-white dark-glow-purple"
            : "text-white/60 hover:text-white"
        }`}
        aria-current={vis === "cards"}
      >
        <svg viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3" aria-hidden="true">
          <rect x="1" y="1" width="6" height="6" rx="1" />
          <rect x="9" y="1" width="6" height="6" rx="1" />
          <rect x="1" y="9" width="6" height="6" rx="1" />
          <rect x="9" y="9" width="6" height="6" rx="1" />
        </svg>
        Cards
      </Link>
      <Link
        href={hrefFor("lista")}
        scroll={false}
        className={`inline-flex h-7 items-center gap-1.5 rounded-full px-3 text-xs font-medium transition ${
          vis === "lista"
            ? "bg-surface-2 text-white dark-glow-purple"
            : "text-white/60 hover:text-white"
        }`}
        aria-current={vis === "lista"}
      >
        <svg viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3" aria-hidden="true">
          <rect x="1" y="2" width="14" height="2" rx="0.5" />
          <rect x="1" y="7" width="14" height="2" rx="0.5" />
          <rect x="1" y="12" width="14" height="2" rx="0.5" />
        </svg>
        Lista
      </Link>
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
      scroll={false}
      className={`inline-flex h-9 items-center gap-2 rounded-full px-4 text-sm font-medium transition ${
        active
          ? "dark-bg-grad-purple-pink text-white dark-glow-purple"
          : "border border-white/[0.06] bg-surface/60 text-white/70 hover:text-white"
      }`}
    >
      {label}
      {count !== undefined && (
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
            active ? "bg-white/20 text-white" : "bg-white/[0.06] text-white/60"
          }`}
        >
          {count}
        </span>
      )}
    </Link>
  );
}
