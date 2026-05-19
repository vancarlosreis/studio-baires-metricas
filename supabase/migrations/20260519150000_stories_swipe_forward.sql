-- ============================================================================
-- swipe_forward em stories (= "Próximo story" do Reportei)
-- ============================================================================
-- A IG v22+ depreciou taps_forward/taps_back/exits como métricas top-level
-- e unificou em `navigation` agregado. Pra ter os 4 separados precisa do
-- breakdown story_navigation_action_type que retorna:
--   TAP_FORWARD   → taps_forward  ("Avançar")
--   TAP_BACK      → taps_back     ("Voltar")
--   TAP_EXIT      → exits         ("Sair")
--   SWIPE_FORWARD → swipe_forward ("Próximo story")
-- ============================================================================

alter table public.stories
  add column if not exists swipe_forward integer;

comment on column public.stories.swipe_forward is
  'SWIPE_FORWARD do breakdown story_navigation_action_type — quantas pessoas avançaram pra o próximo story dessa conta.';
