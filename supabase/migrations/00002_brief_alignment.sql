-- ============================================================
-- 00002_brief_alignment.sql
-- Symptom: schema drifts from PROJECT BRIEF sections 4-6.
-- Cause:  00001 shipped a minimal model; the brief requires
--         upstream auth config, access tiers, per-key allowlists,
--         and the global switchboard in app_settings.
-- Rejected alternative: retrofit columns into 00001. Rejected
-- because migrations are forward-only and numbered.
-- ============================================================

-- ── profiles: add early_access role + budgets ───────────────
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('user', 'early_access', 'admin'));

alter table public.profiles
  add column if not exists monthly_budget_usd numeric(12,4),
  add column if not exists credit_balance_usd numeric(12,4) not null default 0;

-- ── api_keys: brief fields ──────────────────────────────────
alter table public.api_keys
  add column if not exists key_last_four text,
  add column if not exists allowed_model_ids text[],
  add column if not exists request_count bigint not null default 0;

-- brief statuses: active, disabled, revoked
alter table public.api_keys drop constraint if exists api_keys_status_check;
alter table public.api_keys add constraint api_keys_status_check
  check (status in ('active', 'disabled', 'revoked'));

-- ── upstreams: auth + routing config ────────────────────────
alter table public.upstreams
  add column if not exists slug text unique,
  add column if not exists chat_path text not null default '/v1/chat/completions',
  add column if not exists auth_scheme text not null default 'bearer'
    check (auth_scheme in ('bearer', 'x-api-key', 'api-key', 'header', 'query')),
  add column if not exists auth_header_name text,
  add column if not exists extra_headers jsonb not null default '{}',
  add column if not exists priority int not null default 0,
  add column if not exists timeout_ms int not null default 30000,
  add column if not exists max_key_tries int not null default 2,
  add column if not exists rotate_on_timeout boolean not null default true;

-- SSRF guard: reject loopback / private / metadata hosts before
-- an operator row can ever be used for forwarding.
create or replace function public.assert_safe_base_url()
returns trigger
language plpgsql
as $$
declare
  host text;
begin
  host := lower(split_part(split_part(new.base_url, '://', 2), '/', 1));
  host := split_part(host, ':', 1); -- strip port
  if host in ('localhost', 'metadata.google.internal') then
    raise exception 'base_url host % is not permitted', host;
  end if;
  if host ~ '^(127\.|10\.|192\.168\.|169\.254\.|0\.|::1|fc|fd|fe80)' then
    raise exception 'base_url host % is a loopback/private/link-local address', host;
  end if;
  if host ~ '^172\.(1[6-9]|2[0-9]|3[01])\.' then
    raise exception 'base_url host % is a private (172.16/12) address', host;
  end if;
  return new;
end;
$$;

drop trigger if exists upstreams_safe_base_url on public.upstreams;
create trigger upstreams_safe_base_url
  before insert or update of base_url on public.upstreams
  for each row execute function public.assert_safe_base_url();

-- ── upstream_keys: health fields ────────────────────────────
alter table public.upstream_keys
  add column if not exists status text not null default 'unknown'
    check (status in ('working', 'failing', 'rate_limited', 'expired', 'unknown')),
  add column if not exists last_checked_at timestamptz,
  add column if not exists consecutive_failures int not null default 0,
  add column if not exists timeout_count int not null default 0;

-- ── models: brief fields ────────────────────────────────────
alter table public.models
  add column if not exists display_name text,
  add column if not exists description text,
  add column if not exists capabilities text[] not null default '{}',
  add column if not exists status text not null default 'active',
  add column if not exists access_tier text not null default 'public'
    check (access_tier in ('public', 'early_access')),
  add column if not exists sort_order int not null default 0,
  add column if not exists timeout_ms int;

-- prices are per 1M tokens per the brief; rename for clarity
alter table public.models rename column input_price to input_price_per_million;
alter table public.models rename column output_price to output_price_per_million;

-- ── public_models view: join upstreams, definer view ───────
-- The brief warns: a security_invoker view applies RLS on the
-- underlying tables, so anon gets a silent empty array.
-- security_invoker = off makes it a definer view; grant to anon.
drop view if exists public.public_models;
create view public.public_models
  with (security_invoker = off)
as
  select
    m.public_id,
    m.display_name,
    m.description,
    m.model_type,
    m.context_length,
    m.input_price_per_million,
    m.output_price_per_million,
    m.capabilities,
    m.access_tier,
    m.sort_order
  from public.models m
  join public.upstreams u on u.id = m.upstream_id
  where m.is_active = true
    and m.status = 'active'
    and u.is_active = true
  order by m.sort_order asc, m.public_id asc;

grant select on public.public_models to anon;

-- ── app_settings: the global switchboard ────────────────────
alter table public.app_settings
  add column if not exists failover_enabled boolean not null default true,
  add column if not exists max_failover_hops int not null default 3,
  add column if not exists default_timeout_ms int not null default 30000,
  add column if not exists credits_enforced boolean not null default true,
  add column if not exists overdraft_limit_usd numeric(12,4) not null default 0,
  add column if not exists global_rpm_ceiling int not null default 600,
  add column if not exists per_ip_rpm_ceiling int not null default 120,
  add column if not exists spend_window_minutes int not null default 60,
  add column if not exists spend_window_limit_usd numeric(12,4);

-- ── request_logs: brief fields ──────────────────────────────
alter table public.request_logs
  add column if not exists upstream_key_id uuid references public.upstream_keys(id) on delete set null,
  add column if not exists ok boolean,
  add column if not exists error_code text,
  add column if not exists failover_count int not null default 0;

-- client_ip should be inet per the brief
alter table public.request_logs
  alter column client_ip type inet using client_ip::inet;

-- ── authenticate_key RPC: one round trip, brief fields ──────
-- Returns no row when the key is inactive AND its owner is also
-- inactive, so a client looping on a dead key does not fill logs.
drop function if exists public.authenticate_key(text);
create function public.authenticate_key(p_key_hash text)
returns table (
  key_id              uuid,
  profile_id          text,
  key_status          text,
  key_prefix          text,
  rpm_limit           int,
  allowed_model_ids   text[],
  budget_usd          numeric,
  spent_usd           numeric,
  expires_at          timestamptz,
  profile_role        text,
  profile_status      text,
  monthly_budget_usd  numeric,
  credit_balance_usd  numeric,
  month_spend_usd     numeric
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
    k.allowed_model_ids,
    k.budget_usd,
    k.spent_usd,
    k.expires_at,
    p.role,
    p.status,
    p.monthly_budget_usd,
    p.credit_balance_usd,
    coalesce((
      select sum(l.cost_usd)
      from public.request_logs l
      where l.api_key_id = k.id
        and l.created_at >= date_trunc('month', now())
    ), 0)
  from public.api_keys k
  join public.profiles p on p.id = k.profile_id
  where k.key_hash = p_key_hash
    -- the narrow no-log condition: dead key on a dead account
    and not (k.status <> 'active' and p.status <> 'active')
  limit 1;
$$;

-- ── keywatch support: probe schedule is external (pg_cron) ──
-- Assert: every active model has at least one active, working key.
create or replace view public.models_without_working_key
  with (security_invoker = off)
as
  select m.public_id
  from public.models m
  join public.upstreams u on u.id = m.upstream_id
  where m.is_active = true
    and m.status = 'active'
    and u.is_active = true
    and not exists (
      select 1 from public.upstream_keys uk
      where uk.upstream_id = u.id
        and uk.is_active = true
        and uk.status = 'working'
    );
