-- ============================================================================
-- Shared team access (allowlist no banco)
-- ============================================================================
-- Substitui as policies "users manage own X" (que filtravam por user_id)
-- por "team manages all X" usando uma allowlist de e-mails hardcoded.
--
-- Resultado: qualquer um dos e-mails listados em `is_team_member()` enxerga
-- e edita TODAS as contas conectadas, snapshots, mídias, insights,
-- demografias, stories, sync_jobs e reports — independente de quem conectou.
--
-- Sincronizar com src/lib/auth/allowlist.ts (app faz a mesma checagem em
-- 3 camadas: signin, callback e middleware). Defense in depth.
--
-- Pra adicionar/remover e-mail: edita a constante abaixo + crie migration
-- nova (DROP+CREATE da função) + sincronize allowlist.ts.
-- ============================================================================

-- Função que retorna true se o e-mail do JWT está na allowlist.
-- STABLE: o resultado não muda dentro de uma transação (otimização do planner).
-- SECURITY DEFINER NÃO é necessário aqui: auth.jwt() já roda como o caller.
create or replace function public.is_team_member()
returns boolean
language sql
stable
as $$
  select coalesce(
    (auth.jwt() ->> 'email')::text in (
      'vancarlosreis@gmail.com',
      'studiobaires.mkt@gmail.com'
    ),
    false
  );
$$;

comment on function public.is_team_member() is
  'Allowlist de e-mails que podem acessar/editar TODOS os dados do app. Sincronizar com src/lib/auth/allowlist.ts no app.';

-- ----------------------------------------------------------------------------
-- Drop policies antigas
-- ----------------------------------------------------------------------------
drop policy if exists "users manage own ig_accounts"           on public.ig_accounts;
drop policy if exists "users manage own account_snapshots"     on public.account_snapshots;
drop policy if exists "users manage own media"                 on public.media;
drop policy if exists "users manage own media_insights"        on public.media_insights;
drop policy if exists "users manage own sync_jobs"             on public.sync_jobs;
drop policy if exists "users manage own reports"               on public.reports;
drop policy if exists "users manage own audience_demographics" on public.audience_demographics;
drop policy if exists "users manage own stories"               on public.stories;

-- ----------------------------------------------------------------------------
-- Cria policies novas: time inteiro tem acesso total
-- ----------------------------------------------------------------------------
create policy "team manages all ig_accounts"
  on public.ig_accounts for all
  to authenticated
  using (public.is_team_member())
  with check (public.is_team_member());

create policy "team manages all account_snapshots"
  on public.account_snapshots for all
  to authenticated
  using (public.is_team_member())
  with check (public.is_team_member());

create policy "team manages all media"
  on public.media for all
  to authenticated
  using (public.is_team_member())
  with check (public.is_team_member());

create policy "team manages all media_insights"
  on public.media_insights for all
  to authenticated
  using (public.is_team_member())
  with check (public.is_team_member());

create policy "team manages all sync_jobs"
  on public.sync_jobs for all
  to authenticated
  using (public.is_team_member())
  with check (public.is_team_member());

create policy "team manages all reports"
  on public.reports for all
  to authenticated
  using (public.is_team_member())
  with check (public.is_team_member());

create policy "team manages all audience_demographics"
  on public.audience_demographics for all
  to authenticated
  using (public.is_team_member())
  with check (public.is_team_member());

create policy "team manages all stories"
  on public.stories for all
  to authenticated
  using (public.is_team_member())
  with check (public.is_team_member());
