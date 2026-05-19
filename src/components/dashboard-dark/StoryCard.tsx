import Image from "next/image";
import {
  Eye,
  Users,
  Activity,
  UserCircle2,
  MessageCircle,
  Share2,
  ChevronRight,
  ChevronLeft,
  SkipForward,
  LogOut,
} from "lucide-react";
import type { StoryRow } from "@/lib/queries/stories";

function fmt(n: number | null | undefined) {
  if (n == null) return "—";
  return new Intl.NumberFormat("pt-BR").format(n);
}

function fmtPct(n: number | null | undefined) {
  if (n == null || !isFinite(n)) return "—";
  return `${(n * 100).toFixed(1).replace(".", ",")}%`;
}

function postedLabel(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Retenção do story = (reach - exits - swipe_forward) / reach.
 *
 * Mesma fórmula do Reportei: do total que viu (reach), quem NÃO saiu (exits)
 * E NÃO pulou pro próximo perfil (swipe_forward) = realmente terminou.
 * Usar `views` em vez de `reach` infla pq views conta replays.
 */
function retention(
  reach: number | null,
  exits: number | null,
  swipeForward: number | null,
): number | null {
  if (!reach || reach <= 0) return null;
  const lost = (exits ?? 0) + (swipeForward ?? 0);
  return Math.max(0, (reach - lost) / reach);
}

export function StoryCard({ story }: { story: StoryRow }) {
  const thumb = story.thumbnail_url ?? story.media_url ?? null;
  const isVideo = story.media_type === "VIDEO";
  const ret = retention(story.reach, story.exits, story.swipe_forward);

  return (
    <article className="dark-card flex flex-col overflow-hidden">
      <div className="relative aspect-[9/16] w-full overflow-hidden bg-surface-2">
        {thumb ? (
          <Image
            src={thumb}
            alt={story.caption ?? "Story"}
            fill
            className="object-cover"
            unoptimized
          />
        ) : (
          <div className="grid h-full w-full place-items-center text-4xl text-white/30">
            {isVideo ? "🎬" : "📖"}
          </div>
        )}
        <div className="absolute left-2 top-2 flex items-center gap-1.5">
          <span className="rounded-full bg-neon-amber/20 px-2 py-0.5 text-[10px] font-semibold text-neon-amber backdrop-blur">
            Story
          </span>
          <span className="rounded-full bg-black/50 px-2 py-0.5 text-[10px] text-white/80 backdrop-blur">
            {postedLabel(story.posted_at)}
          </span>
        </div>
        {ret != null && (
          <div className="absolute right-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur">
            Retenção {fmtPct(ret)}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-x-3 gap-y-2 p-4 text-xs">
        <Metric icon={<Eye size={12} className="text-neon-blue" />} label="Visualizações" value={fmt(story.views)} />
        <Metric icon={<Users size={12} className="text-neon-purple" />} label="Alcance" value={fmt(story.reach)} />
        <Metric icon={<Activity size={12} className="text-neon-pink" />} label="Interações" value={fmt(story.total_interactions)} />
        <Metric icon={<UserCircle2 size={12} className="text-neon-cyan" />} label="Visitas ao perfil" value={fmt(story.profile_visits ?? story.profile_activity)} />
        <Metric icon={<MessageCircle size={12} />} label="Respostas" value={fmt(story.replies)} />
        <Metric icon={<Share2 size={12} />} label="Compartilhamentos" value={fmt(story.shares)} />
        <Metric icon={<ChevronRight size={12} />} label="Avançar" value={fmt(story.taps_forward)} />
        <Metric icon={<SkipForward size={12} />} label="Próximo story" value={fmt(story.swipe_forward)} />
        <Metric icon={<ChevronLeft size={12} />} label="Voltar" value={fmt(story.taps_back)} />
        <Metric icon={<LogOut size={12} />} label="Sair" value={fmt(story.exits)} />
      </div>

      {story.permalink && (
        <a
          href={story.permalink}
          target="_blank"
          rel="noreferrer"
          className="border-t border-white/[0.06] px-4 py-2.5 text-center text-[11px] text-white/50 transition hover:text-white"
        >
          Abrir no Instagram →
        </a>
      )}
    </article>
  );
}

function Metric({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-2 text-white/60">
      <span className="flex min-w-0 items-center gap-1.5 truncate">
        {icon}
        <span className="truncate">{label}</span>
      </span>
      <span className="shrink-0 font-semibold text-white">{value}</span>
    </div>
  );
}
