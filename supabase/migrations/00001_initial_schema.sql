-- Vanguard Gateway schema
-- Run inside Supabase SQL editor or as a migration

-- Enable required extensions
create extension if not exists pgcrypto;

-- ============================================================
-- profiles
-- ============================================================
create table if not exists public.profiles (
  id          text primary key,            -- Firebase UID
  email       text not null,
  display_name text,
  role        text not null default 'user' check (role in ('user', 'admin')),
  status      text not null default 'active' check (status in ('active', 'suspended')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can read own profile"
  on public.profiles for select
  using (auth.uid()::text = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid()::text = id)
  with check (auth.uid()::text = id);

create policy "Admins can read all profiles"
  on public.profiles for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()::text and p.role = 'admin'
    )
  );

-- ============================================================
-- api_keys
-- ============================================================
create table if not exists public.api_keys (
  id          uuid primary key default gen_random_uuid(),
  profile_id  text not null references public.profiles(id) on delete cascade,
  name        text not null default 'Default',
  key_hash    text not null unique,
  key_prefix  text not null,              -- first 8 chars of vg_live_...
  status      text not null default 'active' check (status in ('active', 'disabled', 'expired')),
  expires_at  timestamptz,
  rpm_limit   int,                         -- requests per minute
  budget_usd  numeric(12,4),               -- monthly budget cap
  spent_usd   numeric(12,4) not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.api_keys enable row level security;

create policy "Users can read own keys"
  on public.api_keys for select
  using (profile_id = auth.uid()::text);

create policy "Users can insert own keys"
  on public.api_keys for insert
  with check (profile_id = auth.uid()::text);

create policy "Users can update own keys"
  on public.api_keys for update
  using (profile_id = auth.uid()::text);

-- ============================================================
-- upstreams  (providers: openai, anthropic, google, etc.)
-- ============================================================
create table if not exists public.upstreams (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,        -- e.g. 'openai', 'anthropic'
  base_url    text not null,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

alter table public.upstreams enable row level security;
-- No anon read. Admin-only via service_role or RPC.

create policy "Admins can manage upstreams"
  on public.upstreams for all
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()::text and p.role = 'admin'
    )
  );

-- ============================================================
-- upstream_keys
-- ============================================================
create table if not exists public.upstream_keys (
  id            uuid primary key default gen_random_uuid(),
  upstream_id   uuid not null references public.upstreams(id) on delete cascade,
  key_encrypted text not null,             -- encrypted at rest by edge function
  label         text,
  is_active     boolean not null default true,
  cooldown_until timestamptz,
  budget_usd    numeric(12,4),
  spent_usd     numeric(12,4) not null default 0,
  created_at    timestamptz not null default now()
);

alter table public.upstream_keys enable row level security;

create policy "Admins can manage upstream_keys"
  on public.upstream_keys for all
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()::text and p.role = 'admin'
    )
  );

-- ============================================================
-- models  (public_id -> upstream mapping)
-- ============================================================
create table if not exists public.models (
  id                uuid primary key default gen_random_uuid(),
  public_id         text not null unique,   -- what the caller asks for
  upstream_id       uuid not null references public.upstreams(id) on delete cascade,
  upstream_model_id text not null,           -- real model id sent to provider
  model_type        text,                    -- chat, completion, embedding, image
  context_length    int,
  input_price       numeric(10,6),           -- per 1k tokens
  output_price      numeric(10,6),
  is_active         boolean not null default true,
  priority          int not null default 0,  -- higher = tried first
  created_at        timestamptz not null default now()
);

alter table public.models enable row level security;

create policy "Admins can manage models"
  on public.models for all
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()::text and p.role = 'admin'
    )
  );

-- ============================================================
-- public_models view  (security_invoker = off => definer view)
-- Exposes ONLY safe columns to anon role
-- ============================================================
create or replace view public.public_models
  with (security_invoker = off)
as
  select
    m.public_id,
    m.model_type,
    m.context_length,
    m.input_price,
    m.output_price
  from public.models m
  where m.is_active = true;

grant select on public.public_models to anon;

-- ============================================================
-- request_logs
-- ============================================================
create table if not exists public.request_logs (
  id              uuid primary key default gen_random_uuid(),
  api_key_id      uuid references public.api_keys(id) on delete set null,
  profile_id      text references public.profiles(id) on delete set null,
  model_public_id text,
  upstream_id     uuid references public.upstreams(id) on delete set null,
  status_code     int,
  input_tokens    int,
  output_tokens   int,
  cost_usd        numeric(12,6),
  latency_ms      int,
  client_ip       text,
  error_message   text,
  created_at      timestamptz not null default now()
);

alter table public.request_logs enable row level security;

create policy "Users can read own logs"
  on public.request_logs for select
  using (profile_id = auth.uid()::text);

create policy "Admins can read all logs"
  on public.request_logs for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()::text and p.role = 'admin'
    )
  );

-- ============================================================
-- app_settings (single-row config, id=1)
-- ============================================================
create table if not exists public.app_settings (
  id                  int primary key default 1 check (id = 1),
  site_name           text not null default 'Vanguard',
  maintenance_mode    boolean not null default false,
  default_rpm_limit   int not null default 60,
  default_budget_usd  numeric(12,4) not null default 10.0000,
  edge_secret         text,                 -- shared secret between Worker and Edge Function
  updated_at          timestamptz not null default now()
);

alter table public.app_settings enable row level security;

create policy "Admins can manage settings"
  on public.app_settings for all
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()::text and p.role = 'admin'
    )
  );

insert into public.app_settings (id) values (1) on conflict do nothing;

-- ============================================================
-- RPC: authenticate_key (called by edge function)
-- Returns profile + key info in one call
-- ============================================================
create or replace function public.authenticate_key(p_key_hash text)
returns table (
  key_id       uuid,
  profile_id   text,
  key_status   text,
  key_prefix   text,
  rpm_limit    int,
  budget_usd   numeric,
  spent_usd    numeric,
  expires_at   timestamptz,
  profile_role text,
  profile_status text
)
language sql
stable
security definer
set search_path = 'public'
as $$
  select
    k.id,
    k.profile_id,
    k.status,
    k.key_prefix,
    k.rpm_limit,
    k.budget_usd,
    k.spent_usd,
    k.expires_at,
    p.role,
    p.status
  from public.api_keys k
  join public.profiles p on p.id = k.profile_id
  where k.key_hash = p_key_hash
  limit 1;
$$;
