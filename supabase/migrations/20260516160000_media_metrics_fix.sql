-- ============================================================================
-- Métricas adicionais por mídia: novos seguidores, visitas e atividade no perfil
-- Descobertas a partir do erro 400 da API que listou as métricas suportadas
-- ============================================================================

alter table public.media_insights
  add column if not exists follows int,
  add column if not exists profile_visits int,
  add column if not exists profile_activity int,
  add column if not exists navigation int;

comment on column public.media_insights.follows is
  'Novos seguidores atribuídos a esse post (atribuição da Meta).';
comment on column public.media_insights.profile_visits is
  'Pessoas que visitaram o perfil pelo post.';
comment on column public.media_insights.profile_activity is
  'Ações realizadas no perfil pelo post (cliques em site, e-mail, etc).';
comment on column public.media_insights.navigation is
  'Taps de navegação (em carrosseis e stories).';
