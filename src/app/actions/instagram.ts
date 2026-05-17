"use server";

import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { buildAuthUrl, isInstagramConfigured } from "@/lib/instagram/oauth";
import {
  buildFacebookAuthUrl,
  fetchPagesWithIg,
  isFacebookConfigured,
} from "@/lib/instagram/oauth-fb";
import { decryptToken, encryptToken } from "@/lib/crypto";

const STATE_COOKIE = "ig_oauth_state";
const FB_STATE_COOKIE = "fb_oauth_state";
const FB_TOKEN_COOKIE = "fb_pending_token";
const STATE_MAX_AGE = 600; // 10 minutos

/**
 * Inicia o fluxo OAuth do Instagram Business Login.
 * Gera um state pra CSRF, salva em cookie httpOnly e redireciona pro Instagram.
 */
export async function startInstagramOAuth() {
  if (!isInstagramConfigured()) {
    throw new Error(
      "Instagram não configurado. Preencha INSTAGRAM_APP_ID, INSTAGRAM_APP_SECRET e INSTAGRAM_REDIRECT_URI.",
    );
  }

  // Exige usuário autenticado no app
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/?error=not_authenticated");
  }

  const state = randomBytes(16).toString("hex");
  const cookieStore = await cookies();
  cookieStore.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: STATE_MAX_AGE,
  });

  redirect(buildAuthUrl(state));
}

/**
 * Inicia o fluxo OAuth via Facebook Login (Meta Switch).
 * Permite importar várias contas IG vinculadas a Páginas do FB de uma vez.
 */
export async function startFacebookOAuth() {
  if (!isFacebookConfigured()) {
    throw new Error(
      "Facebook Login não configurado. Preencha META_APP_ID, META_APP_SECRET e META_FB_REDIRECT_URI em .env.local.",
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/?error=not_authenticated");
  }

  const state = randomBytes(16).toString("hex");
  const cookieStore = await cookies();
  cookieStore.set(FB_STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: STATE_MAX_AGE,
  });

  redirect(buildFacebookAuthUrl(state));
}

/**
 * Confirma seleção de contas vindas do Meta Business Suite.
 * Lê o token temporário da cookie (gravado por /auth/facebook/callback),
 * descifra, salva uma row ig_accounts por conta selecionada e limpa cookie.
 */
export async function connectSelectedMetaAccounts(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/?error=not_authenticated");
  }

  const cookieStore = await cookies();
  const encryptedB64 = cookieStore.get(FB_TOKEN_COOKIE)?.value;
  const expiresIn = Number(cookieStore.get(`${FB_TOKEN_COOKIE}_exp`)?.value ?? 0);
  if (!encryptedB64) {
    redirect("/dashboard/conectar?error=meta_session_expired");
  }

  const selectedPageIds = formData.getAll("page_ids").map(String);
  if (selectedPageIds.length === 0) {
    redirect("/dashboard/conectar/meta?error=no_selection");
  }

  let pages;
  let token: string;
  try {
    token = decryptToken(Buffer.from(encryptedB64, "base64"));
    pages = await fetchPagesWithIg(token);
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    redirect(
      `/dashboard/conectar?error=fetch_pages_failed&detail=${encodeURIComponent(message)}`,
    );
  }

  const selectedSet = new Set(selectedPageIds);
  const toInsert = pages.filter((p) => selectedSet.has(p.page_id));
  if (toInsert.length === 0) {
    redirect("/dashboard/conectar?error=selection_mismatch");
  }

  const encrypted = encryptToken(token);
  const tokenHex = `\\x${encrypted.toString("hex")}`;
  const tokenExpiresAt =
    expiresIn > 0
      ? new Date(Date.now() + expiresIn * 1000).toISOString()
      : null;

  const rows = toInsert.map((p) => ({
    user_id: user!.id,
    ig_user_id: p.ig_user_id,
    ig_username: p.ig_username,
    ig_account_name: p.ig_name ?? null,
    ig_profile_picture_url: p.ig_profile_picture_url ?? null,
    fb_page_id: p.page_id,
    fb_page_name: p.page_name,
    access_token_encrypted: tokenHex,
    token_expires_at: tokenExpiresAt,
    auth_method: "facebook_login" as const,
    is_active: true,
    connected_at: new Date().toISOString(),
    last_synced_at: null,
  }));

  const { error: dbError } = await supabase
    .from("ig_accounts")
    .upsert(rows, { onConflict: "user_id,ig_user_id" });

  // Limpa cookies do fluxo temporário sempre, mesmo em erro
  cookieStore.delete(FB_TOKEN_COOKIE);
  cookieStore.delete(`${FB_TOKEN_COOKIE}_exp`);

  if (dbError) {
    console.error("[connectSelectedMetaAccounts] erro:", dbError);
    redirect(
      `/dashboard/conectar?error=db_error&detail=${encodeURIComponent(dbError.message)}`,
    );
  }

  redirect(`/dashboard?connected=multi&count=${rows.length}`);
}

/**
 * Desconecta uma conta IG (mantém histórico no banco mas marca como inativa).
 */
export async function disconnectInstagramAccount(igAccountId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/?error=not_authenticated");
  }

  const { error } = await supabase
    .from("ig_accounts")
    .update({ is_active: false })
    .eq("id", igAccountId);

  if (error) {
    throw new Error(`Falha ao desconectar conta: ${error.message}`);
  }

  redirect("/dashboard");
}
