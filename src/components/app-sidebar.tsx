import Link from "next/link";
import { LayoutDashboard, FileBarChart, Plug, LogOut } from "lucide-react";
import { signOut } from "@/app/actions/auth";
import { ThemeToggle } from "@/components/theme-toggle";
import type { Theme } from "@/lib/theme";

const items = [
  { icon: LayoutDashboard, label: "Visão geral", href: "/dashboard" },
  { icon: FileBarChart, label: "Relatórios", href: "/dashboard/relatorios" },
  { icon: Plug, label: "Integrações", href: "/dashboard/integrations" },
];

type Props = {
  initials: string;
  avatarUrl?: string | null;
  theme: Theme;
};

export function AppSidebar({ initials, avatarUrl, theme }: Props) {
  return (
    <aside className="sticky top-6 z-10 flex h-[calc(100vh-3rem)] w-[80px] shrink-0 flex-col items-center justify-between rounded-2xl border border-border bg-surface/60 px-2 py-5 backdrop-blur">
      <div className="flex flex-col items-center gap-6">
        <Link
          href="/dashboard"
          className="dark-bg-grad-purple-pink dark-glow-purple grid h-10 w-10 place-items-center rounded-xl"
          title="Studio Baires"
        >
          <span className="text-sm font-bold text-white">SB</span>
        </Link>

        <nav className="mt-2 flex flex-col gap-2">
          {items.map(({ icon: Icon, label, href }) => (
            <Link
              key={href}
              href={href}
              title={label}
              className="grid h-11 w-11 place-items-center rounded-xl text-fg-muted transition hover:bg-surface-2 hover:text-fg"
            >
              <Icon size={18} strokeWidth={1.8} />
            </Link>
          ))}
        </nav>
      </div>

      <div className="flex flex-col items-center gap-2">
        <ThemeToggle theme={theme} />

        <form action={signOut}>
          <button
            type="submit"
            title="Sair"
            aria-label="Sair"
            className="grid h-10 w-10 place-items-center rounded-xl text-fg-muted transition hover:bg-surface-2 hover:text-fg"
          >
            <LogOut size={16} strokeWidth={1.8} />
          </button>
        </form>

        <div className="mt-2 h-9 w-9 overflow-hidden rounded-full ring-2 ring-neon-purple/60">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl}
              alt={initials}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="dark-bg-grad-purple-pink grid h-full w-full place-items-center text-xs font-semibold text-white">
              {initials}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
