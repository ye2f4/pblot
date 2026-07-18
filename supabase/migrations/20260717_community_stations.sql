-- 社区 / 机构共享地震台站网络
-- 数据来自 Raspberry Shake 社区（个人共享地震仪）+ EarthScope / IRIS 机构台网，
-- 由 supabase/functions/fetch-shakenet 定期拉取 FDSN station 文本并写入本表。
create table if not exists public.community_stations (
  id           text primary key,                 -- network_station，全局唯一
  network      text not null,
  station      text not null,
  source       text not null,                    -- 'raspberryshake' | 'earthscope'
  name         text,                             -- 台站名称 / 地点
  lat          double precision,
  lng          double precision,
  elevation    double precision,
  start_time   timestamptz,
  end_time     timestamptz,                       -- 空 = 当前仍活跃
  is_active    boolean default true,
  last_synced  timestamptz default now()
);

create index if not exists idx_community_stations_source  on public.community_stations (source);
create index if not exists idx_community_stations_active  on public.community_stations (is_active);
create index if not exists idx_community_stations_geo     on public.community_stations (lat, lng);

-- 公开可读（前端用 anon key 展示地图）
alter table public.community_stations enable row level security;

drop policy if exists "community_stations_public_read" on public.community_stations;
create policy "community_stations_public_read"
  on public.community_stations
  for select
  using (true);

grant select on public.community_stations to anon, authenticated;
