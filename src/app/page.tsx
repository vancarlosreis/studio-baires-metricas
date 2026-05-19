import Link from "next/link";
import { LoginForm } from "@/components/login-form";

type SearchParams = Promise<{ auth_error?: string; next?: string }>;

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  email_not_allowed: "Este e-mail não está autorizado a acessar o sistema.",
  not_authenticated: "Você precisa estar logada pra acessar essa página.",
  "1": "Não conseguimos completar o login. Tente novamente.",
};

export default async function Home({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const authErrorMsg = sp.auth_error
    ? (AUTH_ERROR_MESSAGES[sp.auth_error] ?? `Erro: ${sp.auth_error}`)
    : null;
  const next =
    sp.next && sp.next.startsWith("/") && !sp.next.startsWith("//")
      ? sp.next
      : undefined;

  return (
    <div className="theme-glow relative flex min-h-screen flex-col bg-bg text-fg">
      <header className="relative z-10 mx-auto w-full max-w-6xl px-6 pt-8 sm:px-10">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-semibold text-fg"
        >
          <span className="dark-bg-grad-purple-pink dark-glow-purple grid h-9 w-9 place-items-center rounded-xl text-xs font-bold text-white">
            SB
          </span>
          Studio Baires
        </Link>
      </header>

      <main className="relative z-10 mx-auto grid w-full max-w-6xl flex-1 items-center gap-16 px-6 pt-12 pb-16 sm:px-10 lg:grid-cols-2 lg:gap-12 lg:pt-20">
        <section>
          <p className="text-[11px] uppercase tracking-[0.2em] text-fg-muted">
            Studio Baires
          </p>
          <h1 className="mt-3 text-5xl font-bold leading-[1.05] text-fg sm:text-6xl">
            <span className="block">Métricas</span>
            <span className="block">que parecem</span>
            <span className="dark-text-grad block">revista.</span>
          </h1>
          <p className="mt-8 max-w-lg text-base leading-relaxed text-fg-muted sm:text-lg">
            Análise de Instagram para agências que entregam relatórios com cara
            de editorial, não de planilha.{" "}
            <span className="italic">Dados sérios, apresentação que vende.</span>
          </p>
        </section>

        <section className="dark-card w-full max-w-md justify-self-end p-7 lg:max-w-lg lg:p-8">
          {authErrorMsg && (
            <div className="mb-4 rounded-2xl border border-danger-neon/30 bg-danger-neon/10 px-4 py-3">
              <p className="text-sm font-semibold text-danger-neon">
                {authErrorMsg}
              </p>
            </div>
          )}
          <LoginForm next={next} />
        </section>
      </main>

      <footer className="relative z-10 mx-auto w-full max-w-6xl px-6 py-6 text-xs text-fg-muted sm:px-10">
        <div className="flex items-center justify-between border-t border-border pt-5">
          <span>© {new Date().getFullYear()} Studio Baires</span>
          <Link href="/privacidade" className="hover:text-fg">
            Política de privacidade
          </Link>
        </div>
      </footer>
    </div>
  );
}
