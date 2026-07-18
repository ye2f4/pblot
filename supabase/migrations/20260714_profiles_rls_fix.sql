-- ============================================================
-- profiles 表：RLS 修复 + 自动建档触发器 + 历史用户补建
-- ------------------------------------------------------------
-- 解决问题：
--   1. 个人主页打不开（他人无法读取 -> RLS 缺少公开 SELECT 策略）
--   2. 异地注册资料丢失（开启邮箱验证后 signUp 无 session，
--      前端写 profiles 被 RLS 拦截 -> 无资料行）
--   3. 首页「最新用户」排序需要可靠的 created_at 时间字段
-- ============================================================

-- 0. 确保表存在（若已存在则忽略；字段用 IF NOT EXISTS 兜底补齐）
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE
);

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS username TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS nickname TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT DEFAULT '😀';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS signature TEXT DEFAULT '这家伙很懒~';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS gender TEXT DEFAULT 'unknown';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS birthday DATE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS address TEXT DEFAULT '';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS real_name TEXT DEFAULT '';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 昵称唯一（用于注册查重），忽略 NULL
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_nickname ON profiles(nickname) WHERE nickname IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username) WHERE username IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON profiles(created_at DESC);

-- ============================================================
-- 1. RLS 策略
-- ============================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 公开读取：任何人都能查看用户主页（修复「个人主页打不开」）
DROP POLICY IF EXISTS "允许所有人查看资料" ON profiles;
CREATE POLICY "允许所有人查看资料" ON profiles
  FOR SELECT USING (true);

-- 已登录用户可插入自己的资料行
DROP POLICY IF EXISTS "允许用户插入自己的资料" ON profiles;
CREATE POLICY "允许用户插入自己的资料" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- 已登录用户可更新自己的资料
DROP POLICY IF EXISTS "允许用户更新自己的资料" ON profiles;
CREATE POLICY "允许用户更新自己的资料" ON profiles
  FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- ============================================================
-- 2. 自动建档触发器（核心修复：异地注册资料丢失）
--    新用户在 auth.users 创建时，由数据库以更高权限自动建立 profiles 行，
--    不依赖前端 session / 邮箱验证状态，保证任何地方注册都必有资料行。
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  meta_username TEXT;
  meta_nickname TEXT;
BEGIN
  meta_username := NULLIF(NEW.raw_user_meta_data->>'username', '');
  meta_nickname := COALESCE(
    NULLIF(NEW.raw_user_meta_data->>'nickname', ''),
    NULLIF(NEW.raw_user_meta_data->>'preferred_username', ''),
    NULLIF(NEW.raw_user_meta_data->>'name', ''),
    meta_username,
    '新用户'
  );

  INSERT INTO public.profiles (id, username, nickname, email, avatar_url, signature, gender, real_name, created_at)
  VALUES (
    NEW.id,
    meta_username,
    meta_nickname,
    NEW.email,
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'avatar_url', ''), '😀'),
    '这家伙很懒~',
    'unknown',
    '',
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 3. 历史用户补建（修复已注册但无资料行的用户，如 FCU）
--    为所有缺失 profiles 的 auth.users 补建资料行，
--    并用 auth.users.created_at 回填时间，保证「最新用户」排序正确。
-- ============================================================
INSERT INTO public.profiles (id, username, nickname, email, avatar_url, signature, gender, real_name, created_at)
SELECT
  u.id,
  NULLIF(u.raw_user_meta_data->>'username', ''),
  COALESCE(
    NULLIF(u.raw_user_meta_data->>'nickname', ''),
    NULLIF(u.raw_user_meta_data->>'preferred_username', ''),
    NULLIF(u.raw_user_meta_data->>'name', ''),
    NULLIF(u.raw_user_meta_data->>'username', ''),
    '新用户'
  ),
  u.email,
  '😀',
  '这家伙很懒~',
  'unknown',
  '',
  u.created_at
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL;

-- 回填已存在但 created_at 为空的资料行时间
UPDATE public.profiles p
SET created_at = u.created_at
FROM auth.users u
WHERE p.id = u.id AND p.created_at IS NULL;
