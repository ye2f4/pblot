-- ============================================================
-- Bilibili OAuth 登录支持
-- ------------------------------------------------------------
-- 为 public.profiles 增加 bilibili_openid 关联列，用于把哔哩哔哩账号
-- 与本站 Supabase 用户唯一绑定（B 站「账号授权」返回的是 per-app 的
-- openid，而非全局 mid，故以 openid 作为稳定唯一标识）。
-- ============================================================

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bilibili_openid TEXT;

-- 唯一索引（忽略 NULL），保证一个 B 站账号只能绑定一个本站用户
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_bilibili_openid
  ON profiles (bilibili_openid)
  WHERE bilibili_openid IS NOT NULL;
