import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAllowedEmail } from "@/lib/auth/allowlist";
import { createServiceClient } from "@/lib/supabase/service";
import { revokeOAuthTokenAction } from "./actions";

export const dynamic = "force-dynamic";

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

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function IntegrationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isAllowedEmail(user.email)) {
    redirect("/?auth_error=not_authenticated");
  }

  const service = createServiceClient();
  const { data: tokens } = await service
    .from("oauth_access_tokens")
    .select("token_hash, client_id, scope, expires_at, created_at, last_used_at, revoked_at")
    .is("revoked_at", null)
    .gte("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false });

  // Junta nome do client (não temos foreign key formal pq client_id é text)
  const clientIds = Array.from(new Set((tokens ?? []).map((t) => t.client_id)));
  const { data: clients } = clientIds.length
    ? await service
        .from("oauth_clients")
        .select("client_id, client_name")
        .in("client_id", clientIds)
    : { data: [] as { client_id: string; client_name: string | null }[] };
  const nameOf = new Map(
    (clients ?? []).map((c) => [c.client_id, c.client_name ?? "Cliente sem nome"]),
  );

  return (
    <div className="dark-scope mx-auto flex max-w-5xl flex-col gap-6 px-6 py-10 bg-bg-base min-h-[80vh]">
      <div>
        <p className="text-[11px] uppercase tracking-[0.2em] text-white/50">
          Integrações
        </p>
        <h1 className="mt-1 text-3xl font-bold text-white">
          Conectores MCP autorizados
        </h1>
        <p className="mt-2 text-sm text-white/60">
          Cada token aqui é um app externo (Claude.ai, Claude Desktop, etc) que
          pode chamar as tools MCP da plataforma. Revogue se não usa mais.
        </p>
      </div>

      {(!tokens || tokens.length === 0) && (
        <div className="dark-card grid place-items-center px-6 py-12 text-center text-sm text-white/40">
          <div>
            <p>Nenhum token ativo.</p>
            <p className="mt-1 text-xs text-white/30">
              Pra conectar o Claude.ai, adicione um Custom Connector apontando
              pra <code className="text-white/60">/api/mcp</code> — você vai cair
              numa tela de autorização nesta plataforma.
            </p>
          </div>
        </div>
      )}

      {tokens && tokens.length > 0 && (
        <div className="dark-card overflow-x-auto p-0">
          <table className="w-full min-w-[700px] border-collapse text-[13px]">
            <thead>
              <tr className="border-b border-white/[0.08] text-[10px] uppercase tracking-[0.12em] text-white/50">
                <th className="px-4 py-3 text-left font-semibold">Aplicativo</th>
                <th className="px-4 py-3 text-left font-semibold">Autorizado em</th>
                <th className="px-4 py-3 text-left font-semibold">Último uso</th>
                <th className="px-4 py-3 text-left font-semibold">Expira em</th>
                <th className="px-4 py-3 text-right font-semibold">Ação</th>
              </tr>
            </thead>
            <tbody>
              {tokens.map((t) => (
                <tr
                  key={t.token_hash}
                  className="border-b border-white/[0.04] text-white/80"
                >
                  <td className="px-4 py-3">
                    <div className="font-semibold text-white">
                      {nameOf.get(t.client_id) ?? "Cliente"}
                    </div>
                    <div className="text-[11px] text-white/40">
                      {t.client_id}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-white/60">
                    {fmtDate(t.created_at)}
                  </td>
                  <td className="px-4 py-3 text-white/60">
                    {timeAgo(t.last_used_at)}
                  </td>
                  <td className="px-4 py-3 text-white/60">
                    {fmtDate(t.expires_at)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <form action={revokeOAuthTokenAction}>
                      <input
                        type="hidden"
                        name="token_hash"
                        value={t.token_hash}
                      />
                      <button
                        type="submit"
                        className="rounded-full border border-red-400/30 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-300 transition hover:bg-red-500/20"
                      >
                        Revogar
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
