/**
 * Bearer token fixo pra autenticar requests MCP.
 *
 * Configure MCP_BEARER_TOKEN nas envs do Vercel (e .env.local local). Gere
 * com `openssl rand -hex 32`. Nunca commite o token.
 */

export type AuthCheck =
  | { ok: true }
  | { ok: false; status: 401 | 500; reason: string };

export function checkBearer(authHeader: string | null): AuthCheck {
  const expected = process.env.MCP_BEARER_TOKEN;
  if (!expected) {
    return {
      ok: false,
      status: 500,
      reason: "MCP_BEARER_TOKEN não definido no servidor",
    };
  }
  if (!authHeader) {
    return { ok: false, status: 401, reason: "missing Authorization header" };
  }
  const match = /^Bearer\s+(.+)$/i.exec(authHeader.trim());
  if (!match) {
    return { ok: false, status: 401, reason: "expected 'Bearer <token>'" };
  }
  const provided = match[1].trim();
  // Comparação em tempo constante pra evitar timing attack (mesmo com Bearer
  // estático o overhead é trivial).
  if (provided.length !== expected.length) {
    return { ok: false, status: 401, reason: "token inválido" };
  }
  let diff = 0;
  for (let i = 0; i < provided.length; i++) {
    diff |= provided.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0
    ? { ok: true }
    : { ok: false, status: 401, reason: "token inválido" };
}
