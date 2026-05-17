"use client";

import Link from "next/link";
import {
  LayoutDashboard,
  BarChart3,
  Users,
  Images,
  Sparkles,
  Settings,
  LifeBuoy,
  ArrowLeft,
} from "lucide-react";

const items = [
  { icon: LayoutDashboard, label: "Visão geral", href: "/dashboard" },
  { icon: BarChart3, label: "Analytics", active: true },
  { icon: Images, label: "Conteúdo" },
  { icon: Users, label: "Audiência" },
  { icon: Sparkles, label: "AI Insights" },
];

const footerItems = [
  { icon: LifeBuoy, label: "Suporte" },
  { icon: Settings, label: "Configurações" },
];

type Props = {
  initials: string;
  avatarUrl?: string | null;
};

export function Sidebar({ initials, avatarUrl }: Props) {
  return (
    <aside className="sticky top-6 flex h-[calc(100vh-3rem)] w-[80px] flex-col items-center justify-between rounded-2xl border border-white/[0.06] bg-surface/60 px-2 py-5 backdrop-blur">
      <div className="flex flex-col items-center gap-6">
        <Link
          href="/dashboard"
          className="dark-bg-grad-purple-pink dark-glow-purple grid h-10 w-10 place-items-center rounded-xl"
          title="Voltar à visão geral"
        >
          <span className="text-sm font-bold text-white">SB</span>
        </Link>

        <Link
          href="/dashboard"
          className="grid h-9 w-9 place-items-center rounded-xl text-white/70 transition hover:bg-white/5 hover:text-white"
          title="Voltar"
        >
          <ArrowLeft size={16} strokeWidth={1.8} />
        </Link>

        <nav className="mt-2 flex flex-col gap-2">
          {items.map(({ icon: Icon, label, active, href }) => {
            const className = `group relative grid h-11 w-11 place-items-center rounded-xl transition ${
              active
                ? "bg-surface-2 text-white dark-glow-purple"
                : "text-white/70 hover:bg-white/5 hover:text-white"
            }`;
            const inner = (
              <>
                {active && (
                  <span className="dark-bg-grad-purple-pink absolute -left-2 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-full" />
                )}
                <Icon size={18} strokeWidth={1.8} />
              </>
            );
            return href ? (
              <Link key={label} href={href} title={label} className={className}>
                {inner}
              </Link>
            ) : (
              <button key={label} title={label} className={className} type="button">
                {inner}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="flex flex-col items-center gap-2">
        {footerItems.map(({ icon: Icon, label }) => (
          <button
            key={label}
            type="button"
            title={label}
            className="grid h-11 w-11 place-items-center rounded-xl text-white/70 transition hover:bg-white/5 hover:text-white"
          >
            <Icon size={18} strokeWidth={1.8} />
          </button>
        ))}
        <div className="mt-2 h-9 w-9 overflow-hidden rounded-full ring-2 ring-neon-purple/60">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt={initials} className="h-full w-full object-cover" />
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
