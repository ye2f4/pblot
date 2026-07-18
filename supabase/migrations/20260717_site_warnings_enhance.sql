-- ============================================================
-- 预警表增强：核打击(爆心经纬度/预计来袭时间/避险建议) + 防空警报子类型
-- 在 20260717_site_warnings.sql 建表之后执行（ALTER 已存在表，安全幂等）
-- 执行：Supabase Dashboard -> SQL Editor -> 粘贴 -> Run
-- ============================================================

alter table if exists public.site_warnings
  add column if not exists lat        numeric,        -- 爆心/空袭中心纬度
  add column if not exists lng        numeric,        -- 爆心/空袭中心经度
  add column if not exists impact_at  timestamptz,    -- 预计来袭时间（用于倒计时）
  add column if not exists subtype    text,           -- 防空警报子类型 pre|air|allclear
  add column if not exists shelter    text;           -- 避险建议（多行，留空则用默认）

comment on column public.site_warnings.lat is '爆心/空袭中心纬度（核打击/防空）';
comment on column public.site_warnings.lng is '爆心/空袭中心经度（核打击/防空）';
comment on column public.site_warnings.impact_at is '预计来袭时间，前端据此做倒计时';
comment on column public.site_warnings.subtype is '防空警报子类型：pre 预先 / air 空袭 / allclear 解除';
comment on column public.site_warnings.shelter is '避险建议（多行文本）';
