/**
 * URL canônica da app — usada em endpoints OAuth (que precisam apontar pro
 * domínio estável, NÃO pra URL de deployment com hash).
 *
 * Prioridade:
 * 1. NEXT_PUBLIC_APP_URL (override manual, ex: "https://app.studiobaires.com")
 * 2. VERCEL_PROJECT_PRODUCTION_URL (domínio canônico do projeto Vercel)
 * 3. VERCEL_URL (deployment URL — tem hash, último recurso)
 * 4. Fallback hardcoded
 *
 * IMPORTANTE: NÃO usar VERCEL_URL no OAuth porque ela varia por deployment
 * (ex: studio-baires-metricas-mvy0nna7y-...vercel.app) e fica atrás do
 * deployment protection do Vercel, bloqueando o Claude.ai.
 */
export function baseUrl(): string {
  const url =
    process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : null) ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ??
    "https://studio-baires-metricas.vercel.app";
  return url.replace(/\/$/, "");
}
