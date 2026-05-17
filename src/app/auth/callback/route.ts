import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAllowedEmail } from "@/lib/auth/allowlist";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.user) {
      // Bloqueio pós-OAuth: Google/magic link já criaram sessão, mas se o
      // email não está na allowlist a gente faz signOut imediato.
      if (!isAllowedEmail(data.user.email)) {
        await supabase.auth.signOut();
        return NextResponse.redirect(
          `${origin}/?auth_error=email_not_allowed`,
        );
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/?auth_error=1`);
}
