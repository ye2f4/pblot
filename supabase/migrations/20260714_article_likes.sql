-- ============================================
-- 文章点赞系统 数据库迁移
-- 供 src/components/Comments 点赞功能使用
-- ============================================

CREATE TABLE IF NOT EXISTS article_likes (
  id BIGSERIAL PRIMARY KEY,
  article_slug TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (article_slug, user_id)
);

CREATE INDEX IF NOT EXISTS idx_article_likes_slug ON article_likes(article_slug);

-- RLS：允许所有人读取点赞数；登录用户可对自己点赞（唯一约束防重复）
ALTER TABLE article_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "允许所有人读取点赞" ON article_likes
  FOR SELECT USING (true);

CREATE POLICY "允许登录用户点赞" ON article_likes
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "允许登录用户取消自己的点赞" ON article_likes
  FOR DELETE USING (auth.uid() = user_id);
