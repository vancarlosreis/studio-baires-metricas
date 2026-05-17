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
import { EvolutionChart, type EvolutionDataPoint } from "@/components/evolution-chart";
import { MediaDisplay } from "@/components/media-display";
import { SyncButton } from "@/components/sync-button";
import { PeriodSelector } from "@/components/period-selector";
import {
  DonutChart,
  DonutLegend,
  type DonutSlice,
} from "@/components/charts/donut-chart";
import { AgeBarChart } from "@/components/charts/age-gender-chart";
import { HourlyBarChart } from "@/components/charts/hourly-chart";
import { DayOfWeekChart } from "@/components/charts/day-of-week-chart";
import { DemographicsTable } from "@/components/tables/demographics-table";
import {
  KpiCard,
  KpiComparisonCard,
  KpiNoHistoryCard,
  KpiWithDateRange,
} from "@/components/kpi/kpi-cards";

const PRODUCT_TYPE_FROM_TAB: Record<string, string | undefined> = {
  posts: "FEED",
  reels: "REELS",
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

const COLORS = {
  forest: "#2F4A35",
  burgundy: "#8B2C2C",
  ink: "#2A1F18",
};

type Params = Promise<{ handle: string }>;
type SearchParams = Promise<{
  aba?: string;
  periodo?: string;
  de?: string;
  ate?: string;
  vis?: string;
  sort?: string;
  ord?: string;
}>;

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
  const period = resolvePeriod(sParams.periodo, sParams.de, sParams.ate);
  const previous = previousPeriod(period);

  // Busca paralela de tudo que precisamos
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

  // Filtra mídias do período pra grid/tabela
  const media = allMedia.filter((m) => {
    const t = new Date(m.posted_at).getTime();
    return t >= period.start.getTime() && t <= period.end.getTime();
  });

  // Snapshot mais recente (atual) e mais antigo do período
  const inPeriodSnapshots = snapshots.filter((s) => {
    const t = new Date(s.snapshot_date + "T12:00:00").getTime();
    return t >= period.start.getTime() && t <= period.end.getTime();
  });
  const latest = inPeriodSnapshots[inPeriodSnapshots.length - 1] ?? snapshots[snapshots.length - 1];

  // Snapshot anterior pra comparação de valores de período (reach, views, etc)
  const prev = snapshotBeforePeriod;

  // Demographics
  const genderFollower = demographics.follower?.gender;
  const genderDonut: DonutSlice[] = genderFollower
    ? [
        {
          label: genderLabel("F"),
          value: genderFollower["F"] ?? 0,
          color: COLORS.burgundy,
        },
        {
          label: genderLabel("M"),
          value: genderFollower["M"] ?? 0,
          color: COLORS.forest,
        },
        {
          label: genderLabel("U"),
          value: genderFollower["U"] ?? 0,
          color: "#A8B3A2",
        },
      ].filter((s) => s.value > 0)
    : [];
  const followerAge = sortAgeBuckets(demographics.follower?.age).map((b) => ({
    age: b.key,
    value: b.value,
  }));
  const reachedAge = sortAgeBuckets(demographics.reached?.age).map((b) => ({
    age: b.key,
    value: b.value,
  }));
  const topCitiesFollower = topEntries(demographics.follower?.city, 10);
  const topCountriesFollower = topEntries(demographics.follower?.country, 6);

  // Online followers (heatmap)
  const onlineFollowers = latest?.online_followers as
    | Record<string, number>
    | null;

  // Evolução chart
  const chartSnapshots = inPeriodSnapshots.length > 0 ? inPeriodSnapshots : snapshots;
  const reachData: EvolutionDataPoint[] = chartSnapshots.map((s) => ({
    date: s.snapshot_date,
    value: s.reach,
  }));

  const initials = getAccountInitials(account);
  const displayName = account.ig_account_name || account.ig_username;
  const accountTypeLabel =
    account.account_type === "BUSINESS"
      ? "Empresa"
      : account.account_type === "MEDIA_CREATOR"
        ? "Criador"
        : "Conta";

  return (
    <div className="mx-auto max-w-7xl px-6 py-12 sm:px-10">
      {/* Voltar */}
      <Link
        href="/dashboard"
        className="text-sm font-semibold text-ink-soft underline-offset-4 hover:text-ink hover:underline"
      >
        ← Voltar
      </Link>

      {/* Header */}
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
              {accountTypeLabel}
            </p>
            <h1 className="headline-display mt-1 text-4xl text-ink sm:text-5xl">
              {displayName}
            </h1>
            <p className="text-base text-ink-soft">@{account.ig_username}</p>
          </div>
        </div>

        <div className="flex flex-col items-end gap-3">
          <div className="flex items-center gap-3">
            <PeriodSelector />
            <SyncButton igAccountId={account.id} variant="primary" />
          </div>
          <span className="text-xs text-ink-soft">
            Última sync <span className="italic">{timeAgo(account.last_synced_at)}</span>
          </span>
        </div>
      </header>

      {/* Banner informativo */}
      <div className="mt-10 rounded-2xl border border-ink/10 bg-paper/60 px-6 py-4">
        <p className="text-xs leading-relaxed text-ink-soft">
          A maior parte dos dados do <strong className="text-ink">Instagram Business</strong> refere-se a
          resultados <strong className="text-ink">orgânicos</strong>. As métricas que incluem dados
          pagos estão marcadas no título. Para acessar todos os dados pagos do
          Instagram, consulte o relatório de <strong className="text-ink">Meta Ads</strong>.
        </p>
      </div>

      {/* ============================================================== */}
      {/* SEÇÃO 1 — KPIs da conta (linhas 1-2) */}
      {/* ============================================================== */}
      <SectionTitle eyebrow="Visão geral" title="A conta." />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiNoHistoryCard label="Número de seguidores" />
        <KpiNoHistoryCard label="Variação de seguidores" />
        <KpiComparisonCard
          label="Visualizações totais (orgânicas + pagas)"
          value={latest?.views}
          previous={prev?.views}
        />
        <KpiWithDateRange
          label="Alcance total (orgânico + pago) dos últimos 30 dias"
          value={latest?.reach}
          previous={prev?.reach}
          start={period.start}
          end={period.end}
        />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiWithDateRange
          label="Alcance pago dos últimos 30 dias"
          value={0}
          previous={0}
          start={period.start}
          end={period.end}
        />
        <KpiWithDateRange
          label="Alcance orgânico dos últimos 30 dias"
          value={latest?.reach}
          previous={prev?.reach}
          start={period.start}
          end={period.end}
        />
        <KpiComparisonCard
          label="Visitas do perfil"
          value={latest?.profile_links_taps}
          previous={prev?.profile_links_taps}
        />
        <KpiComparisonCard
          label="Interações totais"
          value={latest?.total_interactions}
          previous={prev?.total_interactions}
        />
      </div>

      {/* ============================================================== */}
      {/* SEÇÃO 2 — Audiência (idade × gênero + alcance diário) */}
      {/* ============================================================== */}
      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <ChartCard
          title="Audiência por idade"
          subtitle="Distribuição de seguidores · API não entrega cruzamento idade × gênero"
        >
          <AgeBarChart data={followerAge} color="forest" />
        </ChartCard>
        <ChartCard title="Alcance diário" subtitle="Últimos snapshots">
          <EvolutionChart data={reachData} color="forest" />
        </ChartCard>
      </div>

      {/* ============================================================== */}
      {/* SEÇÃO 3 — Seguidores por gênero (donut) */}
      {/* ============================================================== */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div /> {/* espaço vazio à esquerda pra balancear */}
        <ChartCard
          title="Seguidores por gênero"
          subtitle={`${sumValues(genderFollower).toLocaleString("pt-BR")} pessoas`}
        >
          <DonutChart
            data={genderDonut}
            centerValue={sumValues(genderFollower).toLocaleString("pt-BR")}
            centerLabel="Total"
          />
          <DonutLegend data={genderDonut} />
        </ChartCard>
      </div>

      {/* ============================================================== */}
      {/* SEÇÃO 4 — Cidades */}
      {/* ============================================================== */}
      <div className="mt-10">
        <DemographicsTable
          title="Cidades com o maior número de seguidores"
          subtitle="Top 10"
          entries={topCitiesFollower}
          type="city"
          total={sumValues(demographics.follower?.city)}
        />
      </div>

      {/* ============================================================== */}
      {/* SEÇÃO 5 — Postagens (KPIs agregados) */}
      {/* ============================================================== */}
      <SectionTitle eyebrow="Postagens" title="Posts do feed." />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <KpiComparisonCard
          label="Número de postagens do feed"
          value={feedAggCurrent.count}
          previous={feedAggPrev.count}
        />
        <KpiWithDateRange
          label="Alcance das postagens dos últimos 30 dias"
          value={feedAggCurrent.reach}
          previous={feedAggPrev.reach}
          start={period.start}
          end={period.end}
        />
        <KpiComparisonCard
          label="Interações nas postagens"
          value={feedAggCurrent.total_interactions}
          previous={feedAggPrev.total_interactions}
        />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiComparisonCard
          label="Curtidas em postagens"
          value={feedAggCurrent.likes}
          previous={feedAggPrev.likes}
        />
        <KpiComparisonCard
          label="Salvamento das postagens"
          value={feedAggCurrent.saves}
          previous={feedAggPrev.saves}
        />
        <KpiComparisonCard
          label="Comentários em postagens"
          value={feedAggCurrent.comments}
          previous={feedAggPrev.comments}
        />
        <KpiComparisonCard
          label="Compartilhamento das postagens"
          value={feedAggCurrent.shares}
          previous={feedAggPrev.shares}
        />
      </div>

      {/* Melhor dia + melhor horário */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <ChartCard
          title="Melhor dia para postagens"
          subtitle="Engajamento médio por dia da semana (dos posts publicados)"
        >
          <DayOfWeekChart data={dayOfWeekStats} />
        </ChartCard>
        <ChartCard
          title="Melhor horário para postagens"
          subtitle="Seguidores online por hora"
        >
          <HourlyBarChart data={onlineFollowers} />
        </ChartCard>
      </div>

      {/* ============================================================== */}
      {/* SEÇÃO 6 — Reels (KPIs agregados) */}
      {/* ============================================================== */}
      <SectionTitle eyebrow="Reels" title="Performance dos reels." />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <KpiComparisonCard
          label="Número de Reels"
          value={reelsAggCurrent.count}
          previous={reelsAggPrev.count}
        />
        <KpiWithDateRange
          label="Alcance dos reels dos últimos 30 dias"
          value={reelsAggCurrent.reach}
          previous={reelsAggPrev.reach}
          start={period.start}
          end={period.end}
        />
        <KpiComparisonCard
          label="Interações nos Reels"
          value={reelsAggCurrent.total_interactions}
          previous={reelsAggPrev.total_interactions}
        />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiComparisonCard
          label="Curtidas nos Reels"
          value={reelsAggCurrent.likes}
          previous={reelsAggPrev.likes}
        />
        <KpiComparisonCard
          label="Comentários nos Reels"
          value={reelsAggCurrent.comments}
          previous={reelsAggPrev.comments}
        />
        <KpiComparisonCard
          label="Salvamento nos Reels"
          value={reelsAggCurrent.saves}
          previous={reelsAggPrev.saves}
        />
        <KpiComparisonCard
          label="Compartilhamento nos Reels"
          value={reelsAggCurrent.shares}
          previous={reelsAggPrev.shares}
        />
      </div>

      {/* ============================================================== */}
      {/* SEÇÃO 7 — Stories (preliminar — implementar sync) */}
      {/* ============================================================== */}
      <SectionTitle eyebrow="Stories" title="Stories nas últimas 24h." />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <KpiComparisonCard label="Número de stories" value={0} previous={0} />
        <KpiComparisonCard
          label="Visualizações totais dos Stories"
          value={0}
          previous={0}
        />
        <KpiWithDateRange
          label="Alcance dos stories dos últimos 30 dias"
          value={0}
          previous={0}
          start={period.start}
          end={period.end}
        />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <KpiComparisonCard
          label="Total de interações com Stories"
          value={0}
          previous={0}
        />
        <KpiComparisonCard
          label="Total de respostas a stories"
          value={0}
          previous={0}
        />
        <KpiComparisonCard
          label="Total de compartilhamentos dos Stories"
          value={0}
          previous={0}
        />
      </div>

      <div className="mt-4 rounded-2xl border border-dashed border-tape/40 bg-tape/10 px-4 py-3">
        <p className="text-xs text-ink-soft">
          ⚠️ Sync de stories ainda não implementado. Stories expiram em 24h na
          API — implementação requer cron job a cada 4-6 horas (próxima fase).
        </p>
      </div>

      {/* ============================================================== */}
      {/* SEÇÃO 8 — Geografia detalhada */}
      {/* ============================================================== */}
      <SectionTitle eyebrow="Geografia" title="De onde vem o público." />

      <div className="grid gap-6 lg:grid-cols-2">
        <DemographicsTable
          title="Países — Seguidores"
          subtitle="Top 6"
          entries={topCountriesFollower}
          type="country"
          total={sumValues(demographics.follower?.country)}
        />
        <DemographicsTable
          title="Cidades — Alcançadas (7d)"
          subtitle="Top 10 alcançadas no período"
          entries={topEntries(demographics.reached?.city, 10)}
          type="city"
          total={sumValues(demographics.reached?.city)}
        />
      </div>

      {/* ============================================================== */}
      {/* SEÇÃO 9 — Mídias (grid/tabela com filtros) */}
      {/* ============================================================== */}
      <section className="mt-16">
        <SectionTitle
          eyebrow="Conteúdo"
          title="Dados orgânicos de postagens."
          marginTop={false}
        />

        <div className="mb-4 flex flex-wrap gap-2">
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

        <p className="mb-4 text-xs text-ink-soft">
          {media.length === 0
            ? "Nenhuma mídia no período selecionado"
            : `${media.length} ${media.length === 1 ? "mídia" : "mídias"} no período · clique pra ver detalhes`}
        </p>

        <MediaDisplay items={media} />
      </section>
    </div>
  );
}

// ============================================================================
// Sub-components
// ============================================================================

function SectionTitle({
  eyebrow,
  title,
  marginTop = true,
}: {
  eyebrow: string;
  title: string;
  marginTop?: boolean;
}) {
  return (
    <div className={marginTop ? "mb-6 mt-16" : "mb-6"}>
      <p className="text-xs font-semibold uppercase tracking-wider text-ink-soft">
        {eyebrow}
      </p>
      <h2 className="headline-display mt-1 text-3xl text-ink sm:text-4xl">
        {title}
      </h2>
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
