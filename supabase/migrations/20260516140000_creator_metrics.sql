-- ============================================================================
-- Suporte a métricas de contas Criador (MEDIA_CREATOR)
-- A Graph API tem conjuntos diferentes de métricas para BUSINESS vs CREATOR.
-- Adicionamos as métricas universais que funcionam em ambos os tipos.
-- ============================================================================

-- account_snapshots: novas métricas universais
alter table public.account_snapshots
  add column if not exists accounts_engaged int,
  add column if not exists total_interactions int,
  add column if not exists likes int,
  add column if not exists comments int,
  add column if not exists shares int,
  add column if not exists saves int;

comment on column public.account_snapshots.accounts_engaged is
  'Número de contas únicas que engajaram (curtir/comentar/salvar/compartilhar).';
comment on column public.account_snapshots.total_interactions is
  'Total de interações no período (soma de likes, comments, saves, shares).';

-- ig_accounts: rastreamos o account_type pra escolher métricas corretas
alter table public.ig_accounts
  add column if not exists account_type text;

comment on column public.ig_accounts.account_type is
  'Tipo da conta retornado pela API: BUSINESS, MEDIA_CREATOR ou similar. Determina conjunto de métricas disponíveis.';
