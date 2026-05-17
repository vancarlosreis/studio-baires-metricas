/**
 * Allowlist de emails autorizados a acessar o app.
 *
 * Aplicada em 3 camadas (defense in depth):
 * 1. `signInWithMagicLink` rejeita ANTES de enviar o email
 * 2. `/auth/callback` (Google OAuth) verifica DEPOIS do exchange e
 *    faz signOut se não autorizado
 * 3. Middleware faz check final em rotas protegidas — pega edge cases
 *    (sessão antiga, token roubado, allowlist editada)
 *
 * Pra mudar a lista: edita aqui OU seta a env var ALLOWED_EMAILS
 * com a lista separada por vírgula (override completo, não merge).
 */

const DEFAULT_ALLOWED_EMAILS = [
  "vancarlosreis@gmail.com",
  "studiobaires.mkt@gmail.com",
];

function getAllowedEmails(): string[] {
  const env = process.env.ALLOWED_EMAILS;
  if (env && env.trim().length > 0) {
    return env
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
  }
  return DEFAULT_ALLOWED_EMAILS.map((e) => e.toLowerCase());
}

export function isAllowedEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return getAllowedEmails().includes(email.trim().toLowerCase());
}
