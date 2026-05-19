import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAllowedEmail } from "@/lib/auth/allowlist";
import { getClient } from "@/lib/oauth/clients";
import { approveAuthorizationAction } from "./actions";

type SearchParams = Promise<{
  client_id?: string;
  redirect_uri?: string;
  response_type?: string;
  scope?: string;
  state?: string;
  code_challenge?: string;
  code_challenge_method?: string;
  resource?: string;
  error?: string;
}>;

function ErrorScreen({ title, message }: { title: string; message: string }) {
  return (
    <div className="dark-scope min-h-screen bg-bg-base">
      <main className="mx-auto flex max-w-xl flex-col items-center justify-center px-6 py-24">
        <div className="dark-card w-full p-8">
          <h1 className="text-xl font-bold text-white">{title}</h1>
          <p className="mt-3 text-sm text-white/70">{message}</p>
        </div>
      </main>
    </div>
  );
}

export default async function AuthorizePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;

  // 1. Validações de request OAuth
  if (sp.response_type && sp.response_type !== "code") {
    return (
      <ErrorScreen
        title="Erro: response_type inválido"
        message="Esperado 'code'."
      />
    );
  }
  if (!sp.client_id) {
    return (
      <ErrorScreen
        title="Erro: client_id ausente"
        message="A requisição OAuth não trouxe client_id."
      />
    );
  }
  if (!sp.redirect_uri) {
    return (
      <ErrorScreen
        title="Erro: redirect_uri ausente"
        message="A requisição OAuth precisa de redirect_uri."
      />
    );
  }
  if (!sp.code_challenge || !sp.code_challenge_method) {
    return (
      <ErrorScreen
        title="Erro: PKCE obrigatório"
        message="code_challenge e code_challenge_method são obrigatórios."
      />
    );
  }
  if (sp.code_challenge_method !== "S256") {
    return (
      <ErrorScreen
        title="Erro: PKCE method inválido"
        message="Apenas S256 é aceito."
      />
    );
  }

  // 2. Client tem que existir e o redirect_uri tem que estar registrado
  const client = await getClient(sp.client_id);
  if (!client) {
    return (
      <ErrorScreen
        title="Erro: client desconhecido"
        message="Client não registrado."
      />
    );
  }
  if (!client.redirect_uris.includes(sp.redirect_uri)) {
    return (
      <ErrorScreen
        title="Erro: redirect_uri não autorizado"
        message="Esse redirect_uri não está registrado pro client."
      />
    );
  }

  // 3. Checa user logado
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Se não tá logado, redireciona pra / preservando todos params via cookie next
  if (!user) {
    const currentUrl = new URL("/oauth/authorize", "https://x");
    Object.entries(sp).forEach(([k, v]) => {
      if (v) currentUrl.searchParams.set(k, v);
    });
    redirect(`/?next=${encodeURIComponent(currentUrl.pathname + currentUrl.search)}`);
  }

  // 4. Allowlist
  if (!isAllowedEmail(user.email)) {
    return (
      <ErrorScreen
        title="Acesso negado"
        message={`O email ${user.email} não está autorizado a usar essa integração.`}
      />
    );
  }

  // 5. Consent screen
  return (
    <div className="dark-scope min-h-screen bg-bg-base">
      <main className="mx-auto flex max-w-xl flex-col items-center justify-center px-6 py-24">
        <div className="dark-card w-full overflow-hidden">
          <div className="dark-bg-grad-banner border-b border-white/[0.08] p-8">
            <p className="text-[11px] uppercase tracking-[0.2em] text-white/70">
              Autorização OAuth
            </p>
            <h1 className="mt-2 text-2xl font-bold text-white">
              {client.client_name ?? "Aplicativo"}{" "}
              <span className="font-normal text-white/70">quer conectar</span>
            </h1>
            <p className="mt-2 text-sm text-white/70">
              Logado como <strong>{user.email}</strong>
            </p>
          </div>

          <div className="space-y-4 p-8">
            <p className="text-sm text-white/80">
              Esse aplicativo vai poder:
            </p>
            <ul className="space-y-2 text-sm text-white/70">
              <li className="flex gap-2">
                <span className="text-neon-purple">→</span> Listar contas
                Instagram conectadas
              </li>
              <li className="flex gap-2">
                <span className="text-neon-purple">→</span> Ler métricas
                (alcance, interações, posts, stories, demografia)
              </li>
              <li className="flex gap-2">
                <span className="text-neon-purple">→</span> Sincronizar contas
                (puxar dados atualizados da IG API)
              </li>
              <li className="flex gap-2">
                <span className="text-neon-purple">→</span> Ver histórico de
                jobs de sincronização
              </li>
            </ul>

            <p className="pt-2 text-xs text-white/40">
              Você pode revogar esse acesso a qualquer momento em{" "}
              <strong>Dashboard → Integrações</strong>.
            </p>

            <form
              action={approveAuthorizationAction}
              className="flex gap-3 pt-6"
            >
              <input type="hidden" name="client_id" value={sp.client_id} />
              <input type="hidden" name="redirect_uri" value={sp.redirect_uri} />
              <input type="hidden" name="state" value={sp.state ?? ""} />
              <input
                type="hidden"
                name="code_challenge"
                value={sp.code_challenge}
              />
              <input
                type="hidden"
                name="code_challenge_method"
                value={sp.code_challenge_method}
              />
              <input type="hidden" name="scope" value={sp.scope ?? ""} />
              <input type="hidden" name="resource" value={sp.resource ?? ""} />

              <button
                type="submit"
                name="action"
                value="deny"
                className="flex-1 rounded-full border border-white/[0.06] bg-surface/60 px-4 py-2.5 text-sm font-medium text-white/70 transition hover:text-white"
              >
                Negar
              </button>
              <button
                type="submit"
                name="action"
                value="approve"
                className="dark-bg-grad-purple-pink dark-glow-purple flex-1 rounded-full px-4 py-2.5 text-sm font-semibold text-white"
              >
                Autorizar
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
