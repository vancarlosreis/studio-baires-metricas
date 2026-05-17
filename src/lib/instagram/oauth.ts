/**
 * Helpers de OAuth para Instagram Business Login.
 *
 * Fluxo:
 *   1. buildAuthUrl(state) → redireciona usuário pro Instagram
 *   2. Instagram redireciona /auth/instagram/callback?code=...&state=...
 *   3. exchangeCodeForShortToken(code) → token de curta duração (1h)
 *   4. exchangeShortForLongToken(shortToken) → token de longa duração (60 dias)
 *   5. fetchProfile(longToken) → user_id, username, name, picture
 */

const AUTH_URL = "https://www.instagram.com/oauth/authorize";
const TOKEN_URL = "https://api.instagram.com/oauth/access_token";
const LONG_LIVED_URL = "https://graph.instagram.com/access_token";
const GRAPH_API_BASE = "https://graph.instagram.com/v23.0";

// Scopes pra MVP de métricas. Confirmar com painel Meta quando configurar Business Login.
const SCOPES = [
  "instagram_business_basic",
  "instagram_business_manage_insights",
].join(",");

function getClientId(): string {
  const id = process.env.INSTAGRAM_APP_ID;
  if (!id) throw new Error("INSTAGRAM_APP_ID não configurada em .env.local");
  return id;
}

function getClientSecret(): string {
  const secret = process.env.INSTAGRAM_APP_SECRET;
  if (!secret) throw new Error("INSTAGRAM_APP_SECRET não configurada em .env.local");
  return secret;
}

function getRedirectUri(): string {
  const uri = process.env.INSTAGRAM_REDIRECT_URI;
  if (!uri) throw new Error("INSTAGRAM_REDIRECT_URI não configurada em .env.local");
  return uri;
}

export function isInstagramConfigured(): boolean {
  return Boolean(
    process.env.INSTAGRAM_APP_ID &&
      process.env.INSTAGRAM_APP_SECRET &&
      process.env.INSTAGRAM_REDIRECT_URI,
  );
}

/** Monta a URL de autorização do Instagram com state pra CSRF. */
export function buildAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: getClientId(),
    redirect_uri: getRedirectUri(),
    response_type: "code",
    scope: SCOPES,
    state,
  });
  return `${AUTH_URL}?${params.toString()}`;
}

export type ShortLivedTokenResponse = {
  access_token: string;
  user_id: number | string;
  permissions?: string;
};

/** Troca o `code` recebido no callback por um token de curta duração (~1h). */
export async function exchangeCodeForShortToken(
  code: string,
): Promise<ShortLivedTokenResponse> {
  const body = new URLSearchParams({
    client_id: getClientId(),
    client_secret: getClientSecret(),
    grant_type: "authorization_code",
    redirect_uri: getRedirectUri(),
    code,
  });

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `Falha ao trocar code por token (${res.status}): ${text.slice(0, 200)}`,
    );
  }

  const json = await res.json();

  // Business Login pode retornar { data: [{...}] } ou objeto direto.
  // Normalizamos pra um shape único.
  if (Array.isArray(json?.data) && json.data.length > 0) {
    return json.data[0] as ShortLivedTokenResponse;
  }
  return json as ShortLivedTokenResponse;
}

export type LongLivedTokenResponse = {
  access_token: string;
  token_type: string;
  expires_in: number; // segundos (~60 dias = 5184000)
};

/** Troca o short-lived token (1h) por um long-lived (60 dias). */
export async function exchangeShortForLongToken(
  shortToken: string,
): Promise<LongLivedTokenResponse> {
  const params = new URLSearchParams({
    grant_type: "ig_exchange_token",
    client_secret: getClientSecret(),
    access_token: shortToken,
  });

  const res = await fetch(`${LONG_LIVED_URL}?${params.toString()}`);

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `Falha ao trocar short por long token (${res.status}): ${text.slice(0, 200)}`,
    );
  }

  return (await res.json()) as LongLivedTokenResponse;
}

export type InstagramProfile = {
  user_id: string;
  username: string;
  name?: string;
  account_type?: string;
  profile_picture_url?: string;
};

/** Busca o perfil do usuário autenticado usando o access token. */
export async function fetchProfile(
  accessToken: string,
): Promise<InstagramProfile> {
  const params = new URLSearchParams({
    fields: "user_id,username,name,account_type,profile_picture_url",
    access_token: accessToken,
  });

  const res = await fetch(`${GRAPH_API_BASE}/me?${params.toString()}`);

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `Falha ao buscar perfil Instagram (${res.status}): ${text.slice(0, 200)}`,
    );
  }

  const json = await res.json();
  return {
    user_id: String(json.user_id ?? json.id),
    username: json.username,
    name: json.name,
    account_type: json.account_type,
    profile_picture_url: json.profile_picture_url,
  };
}
