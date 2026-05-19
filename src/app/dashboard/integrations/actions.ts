"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAllowedEmail } from "@/lib/auth/allowlist";
import { revokeTokenByHash } from "@/lib/oauth/tokens";

export async function revokeOAuthTokenAction(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isAllowedEmail(user.email)) {
    redirect("/?auth_error=not_authenticated");
  }

  const token_hash = String(formData.get("token_hash") ?? "");
  if (!token_hash) return;
  await revokeTokenByHash(token_hash);

  revalidatePath("/dashboard/integrations");
}
