import Link from "next/link";
import { LoginForm } from "@/components/login-form";

type SearchParams = Promise<{ auth_error?: string; next?: string }>;

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  email_not_allowed: "Este e-mail não está autorizado a acessar o sistema.",
  not_authenticated: "Você precisa estar logada pra acessar essa página.",
  "1": "Não conseguimos completar o login. Tente novamente.",
};

function Sparkle({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path d="M12 0 L13.5 9.5 L24 12 L13.5 14.5 L12 24 L10.5 14.5 L0 12 L10.5 9.5 Z" />
    </svg>
  );
}

export default async function Home({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const authErrorMsg = sp.auth_error
    ? (AUTH_ERROR_MESSAGES[sp.auth_error] ?? `Erro: ${sp.auth_error}`)
    : null;
  // Sanitiza next (só paths internos) pra evitar open redirect.
  const next =
    sp.next && sp.next.startsWith("/") && !sp.next.startsWith("//")
      ? sp.next
      : undefined;

  return (
    <div className="bg-paper-grid relative min-h-screen flex-1 overflow-hidden">
      {/* Sparkles decorativos */}
      <Sparkle className="absolute top-20 left-12 h-10 w-10 text-forest opacity-70" />
      <Sparkle className="absolute top-24 right-32 h-7 w-7 text-accent-red opacity-70" />
      <Sparkle className="absolute bottom-32 left-28 h-9 w-9 text-burgundy opacity-60" />
      <Sparkle className="absolute bottom-20 right-1/3 h-8 w-8 text-accent-red opacity-70" />

      {/* Brand mark */}
      <header className="relative z-10 mx-auto max-w-7xl px-8 pt-10 sm:px-12">
        <Link
          href="/"
          className="headline-display text-3xl text-ink hover:opacity-80"
        >
          Studio Baires
        </Link>
      </header>

      {/* Split layout: hero + form */}
      <main className="relative z-10 mx-auto grid max-w-7xl items-center gap-16 px-8 pt-16 pb-20 sm:px-12 lg:grid-cols-2 lg:gap-12 lg:pt-24">
        {/* Lado esquerdo: headline */}
        <section>
          <h1 className="headline-display text-ink text-6xl leading-[0.95] sm:text-7xl lg:text-[5.5rem]">
            <span className="block">Métricas</span>
            <span className="block">que parecem</span>
            <span className="block text-burgundy">revista.</span>
          </h1>

          <p className="mt-10 max-w-xl text-base leading-relaxed text-ink-soft sm:text-lg">
            Análise de Instagram para agências que entregam relatórios com cara
            de editorial, não de planilha.{" "}
            <span className="italic">Dados sérios, apresentação que vende.</span>
          </p>
        </section>

        {/* Lado direito: form de login */}
        <section className="w-full max-w-md justify-self-end lg:max-w-lg">
          {authErrorMsg && (
            <div className="mb-4 rounded-2xl border border-burgundy/30 bg-burgundy/10 px-5 py-3">
              <p className="text-sm font-semibold text-burgundy">{authErrorMsg}</p>
            </div>
          )}
          <LoginForm next={next} />
        </section>
      </main>

      {/* Footer */}
      <footer className="relative z-10 mx-auto max-w-7xl px-8 py-8 text-sm text-ink-soft sm:px-12">
        <div className="flex items-center justify-between border-t border-ink/10 pt-6">
          <span>© {new Date().getFullYear()} Studio Baires</span>
          <span className="italic">Made in Brasil</span>
        </div>
      </footer>
    </div>
  );
}
