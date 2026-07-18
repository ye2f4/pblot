-- ============================================================
-- 后台审核增强：用户投稿审核 + 友链管理
-- 可重复执行（幂等）
-- ============================================================

-- ------------------------------------------------------------
-- 1) 扩展 user_submissions：增加审核状态流转、置顶、审核备注
-- ------------------------------------------------------------

-- 原有 CHECK 仅允许 draft/published，扩展为 4 态
ALTER TABLE user_submissions
  DROP CONSTRAINT IF EXISTS user_submissions_status_check;

ALTER TABLE user_submissions
  ADD CONSTRAINT user_submissions_status_check
  CHECK (status IN ('draft', 'pending', 'published', 'rejected'));

-- 投稿审核相关字段
ALTER TABLE user_submissions
  ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE user_submissions
  ADD COLUMN IF NOT EXISTS review_note TEXT;

ALTER TABLE user_submissions
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_user_submissions_pinned
  ON user_submissions (is_pinned, created_at DESC);

-- ------------------------------------------------------------
-- 2) friend_links 友链表（前台友链页数据源，后台可管理）
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.friend_links (
  id           SERIAL PRIMARY KEY,
  name         TEXT NOT NULL,
  url          TEXT NOT NULL,
  avatar       TEXT,
  description  TEXT,
  tag          TEXT DEFAULT '朋友',          -- 分组：朋友 / 技术 / 组织…
  sort_order   INTEGER NOT NULL DEFAULT 0,
  is_approved  BOOLEAN NOT NULL DEFAULT TRUE, -- 默认通过；如走申请审核可置 false
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.friend_links IS '站点友链，前台按 tag 分组展示，后台可增删改与启停';

CREATE INDEX IF NOT EXISTS idx_friend_links_sort ON public.friend_links (sort_order, id);
CREATE INDEX IF NOT EXISTS idx_friend_links_approved ON public.friend_links (is_approved);

-- 更新 updated_at
CREATE OR REPLACE FUNCTION set_friend_link_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_friend_link_updated ON public.friend_links;
CREATE TRIGGER trigger_friend_link_updated
  BEFORE UPDATE ON public.friend_links
  FOR EACH ROW EXECUTE FUNCTION set_friend_link_updated_at();

-- RLS
ALTER TABLE public.friend_links ENABLE ROW LEVEL SECURITY;

-- 公开可读已通过友链
DROP POLICY IF EXISTS "友链公开读取已通过" ON public.friend_links;
CREATE POLICY "友链公开读取已通过"
  ON public.friend_links FOR SELECT
  USING (is_approved = TRUE);

-- 匿名/认证用户不可写，仅 service_role（Edge Function）可写
DROP POLICY IF EXISTS "友链禁止匿名写" ON public.friend_links;
CREATE POLICY "友链禁止匿名写"
  ON public.friend_links FOR ALL
  TO anon, authenticated
  USING (FALSE) WITH CHECK (FALSE);
