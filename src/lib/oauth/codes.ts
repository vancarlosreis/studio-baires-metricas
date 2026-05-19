import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import { generateOpaqueToken, sha256Hex, verifyPkceS256 } from "./crypto";

const CODE_TTL_SECONDS = 10 * 60; // 10 min

export type IssueCodeInput = {
  client_id: string;
  user_id: string;
  user_email: string;
  redirect_uri: string;
  scope: string | null;
  code_challenge: string;
  code_challenge_method: "S256" | "plain";
  resource: string | null;
};

/** Gera authorization_code e persiste hash. Retorna o code plain (única vez). */
export async function issueAuthorizationCode(
  input: IssueCodeInput,
): Promise<string> {
  const code = generateOpaqueToken(32);
  const code_hash = sha256Hex(code);
  const expires_at = new Date(Date.now() + CODE_TTL_SECONDS * 1000).toISOString();

  const supabase = createServiceClient();
  const { error } = await supabase.from("oauth_authorization_codes").insert({
    code_hash,
    client_id: input.client_id,
    user_id: input.user_id,
    user_email: input.user_email,
    redirect_uri: input.redirect_uri,
    scope: input.scope,
    code_challenge: input.code_challenge,
    code_challenge_method: input.code_challenge_method,
    resource: input.resource,
    expires_at,
  });
  if (error) throw new Error(`Falha ao emitir code: ${error.message}`);
  return code;
}

export type ConsumedCode = {
  client_id: string;
  user_id: string;
  user_email: string;
  redirect_uri: string;
  scope: string | null;
  resource: string | null;
};

/**
 * Troca code por dados originais (single-use). Valida:
 *  - existe + não expirou + não usado
 *  - client_id bate
 *  - redirect_uri bate (exato)
 *  - code_verifier passa PKCE
 */
export async function consumeAuthorizationCode(input: {
  code: string;
  client_id: string;
  redirect_uri: string;
  code_verifier: string;
}): Promise<ConsumedCode> {
  const code_hash = sha256Hex(input.code);
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("oauth_authorization_codes")
    .select("*")
    .eq("code_hash", code_hash)
    .maybeSingle();

  if (error) throw new Error(`Falha ao buscar code: ${error.message}`);
  if (!data) throw new Error("invalid_grant: code não encontrado");
  if (data.used_at) throw new Error("invalid_grant: code já usado");
  if (new Date(data.expires_at).getTime() < Date.now()) {
    throw new Error("invalid_grant: code expirado");
  }
  if (data.client_id !== input.client_id) {
    throw new Error("invalid_grant: client_id mismatch");
  }
  if (data.redirect_uri !== input.redirect_uri) {
    throw new Error("invalid_grant: redirect_uri mismatch");
  }

  // PKCE
  if (data.code_challenge_method === "S256") {
    if (!verifyPkceS256(input.code_verifier, data.code_challenge)) {
      throw new Error("invalid_grant: PKCE verification failed");
    }
  } else {
    if (input.code_verifier !== data.code_challenge) {
      throw new Error("invalid_grant: PKCE verification failed");
    }
  }

  // Marca como usado
  await supabase
    .from("oauth_authorization_codes")
    .update({ used_at: new Date().toISOString() })
    .eq("code_hash", code_hash);

  return {
    client_id: data.client_id,
    user_id: data.user_id,
    user_email: data.user_email,
    redirect_uri: data.redirect_uri,
    scope: data.scope,
    resource: data.resource,
  };
}
