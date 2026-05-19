import type { StoryRow } from "@/lib/queries/stories";
import { StoryCard } from "./StoryCard";

export function StoriesGrid({ stories }: { stories: StoryRow[] }) {
  if (stories.length === 0) {
    return (
      <div className="dark-card grid place-items-center px-6 py-12 text-center text-sm text-white/40">
        <div>
          <p>Nenhum story coletado no período.</p>
          <p className="mt-1 text-xs text-white/30">
            A IG API só expõe stories ativos (&lt;24h). Pra ter histórico,
            o sync precisa rodar de forma recorrente.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {stories.map((s) => (
        <StoryCard key={s.id} story={s} />
      ))}
    </div>
  );
}
