import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { listIgAccounts } from "@/lib/queries/ig-accounts";
import {
  generateReportFormAction,
  downloadReportFormAction,
  deleteReportFormAction,
} from "@/app/actions/reports";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

type SearchParams = Promise<{
  generated?: string;
  error?: string;
}>;

export default async function RelatoriosPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const supabase = await createClient();

  const [accounts, { data: reports }] = await Promise.all([
    listIgAccounts(supabase),
    supabase
      .from("reports")
      .select("*, ig_accounts(ig_username, ig_account_name)")
      .order("generated_at", { ascending: false }),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-6 py-12 sm:px-10">
      {params.generated && (
        <div className="mb-8 rounded-2xl border border-forest/30 bg-forest/5 px-6 py-4">
          <p className="text-sm font-semibold text-forest">
            ✨ Relatório gerado com sucesso. Clique em &ldquo;Baixar&rdquo; abaixo.
          </p>
        </div>
      )}

      {params.error && (
        <div className="mb-8 rounded-2xl border border-burgundy/30 bg-burgundy/5 px-6 py-4">
          <p className="text-sm font-semibold text-burgundy">
            Erro ao gerar relatório
          </p>
          <p className="mt-1 text-xs text-burgundy/80">
            <code>{params.error}</code>
          </p>
        </div>
      )}

      <div className="mb-10">
        <p className="text-sm font-semibold uppercase tracking-wider text-ink-soft">
          Estúdio
        </p>
        <h1 className="headline-display mt-2 text-5xl text-ink sm:text-6xl">
          Relatórios <span className="text-burgundy italic">PDF</span>
        </h1>
        <p className="mt-3 max-w-2xl text-base text-ink-soft sm:text-lg">
          Gere relatórios mensais brandados Studio Baires pra entregar pros
          clientes da agência.
        </p>
      </div>

      {/* Gerar novo */}
      <section className="mb-12 rounded-3xl border border-ink/10 bg-paper p-8">
        <h2 className="headline-display text-2xl text-ink">
          Gerar <span className="italic">novo</span>
        </h2>
        <p className="mt-1 text-sm text-ink-soft">
          Cobre os últimos 30 dias. Cliente recebe um PDF estilo revista.
        </p>

        {accounts.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-ink/20 bg-cream/50 p-6 text-center">
            <p className="text-sm text-ink-soft">
              <span className="italic">Nenhuma conta conectada ainda.</span>{" "}
              <Link
                href="/dashboard/conectar"
                className="font-semibold text-ink underline-offset-2 hover:underline"
              >
                Conecte uma conta
              </Link>{" "}
              pra gerar relatórios.
            </p>
          </div>
        ) : (
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {accounts.map((a) => (
              <form
                key={a.id}
                action={generateReportFormAction}
                className="rounded-2xl border border-ink/10 bg-cream/40 p-4"
              >
                <input type="hidden" name="igAccountId" value={a.id} />
                <div className="mb-3">
                  <div className="truncate text-sm font-semibold text-ink">
                    {a.ig_account_name || a.ig_username}
                  </div>
                  <div className="truncate text-xs text-ink-soft">
                    @{a.ig_username}
                  </div>
                </div>
                <button
                  type="submit"
                  className="inline-flex h-9 w-full items-center justify-center rounded-full bg-ink px-4 text-xs font-semibold text-cream transition-colors hover:bg-forest"
                >
                  Gerar relatório
                </button>
              </form>
            ))}
          </div>
        )}
      </section>

      {/* Histórico */}
      <section>
        <h2 className="headline-display text-3xl text-ink">
          Histórico
        </h2>
        <p className="mt-1 text-sm text-ink-soft">
          {reports?.length === 0 || !reports
            ? "Nenhum relatório gerado ainda"
            : `${reports.length} relatório${reports.length === 1 ? "" : "s"}`}
        </p>

        {reports && reports.length > 0 && (
          <div className="mt-6 overflow-hidden rounded-2xl border border-ink/10 bg-paper">
            <table className="w-full">
              <thead>
                <tr className="border-b border-ink/10 text-left">
                  <th className="px-6 py-4 text-[10px] font-semibold uppercase tracking-wider text-ink-soft">
                    Conta
                  </th>
                  <th className="px-6 py-4 text-[10px] font-semibold uppercase tracking-wider text-ink-soft">
                    Período
                  </th>
                  <th className="px-6 py-4 text-[10px] font-semibold uppercase tracking-wider text-ink-soft">
                    Gerado em
                  </th>
                  <th className="px-6 py-4 text-right text-[10px] font-semibold uppercase tracking-wider text-ink-soft">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody>
                {reports.map((r) => {
                  const acc = r.ig_accounts as {
                    ig_username: string;
                    ig_account_name: string | null;
                  } | null;
                  return (
                    <tr
                      key={r.id}
                      className="border-b border-ink/5 last:border-b-0 hover:bg-cream/30"
                    >
                      <td className="px-6 py-4">
                        <div className="font-semibold text-ink">
                          {acc?.ig_account_name || acc?.ig_username || "—"}
                        </div>
                        <div className="text-xs text-ink-soft">
                          @{acc?.ig_username}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-ink-soft">
                        {formatDate(r.period_start)} →{" "}
                        {formatDate(r.period_end)}
                      </td>
                      <td className="px-6 py-4 text-sm text-ink-soft">
                        {formatDate(r.generated_at)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <form action={downloadReportFormAction}>
                            <input type="hidden" name="reportId" value={r.id} />
                            <button
                              type="submit"
                              className="rounded-full bg-forest px-4 py-1.5 text-xs font-semibold text-cream hover:bg-forest-soft"
                            >
                              Baixar PDF
                            </button>
                          </form>
                          <form action={deleteReportFormAction}>
                            <input type="hidden" name="reportId" value={r.id} />
                            <button
                              type="submit"
                              className="rounded-full border border-burgundy/30 px-3 py-1.5 text-xs font-semibold text-burgundy hover:bg-burgundy/5"
                              title="Deletar"
                            >
                              ✕
                            </button>
                          </form>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
