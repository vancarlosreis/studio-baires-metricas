import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import {
  exchangeCodeForShortToken,
  exchangeShortForLongToken,
  fetchProfile,
} from "@/lib/instagram/oauth";
import { encryptToken } from "@/lib/crypto";

const STATE_COOKIE = "ig_oauth_state";

function errorRedirect(origin: string, code: string, detail?: string) {
  const url = new URL(`${origin}/dashboard/conectar`);
  url.searchParams.set("error", code);
  if (detail) url.searchParams.set("detail", detail.slice(0, 200));
  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const { origin } = url;
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error");
  const oauthErrorReason = url.searchParams.get("error_reason");
  const oauthErrorDescription = url.searchParams.get("error_description");

  // Usuário negou ou Instagram retornou erro
  if (oauthError) {
    return errorRedirect(
      origin,
      oauthError,
      oauthErrorDescription ?? oauthErrorReason ?? undefined,
    );
  }

  if (!code || !state) {
    return errorRedirect(origin, "missing_params");
  }

  // Valida state (CSRF protection)
  const cookieStore = await cookies();
  const savedState = cookieStore.get(STATE_COOKIE)?.value;
  cookieStore.delete(STATE_COOKIE);
  if (!savedState || savedState !== state) {
    return errorRedirect(origin, "invalid_state");
  }

  // Usuário precisa estar autenticado no app
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(`${origin}/?error=not_authenticated`);
  }

  try {
    // 1. Troca code por short-lived token
    const shortToken = await exchangeCodeForShortToken(code);

    // 2. Troca short por long-lived token (60 dias)
    const longToken = await exchangeShortForLongToken(shortToken.access_token);

    // 3. Busca dados do perfil
    const profile = await fetchProfile(longToken.access_token);

    // 4. Criptografa o token e converte pra hex (bytea no Postgres)
    const encrypted = encryptToken(longToken.access_token);
    const tokenHex = `\\x${encrypted.toString("hex")}`;

    const tokenExpiresAt = new Date(
      Date.now() + longToken.expires_in * 1000,
    ).toISOString();

    // 5. Upsert no banco (cria ou atualiza se já tiver conectado essa mesma conta)
    const { error: dbError } = await supabase.from("ig_accounts").upsert(
      {
        user_id: user.id,
        ig_user_id: profile.user_id,
        ig_username: profile.username,
        ig_account_name: profile.name ?? null,
        ig_profile_picture_url: profile.profile_picture_url ?? null,
        fb_page_id: null, // Business Login não exige
        // bytea no Postgres: passamos como hex string com prefixo \x
        access_token_encrypted: tokenHex,
        token_expires_at: tokenExpiresAt,
        auth_method: "business_login",
        is_active: true,
        connected_at: new Date().toISOString(),
        last_synced_at: null,
      },
      { onConflict: "user_id,ig_user_id" },
    );

    if (dbError) {
      console.error("[ig-callback] Erro ao salvar ig_account:", dbError);
      return errorRedirect(origin, "db_error", dbError.message);
    }

    // 6. Sucesso → vai pro dashboard com flag de "recém-conectado"
    const successUrl = new URL(`${origin}/dashboard`);
    successUrl.searchParams.set("connected", profile.username);
    return NextResponse.redirect(successUrl);
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    console.error("[ig-callback] Erro no OAuth:", message);
    return errorRedirect(origin, "oauth_failed", message);
  }
}
