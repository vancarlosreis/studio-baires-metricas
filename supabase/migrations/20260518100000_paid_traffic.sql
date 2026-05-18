-- ============================================================================
-- Tráfego pago: Marketing API integration
-- ============================================================================
-- Objetivo: separar métricas de engajamento entre orgânico e pago.
--
-- Como funciona:
-- 1. Cada ig_account pode ter N fb_ad_accounts vinculadas (via Business Manager).
-- 2. Pra cada ad rodando, a Marketing API retorna reach/impressions/clicks/spend.
-- 3. Cada ad referencia uma mídia IG via `creative.object_story_id` (boosted
--    post) ou via `instagram_permalink_url`. Cruzamos pra agregar paid_* por
--    media_id.
-- 4. Orgânico = Total (do media_insights) − Pago (do media_paid_insights).
--
-- Requer escopo `ads_read` no token Facebook do usuário (adicionado em
-- src/lib/instagram/oauth-fb.ts). Contas conectadas antes desta migration
-- precisam re-conectar pra obter o escopo novo.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Ad accounts (contas de anúncios do Meta Business Manager)
-- ----------------------------------------------------------------------------
create table public.fb_ad_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  ig_account_id uuid not null references public.ig_accounts(id) on delete cascade,
  fb_ad_account_id text not null, -- "act_XXXXXXXXXXXX"
  name text,
  currency text,
  timezone_name text,
  account_status integer, -- 1 ativo, 2 desativado, 3 pendente, etc
  is_active boolean not null default true,
  connected_at timestamptz not null default now(),
  last_synced_at timestamptz,
  raw_payload jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (ig_account_id, fb_ad_account_id)
);

create index fb_ad_accounts_ig_account_id_idx on public.fb_ad_accounts(ig_account_id);
create index fb_ad_accounts_user_id_idx on public.fb_ad_accounts(user_id);

create trigger fb_ad_accounts_set_updated_at
  before update on public.fb_ad_accounts
  for each row execute function public.set_updated_at();

comment on table public.fb_ad_accounts is
  'Ad accounts do Meta Business Manager vinculadas a uma ig_account. Uma IG pode ter várias ad accounts (ex: uma por cliente).';

-- ----------------------------------------------------------------------------
-- 2. Insights pagos agregados por mídia
-- ----------------------------------------------------------------------------
-- Por design, INSERT (não upsert) — guardamos histórico de snapshots.
-- Pra ler "valor atual" agregar pelo snapshot_at mais recente em cada media.
create table public.media_paid_insights (
  id uuid primary key default gen_random_uuid(),
  media_id uuid not null references public.media(id) on delete cascade,
  snapshot_at timestamptz not null default now(),
  -- Métricas agregadas (soma de todos os ads que referenciam essa mídia)
  paid_reach integer,
  paid_impressions integer,
  paid_clicks integer,
  paid_spend numeric(12,2), -- em moeda local (ad_account.currency)
  paid_video_views integer, -- views de vídeo via ads
  paid_engagement integer, -- engajamento via ads (likes+comments+shares+saves)
  ad_count integer, -- quantos ads ativos/passados promoveram essa mídia
  raw_payload jsonb, -- lista de ads + suas métricas pra debugging
  created_at timestamptz not null default now()
);

create index media_paid_insights_media_id_idx on public.media_paid_insights(media_id);
create index media_paid_insights_snapshot_at_idx on public.media_paid_insights(snapshot_at desc);

comment on table public.media_paid_insights is
  'Snapshot agregado das métricas pagas de uma mídia (somando todos os ads que a promoveram). Não é upsert — guardamos histórico.';

-- ----------------------------------------------------------------------------
-- 3. RLS — segue padrão de "team manages all" (allowlist hardcoded)
-- ----------------------------------------------------------------------------
alter table public.fb_ad_accounts enable row level security;
alter table public.media_paid_insights enable row level security;

create policy "team manages all fb_ad_accounts"
  on public.fb_ad_accounts for all
  to authenticated
  using (public.is_team_member())
  with check (public.is_team_member());

create policy "team manages all media_paid_insights"
  on public.media_paid_insights for all
  to authenticated
  using (public.is_team_member())
  with check (public.is_team_member());
