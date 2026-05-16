import Link from "next/link";
import { KpiCard } from "@/components/kpi-card";
import { AccountCard, type AccountMock } from "@/components/account-card";
import { createClient } from "@/lib/supabase/server";
import { getFirstName } from "@/lib/user";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

// Mock data — substituir por dados reais quando integrar Meta Graph API
const mockAccounts: AccountMock[] = [
  {
    id: "1",
    handle: "@duda.macedogr",
    name: "Duda Gregório",
    followers: 48200,
    growth30d: 12.4,
    reach30d: 284000,
    initials: "DG",
  },
  {
    id: "2",
    handle: "@clinica.belapele",
    name: "Clínica Bela Pele",
    followers: 12500,
    growth30d: 4.1,
    reach30d: 56300,
    initials: "BP",
  },
  {
    id: "3",
    handle: "@cafe.matinal",
    name: "Café Matinal",
    followers: 8900,
    growth30d: -1.8,
    reach30d: 34100,
    initials: "CM",
  },
];

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const firstName = getFirstName(user);
  const greeting = getGreeting();

  return (
    <div className="mx-auto max-w-7xl px-6 py-12 sm:px-10">
      {/* Saudação */}
      <div className="mb-10">
        <p className="text-sm font-semibold uppercase tracking-wider text-ink-soft">
          Visão geral
        </p>
        <h1 className="headline-display mt-2 text-5xl text-ink sm:text-6xl">
          {greeting}, <span className="text-burgundy">{firstName}</span>.
        </h1>
        <p className="mt-3 max-w-2xl text-base text-ink-soft sm:text-lg">
          Aqui está o resumo dos últimos 30 dias dos seus clientes.
        </p>
      </div>

      {/* KPIs */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Contas conectadas"
          value="3"
          hint="ativas"
          trend="neutral"
        />
        <KpiCard
          label="Seguidores totais"
          value="69.6k"
          hint="+1.2k"
          trend="up"
          accent="forest"
        />
        <KpiCard
          label="Alcance médio"
          value="125k"
          hint="+8.4%"
          trend="up"
          accent="forest"
        />
        <KpiCard
          label="Posts no mês"
          value="42"
          hint="-3"
          trend="down"
          accent="burgundy"
        />
      </section>

      {/* Contas */}
      <section className="mt-16">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <h2 className="headline-display text-3xl text-ink">
              Suas <span className="italic">contas</span>
            </h2>
            <p className="mt-1 text-sm text-ink-soft">
              {mockAccounts.length} {mockAccounts.length === 1 ? "conta conectada" : "contas conectadas"}
            </p>
          </div>
          <Link
            href="/dashboard/conectar"
            className="inline-flex h-10 items-center rounded-full bg-forest px-5 text-sm font-semibold text-cream transition-colors hover:bg-forest-soft"
          >
            + Conectar conta
          </Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {mockAccounts.map((account) => (
            <AccountCard key={account.id} account={account} />
          ))}
        </div>
      </section>

      {/* Empty state aviso */}
      <div className="mt-16 rounded-2xl border border-dashed border-ink/20 bg-paper/50 p-8 text-center">
        <p className="text-sm text-ink-soft">
          <span className="italic">Estes são dados de demonstração.</span>{" "}
          Quando você conectar uma conta real do Instagram, as métricas serão
          atualizadas automaticamente.
        </p>
      </div>
    </div>
  );
}
