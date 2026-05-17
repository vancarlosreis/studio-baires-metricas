import Link from "next/link";
import {
  startFacebookOAuth,
  startInstagramOAuth,
} from "@/app/actions/instagram";

function InstagramIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path d="M12 2.2c3.2 0 3.6 0 4.85.07 1.17.05 1.8.25 2.23.42.56.22.96.48 1.38.9.42.42.68.82.9 1.38.17.42.37 1.06.42 2.23.06 1.26.07 1.64.07 4.85s0 3.6-.07 4.85c-.05 1.17-.25 1.8-.42 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.17-1.06.37-2.23.42-1.26.06-1.64.07-4.85.07s-3.6 0-4.85-.07c-1.17-.05-1.8-.25-2.23-.42-.56-.22-.96-.48-1.38-.9-.42-.42-.68-.82-.9-1.38-.17-.42-.37-1.06-.42-2.23C2.2 15.6 2.2 15.2 2.2 12s0-3.6.07-4.85c.05-1.17.25-1.8.42-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.17 1.06-.37 2.23-.42C8.4 2.2 8.8 2.2 12 2.2zM12 0C8.74 0 8.33 0 7.05.07 5.78.13 4.9.33 4.14.63c-.8.3-1.47.72-2.14 1.4-.67.66-1.08 1.34-1.39 2.13C.33 4.9.13 5.78.07 7.05.01 8.33 0 8.74 0 12s.01 3.67.07 4.95c.06 1.27.26 2.15.56 2.91.31.8.72 1.47 1.4 2.14.66.67 1.34 1.08 2.13 1.39.76.3 1.64.5 2.91.56C8.33 24 8.74 24 12 24s3.67-.01 4.95-.07c1.27-.06 2.15-.26 2.91-.56.8-.31 1.47-.72 2.14-1.4.67-.66 1.08-1.34 1.39-2.13.3-.76.5-1.64.56-2.91.06-1.28.07-1.69.07-4.95s-.01-3.67-.07-4.95c-.06-1.27-.26-2.15-.56-2.91-.31-.8-.72-1.47-1.4-2.14C21.34 1.31 20.66.9 19.87.6 19.1.3 18.22.1 16.95.04 15.67.01 15.26 0 12 0zm0 5.84A6.16 6.16 0 105.84 12 6.16 6.16 0 0012 5.84zm0 10.16A4 4 0 1116 12a4 4 0 01-4 4zm6.4-11.85a1.44 1.44 0 11-1.44-1.44 1.44 1.44 0 011.44 1.44z" />
    </svg>
  );
}

type SearchParams = Promise<{
  error?: string;
  detail?: string;
}>;

const ERROR_MESSAGES: Record<string, string> = {
  missing_params: "O Meta não retornou os parâmetros esperados. Tente novamente.",
  invalid_state: "Validação de segurança falhou. Tente novamente a partir do botão abaixo.",
  not_authenticated: "Você precisa estar logada pra conectar uma conta.",
  db_error: "Erro ao salvar a conta no banco de dados.",
  oauth_failed: "Falha na autorização.",
  access_denied: "Você negou o acesso. Tente novamente se mudar de ideia.",
  meta_session_expired: "Sessão do Meta expirou. Refaça a conexão.",
  fetch_pages_failed: "Não consegui listar suas Páginas do Facebook. Verifique as permissões.",
  selection_mismatch: "As contas selecionadas não bateram com as disponíveis. Tente novamente.",
  no_selection: "Selecione ao menos uma conta pra importar.",
};

