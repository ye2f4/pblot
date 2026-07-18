-- ============================================================
-- 全站灾害/应急预警 - 数据表
-- 执行：Supabase Dashboard -> SQL Editor -> 粘贴 -> Run
-- ============================================================

create table if not exists public.site_warnings (
  id           text primary key default gen_random_uuid()::text,
  type         text not null,                 -- earthquake | weather | airdrill | nuclear | other
  level        text not null default 'blue',  -- red | orange | yellow | blue
  region       text,
  title        text not null,
  message      text,
  source       text,
  is_active    boolean not null default true,
  is_auto      boolean not null default false,
  published_at timestamptz not null default now(),
  expires_at   timestamptz,
  created_by   text
);

comment on table public.site_warnings is '全站应急预警：地震/气象/防空/核应急等，公开读、仅 service_role 写';

create index if not exists idx_site_warnings_active
  on public.site_warnings (is_active, published_at desc);

alter table public.site_warnings enable row level security;

drop policy if exists "site_warnings public read" on public.site_warnings;
create policy "site_warnings public read"
  on public.site_warnings for select
  to anon, authenticated
  using (true);

-- 匿名/认证用户一律不可写，仅 service_role（Edge Function）可写
drop policy if exists "site_warnings no anon write" on public.site_warnings;
create policy "site_warnings no anon write"
  on public.site_warnings for all
  to anon, authenticated
  using (false) with check (false);
