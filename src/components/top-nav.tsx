import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  getDisplayName,
  getInitials,
  getAvatarUrl,
} from "@/lib/user";
import { UserMenu } from "./user-menu";

const navItems = [
  { href: "/dashboard", label: "Visão geral" },
  { href: "/dashboard/contas", label: "Contas" },
  { href: "/dashboard/relatorios", label: "Relatórios" },
];

export async function TopNav() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const name = getDisplayName(user);
  const initials = getInitials(user);
  const avatarUrl = getAvatarUrl(user);
  const email = user?.email ?? "";

  return (
    <header className="sticky top-0 z-40 border-b border-ink/10 bg-cream/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 sm:px-10">
        <div className="flex items-center gap-10">
          <Link
            href="/dashboard"
            className="headline-display text-2xl text-ink hover:opacity-80"
          >
            Studio Baires
          </Link>
          <nav className="hidden gap-6 text-sm font-medium text-ink-soft md:flex">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="transition-colors hover:text-ink"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/conectar"
            className="hidden h-10 items-center rounded-full bg-forest px-5 text-sm font-semibold text-cream transition-colors hover:bg-forest-soft sm:inline-flex"
          >
            + Conectar conta
          </Link>
          <UserMenu
            name={name}
            email={email}
            initials={initials}
            avatarUrl={avatarUrl}
          />
        </div>
      </div>
    </header>
  );
}
