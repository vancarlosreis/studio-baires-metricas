import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { decryptToken } from "@/lib/crypto";
import { createClient } from "@/lib/supabase/server";
import { fetchPagesWithIg, type FbPageWithIg } from "@/lib/instagram/oauth-fb";
import { connectSelectedMetaAccounts } from "@/app/actions/instagram";

const TOKEN_COOKIE = "fb_pending_token";

export default async function MetaSelectPage() {
  const cookieStore = await cookies();
  const encryptedB64 = cookieStore.get(TOKEN_COOKIE)?.value;

  if (!encryptedB64) {
    redirect("/dashboard/conectar?error=meta_session_expired");
  }

  // Token de uso temporário (10min) — descifra só pra listar páginas
  let pages: FbPageWithIg[];
  try {
    const token = decryptToken(Buffer.from(encryptedB64, "base64"));
    pages = await fetchPagesWithIg(token);
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    redirect(
      `/dashboard/conectar?error=fetch_pages_failed&detail=${encodeURIComponent(message)}`,
    );
  }

  // Pega as contas já conectadas pra desabilitar duplicatas
  const supabase = await createClient();
  const { data: existingAccounts } = await supabase
    .from("ig_accounts")
    .select("ig_user_id")
    .eq("is_active", true);
  const existingSet = new Set((existingAccounts ?? []).map((a) => a.ig_user_id));

  return (
    <div className="mx-auto max-w-3xl px-6 py-16 sm:px-10 sm:py-24">
      <div className="mb-10">
        <Link
          href="/dashboard/conectar"
          className="text-sm font-semibold text-ink-soft underline-offset-4 hover:text-ink hover:underline"
        >
          ← Voltar
        </Link>
      </div>

      <p className="text-sm font-semibold uppercase tracking-wider text-ink-soft">
        Meta Business Suite
      </p>
      <h1 className="headline-display mt-2 text-5xl text-ink sm:text-6xl">
        Quais contas quer <span className="text-burgundy">importar?</span>
      </h1>
      <p className="mt-4 max-w-xl text-base leading-relaxed text-ink-soft sm:text-lg">
        Encontrei {pages.length}{" "}
        {pages.length === 1 ? "conta Instagram" : "contas Instagram"} ligadas às
        suas Páginas do Facebook. Marque as que você quer ver no dashboard.
      </p>

      {pages.length === 0 ? (
        <div className="mt-10 rounded-3xl border border-dashed border-ink/20 bg-paper/50 px-8 py-16 text-center">
          <div className="headline-display text-3xl text-ink">
            Nenhuma conta Instagram encontrada
          </div>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-ink-soft">
            Suas Páginas do Facebook não têm contas Instagram Business vinculadas,
            ou seu usuário não tem permissão de ver elas no Meta Business Suite.
          </p>
          <Link
            href="/dashboard/conectar"
            className="mt-6 inline-flex h-12 items-center rounded-full bg-ink px-8 text-sm font-semibold text-cream hover:bg-forest"
          >
            Voltar
          </Link>
        </div>
      ) : (
        <form action={connectSelectedMetaAccounts} className="mt-10 space-y-3">
          {pages.map((p) => {
            const isDuplicate = existingSet.has(p.ig_user_id);
            return (
              <label
                key={p.ig_user_id}
                className="flex cursor-pointer items-start gap-4 rounded-2xl border border-ink/10 bg-paper p-4 transition-colors hover:border-forest/40"
              >
                <input
                  type="checkbox"
                  name="page_ids"
                  value={p.page_id}
                  defaultChecked={true}
                  className="mt-1 h-5 w-5 shrink-0 accent-forest"
                />
                <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-ink text-cream">
                  {p.ig_profile_picture_url ? (
                    <Image
                      src={p.ig_profile_picture_url}
                      alt={p.ig_username}
                      width={56}
                      height={56}
                      className="h-full w-full object-cover"
                      unoptimized
                    />
                  ) : (
                    <span className="text-xs font-semibold">
                      {p.ig_username.slice(0, 2).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-base font-semibold text-ink">
                    {p.ig_name || p.ig_username}
                  </p>
                  <p className="text-sm text-ink-soft">@{p.ig_username}</p>
                  <div className="mt-1 flex flex-wrap gap-3 text-xs text-ink-soft">
                    {p.followers_count !== undefined && (
                      <span>
                        <strong className="text-ink">
                          {p.followers_count.toLocaleString("pt-BR")}
                        </strong>{" "}
                        seguidores
                      </span>
                    )}
                    {p.media_count !== undefined && (
                      <span>
                        <strong className="text-ink">{p.media_count}</strong> posts
                      </span>
                    )}
                    <span className="italic">via Página: {p.page_name}</span>
                  </div>
                </div>
                {isDuplicate && (
                  <span
                    className="shrink-0 rounded-full bg-forest/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-forest"
                    title="Re-importar atualiza o token de acesso (não duplica)"
                  >
                    atualizar token
                  </span>
                )}
              </label>
            );
          })}

          <div className="flex flex-col gap-3 pt-6 sm:flex-row sm:justify-end">
            <Link
              href="/dashboard/conectar"
              className="inline-flex h-12 items-center justify-center rounded-full border border-ink/15 bg-paper px-6 text-sm font-semibold text-ink hover:border-ink/40"
            >
              Cancelar
            </Link>
            <button
              type="submit"
              className="inline-flex h-12 items-center justify-center rounded-full bg-forest px-8 text-sm font-semibold text-cream hover:bg-forest-soft"
            >
              Importar selecionadas
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
