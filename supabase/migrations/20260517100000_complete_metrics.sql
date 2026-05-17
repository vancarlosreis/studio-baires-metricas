-- ============================================================================
-- Expansão de métricas pra cobrir dashboard completo do Instagram
-- Adapta-se à v22 da Graph API: `views` substitui impressions/plays/video_views
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. account_snapshots: novas métricas universais
-- ----------------------------------------------------------------------------
alter table public.account_snapshots
  add column if not exists views int,                  -- substitui impressions
  add column if not exists follower_count_delta int,   -- crescimento líquido no período
  add column if not exists profile_links_taps int,     -- substitui website_clicks
  add column if not exists likes int,
  add column if not exists comments int,
  add column if not exists shares int,
  add column if not exists saves int,
  add column if not exists replies int,
  add column if not exists online_followers jsonb;     -- {hora: count} pra heatmap

comment on column public.account_snapshots.views is
  'Views totais (substitui impressions na v22+). Inclui posts + stories + reels.';
comment on column public.account_snapshots.profile_links_taps is
  'Cliques nos botões do perfil (e-mail, telefone, site, rota). Substitui website_clicks.';
comment on column public.account_snapshots.online_followers is
  'JSON {hora_0..hora_23: count} pra montar gráficos de melhor horário/dia de postagem.';

-- ----------------------------------------------------------------------------
-- 2. media_insights: adicionar `views` (v22+)
-- ----------------------------------------------------------------------------
-- (a coluna `views` já foi adicionada na migration anterior; só garantimos comment)
comment on column public.media_insights.views is
  'Views da mídia (v22+, substitui impressions/plays/video_views).';

-- ----------------------------------------------------------------------------
-- 3. audience_demographics: nova tabela
-- ----------------------------------------------------------------------------
-- Snapshot semanal/mensal de quem segue, quem alcançou, quem engajou.
-- Cada linha é (audience_type, breakdown_type, snapshot_date).
-- Os valores ficam em `breakdown_values` como JSON {chave: count}.

create type public.audience_type as enum (
  'follower',   -- quem segue a conta
  'reached',    -- quem foi alcançado no período
  'engaged'     -- quem engajou (curtir/comentar/salvar/share)
);

create type public.demographic_breakdown as enum (
  'age',        -- 13-17, 18-24, 25-34, 35-44, 45-54, 55-64, 65+
  'gender',     -- M, F, U
  'city',       -- "São Paulo, São Paulo"
  'country'     -- BR, US, AR, etc
);

create table public.audience_demographics (
  id uuid primary key default gen_random_uuid(),
  ig_account_id uuid not null references public.ig_accounts(id) on delete cascade,
  snapshot_date date not null,
  audience_type public.audience_type not null,
  breakdown public.demographic_breakdown not null,

  -- {chave_breakdown: contagem} — ex: {"18-24": 234, "25-34": 412, ...}
  breakdown_values jsonb not null default '{}'::jsonb,

  raw_payload jsonb,
  created_at timestamptz not null default now(),

  unique (ig_account_id, snapshot_date, audience_type, breakdown)
);

create index audience_demographics_account_idx
  on public.audience_demographics (ig_account_id, snapshot_date desc);

comment on table public.audience_demographics is
  'Snapshot de demografia: quem segue/alcança/engaja, por idade/gênero/cidade/país. Requer conta com 100+ seguidores.';

-- ----------------------------------------------------------------------------
-- 4. stories: nova tabela
-- ----------------------------------------------------------------------------
-- Stories expiram em 24h na API. Precisamos preservar o snapshot antes de
-- expirarem (cron 4-6h). Estrutura simples — uma linha por story sincronizado.

create table public.stories (
  id uuid primary key default gen_random_uuid(),
  ig_account_id uuid not null references public.ig_accounts(id) on delete cascade,

  ig_media_id text not null,
  caption text,
  permalink text,
  media_url text,
  thumbnail_url text,
  media_type text,                                       -- IMAGE, VIDEO

  posted_at timestamptz not null,
  expires_at timestamptz,                                 -- posted_at + 24h

  -- Insights coletados antes de expirar
  reach int,
  views int,                                              -- substitui impressions
  replies int,
  shares int,
  total_interactions int,
  taps_forward int,
  taps_back int,
  exits int,
  navigation int,
  profile_activity int,

  raw_payload jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (ig_account_id, ig_media_id)
);

create index stories_account_posted_idx
  on public.stories (ig_account_id, posted_at desc);

create trigger trg_stories_updated_at
  before update on public.stories
  for each row execute function public.set_updated_at();

comment on table public.stories is
  'Stories sincronizados. Endpoint /me/stories só retorna ativos (24h), por isso preservamos aqui.';

-- ----------------------------------------------------------------------------
-- 5. RLS pras novas tabelas
-- ----------------------------------------------------------------------------
alter table public.audience_demographics enable row level security;
alter table public.stories enable row level security;

create policy "users manage own audience_demographics"
  on public.audience_demographics for all
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

create policy "users manage own stories"
  on public.stories for all
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
