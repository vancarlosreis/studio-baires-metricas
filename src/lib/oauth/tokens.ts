import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import { generateOpaqueToken, sha256Hex } from "./crypto";

const ACCESS_TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 dias
const REFRESH_TOKEN_TTL_SECONDS = 90 * 24 * 60 * 60; // 90 dias

export type IssueTokenInput = {
  client_id: string;
  user_id: string;
  user_email: string;
  scope: string | null;
};

export type IssuedTokenPair = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: "Bearer";
  scope: string | null;
};

export async function issueTokenPair(
  input: IssueTokenInput,
): Promise<IssuedTokenPair> {
  const access_token = generateOpaqueToken(32);
  const refresh_token = generateOpaqueToken(32);
  const access_hash = sha256Hex(access_token);
  const refresh_hash = sha256Hex(refresh_token);
  const now = Date.now();
  const access_expires = new Date(now + ACCESS_TOKEN_TTL_SECONDS * 1000).toISOString();
  const refresh_expires = new Date(now + REFRESH_TOKEN_TTL_SECONDS * 1000).toISOString();

  const supabase = createServiceClient();

  const { error: accessErr } = await supabase
    .from("oauth_access_tokens")
    .insert({
      token_hash: access_hash,
      client_id: input.client_id,
      user_id: input.user_id,
      user_email: input.user_email,
      scope: input.scope,
      expires_at: access_expires,
    });
  if (accessErr) throw new Error(`Falha ao emitir access_token: ${accessErr.message}`);

  const { error: refreshErr } = await supabase
    .from("oauth_refresh_tokens")
    .insert({
      token_hash: refresh_hash,
      access_token_hash: access_hash,
      client_id: input.client_id,
      user_id: input.user_id,
      user_email: input.user_email,
      scope: input.scope,
      expires_at: refresh_expires,
    });
  if (refreshErr) throw new Error(`Falha ao emitir refresh_token: ${refreshErr.message}`);

  return {
    access_token,
    refresh_token,
    expires_in: ACCESS_TOKEN_TTL_SECONDS,
    token_type: "Bearer",
    scope: input.scope,
  };
}

export type ValidAccessToken = {
  client_id: string;
  user_id: string;
  user_email: string;
  scope: string | null;
};

/**
 * Valida access_token. Retorna info do usuário se válido, null caso contrário.
 * Atualiza last_used_at em background (best-effort).
 */
export async function validateAccessToken(
  token: string,
): Promise<ValidAccessToken | null> {
  const token_hash = sha256Hex(token);
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("oauth_access_tokens")
    .select("client_id, user_id, user_email, scope, expires_at, revoked_at")
    .eq("token_hash", token_hash)
    .maybeSingle();

  if (error || !data) return null;
  if (data.revoked_at) return null;
  if (new Date(data.expires_at).getTime() < Date.now()) return null;

  // Best-effort update last_used_at
  supabase
    .from("oauth_access_tokens")
    .update({ last_used_at: new Date().toISOString() })
    .eq("token_hash", token_hash)
    .then(() => {});

  return {
    client_id: data.client_id,
    user_id: data.user_id,
    user_email: data.user_email,
    scope: data.scope,
  };
}

/**
 * Troca refresh_token por novo par (rotação). Revoga o antigo.
 */
export async function rotateRefreshToken(
  refreshToken: string,
  client_id: string,
): Promise<IssuedTokenPair> {
  const refresh_hash = sha256Hex(refreshToken);
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("oauth_refresh_tokens")
    .select("*")
    .eq("token_hash", refresh_hash)
    .maybeSingle();

  if (error || !data) throw new Error("invalid_grant: refresh_token inválido");
  if (data.revoked_at) throw new Error("invalid_grant: refresh_token revogado");
  if (new Date(data.expires_at).getTime() < Date.now()) {
    throw new Error("invalid_grant: refresh_token expirado");
  }
  if (data.client_id !== client_id) {
    throw new Error("invalid_grant: client_id mismatch");
  }

  // Revoga o par antigo
  const now = new Date().toISOString();
  await supabase
    .from("oauth_refresh_tokens")
    .update({ revoked_at: now })
    .eq("token_hash", refresh_hash);
  if (data.access_token_hash) {
    await supabase
      .from("oauth_access_tokens")
      .update({ revoked_at: now })
      .eq("token_hash", data.access_token_hash);
  }

  return issueTokenPair({
    client_id: data.client_id,
    user_id: data.user_id,
    user_email: data.user_email,
    scope: data.scope,
  });
}

export async function revokeTokenByHash(tokenHash: string): Promise<void> {
  const supabase = createServiceClient();
  const now = new Date().toISOString();
  // Revoga tanto access quanto refresh (qualquer um dos dois pode chegar aqui)
  await Promise.all([
    supabase
      .from("oauth_access_tokens")
      .update({ revoked_at: now })
      .eq("token_hash", tokenHash),
    supabase
      .from("oauth_refresh_tokens")
      .update({ revoked_at: now })
      .eq("token_hash", tokenHash),
  ]);
}
