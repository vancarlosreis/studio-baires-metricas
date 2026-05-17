"use client";

import { Sparkles, ArrowUp, Clock, Hash, Wand2, TrendingUp } from "lucide-react";

type Suggestion = {
  tag: string;
  title: string;
  body: string;
};

type Props = {
  firstName: string;
  reach30d: number;
  followersCount: number;
  bestPostingDay?: string | null;
  topMediaType?: string | null;
};

function fmtCompact(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toLocaleString("pt-BR");
}

const iconMap: Record<string, typeof Sparkles> = {
  Timing: Clock,
  Hashtag: Hash,
  Formato: Wand2,
  Insight: TrendingUp,
};

export function AiPanel({ firstName, reach30d, followersCount, bestPostingDay, topMediaType }: Props) {
  const suggestions: Suggestion[] = [
    bestPostingDay
      ? {
          tag: "Timing",
          title: `Melhor dia da semana: ${bestPostingDay}`,
          body: `Posts publicados em ${bestPostingDay.toLowerCase()} têm o maior engajamento médio. Vale concentrar conteúdos importantes nesse dia.`,
        }
      : {
          tag: "Timing",
          title: "Sem dado suficiente de timing",
          body: "Publique mais posts no período pra eu identificar o melhor dia.",
        },
    topMediaType
      ? {
          tag: "Formato",
          title: `${topMediaType} dominam o feed`,
          body: `Esse formato concentra a maior parte das publicações recentes. Mantenha a frequência se está performando.`,
        }
      : {
          tag: "Formato",
          title: "Sem distribuição clara",
          body: "Distribuição de formatos ainda equilibrada.",
        },
    {
      tag: "Insight",
      title: "Engajamento × alcance",
      body: `Sua base de ${fmtCompact(followersCount)} seguidores alcançou ${fmtCompact(reach30d)} contas únicas no período. Reels e carrosséis costumam ampliar esse alcance.`,
    },
  ];

  return (
    <aside className="sticky top-6 flex h-[calc(100vh-3rem)] w-[360px] flex-col gap-4">
      <div className="dark-card relative overflow-hidden p-5">
        <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-[var(--color-neon-purple)]/30 blur-3xl" />
        <div className="relative flex items-center gap-2">
          <div className="dark-bg-grad-purple-pink dark-glow-purple grid h-9 w-9 place-items-center rounded-xl">
            <Sparkles size={16} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">AI Assistant</p>
            <p className="text-xs text-white/50">Studio Baires AI · beta</p>
          </div>
        </div>
        <p className="relative mt-4 text-sm text-white/70">
          Olá, {firstName}. Analisei <span className="text-white">{fmtCompact(reach30d)}</span> contas
          alcançadas no período. Quer um resumo do que está performando melhor?
        </p>
      </div>

      <div className="dark-card flex min-h-0 flex-1 flex-col p-5">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/50">
            Sugestões inteligentes
          </p>
          <span className="rounded-full bg-[var(--color-warning-neon)]/15 px-2 py-0.5 text-[10px] font-medium text-[var(--color-warning-neon)]">
            Heurística
          </span>
        </div>

        <div className="mt-4 flex-1 space-y-3 overflow-y-auto pr-1">
          {suggestions.map((s) => {
            const Icon = iconMap[s.tag] ?? Sparkles;
            return (
              <div
                key={s.title}
                className="dark-card-hover rounded-2xl border border-white/[0.06] bg-[var(--color-surface-2)]/60 p-3"
              >
                <div className="flex items-center gap-2">
                  <div className="grid h-7 w-7 place-items-center rounded-lg bg-white/5">
                    <Icon size={13} className="text-[var(--color-neon-pink)]" />
                  </div>
                  <span className="text-xs text-white/50">{s.tag}</span>
                </div>
                <p className="mt-2 text-sm font-medium text-white">{s.title}</p>
                <p className="mt-1 text-xs text-white/70">{s.body}</p>
              </div>
            );
          })}
        </div>

        <form
          onSubmit={(e) => e.preventDefault()}
          className="mt-4 flex items-center gap-2 rounded-2xl border border-white/[0.10] bg-[var(--color-bg-elevated)] px-3 py-2"
        >
          <input
            placeholder="Pergunte algo sobre suas métricas…"
            className="flex-1 bg-transparent text-sm text-white placeholder:text-white/40 focus:outline-none"
          />
          <button
            type="submit"
            className="dark-bg-grad-purple-pink dark-glow-purple grid h-8 w-8 place-items-center rounded-xl text-white transition hover:scale-105"
            aria-label="Enviar"
          >
            <ArrowUp size={14} />
          </button>
        </form>
      </div>
    </aside>
  );
}
