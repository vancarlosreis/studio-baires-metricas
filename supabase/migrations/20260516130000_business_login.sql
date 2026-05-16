-- ============================================================================
-- Ajustes pra Business Login for Instagram (API nova, sem Facebook Page)
-- A versão nova da API permite OAuth direto com a conta IG Business,
-- sem exigir vinculação com Página do Facebook.
-- ============================================================================

-- fb_page_id e fb_page_name viram opcionais (alguns clientes ainda usam,
-- mas Business Login não exige)
alter table public.ig_accounts
  alter column fb_page_id drop not null;

comment on column public.ig_accounts.fb_page_id is
  'ID da Página Facebook vinculada. Opcional — Business Login OAuth direto não exige.';

-- Adicionar coluna pra distinguir qual método de auth foi usado
do $$
begin
  if not exists (select 1 from pg_type where typname = 'ig_auth_method') then
    create type public.ig_auth_method as enum ('business_login', 'facebook_login');
  end if;
end$$;

alter table public.ig_accounts
  add column if not exists auth_method public.ig_auth_method
    not null default 'business_login';

comment on column public.ig_accounts.auth_method is
  'business_login = OAuth direto com Instagram (recomendado). facebook_login = OAuth via Facebook (legado).';
