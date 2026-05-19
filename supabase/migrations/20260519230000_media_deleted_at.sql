-- ============================================================================
-- deleted_at em media + stories — detecta posts excluídos no IG
-- ============================================================================
-- A IG /me/media só retorna posts ativos. Quando um post é deletado, ele
-- some da resposta da API, mas continua no nosso banco (pq foi sincronizado
-- antes). Sem essa coluna, ele continua aparecendo no dashboard.
--
-- Estratégia: durante o sync, comparamos IDs vindos da Meta com IDs no banco.
-- Os que estavam no banco e não vieram = deletados → marcamos deleted_at.
-- Queries filtram deleted_at IS NULL.
-- ============================================================================

alter table public.media
  add column if not exists deleted_at timestamptz;

create index if not exists media_active_idx
  on public.media (ig_account_id, posted_at desc)
  where deleted_at is null;

comment on column public.media.deleted_at is
  'Timestamp de quando detectamos que o post foi excluído do IG (não retornou no /me/media). NULL = ativo.';

alter table public.stories
  add column if not exists deleted_at timestamptz;

comment on column public.stories.deleted_at is
  'Stories expiram em 24h naturalmente — mas se forem excluídos antes disso, marca aqui.';
