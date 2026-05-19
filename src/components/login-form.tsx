"use client";

import { useActionState, useState } from "react";
import {
  signInWithMagicLink,
  signInWithGoogle,
  type AuthState,
} from "@/app/actions/auth";

const initialState: AuthState = {};

function GoogleIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

export function LoginForm({ next }: { next?: string }) {
  const [state, formAction, pending] = useActionState(
    signInWithMagicLink,
    initialState,
  );
  const [email, setEmail] = useState("");

  if (state.sent) {
    return (
      <div className="w-full text-center">
        <h2 className="text-2xl font-bold text-fg">
          Confira seu <span className="dark-text-grad">e-mail</span>.
        </h2>
        <p className="mt-3 text-sm text-fg-muted">
          Enviamos um link para <strong className="text-fg">{email}</strong>.
          Abra o link em qualquer dispositivo pra entrar.
        </p>
        <a
          href="/"
          className="mt-5 inline-block text-xs font-semibold text-fg-muted underline-offset-4 hover:text-fg hover:underline"
        >
          Tentar outro e-mail
        </a>
      </div>
    );
  }

  return (
    <div className="w-full space-y-5">
      <form action={formAction} className="space-y-4">
        {next && <input type="hidden" name="next" value={next} />}
        <div className="space-y-2">
          <label
            htmlFor="email"
            className="block text-xs font-semibold uppercase tracking-wider text-fg-muted"
          >
            E-mail
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="voce@studiobaires.com"
            className="block w-full rounded-full border border-border bg-surface-2 px-5 py-3 text-sm text-fg placeholder:text-fg-faint outline-none transition focus:border-neon-purple focus:ring-2 focus:ring-neon-purple/30"
          />
        </div>

        <button
          type="submit"
          disabled={pending || !email}
          className="dark-bg-grad-purple-pink dark-glow-purple inline-flex h-11 w-full items-center justify-center rounded-full px-6 text-sm font-semibold text-white transition disabled:opacity-50"
        >
          {pending ? "Enviando link…" : "Receber link por e-mail"}
        </button>

        {state.error && (
          <p className="rounded-2xl border border-danger-neon/30 bg-danger-neon/10 px-4 py-3 text-sm text-danger-neon">
            {state.error}
          </p>
        )}
      </form>

      <div className="flex items-center gap-4 py-1">
        <div className="h-px flex-1 bg-border" />
        <span className="text-[10px] font-semibold uppercase tracking-wider text-fg-muted">
          ou
        </span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <form action={signInWithGoogle}>
        {next && <input type="hidden" name="next" value={next} />}
        <button
          type="submit"
          className="inline-flex h-11 w-full items-center justify-center gap-3 rounded-full border border-border bg-surface-2 px-5 text-sm font-semibold text-fg transition hover:border-border-strong"
        >
          <GoogleIcon className="h-5 w-5" />
          Entrar com Google
        </button>
      </form>

      <p className="pt-1 text-center text-[11px] text-fg-faint">
        Ao entrar, você concorda com nossa{" "}
        <a
          href="/privacidade"
          className="underline-offset-2 hover:text-fg-muted hover:underline"
        >
          Política de Privacidade
        </a>
        .
      </p>
    </div>
  );
}
