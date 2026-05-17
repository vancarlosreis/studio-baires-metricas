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
import { syncAccountFormAction } from "@/app/actions/sync";
import {
  EvolutionChart,
  type EvolutionDataPoint,
} from "@/components/evolution-chart";
import { MediaGrid } from "@/components/media-grid";
import {
  DonutChart,
  DonutLegend,
  type DonutSlice,
} from "@/components/charts/donut-chart";
import {
  AgeBarChart,
  AgeGenderGroupedChart,
  type GroupedBarData,
} from "@/components/charts/age-gender-chart";
import { HourlyBarChart } from "@/components/charts/hourly-chart";
import { DemographicsTable } from "@/components/tables/demographics-table";

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

const COLORS = {
  forest: "#2F4A35",
  burgundy: "#8B2C2C",
  ink: "#2A1F18",
  inkSoft: "#5A4A3A",
  tape: "#F4D35E",
};

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

  const [snapshots, media, mediaCounts, demographics] = await Promise.all([
    listAccountSnapshots(supabase, account.id, 30),
    listMediaWithInsights(supabase, account.id, { limit: 48, productType }),
    countMediaByType(supabase, account.id),
    getLatestDemographics(supabase, account.id),
  ]);

  const latest = snapshots[snapshots.length - 1];

  // Gráfico de evolução
  const followersData: EvolutionDataPoint[] = snapshots.map((s) => ({
    date: s.snapshot_date,
    value: s.followers_count,
  }));
  const reachData: EvolutionDataPoint[] = snapshots.map((s) => ({
    date: s.snapshot_date,
    value: s.reach,
  }));
  const viewsData: EvolutionDataPoint[] = snapshots.map((s) => ({
    date: s.snapshot_date,
    value: s.views,
  }));
  const engagedData: EvolutionDataPoint[] = snapshots.map((s) => ({
    date: s.snapshot_date,
    value: s.accounts_engaged,
  }));

  // Donut de gênero (seguidores)
  const genderFollower = demographics.follower?.gender;
  const genderDonutData: DonutSlice[] = genderFollower
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
  const genderTotal = sumValues(genderFollower);

  // Bar chart de idade (followers + reached lado a lado seria ideal, mas
  // o spec mostra agrupado por gênero — vamos mostrar idade simples por enquanto)
  const followerAge = sortAgeBuckets(demographics.follower?.age).map((b) => ({
    age: b.key,
    value: b.value,
  }));
  const reachedAge = sortAgeBuckets(demographics.reached?.age).map((b) => ({
    age: b.key,
    value: b.value,
  }));

  // Combinar age+gender pra GroupedBarChart precisaria de dados mais granulares
  // que a API não entrega. Mostramos os dois lados (followers e reached) separados.

  // Top cidades
  const topCitiesFollower = topEntries(demographics.follower?.city, 10);
  const topCitiesReached = topEntries(demographics.reached?.city, 10);

  // Top países
  const topCountriesFollower = topEntries(demographics.follower?.country, 6);

  // Online followers (heatmap por hora)
  const onlineFollowers = latest?.online_followers as
    | Record<string, number>
    | null;

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

      {/* === SEÇÃO 1: KPIs principais (4 linhas de 4) === */}
      <SectionTitle eyebrow="Visão geral" title="Os números." />

      {/* Linha 1: Conta */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Seguidores" value={formatNumber(latest?.followers_count)} />
        <Kpi label="Seguindo" value={formatNumber(latest?.follows_count)} />
        <Kpi
          label="Posts totais"
          value={formatNumber(latest?.media_count)}
        />
        <Kpi
          label="Cliques no perfil"
          value={formatNumber(latest?.profile_links_taps)}
          hint="botões de contato"
        />
      </div>

      {/* Linha 2: Alcance e impressões */}
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi
          label="Alcance (7d)"
          value={formatNumber(latest?.reach)}
          accent="forest"
        />
        <Kpi
          label="Visualizações (7d)"
          value={formatNumber(latest?.views)}
          accent="forest"
        />
        <Kpi
          label="Contas engajadas (7d)"
          value={formatNumber(latest?.accounts_engaged)}
          accent="forest"
        />
        <Kpi
          label="Interações totais (7d)"
          value={formatNumber(latest?.total_interactions)}
          accent="burgundy"
        />
      </div>

      {/* Linha 3: Engajamento detalhado */}
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Curtidas" value={formatNumber(latest?.likes)} />
        <Kpi label="Comentários" value={formatNumber(latest?.comments)} />
        <Kpi label="Salvamentos" value={formatNumber(latest?.saves)} />
        <Kpi
          label="Compartilhamentos"
          value={formatNumber(latest?.shares)}
        />
      </div>

      {/* === SEÇÃO 2: Evolução === */}
      <SectionTitle eyebrow="Crescimento" title="Evolução nos últimos 30 dias." />

      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="Seguidores" subtitle="Histórico">
          <EvolutionChart data={followersData} color="ink" />
        </ChartCard>
        <ChartCard title="Alcance" subtitle="Histórico">
          <EvolutionChart data={reachData} color="forest" />
        </ChartCard>
        <ChartCard title="Visualizações" subtitle="Histórico">
          <EvolutionChart data={viewsData} color="forest" />
        </ChartCard>
        <ChartCard title="Contas engajadas" subtitle="Histórico">
          <EvolutionChart data={engagedData} color="burgundy" />
        </ChartCard>
      </div>

      {/* === SEÇÃO 3: Audiência (demographics) === */}
      <SectionTitle
        eyebrow="Audiência"
        title="Quem segue e quem alcança."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard
          title="Seguidores por gênero"
          subtitle={`${formatNumber(genderTotal)} pessoas`}
        >
          <DonutChart
            data={genderDonutData}
            centerLabel="Total"
            centerValue={formatNumber(genderTotal)}
          />
          <DonutLegend data={genderDonutData} />
        </ChartCard>

        <ChartCard
          title="Idade dos seguidores"
          subtitle={`${formatNumber(sumValues(demographics.follower?.age))} pessoas`}
        >
          <AgeBarChart data={followerAge} color="forest" />
        </ChartCard>

        <ChartCard
          title="Audiência alcançada"
          subtitle="Por faixa etária (últimos 7d)"
        >
          <AgeBarChart data={reachedAge} color="burgundy" />
        </ChartCard>

        {onlineFollowers && (
          <ChartCard
            title="Melhor horário pra postar"
            subtitle="Quando seus seguidores estão online"
          >
            <HourlyBarChart data={onlineFollowers} />
          </ChartCard>
        )}
      </div>

      {/* === SEÇÃO 4: Geografia === */}
      <SectionTitle
        eyebrow="Geografia"
        title="De onde vem o público."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <DemographicsTable
          title="Cidades — Seguidores"
          subtitle="Top 10"
          entries={topCitiesFollower}
          type="city"
          total={sumValues(demographics.follower?.city)}
        />
        <DemographicsTable
          title="Cidades — Alcançadas"
          subtitle="Top 10 nos últimos 7d"
          entries={topCitiesReached}
          type="city"
          total={sumValues(demographics.reached?.city)}
        />
        <DemographicsTable
          title="Países — Seguidores"
          subtitle="Top 6"
          entries={topCountriesFollower}
          type="country"
          total={sumValues(demographics.follower?.country)}
        />
        <div className="hidden lg:block">
          {/* Placeholder pra simetria; pode virar widget extra depois */}
        </div>
      </div>

      {/* === SEÇÃO 5: Mídias === */}
      <section className="mt-16">
        <SectionTitle
          eyebrow="Conteúdo"
          title="Últimas mídias."
          marginTop={false}
        />

        {/* Tabs filtro */}
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

function Kpi({
  label,
  value,
  accent = "ink",
  hint,
}: {
  label: string;
  value: string;
  accent?: "ink" | "forest" | "burgundy";
  hint?: string;
}) {
  const color =
    accent === "forest"
      ? "text-forest"
      : accent === "burgundy"
        ? "text-burgundy"
        : "text-ink";
  return (
    <div className="rounded-2xl border border-ink/10 bg-paper p-5">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-soft">
        {label}
      </div>
      <div className={`headline-display mt-2 text-4xl ${color}`}>{value}</div>
      {hint && <div className="mt-1 text-[10px] text-ink-soft">{hint}</div>}
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
