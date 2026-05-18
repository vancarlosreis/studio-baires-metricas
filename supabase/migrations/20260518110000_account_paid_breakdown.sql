-- ============================================================================
-- Paid breakdown via media_product_type=AD na IG Insights API
-- ============================================================================
-- Descoberta: a IG Insights API tem breakdown=media_product_type que retorna
-- AD como uma das categorias, ao lado de POST/REEL/STORY/CAROUSEL_CONTAINER.
-- Esse "AD" representa o alcance/views/interações vindo de tráfego pago,
-- sem precisar de Marketing API nem permissões em ad accounts.
--
-- Mais simples e cobre o caso de uso da agência:
-- - Funciona pra qualquer conta IG conectada
-- - Não requer ads_read scope
-- - Não requer acesso à ad account do cliente
-- - Cliente impulsiona post via app (ou via Ads Manager), o alcance/views
--   do AD entra automaticamente nesse breakdown
-- ============================================================================

alter table public.account_snapshots
  add column if not exists paid_reach integer,
  add column if not exists paid_views integer,
  add column if not exists paid_total_interactions integer,
  add column if not exists organic_reach integer,
  add column if not exists organic_views integer,
  add column if not exists organic_total_interactions integer;

comment on column public.account_snapshots.paid_reach is
  'Alcance vindo de tráfego pago (media_product_type=AD no breakdown). Subset de reach.';
comment on column public.account_snapshots.paid_views is
  'Visualizações vindas de tráfego pago. Subset de views.';
comment on column public.account_snapshots.paid_total_interactions is
  'Interações em conteúdo pago. Subset de total_interactions.';
comment on column public.account_snapshots.organic_reach is
  'Alcance orgânico = reach total - paid_reach (POST+REEL+CAROUSEL+STORY).';
comment on column public.account_snapshots.organic_views is
  'Views orgânicas = views total - paid_views.';
comment on column public.account_snapshots.organic_total_interactions is
  'Interações orgânicas = total_interactions - paid_total_interactions.';
