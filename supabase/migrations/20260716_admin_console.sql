-- ============================================================
-- 后台管理控制台 - 数据库结构
-- 执行方式：Supabase Dashboard -> SQL Editor -> 粘贴全部 -> Run
-- 可重复执行（IF NOT EXISTS + policy 先删后建，幂等）
-- ============================================================

-- 1) 站点动态配置表：公开只读（首页 Provider 拉取），禁止匿名写
create table if not exists public.site_config (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now()
);

comment on table public.site_config is '后台可改的站点动态参数，按点路径(key)存储，前端合并进 siteData';

alter table public.site_config enable row level security;

drop policy if exists "site_config public read" on public.site_config;
create policy "site_config public read"
  on public.site_config for select
  to anon, authenticated
  using (true);

-- 匿名/认证用户一律不可写，仅 service_role（Edge Function）可写
drop policy if exists "site_config no anon write" on public.site_config;
create policy "site_config no anon write"
  on public.site_config for all
  to anon, authenticated
  using (false) with check (false);

-- 2) 管理密码哈希表：仅 service_role 可见，禁用任何匿名/认证访问
create table if not exists public.admin_secrets (
  id            int primary key default 1,
  password_hash text not null,
  salt          text not null,
  updated_at    timestamptz not null default now()
);

comment on table public.admin_secrets is '后台管理密码的 PBKDF2 哈希与盐，仅 service_role 可读写';

alter table public.admin_secrets enable row level security;

drop policy if exists "admin_secrets sealed" on public.admin_secrets;
create policy "admin_secrets sealed"
  on public.admin_secrets for all
  to anon, authenticated
  using (false) with check (false);
