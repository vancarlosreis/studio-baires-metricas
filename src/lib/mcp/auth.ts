/**
 * Auth do endpoint MCP. Aceita dois modos:
 *
 * 1. OAuth access_token: validado contra a tabela oauth_access_tokens.
 *    É o caminho usado pelo Claude.ai (Connectors) após o fluxo de
 *    /oauth/authorize + /oauth/token.
 *
 * 2. Bearer fixo (MCP_BEARER_TOKEN): fallback pra uso interno / CI.
 *    Configure no Vercel env vars.
 */
import { validateAccessToken, type ValidAccessToken } from "@/lib/oauth/tokens";

export type AuthCheck =
  | { ok: true; user?: ValidAccessToken | null }
  | { ok: false; status: 401 | 500; reason: string };

function extractBearer(authHeader: string | null): string | null {
  if (!authHeader) return null;
  const match = /^Bearer\s+(.+)$/i.exec(authHeader.trim());
  return match ? match[1].trim() : null;
}

function constantTimeEq(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function checkBearer(authHeader: string | null): Promise<AuthCheck> {
  const token = extractBearer(authHeader);
  if (!token) {
    return { ok: false, status: 401, reason: "missing or malformed Authorization header" };
  }

  // 1. Tenta como OAuth access_token
  const oauthUser = await validateAccessToken(token);
  if (oauthUser) {
    return { ok: true, user: oauthUser };
  }

  // 2. Fallback pra Bearer fixo (uso interno)
  const fixed = process.env.MCP_BEARER_TOKEN;
  if (fixed && constantTimeEq(token, fixed)) {
    return { ok: true, user: null };
  }

  return { ok: false, status: 401, reason: "token inválido" };
}
