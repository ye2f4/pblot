-- ============================================
-- 用户投稿系统（在线 Markdown 编辑器 -> 网站发布）
-- ============================================

-- 1. user_submissions 投稿表（投稿广场数据源）
CREATE TABLE IF NOT EXISTS user_submissions (
  id SERIAL PRIMARY KEY,
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  author_name TEXT,
  author_avatar TEXT,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  excerpt TEXT,
  tags TEXT[] DEFAULT '{}',
  cover_image TEXT,
  status TEXT DEFAULT 'published' CHECK (status IN ('draft', 'published')),
  view_count INTEGER DEFAULT 0,
  like_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_submissions_created ON user_submissions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_submissions_author ON user_submissions(author_id);
CREATE INDEX IF NOT EXISTS idx_user_submissions_status ON user_submissions(status);

-- 更新 updated_at 的触发器（可选，保持语义一致）
CREATE OR REPLACE FUNCTION set_submission_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_submission_updated ON user_submissions;
CREATE TRIGGER trigger_submission_updated
  BEFORE UPDATE ON user_submissions
  FOR EACH ROW EXECUTE FUNCTION set_submission_updated_at();

-- 2. RLS 策略
ALTER TABLE user_submissions ENABLE ROW LEVEL SECURITY;

-- 所有人可读
CREATE POLICY "允许所有人读取投稿" ON user_submissions
  FOR SELECT USING (true);

-- 已登录用户可发布投稿
CREATE POLICY "允许已登录用户发布投稿" ON user_submissions
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 作者可修改自己的投稿
CREATE POLICY "允许作者修改自己的投稿" ON user_submissions
  FOR UPDATE USING (auth.uid() = author_id)
  WITH CHECK (auth.uid() = author_id);

-- 作者可删除自己的投稿
CREATE POLICY "允许作者删除自己的投稿" ON user_submissions
  FOR DELETE USING (auth.uid() = author_id);
