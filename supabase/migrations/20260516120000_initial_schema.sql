-- ============================================================================
-- Studio Baires Métricas — Schema inicial
-- Model: single-user. user_id = auth.uid() em todas as tabelas owner.
-- RLS habilitado em todas as tabelas.
-- Tokens OAuth criptografados na aplicação (AES-256-GCM) antes de inserir.
-- ============================================================================

-- ============================================================================
-- 1. ig_accounts — Contas Instagram conectadas via OAuth Meta
-- ============================================================================
create table public.ig_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

  -- Identificação no Instagram
  ig_user_id text not null,
  ig_username text not null,
  ig_account_name text,
  ig_profile_picture_url text,

  -- Facebook Page (necessário pra Graph API)
  fb_page_id text not null,
  fb_page_name text,

  -- OAuth tokens (criptografados via AES-256-GCM)
  access_token_encrypted bytea not null,
  token_expires_at timestamptz,

  -- Status
  is_active boolean not null default true,
  connected_at timestamptz not null default now(),
  last_synced_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (user_id, ig_user_id)
);

create index ig_accounts_user_id_idx on public.ig_accounts (user_id);

comment on table public.ig_accounts is
  'Contas Instagram conectadas via OAuth Meta. Tokens long-lived (60 dias) criptografados na aplicação antes de inserir.';
comment on column public.ig_accounts.access_token_encrypted is
  'Long-lived token criptografado com AES-256-GCM. Layout: iv(12) | tag(16) | ciphertext';

-- ============================================================================
-- 2. account_snapshots — Métricas diárias agregadas
-- ============================================================================
create table public.account_snapshots (
  id uuid primary key default gen_random_uuid(),
  ig_account_id uuid not null references public.ig_accounts(id) on delete cascade,
  snapshot_date date not null,

  followers_count int,
  follows_count int,
  media_count int,

  -- Insights (requer permission instagram_manage_insights)
  reach int,
  impressions int,
  profile_views int,
  website_clicks int,

  raw_payload jsonb,
  created_at timestamptz not null default now(),

  unique (ig_account_id, snapshot_date)
);

create index account_snapshots_account_date_idx
  on public.account_snapshots (ig_account_id, snapshot_date desc);

comment on table public.account_snapshots is
  'Snapshot diário de métricas agregadas. Um por (ig_account_id, snapshot_date).';

-- ============================================================================
-- 3. media — Posts, Reels, Stories sincronizados
-- ============================================================================
create type public.media_kind as enum (
  'IMAGE', 'VIDEO', 'CAROUSEL_ALBUM', 'REELS', 'STORY'
);

create table public.media (
  id uuid primary key default gen_random_uuid(),
  ig_account_id uuid not null references public.ig_accounts(id) on delete cascade,

  ig_media_id text not null,
  kind public.media_kind not null,
  caption text,
  permalink text,
  media_url text,
  thumbnail_url text,

  posted_at timestamptz not null,
  expires_at timestamptz, -- Stories: posted_at + 24h

  raw_payload jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (ig_account_id, ig_media_id)
);

create index media_account_posted_idx on public.media (ig_account_id, posted_at desc);
create index media_kind_idx on public.media (kind);

comment on table public.media is
  'Posts/Reels/Stories sincronizados. Stories preservam dados mesmo após expirar na API.';

-- ============================================================================
-- 4. media_insights — Métricas por mídia (snapshots históricos)
-- ============================================================================
create table public.media_insights (
  id uuid primary key default gen_random_uuid(),
  media_id uuid not null references public.media(id) on delete cascade,
  snapshot_at timestamptz not null default now(),

  -- Engagement
  likes int,
  comments int,
  saves int,
  shares int,

  -- Alcance
  reach int,
  impressions int,

  -- Reels
  plays int,
  video_views int,

  -- Stories
  exits int,
  taps_forward int,
  taps_back int,
  replies int,

  raw_payload jsonb,
  created_at timestamptz not null default now()
);

create index media_insights_media_snapshot_idx
  on public.media_insights (media_id, snapshot_at desc);

comment on table public.media_insights is
  'Snapshots históricos de métricas por mídia. Permite acompanhar engajamento ao longo do tempo.';

-- ============================================================================
-- 5. sync_jobs — Log de sincronizações
-- ============================================================================
create type public.sync_status as enum ('pending', 'running', 'success', 'failed');
create type public.sync_kind as enum (
  'account_profile', 'account_insights', 'media_list', 'media_insights', 'stories'
);

create table public.sync_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  ig_account_id uuid references public.ig_accounts(id) on delete cascade,

  kind public.sync_kind not null,
  status public.sync_status not null default 'pending',

  started_at timestamptz,
  finished_at timestamptz,
  error_message text,
  metadata jsonb,

  created_at timestamptz not null default now()
);

create index sync_jobs_user_created_idx on public.sync_jobs (user_id, created_at desc);
create index sync_jobs_account_created_idx on public.sync_jobs (ig_account_id, created_at desc);

comment on table public.sync_jobs is
  'Log de sincronizações pra debugging e observabilidade.';

-- ============================================================================
-- 6. reports — Relatórios PDF gerados
-- ============================================================================
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  ig_account_id uuid not null references public.ig_accounts(id) on delete cascade,

  title text not null,
  period_start date not null,
  period_end date not null,

  pdf_path text, -- Path no Supabase Storage
  generated_at timestamptz not null default now(),

  created_at timestamptz not null default now()
);

create index reports_user_generated_idx on public.reports (user_id, generated_at desc);

comment on table public.reports is
  'Relatórios PDF gerados. PDF físico mora no Supabase Storage (bucket "reports").';

-- ============================================================================
-- Triggers: updated_at automático
-- ============================================================================
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_ig_accounts_updated_at
  before update on public.ig_accounts
  for each row execute function public.set_updated_at();

create trigger trg_media_updated_at
  before update on public.media
  for each row execute function public.set_updated_at();

-- ============================================================================
-- Row-Level Security
-- ============================================================================
alter table public.ig_accounts        enable row level security;
alter table public.account_snapshots  enable row level security;
alter table public.media              enable row level security;
alter table public.media_insights     enable row level security;
alter table public.sync_jobs          enable row level security;
alter table public.reports            enable row level security;

-- ig_accounts: dono direto
create policy "users manage own ig_accounts"
  on public.ig_accounts for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- account_snapshots: dono via ig_accounts
create policy "users manage own account_snapshots"
  on public.account_snapshots for all
  to authenticated
  using (
    ig_account_id in (
      select id from public.ig_accounts where user_id = auth.uid()
    )
  )
  with check (
    ig_account_id in (
      select id from public.ig_accounts where user_id = auth.uid()
    )
  );

-- media: dono via ig_accounts
create policy "users manage own media"
  on public.media for all
  to authenticated
  using (
    ig_account_id in (
      select id from public.ig_accounts where user_id = auth.uid()
    )
  )
  with check (
    ig_account_id in (
      select id from public.ig_accounts where user_id = auth.uid()
    )
  );

-- media_insights: dono via media → ig_accounts
create policy "users manage own media_insights"
  on public.media_insights for all
  to authenticated
  using (
    media_id in (
      select m.id from public.media m
      join public.ig_accounts a on a.id = m.ig_account_id
      where a.user_id = auth.uid()
    )
  )
  with check (
    media_id in (
      select m.id from public.media m
      join public.ig_accounts a on a.id = m.ig_account_id
      where a.user_id = auth.uid()
    )
  );

-- sync_jobs: dono direto
create policy "users manage own sync_jobs"
  on public.sync_jobs for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- reports: dono direto
create policy "users manage own reports"
  on public.reports for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
