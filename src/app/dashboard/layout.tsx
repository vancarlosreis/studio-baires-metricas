import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAllowedEmail } from "@/lib/auth/allowlist";
import { AppSidebar } from "@/components/app-sidebar";
import { getThemeFromCookie } from "@/lib/theme";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isAllowedEmail(user.email)) {
    redirect("/?auth_error=not_authenticated");
  }

  const theme = await getThemeFromCookie();

  const fullName =
    (user.user_metadata?.full_name as string | undefined) ?? user.email ?? "U";
  const initials = fullName
    .split(/[\s.@]+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
  const avatarUrl =
    (user.user_metadata?.avatar_url as string | undefined) ??
    (user.user_metadata?.picture as string | undefined) ??
    null;

  return (
    <div className="theme-glow theme-scope relative flex min-h-screen bg-bg text-fg">
      <div className="relative z-10 grid w-full grid-cols-[112px_minmax(0,1fr)] gap-6 px-6 py-6">
        <AppSidebar
          initials={initials || "SB"}
          avatarUrl={avatarUrl}
          theme={theme}
        />
        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}
