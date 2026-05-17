import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import {
  exchangeFacebookCode,
  exchangeFacebookShortForLong,
} from "@/lib/instagram/oauth-fb";
import { encryptToken } from "@/lib/crypto";

const STATE_COOKIE = "fb_oauth_state";
const TOKEN_COOKIE = "fb_pending_token";
const TOKEN_MAX_AGE = 600; // 10 min

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
  const oauthErrorDescription = url.searchParams.get("error_description");

  if (oauthError) {
    return errorRedirect(origin, oauthError, oauthErrorDescription ?? undefined);
  }
  if (!code || !state) {
    return errorRedirect(origin, "missing_params");
  }

  const cookieStore = await cookies();
  const savedState = cookieStore.get(STATE_COOKIE)?.value;
  cookieStore.delete(STATE_COOKIE);
  if (!savedState || savedState !== state) {
    return errorRedirect(origin, "invalid_state");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(`${origin}/?error=not_authenticated`);
  }

  try {
    const shortToken = await exchangeFacebookCode(code);
    const longToken = await exchangeFacebookShortForLong(shortToken.access_token);

    // Guarda o token cifrado numa cookie temporária. Página /meta/selecionar
    // lê o token, busca as Pages e mostra UI de seleção. Após o user
    // confirmar, server action descifra, salva contas e limpa a cookie.
    const encrypted = encryptToken(longToken.access_token);
    cookieStore.set(TOKEN_COOKIE, encrypted.toString("base64"), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: TOKEN_MAX_AGE,
    });

    // Também guarda expires_at pra usar quando salvar
    cookieStore.set(`${TOKEN_COOKIE}_exp`, String(longToken.expires_in), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: TOKEN_MAX_AGE,
    });

    return NextResponse.redirect(`${origin}/dashboard/conectar/meta`);
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    console.error("[fb-callback] OAuth falhou:", message);
    return errorRedirect(origin, "oauth_failed", message);
  }
}
