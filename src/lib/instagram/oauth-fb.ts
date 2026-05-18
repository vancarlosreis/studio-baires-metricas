/**
 * Helpers de OAuth via Facebook Login (Meta Switch).
 *
 * Diferente do Business Login direto do Instagram, este fluxo:
 * - Usa Facebook OAuth (graph.facebook.com)
 * - Lista TODAS as Pages do FB que o usuário gerencia
 * - Pra cada Page, descobre a conta IG Business vinculada (se houver)
 * - User pode importar várias contas IG de uma vez
 *
 * Pré-requisitos da conta do cliente:
 * - Conta IG Business/Creator
 * - Conta IG vinculada a uma Página do Facebook
 * - Página do Facebook acessível ao user via Meta Business Suite
 *
 * Fluxo:
 *   1. buildFacebookAuthUrl(state) → redireciona pro Facebook
 *   2. /auth/facebook/callback?code=... → exchangeFacebookCode → short token
 *   3. exchangeFacebookShortForLong(short) → long-lived (~60d)
 *   4. fetchPagesWithIg(long) → lista pages c/ instagram_business_account
 *   5. User escolhe quais importar
 */

const GRAPH_VERSION = "v23.0";
const AUTH_URL = `https://www.facebook.com/${GRAPH_VERSION}/dialog/oauth`;
const TOKEN_URL = `https://graph.facebook.com/${GRAPH_VERSION}/oauth/access_token`;
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;

// Escopos pra listar Pages + acessar IG insights via Business Manager + ads.
// `business_management` e `ads_read` exigem App Review mais rigoroso pra
// produção pública. Em modo Dev funciona com Testers sem App Review.
const SCOPES = [
  "pages_show_list",
  "business_management",
  "instagram_basic",
  "instagram_manage_insights",
  "ads_read", // tráfego pago: ler campaigns/adsets/ads do Marketing API
].join(",");

function getAppId(): string {
  const id = process.env.META_APP_ID ?? process.env.FACEBOOK_APP_ID;
  if (!id) throw new Error("META_APP_ID não configurada em .env.local");
  return id;
}

function getAppSecret(): string {
  const secret =
    process.env.META_APP_SECRET ??
    process.env.FACEBOOK_APP_SECRET ??
    process.env.INSTAGRAM_APP_SECRET; // mesmo Meta App = mesma secret
  if (!secret) throw new Error("META_APP_SECRET não configurada em .env.local");
  return secret;
}

function getRedirectUri(): string {
  const uri = process.env.META_FB_REDIRECT_URI;
  if (!uri) throw new Error("META_FB_REDIRECT_URI não configurada em .env.local");
  return uri;
}

export function isFacebookConfigured(): boolean {
  const hasId = Boolean(process.env.META_APP_ID ?? process.env.FACEBOOK_APP_ID);
  const hasSecret = Boolean(
    process.env.META_APP_SECRET ??
      process.env.FACEBOOK_APP_SECRET ??
      process.env.INSTAGRAM_APP_SECRET,
  );
  const hasRedirect = Boolean(process.env.META_FB_REDIRECT_URI);
  return hasId && hasSecret && hasRedirect;
}

export function buildFacebookAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: getAppId(),
    redirect_uri: getRedirectUri(),
    response_type: "code",
    scope: SCOPES,
    state,
    auth_type: "rerequest", // pede re-permissão se user negou algum escopo antes
  });
  return `${AUTH_URL}?${params.toString()}`;
}

export type FbShortToken = {
  access_token: string;
  token_type: string;
  expires_in?: number;
};

export async function exchangeFacebookCode(code: string): Promise<FbShortToken> {
  const params = new URLSearchParams({
    client_id: getAppId(),
    client_secret: getAppSecret(),
    redirect_uri: getRedirectUri(),
    code,
  });
  const res = await fetch(`${TOKEN_URL}?${params.toString()}`);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`exchange code falhou (${res.status}): ${text.slice(0, 200)}`);
  }
  return (await res.json()) as FbShortToken;
}

export type FbLongToken = {
  access_token: string;
  token_type: string;
  expires_in: number; // ~5184000s (60d)
};

export async function exchangeFacebookShortForLong(
  shortToken: string,
): Promise<FbLongToken> {
  const params = new URLSearchParams({
    grant_type: "fb_exchange_token",
    client_id: getAppId(),
    client_secret: getAppSecret(),
    fb_exchange_token: shortToken,
  });
  const res = await fetch(`${TOKEN_URL}?${params.toString()}`);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `exchange short→long falhou (${res.status}): ${text.slice(0, 200)}`,
    );
  }
  return (await res.json()) as FbLongToken;
}

export type FbPageWithIg = {
  page_id: string;
  page_name: string;
  ig_user_id: string;
  ig_username: string;
  ig_name?: string;
  ig_profile_picture_url?: string;
  followers_count?: number;
  media_count?: number;
};

type RawPage = {
  id: string;
  name: string;
  instagram_business_account?: {
    id: string;
    username: string;
    name?: string;
    profile_picture_url?: string;
    followers_count?: number;
    media_count?: number;
  };
};

/**
 * Lista Pages que o user gerencia + a conta IG Business vinculada (quando houver).
 * Filtra Pages sem IG. Suporta paginação simples (segue `paging.next`).
 */
export async function fetchPagesWithIg(
  accessToken: string,
): Promise<FbPageWithIg[]> {
  const fields =
    "id,name,instagram_business_account{id,username,name,profile_picture_url,followers_count,media_count}";
  const params = new URLSearchParams({
    fields,
    limit: "100",
    access_token: accessToken,
  });

  const out: FbPageWithIg[] = [];
  let url: string | null = `${GRAPH_BASE}/me/accounts?${params.toString()}`;

  while (url) {
    const res = await fetch(url);
    if (!res.ok) {
      const text = await res.text();
      throw new Error(
        `fetch pages falhou (${res.status}): ${text.slice(0, 200)}`,
      );
    }
    const json = (await res.json()) as {
      data: RawPage[];
      paging?: { next?: string };
    };
    for (const p of json.data ?? []) {
      const ig = p.instagram_business_account;
      if (!ig) continue;
      out.push({
        page_id: p.id,
        page_name: p.name,
        ig_user_id: ig.id,
        ig_username: ig.username,
        ig_name: ig.name,
        ig_profile_picture_url: ig.profile_picture_url,
        followers_count: ig.followers_count,
        media_count: ig.media_count,
      });
    }
    url = json.paging?.next ?? null;
  }

  return out;
}
