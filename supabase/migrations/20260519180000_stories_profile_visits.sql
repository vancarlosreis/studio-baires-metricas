-- ============================================================================
-- profile_visits em stories
-- ============================================================================
-- O Reportei mostra "Visitas ao perfil" usando `profile_visits` (métrica
-- documentada da IG Stories Insights). Estávamos usando `profile_activity`
-- que vem zero pra maioria dos casos. Adiciona coluna dedicada.
-- ============================================================================

alter table public.stories
  add column if not exists profile_visits integer;

comment on column public.stories.profile_visits is
  'Visitas ao perfil oriundas desse story. Reportei chama de "Visitas ao perfil".';
