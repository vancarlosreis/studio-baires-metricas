"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { signOut } from "@/app/actions/auth";

export function UserMenu({
  name,
  email,
  initials,
  avatarUrl,
}: {
  name: string;
  email: string;
  initials: string;
  avatarUrl: string | null;
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    if (open) {
      document.addEventListener("mousedown", onClickOutside);
      document.addEventListener("keydown", onEsc);
      return () => {
        document.removeEventListener("mousedown", onClickOutside);
        document.removeEventListener("keydown", onEsc);
      };
    }
  }, [open]);

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Menu do usuário"
        aria-expanded={open}
        className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-ink text-cream ring-offset-2 ring-offset-cream transition-shadow hover:ring-2 hover:ring-ink/20"
      >
        {avatarUrl ? (
          <Image
            src={avatarUrl}
            alt={name}
            width={40}
            height={40}
            className="h-full w-full object-cover"
            unoptimized
          />
        ) : (
          <span className="text-sm font-semibold">{initials}</span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-12 z-50 w-64 origin-top-right rounded-2xl border border-ink/10 bg-paper p-2 shadow-lg"
        >
          <div className="px-4 py-3 border-b border-ink/10">
            <div className="truncate text-sm font-semibold text-ink">{name}</div>
            <div className="truncate text-xs text-ink-soft">{email}</div>
          </div>

          <a
            href="/dashboard/configuracoes"
            role="menuitem"
            className="block rounded-xl px-4 py-2.5 text-sm font-medium text-ink hover:bg-cream"
          >
            Configurações
          </a>

          <form action={signOut}>
            <button
              type="submit"
              role="menuitem"
              className="block w-full rounded-xl px-4 py-2.5 text-left text-sm font-medium text-burgundy hover:bg-burgundy/5"
            >
              Sair
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
