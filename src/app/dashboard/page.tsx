import Link from "next/link";
import { TrendingUp, Eye, Users, Activity } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getFirstName } from "@/lib/user";
import { listIgAccounts } from "@/lib/queries/ig-accounts";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

function formatNumber(n: number | null | undefined): string {
  if (n == null) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1)}K`;
  return n.toString();
}

type SearchParams = Promise<{
  connected?: string;
  synced?: string;
  sync_error?: string;
}>;

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const firstName = getFirstName(user);
  const greeting = getGreeting();

  const accounts = await listIgAccounts(supabase);

  function sumOr(
    key: "followers_count" | "reach" | "media_count" | "accounts_engaged",
  ): number | null {
    const values = accounts
      .map((a) => a.latest_snapshot?.[key])
      .filter((v): v is number => v != null);
    if (values.length === 0) return null;
    return values.reduce((s, v) => s + v, 0);
  }

  const totalFollowers = sumOr("followers_count");
  const totalReach = sumOr("reach");
  const totalEngaged = sumOr("accounts_engaged");

  return (
    <div className="flex flex-col gap-8 pb-10">
      {params.connected && (
        <Banner
          tone="success"
          title={`✨ @${params.connected} conectada com sucesso!`}
          subtitle="Clica em “Sincronizar agora” no card pra puxar as primeiras métricas."
        />
      )}
      {params.synced && (
        <Banner tone="success" title="✓ Sincronizada com sucesso." />
      )}
      {params.sync_error && (
        <Banner
          tone="error"
          title="Falha ao sincronizar"
          subtitle={params.sync_error}
        />
      )}

      <header>
        <p className="text-[11px] uppercase tracking-[0.2em] text-fg-muted">
          Visão geral
        </p>
        <h1 className="mt-2 text-3xl font-bold text-fg sm:text-4xl">
          {greeting}, <span className="dark-text-grad">{firstName}</span>.
        </h1>
        <p className="mt-2 text-sm text-fg-muted">
          {accounts.length === 0
            ? "Conecte sua primeira conta Instagram pra começar."
            : `Resumo das ${accounts.length === 1 ? "métricas da sua conta" : `${accounts.length} contas`}.`}
        </p>
      </header>

      {accounts.length > 0 && (
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MiniKpi icon={Users} label="Contas conectadas" value={String(accounts.length)} accent="purple" />
          <MiniKpi icon={Users} label="Seguidores totais" value={formatNumber(totalFollowers)} accent="pink" />
          <MiniKpi icon={Eye} label="Alcance (7d)" value={formatNumber(totalReach)} accent="blue" />
          <MiniKpi icon={Activity} label="Engajadas (7d)" value={formatNumber(totalEngaged)} accent="cyan" />
        </section>
      )}

      <section>
        <div className="mb-4 flex items-end justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-fg-muted">
              Contas
            </p>
            <h2 className="mt-1 text-2xl font-bold text-fg">
              {accounts.length === 1 ? "Sua conta" : "Suas contas"}
            </h2>
            <p className="mt-1 text-xs text-fg-muted">
              {accounts.length === 0
                ? "Nenhuma conta conectada"
                : `${accounts.length} ${accounts.length === 1 ? "conta conectada" : "contas conectadas"}`}
            </p>
          </div>
          <Link
            href="/dashboard/conectar"
            className="dark-bg-grad-purple-pink dark-glow-purple inline-flex h-10 items-center rounded-full px-5 text-sm font-semibold text-white"
          >
            + Conectar conta
          </Link>
        </div>

        {accounts.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {accounts.map((a) => (
              <AccountTile key={a.id} account={a} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Banner({
  tone,
  title,
  subtitle,
}: {
  tone: "success" | "error";
  title: string;
  subtitle?: string;
}) {
  const cls =
    tone === "success"
      ? "border-success-neon/30 bg-success-neon/10 text-success-neon"
      : "border-danger-neon/30 bg-danger-neon/10 text-danger-neon";
  return (
    <div className={`rounded-2xl border px-5 py-4 ${cls}`}>
      <p className="text-sm font-semibold">{title}</p>
      {subtitle && <p className="mt-1 text-xs opacity-80">{subtitle}</p>}
    </div>
  );
}

const ACCENT_COLOR: Record<string, string> = {
  purple: "text-neon-purple",
  pink: "text-neon-pink",
  blue: "text-neon-blue",
  cyan: "text-neon-cyan",
};

function MiniKpi({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: typeof TrendingUp;
  label: string;
  value: string;
  accent: "purple" | "pink" | "blue" | "cyan";
}) {
  return (
    <div className="dark-card flex flex-col gap-2 p-5">
      <div className="flex items-center justify-between">
        <span className="text-[11px] uppercase tracking-[0.18em] text-fg-muted">
          {label}
        </span>
        <Icon size={16} className={ACCENT_COLOR[accent]} />
      </div>
      <p className="text-2xl font-bold text-fg">{value}</p>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="dark-card grid place-items-center px-8 py-16 text-center">
      <div>
        <h3 className="text-2xl font-bold text-fg">Vamos começar?</h3>
        <p className="mx-auto mt-2 max-w-md text-sm text-fg-muted">
          Conecte sua primeira conta Instagram pra ver métricas, posts em
          destaque e gerar relatórios.
        </p>
        <Link
          href="/dashboard/conectar"
          className="dark-bg-grad-purple-pink dark-glow-purple mt-6 inline-flex h-11 items-center rounded-full px-6 text-sm font-semibold text-white"
        >
          Conectar primeira conta
        </Link>
      </div>
    </div>
  );
}

type AccountTileProps = {
  account: Awaited<ReturnType<typeof listIgAccounts>>[number];
};

function AccountTile({ account }: AccountTileProps) {
  const snap = account.latest_snapshot;
  const initials = account.ig_username.slice(0, 2).toUpperCase();
  return (
    <Link
      href={`/dashboard/contas/${account.ig_username}`}
      className="dark-card dark-card-hover flex flex-col gap-3 p-5"
    >
      <div className="flex items-center gap-3">
        {account.ig_profile_picture_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={account.ig_profile_picture_url}
            alt={account.ig_username}
            className="h-12 w-12 rounded-full object-cover ring-2 ring-neon-purple/40"
          />
        ) : (
          <div className="dark-bg-grad-purple-pink grid h-12 w-12 place-items-center rounded-full text-sm font-bold text-white">
            {initials}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-fg">
            {account.ig_account_name ?? account.ig_username}
          </p>
          <p className="truncate text-xs text-fg-muted">@{account.ig_username}</p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 pt-1">
        <Stat label="Seguidores" value={formatNumber(snap?.followers_count)} />
        <Stat label="Alcance" value={formatNumber(snap?.reach)} />
        <Stat label="Posts" value={formatNumber(snap?.media_count)} />
      </div>
    </Link>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface-2/40 px-2 py-2 text-center">
      <p className="text-[10px] uppercase tracking-wider text-fg-muted">
        {label}
      </p>
      <p className="mt-0.5 text-sm font-semibold text-fg">{value}</p>
    </div>
  );
}
