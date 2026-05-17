import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

type DB = SupabaseClient<Database>;

export type IgAccountRow = Database["public"]["Tables"]["ig_accounts"]["Row"];
export type AccountSnapshotRow =
  Database["public"]["Tables"]["account_snapshots"]["Row"];

export type IgAccountWithLatestSnapshot = IgAccountRow & {
  latest_snapshot: AccountSnapshotRow | null;
};

/**
 * Lista as contas IG ativas do usuário logado, com o último snapshot anexado.
 * Usa RLS — não precisa filtrar por user_id manualmente.
 */
export async function listIgAccounts(
  supabase: DB,
): Promise<IgAccountWithLatestSnapshot[]> {
  const { data: accounts, error } = await supabase
    .from("ig_accounts")
    .select("*")
    .eq("is_active", true)
    .order("connected_at", { ascending: false });

  if (error) {
    console.error("[listIgAccounts] erro:", error);
    return [];
  }
  if (!accounts || accounts.length === 0) return [];

  // Busca o último snapshot de cada conta em uma query única
  const accountIds = accounts.map((a) => a.id);
  const { data: snapshots } = await supabase
    .from("account_snapshots")
    .select("*")
    .in("ig_account_id", accountIds)
    .order("snapshot_date", { ascending: false });

  const latestByAccount = new Map<string, AccountSnapshotRow>();
  for (const snap of snapshots ?? []) {
    if (!latestByAccount.has(snap.ig_account_id)) {
      latestByAccount.set(snap.ig_account_id, snap);
    }
  }

  return accounts.map((a) => ({
    ...a,
    latest_snapshot: latestByAccount.get(a.id) ?? null,
  }));
}

/**
 * Busca uma conta IG pelo handle (username). RLS garante que só retorna se for do usuário.
 */
export async function getIgAccountByHandle(
  supabase: DB,
  handle: string,
): Promise<IgAccountRow | null> {
  const { data, error } = await supabase
    .from("ig_accounts")
    .select("*")
    .eq("ig_username", handle)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    console.error("[getIgAccountByHandle] erro:", error);
    return null;
  }
  return data;
}

/**
 * Calcula iniciais a partir do nome ou username.
 */
export function getAccountInitials(account: IgAccountRow): string {
  const source = account.ig_account_name || account.ig_username;
  const parts = source.trim().replace(/^@/, "").split(/[\s.]+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
