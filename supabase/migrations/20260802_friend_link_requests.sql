-- ============================================================
-- 友链申请审核：用户前台提交友链申请，后台审核
-- 可重复执行（幂等）
-- ============================================================

CREATE TABLE IF NOT EXISTS public.friend_link_requests (
  id           SERIAL PRIMARY KEY,
  name         TEXT NOT NULL,
  url          TEXT NOT NULL,
  avatar       TEXT,
  description  TEXT,
  tag          TEXT DEFAULT '朋友',
  status       TEXT NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending', 'approved', 'rejected')),
  review_note  TEXT,
  reviewed_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.friend_link_requests IS '用户提交的友链申请，后台审核通过后会写入 friend_links 并展示';

CREATE INDEX IF NOT EXISTS idx_friend_link_requests_status ON public.friend_link_requests (status, created_at DESC);

CREATE OR REPLACE FUNCTION set_friend_link_request_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_friend_link_request_updated ON public.friend_link_requests;
CREATE TRIGGER trigger_friend_link_request_updated
  BEFORE UPDATE ON public.friend_link_requests
  FOR EACH ROW EXECUTE FUNCTION set_friend_link_request_updated_at();

-- RLS
ALTER TABLE public.friend_link_requests ENABLE ROW LEVEL SECURITY;

-- 公开可读：仅允许查看自己想看的（这里前台不需要读，仅后台 service_role 读；
-- 为安全起见匿名不可直接读列表，但允许匿名提交申请）
DROP POLICY IF EXISTS "友链申请匿名可提交" ON public.friend_link_requests;
CREATE POLICY "友链申请匿名可提交"
  ON public.friend_link_requests FOR INSERT
  TO anon, authenticated
  WITH CHECK (status = 'pending');

-- 匿名/认证用户不可读、不可改、不可删（仅 service_role 经 Edge Function 处理）
DROP POLICY IF EXISTS "友链申请禁止匿名读写" ON public.friend_link_requests;
CREATE POLICY "友链申请禁止匿名读写"
  ON public.friend_link_requests FOR ALL
  TO anon, authenticated
  USING (FALSE) WITH CHECK (FALSE);
