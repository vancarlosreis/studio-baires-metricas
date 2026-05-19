-- ============================================================================
-- reposts em media_insights
-- ============================================================================
-- Métrica nova do IG (lista de métricas válidas v23 confirmou): conta vezes
-- que um post foi republicado pelo "Repost" nativo do Instagram (introduzido
-- em 2025). Faz parte das interações orgânicas.
-- ============================================================================

alter table public.media_insights
  add column if not exists reposts integer;

comment on column public.media_insights.reposts is
  'Número de reposts do post via feature nativa do Instagram (v23+).';
