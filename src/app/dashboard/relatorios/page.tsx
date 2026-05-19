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
    <div className="flex flex-col gap-6 pb-10">
      {params.generated && (
        <div className="mb-8 rounded-2xl border border-success-neon/30 bg-success-neon/10 px-6 py-4">
          <p className="text-sm font-semibold text-success-neon">
            ✨ Relatório gerado com sucesso. Clique em &ldquo;Baixar&rdquo; abaixo.
          </p>
        </div>
      )}

      {params.error && (
        <div className="mb-8 rounded-2xl border border-danger-neon/30 bg-danger-neon/10 px-6 py-4">
          <p className="text-sm font-semibold text-danger-neon">
            Erro ao gerar relatório
          </p>
          <p className="mt-1 text-xs text-danger-neon/80">
            <code>{params.error}</code>
          </p>
        </div>
      )}

      <div className="mb-10">
        <p className="text-sm font-semibold uppercase tracking-wider text-fg-muted">
          Estúdio
        </p>
        <h1 className="headline-display mt-2 text-5xl text-fg sm:text-6xl">
          Relatórios <span className="text-danger-neon italic">PDF</span>
        </h1>
        <p className="mt-3 max-w-2xl text-base text-fg-muted sm:text-lg">
          Gere relatórios mensais brandados Studio Baires pra entregar pros
          clientes da agência.
        </p>
      </div>

      {/* Gerar novo */}
      <section className="mb-12 rounded-3xl border border-border bg-surface p-8">
        <h2 className="headline-display text-2xl text-fg">
          Gerar <span className="italic">novo</span>
        </h2>
        <p className="mt-1 text-sm text-fg-muted">
          Cobre os últimos 30 dias. Cliente recebe um PDF estilo revista.
        </p>

        {accounts.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-border-strong bg-surface-2/50 p-6 text-center">
            <p className="text-sm text-fg-muted">
              <span className="italic">Nenhuma conta conectada ainda.</span>{" "}
              <Link
                href="/dashboard/conectar"
                className="font-semibold text-fg underline-offset-2 hover:underline"
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
                className="rounded-2xl border border-border bg-surface-2/40 p-4"
              >
                <input type="hidden" name="igAccountId" value={a.id} />
                <div className="mb-3">
                  <div className="truncate text-sm font-semibold text-fg">
                    {a.ig_account_name || a.ig_username}
                  </div>
                  <div className="truncate text-xs text-fg-muted">
                    @{a.ig_username}
                  </div>
                </div>
                <button
                  type="submit"
                  className="inline-flex h-9 w-full items-center justify-center rounded-full bg-neon-purple px-4 text-xs font-semibold text-white transition-colors hover:bg-neon-purple"
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
        <h2 className="headline-display text-3xl text-fg">
          Histórico
        </h2>
        <p className="mt-1 text-sm text-fg-muted">
          {reports?.length === 0 || !reports
            ? "Nenhum relatório gerado ainda"
            : `${reports.length} relatório${reports.length === 1 ? "" : "s"}`}
        </p>

        {reports && reports.length > 0 && (
          <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-surface">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="px-6 py-4 text-[10px] font-semibold uppercase tracking-wider text-fg-muted">
                    Conta
                  </th>
                  <th className="px-6 py-4 text-[10px] font-semibold uppercase tracking-wider text-fg-muted">
                    Período
                  </th>
                  <th className="px-6 py-4 text-[10px] font-semibold uppercase tracking-wider text-fg-muted">
                    Gerado em
                  </th>
                  <th className="px-6 py-4 text-right text-[10px] font-semibold uppercase tracking-wider text-fg-muted">
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
                      className="border-b border-border last:border-b-0 hover:bg-surface-2/30"
                    >
                      <td className="px-6 py-4">
                        <div className="font-semibold text-fg">
                          {acc?.ig_account_name || acc?.ig_username || "—"}
                        </div>
                        <div className="text-xs text-fg-muted">
                          @{acc?.ig_username}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-fg-muted">
                        {formatDate(r.period_start)} →{" "}
                        {formatDate(r.period_end)}
                      </td>
                      <td className="px-6 py-4 text-sm text-fg-muted">
                        {formatDate(r.generated_at)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <form action={downloadReportFormAction}>
                            <input type="hidden" name="reportId" value={r.id} />
                            <button
                              type="submit"
                              className="rounded-full bg-neon-purple px-4 py-1.5 text-xs font-semibold text-white hover:opacity-90"
                            >
                              Baixar PDF
                            </button>
                          </form>
                          <form action={deleteReportFormAction}>
                            <input type="hidden" name="reportId" value={r.id} />
                            <button
                              type="submit"
                              className="rounded-full border border-burgundy/30 px-3 py-1.5 text-xs font-semibold text-danger-neon hover:bg-burgundy/5"
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
