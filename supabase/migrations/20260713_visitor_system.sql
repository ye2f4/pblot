-- ============================================
-- 访问统计系统 & 论坛内容系统 数据库迁移
-- ============================================

-- 1. visit_stats 访问统计表
CREATE TABLE IF NOT EXISTS visit_stats (
  id INTEGER PRIMARY KEY DEFAULT 1,
  today_visits INTEGER DEFAULT 0,
  total_visits INTEGER DEFAULT 0,
  yesterday_visits INTEGER DEFAULT 0,
  last_reset DATE DEFAULT CURRENT_DATE,
  db_latency INTEGER DEFAULT 0,
  cache_latency INTEGER DEFAULT 0,
  api_healthy BOOLEAN DEFAULT true,
  db_healthy BOOLEAN DEFAULT true,
  cache_healthy BOOLEAN DEFAULT true,
  uv_count INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 确保只有一行 id=1
INSERT INTO visit_stats (id, today_visits, total_visits, last_reset)
VALUES (1, 0, 0, CURRENT_DATE)
ON CONFLICT (id) DO NOTHING;

-- 2. online_users 在线用户表
CREATE TABLE IF NOT EXISTS online_users (
  session_id TEXT PRIMARY KEY,
  last_active TIMESTAMPTZ DEFAULT NOW(),
  user_agent TEXT,
  page_path TEXT
);

-- 在线用户索引
CREATE INDEX IF NOT EXISTS idx_online_users_last_active ON online_users(last_active);

-- 3. hourly_visits 24小时访问热力表
CREATE TABLE IF NOT EXISTS hourly_visits (
  id SERIAL PRIMARY KEY,
  stat_date DATE NOT NULL,
  hour INTEGER NOT NULL CHECK (hour >= 0 AND hour <= 23),
  count INTEGER DEFAULT 0,
  UNIQUE(stat_date, hour)
);

CREATE INDEX IF NOT EXISTS idx_hourly_visits_date ON hourly_visits(stat_date);

-- 4. visitor_locations 访客位置表（访问地图数据源）
CREATE TABLE IF NOT EXISTS visitor_locations (
  id SERIAL PRIMARY KEY,
  session_id TEXT NOT NULL,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  city TEXT,
  country TEXT,
  country_code TEXT,
  region TEXT,
  timezone TEXT,
  ip_address TEXT,
  isp TEXT,
  is_mobile BOOLEAN DEFAULT false,
  browser TEXT,
  os TEXT,
  visit_count INTEGER DEFAULT 1,
  first_visit TIMESTAMPTZ DEFAULT NOW(),
  last_active TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_visitor_locations_session ON visitor_locations(session_id);
CREATE INDEX IF NOT EXISTS idx_visitor_locations_last_active ON visitor_locations(last_active);

-- 5. forum_posts 论坛帖子表（五大按钮数据源）
CREATE TABLE IF NOT EXISTS forum_posts (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT,
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  author_name TEXT,
  author_avatar TEXT,
  category TEXT DEFAULT 'general',
  tags TEXT[] DEFAULT '{}',
  is_featured BOOLEAN DEFAULT false,
  is_pinned BOOLEAN DEFAULT false,
  view_count INTEGER DEFAULT 0,
  like_count INTEGER DEFAULT 0,
  reply_count INTEGER DEFAULT 0,
  last_reply_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 补充添加新字段（如果表已存在但缺少这些列）
ALTER TABLE forum_posts ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE forum_posts ADD COLUMN IF NOT EXISTS excerpt TEXT;
ALTER TABLE forum_posts ADD COLUMN IF NOT EXISTS content_hash TEXT;
ALTER TABLE forum_posts ADD COLUMN IF NOT EXISTS source_type TEXT DEFAULT 'manual';
ALTER TABLE forum_posts ADD COLUMN IF NOT EXISTS source_path TEXT;

-- slug 唯一索引（用于去重 upsert）
CREATE UNIQUE INDEX IF NOT EXISTS idx_forum_posts_slug ON forum_posts(slug) WHERE slug IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_forum_posts_created ON forum_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_forum_posts_featured ON forum_posts(is_featured) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_forum_posts_views ON forum_posts(view_count DESC);
CREATE INDEX IF NOT EXISTS idx_forum_posts_last_reply ON forum_posts(last_reply_at DESC NULLS LAST);

-- 6. forum_replies 论坛回复表
CREATE TABLE IF NOT EXISTS forum_replies (
  id SERIAL PRIMARY KEY,
  post_id INTEGER REFERENCES forum_posts(id) ON DELETE CASCADE,
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  author_name TEXT,
  author_avatar TEXT,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_forum_replies_post ON forum_replies(post_id);
CREATE INDEX IF NOT EXISTS idx_forum_replies_created ON forum_replies(created_at DESC);

-- 7. 更新回复计数的触发器函数
CREATE OR REPLACE FUNCTION update_post_reply_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE forum_posts
    SET reply_count = reply_count + 1,
        last_reply_at = NEW.created_at,
        updated_at = NOW()
    WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE forum_posts
    SET reply_count = GREATEST(reply_count - 1, 0),
        updated_at = NOW()
    WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_reply_count ON forum_replies;
CREATE TRIGGER trigger_update_reply_count
  AFTER INSERT OR DELETE ON forum_replies
  FOR EACH ROW EXECUTE FUNCTION update_post_reply_count();

-- 8. 每小时自动更新 hourly_visits 的 RPC 函数
CREATE OR REPLACE FUNCTION record_hourly_visit(target_hour INTEGER DEFAULT NULL)
RETURNS void AS $$
DECLARE
  h INTEGER;
BEGIN
  IF target_hour IS NULL THEN
    h := EXTRACT(HOUR FROM NOW())::INTEGER;
  ELSE
    h := target_hour;
  END IF;
  
  INSERT INTO hourly_visits (stat_date, hour, count)
  VALUES (CURRENT_DATE, h, 1)
  ON CONFLICT (stat_date, hour)
  DO UPDATE SET count = hourly_visits.count + 1;
END;
$$ LANGUAGE plpgsql;

-- 9. 获取服务器当前时间戳的 RPC
CREATE OR REPLACE FUNCTION get_current_timestamp()
RETURNS BIGINT AS $$
BEGIN
  RETURN EXTRACT(EPOCH FROM NOW())::BIGINT * 1000;
END;
$$ LANGUAGE plpgsql;

-- 10. 记录独立访客 UV
CREATE OR REPLACE FUNCTION record_unique_visitor(visitor_fingerprint TEXT)
RETURNS void AS $$
BEGIN
  -- 检查今天是否已经记录过该指纹
  PERFORM 1 FROM visitor_locations
  WHERE session_id = visitor_fingerprint
    AND last_active::date = CURRENT_DATE;
  
  IF NOT FOUND THEN
    -- 新 UV
    UPDATE visit_stats SET uv_count = uv_count + 1 WHERE id = 1;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 11. 增加帖子浏览量
CREATE OR REPLACE FUNCTION increment_post_view(post_id INTEGER)
RETURNS void AS $$
BEGIN
  UPDATE forum_posts SET view_count = COALESCE(view_count, 0) + 1 WHERE id = post_id;
END;
$$ LANGUAGE plpgsql;

-- 12. 自动清理旧在线用户（定时任务推荐使用 pg_cron）
CREATE OR REPLACE FUNCTION cleanup_expired_online_users()
RETURNS void AS $$
BEGIN
  DELETE FROM online_users WHERE last_active < NOW() - INTERVAL '10 minutes';
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- RLS 策略：允许 anon/authenticated 读写 forum_posts
-- ============================================
ALTER TABLE forum_posts ENABLE ROW LEVEL SECURITY;

-- 允许所有人读取帖子
CREATE POLICY "允许所有人读取帖子" ON forum_posts
  FOR SELECT USING (true);

-- 允许已认证用户插入帖子
CREATE POLICY "允许已认证用户插入帖子" ON forum_posts
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 允许已认证用户更新自己的帖子
CREATE POLICY "允许已认证用户更新帖子" ON forum_posts
  FOR UPDATE USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- 也允许 anon key 通过 service_role 写入（用于种子脚本）
-- 如果种子脚本使用 anon key，需要此策略
CREATE POLICY "允许 anon 写入（种子脚本用）" ON forum_posts
  FOR INSERT WITH CHECK (true);

CREATE POLICY "允许 anon 更新（种子脚本用）" ON forum_posts
  FOR UPDATE USING (true);

-- 允许所有人写入访问统计表
ALTER TABLE visit_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "允许所有人读写 visit_stats" ON visit_stats
  FOR ALL USING (true);

ALTER TABLE online_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "允许所有人读写 online_users" ON online_users
  FOR ALL USING (true);

ALTER TABLE hourly_visits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "允许所有人读写 hourly_visits" ON hourly_visits
  FOR ALL USING (true);

ALTER TABLE visitor_locations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "允许所有人读写 visitor_locations" ON visitor_locations
  FOR ALL USING (true);

-- forum_replies RLS
ALTER TABLE forum_replies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "允许所有人读取回复" ON forum_replies
  FOR SELECT USING (true);

CREATE POLICY "允许已认证用户插入回复" ON forum_replies
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "允许 anon 写入回复" ON forum_replies
  FOR INSERT WITH CHECK (true);
