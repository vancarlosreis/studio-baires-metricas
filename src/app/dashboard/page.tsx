import Link from "next/link";
import { KpiCard } from "@/components/kpi-card";
import { AccountCard } from "@/components/account-card";
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
  if (n >= 1_000) return `${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1)}k`;
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

  // KPIs agregados a partir dos snapshots
  const totalFollowers = accounts.reduce(
    (sum, a) => sum + (a.latest_snapshot?.followers_count ?? 0),
    0,
  );
  const totalReach = accounts.reduce(
    (sum, a) => sum + (a.latest_snapshot?.reach ?? 0),
    0,
  );
  const totalPosts = accounts.reduce(
    (sum, a) => sum + (a.latest_snapshot?.media_count ?? 0),
    0,
  );

  return (
    <div className="mx-auto max-w-7xl px-6 py-12 sm:px-10">
      {params.connected && (
        <div className="mb-8 rounded-2xl border border-forest/30 bg-forest/5 px-6 py-4">
          <p className="text-sm font-semibold text-forest">
            ✨ <strong className="font-bold">@{params.connected}</strong> conectada com sucesso!
          </p>
          <p className="mt-1 text-xs text-forest/80">
            Clica em <em>&ldquo;Sincronizar agora&rdquo;</em> no card pra puxar as primeiras métricas.
          </p>
        </div>
      )}

      {params.synced && (
        <div className="mb-8 rounded-2xl border border-forest/30 bg-forest/5 px-6 py-4">
          <p className="text-sm font-semibold text-forest">
            ✓ Sincronizada com sucesso.
          </p>
        </div>
      )}

      {params.sync_error && (
        <div className="mb-8 rounded-2xl border border-burgundy/30 bg-burgundy/5 px-6 py-4">
          <p className="text-sm font-semibold text-burgundy">
            Falha ao sincronizar
          </p>
          <p className="mt-1 text-xs text-burgundy/80">
            <code>{params.sync_error}</code>
          </p>
        </div>
      )}

      {/* Saudação */}
      <div className="mb-10">
        <p className="text-sm font-semibold uppercase tracking-wider text-ink-soft">
          Visão geral
        </p>
        <h1 className="headline-display mt-2 text-5xl text-ink sm:text-6xl">
          {greeting}, <span className="text-burgundy">{firstName}</span>.
        </h1>
        <p className="mt-3 max-w-2xl text-base text-ink-soft sm:text-lg">
          {accounts.length === 0
            ? "Conecte sua primeira conta Instagram pra começar."
            : `Resumo das ${accounts.length === 1 ? "métricas" : `${accounts.length} contas`} dos seus clientes.`}
        </p>
      </div>

      {/* KPIs agregados (só mostra se tiver contas) */}
      {accounts.length > 0 && (
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            label="Contas conectadas"
            value={String(accounts.length)}
            hint={accounts.length === 1 ? "ativa" : "ativas"}
            trend="neutral"
          />
          <KpiCard
            label="Seguidores totais"
            value={formatNumber(totalFollowers)}
            trend="neutral"
            accent="forest"
          />
          <KpiCard
            label="Alcance total"
            value={formatNumber(totalReach)}
            trend="neutral"
            accent="forest"
          />
          <KpiCard
            label="Posts totais"
            value={formatNumber(totalPosts)}
            trend="neutral"
          />
        </section>
      )}

      {/* Lista de contas */}
      <section className="mt-16">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <h2 className="headline-display text-3xl text-ink">
              {accounts.length === 0 ? (
                <>
                  Suas <span className="italic">contas</span>
                </>
              ) : (
                <>
                  {accounts.length === 1 ? "Sua" : "Suas"}{" "}
                  <span className="italic">contas</span>
                </>
              )}
            </h2>
            <p className="mt-1 text-sm text-ink-soft">
              {accounts.length === 0
                ? "Nenhuma conta conectada ainda"
                : accounts.length === 1
                  ? "1 conta conectada"
                  : `${accounts.length} contas conectadas`}
            </p>
          </div>
          <Link
            href="/dashboard/conectar"
            className="inline-flex h-10 items-center rounded-full bg-forest px-5 text-sm font-semibold text-cream transition-colors hover:bg-forest-soft"
          >
            + Conectar conta
          </Link>
        </div>

        {accounts.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {accounts.map((account) => (
              <AccountCard key={account.id} account={account} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-3xl border border-dashed border-ink/20 bg-paper/50 px-8 py-16 text-center">
      <div className="headline-display text-4xl text-ink">
        Vamos começar?
      </div>
      <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-ink-soft">
        <span className="italic">Conecte sua primeira conta Instagram</span> pra
        ver métricas, alcance, posts em destaque e gerar relatórios brandados
        pros seus clientes.
      </p>
      <Link
        href="/dashboard/conectar"
        className="mt-6 inline-flex h-12 items-center rounded-full bg-ink px-8 text-sm font-semibold text-cream transition-colors hover:bg-forest"
      >
        Conectar primeira conta
      </Link>
    </div>
  );
}
