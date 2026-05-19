/**
 * Cliente Supabase com SERVICE ROLE — bypassa RLS.
 *
 * USAR SÓ em endpoints autenticados por outra camada (ex: MCP via Bearer
 * token). NUNCA em rotas que recebem requisições do navegador autenticadas
 * via cookie de usuário — pra essas, use `createClient()` do server.ts.
 */
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY ou NEXT_PUBLIC_SUPABASE_URL não definidos",
    );
  }
  return createSupabaseClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
