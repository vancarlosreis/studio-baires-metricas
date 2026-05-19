-- ============================================================================
-- OAuth 2.1 Authorization Server pro MCP
-- ============================================================================
-- Implementa OAuth 2.1 com PKCE + Dynamic Client Registration (RFC 7591)
-- pra permitir que o Claude.ai (Connectors) conecte no MCP server da plataforma.
--
-- Acesso: apenas via service role (essas tabelas NUNCA são lidas por cliente
-- autenticado via cookie). RLS habilitada com policy "deny all" pra ter
-- defense-in-depth — se alguém vazar o anon key, ainda não lê.
-- ============================================================================

-- Clients registrados dinamicamente (Claude.ai, etc)
create table public.oauth_clients (
  id uuid primary key default gen_random_uuid(),
  client_id text unique not null,
  client_name text,
  redirect_uris text[] not null,
  grant_types text[] not null default array['authorization_code', 'refresh_token'],
  response_types text[] not null default array['code'],
  token_endpoint_auth_method text not null default 'none', -- public client + PKCE
  scope text,
  created_at timestamptz not null default now()
);

comment on table public.oauth_clients is
  'OAuth clients registrados via /oauth/register (RFC 7591 Dynamic Client Registration). Public clients (sem secret) que autenticam via PKCE.';

-- Authorization codes (vida curta — 10 minutos)
create table public.oauth_authorization_codes (
  code_hash text primary key, -- SHA-256 hex do code (nunca armazena plain)
  client_id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  user_email text not null,
  redirect_uri text not null,
  scope text,
  code_challenge text not null,
  code_challenge_method text not null check (code_challenge_method in ('S256', 'plain')),
  resource text, -- audience (RFC 8707)
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index oauth_codes_expires_idx
  on public.oauth_authorization_codes (expires_at);

comment on table public.oauth_authorization_codes is
  'Authorization codes emitidos no /oauth/authorize. Single-use (used_at), vida 10min. Code armazenado como SHA-256.';

-- Access tokens
create table public.oauth_access_tokens (
  token_hash text primary key, -- SHA-256 hex do token
  client_id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  user_email text not null,
  scope text,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  last_used_at timestamptz,
  created_at timestamptz not null default now()
);

create index oauth_tokens_user_idx
  on public.oauth_access_tokens (user_id) where revoked_at is null;
create index oauth_tokens_expires_idx
  on public.oauth_access_tokens (expires_at) where revoked_at is null;

comment on table public.oauth_access_tokens is
  'Access tokens emitidos no /oauth/token. Token armazenado como SHA-256. Validar com lookup por hash.';

-- Refresh tokens
create table public.oauth_refresh_tokens (
  token_hash text primary key,
  access_token_hash text references public.oauth_access_tokens(token_hash) on delete cascade,
  client_id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  user_email text not null,
  scope text,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

comment on table public.oauth_refresh_tokens is
  'Refresh tokens — emitidos junto com access_token. Trocados em /oauth/token grant_type=refresh_token. Quando usado, gera novo par e revoga o anterior (rotação).';

-- RLS: deny all pra authenticated/anon. Acesso só via service role.
alter table public.oauth_clients enable row level security;
alter table public.oauth_authorization_codes enable row level security;
alter table public.oauth_access_tokens enable row level security;
alter table public.oauth_refresh_tokens enable row level security;

-- Sem policies = ninguém acessa via anon/authenticated.
-- Service role bypassa RLS automaticamente.
