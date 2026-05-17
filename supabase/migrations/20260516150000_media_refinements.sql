-- ============================================================================
-- Refinamentos no schema de mídia pra suportar Instagram v23
-- ============================================================================

-- media: Instagram distingue media_type (IMAGE/VIDEO/CAROUSEL) de
-- media_product_type (FEED/REELS/STORY/AD). Salvamos os dois.
alter table public.media
  add column if not exists media_product_type text;

comment on column public.media.media_product_type is
  'Distingue FEED/REELS/STORY/AD/IGTV. Permite filtrar reels de posts normais.';

-- media_insights: adicionar métricas universais que aparecem em insights de
-- post via v23 (engagement total, contas únicas que engajaram).
alter table public.media_insights
  add column if not exists total_interactions int,
  add column if not exists views int;

comment on column public.media_insights.total_interactions is
  'Soma de interações (likes + comments + shares + saves) — versão agregada da API.';
comment on column public.media_insights.views is
  'Visualizações (substitui impressions em alguns contextos da v23).';