export default async function ConectarPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const errorCode = params.error;
  const errorDetail = params.detail;
  const errorMsg = errorCode
    ? ERROR_MESSAGES[errorCode] ?? `Erro: ${errorCode}`
    : null;

  return (
    <div className="mx-auto max-w-2xl px-6 py-16 sm:px-10 sm:py-24">
      <div className="mb-10">
        <Link
          href="/dashboard"
          className="text-sm font-semibold text-ink-soft underline-offset-4 hover:text-ink hover:underline"
        >
          ← Voltar
        </Link>
      </div>

      <p className="text-sm font-semibold uppercase tracking-wider text-ink-soft">
        Nova conta
      </p>
      <h1 className="headline-display mt-2 text-5xl text-ink sm:text-6xl">
        Conectar <span className="text-burgundy">Instagram</span>
      </h1>
      <p className="mt-4 max-w-xl text-base leading-relaxed text-ink-soft sm:text-lg">
        Vamos pedir autorização pra acessar as métricas da conta Instagram que
        você quer adicionar. O fluxo abre o site oficial do Instagram —{" "}
        <span className="italic">nunca pedimos sua senha aqui dentro</span>.
      </p>

      {errorMsg && (
        <div className="mt-8 rounded-2xl border border-burgundy/20 bg-burgundy/5 p-4">
          <p className="text-sm font-semibold text-burgundy">{errorMsg}</p>
          {errorDetail && (
            <p className="mt-1 text-xs text-burgundy/80">
              Detalhe: <code>{errorDetail}</code>
            </p>
          )}
        </div>
      )}

      {/* Card explicativo + CTA */}
      <div className="mt-12 rounded-3xl border border-ink/10 bg-paper p-8 shadow-sm">
        <h2 className="headline-display text-2xl text-ink">
          O que vamos acessar
        </h2>
        <ul className="mt-4 space-y-3 text-sm text-ink-soft">
          <li className="flex gap-3">
            <span className="text-forest">✓</span>
            <span>
              <strong className="text-ink">Informações básicas do perfil</strong>{" "}
              — username, foto e número de seguidores.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="text-forest">✓</span>
            <span>
              <strong className="text-ink">Métricas de conta</strong> — alcance,
              impressões, visualizações do perfil e cliques.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="text-forest">✓</span>
            <span>
              <strong className="text-ink">Métricas de posts, reels e stories</strong>{" "}
              — engajamento, salvamentos, compartilhamentos.
            </span>
          </li>
          <li className="flex gap-3 text-ink-soft/70">
            <span className="text-ink-soft/70">✗</span>
            <span>
              <strong className="text-ink-soft">
                Nunca acessamos suas mensagens diretas
              </strong>{" "}
              ou publicamos qualquer coisa em seu nome.
            </span>
          </li>
        </ul>

        <form action={startInstagramOAuth} className="mt-8">
          <button
            type="submit"
            className="inline-flex h-14 w-full items-center justify-center gap-3 rounded-full bg-ink px-8 text-base font-semibold text-cream transition-colors hover:bg-burgundy"
          >
            <InstagramIcon className="h-5 w-5" />
            Conectar via Instagram
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-ink-soft">
          Uma conta por vez · Você será redirecionada pro Instagram
        </p>
      </div>

      {/* Segundo caminho: Meta Business Suite */}
      <div className="mt-6 rounded-3xl border border-ink/10 bg-paper p-8 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="headline-display text-2xl text-ink">
              Importar do Meta Business Suite
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-soft">
              Lista todas as contas Instagram conectadas às Páginas do Facebook que
              você gerencia — perfeito pra agência que quer importar vários
              clientes de uma vez.
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-tape/30 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-ink">
            Novo
          </span>
        </div>

        <ul className="mt-4 space-y-2 text-xs text-ink-soft">
          <li className="flex gap-2">
            <span className="text-forest">✓</span>
            <span>
              Cada conta IG deve ter Página do FB vinculada (Meta Business Suite)
            </span>
          </li>
          <li className="flex gap-2">
            <span className="text-forest">✓</span>
            <span>Permite selecionar quais importar — não traz todas automaticamente</span>
          </li>
        </ul>

        <form action={startFacebookOAuth} className="mt-6">
          <button
            type="submit"
            className="inline-flex h-12 w-full items-center justify-center gap-3 rounded-full border border-ink/20 bg-cream px-8 text-sm font-semibold text-ink transition-colors hover:border-ink/40"
          >
            <FacebookIcon className="h-5 w-5" />
            Conectar via Facebook
          </button>
        </form>

        <p className="mt-3 text-center text-xs text-ink-soft">
          Você será redirecionada pro Facebook · Não publicamos nada em seu nome
        </p>
      </div>

      <p className="mt-12 text-center text-sm text-ink-soft">
        A conta precisa ser <strong className="text-ink">Business ou Creator</strong>.
        Conta pessoal não funciona — converta nas configurações do Instagram antes.
      </p>
    </div>
  );
}

function FacebookIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}
