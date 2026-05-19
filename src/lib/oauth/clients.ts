import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import { generateOpaqueToken } from "./crypto";

export type OAuthClient = {
  client_id: string;
  client_name: string | null;
  redirect_uris: string[];
  grant_types: string[];
  response_types: string[];
  token_endpoint_auth_method: string;
  scope: string | null;
  created_at: string;
};

export type ClientRegistrationInput = {
  client_name?: string;
  redirect_uris: string[];
  grant_types?: string[];
  response_types?: string[];
  token_endpoint_auth_method?: string;
  scope?: string;
};

/**
 * Registra um novo client (RFC 7591 Dynamic Client Registration).
 * Sempre cria public client (sem secret) — autenticação via PKCE.
 */
export async function registerClient(
  input: ClientRegistrationInput,
): Promise<OAuthClient> {
  if (!Array.isArray(input.redirect_uris) || input.redirect_uris.length === 0) {
    throw new Error("redirect_uris obrigatório (array não-vazio)");
  }

  // Valida que todos os redirect_uris são HTTPS (exceto localhost pra dev)
  for (const uri of input.redirect_uris) {
    try {
      const u = new URL(uri);
      if (u.protocol !== "https:" && u.hostname !== "localhost" && u.hostname !== "127.0.0.1") {
        throw new Error(`redirect_uri precisa ser HTTPS: ${uri}`);
      }
    } catch {
      throw new Error(`redirect_uri inválido: ${uri}`);
    }
  }

  const client_id = `mcp_${generateOpaqueToken(16)}`;
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("oauth_clients")
    .insert({
      client_id,
      client_name: input.client_name ?? null,
      redirect_uris: input.redirect_uris,
      grant_types: input.grant_types ?? ["authorization_code", "refresh_token"],
      response_types: input.response_types ?? ["code"],
      token_endpoint_auth_method: input.token_endpoint_auth_method ?? "none",
      scope: input.scope ?? null,
    })
    .select()
    .single();

  if (error) throw new Error(`Falha ao registrar client: ${error.message}`);
  return data as OAuthClient;
}

export async function getClient(clientId: string): Promise<OAuthClient | null> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("oauth_clients")
    .select("*")
    .eq("client_id", clientId)
    .maybeSingle();
  if (error) {
    console.error("[getClient] erro:", error.message);
    return null;
  }
  return (data as OAuthClient | null) ?? null;
}
