-- ============================================
-- 启用 messages 表的 Realtime 广播
-- 修复「聊天消息提醒 / 未读红点 / 实时刷新」完全收不到新消息的问题
-- 原因：客户端虽用了 supabase.channel().on('postgres_changes', { table:'messages' })，
--       但数据库端 supabase_realtime publication 里从未加入 messages 表，
--       postgres_changes 因此永远收不到 INSERT 事件。
-- ============================================

-- 1. 将 messages 表加入 Realtime publication（幂等，已存在则跳过）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'messages'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE messages';
  END IF;
END $$;

-- 2. 设置 REPLICA IDENTITY FULL
--    对 INSERT 监听非必需，但能保证 UPDATE/DELETE（如消息撤回、编辑）也能拿到完整行，
--    避免实时更新 / 撤回消息时丢失字段。
ALTER TABLE messages REPLICA IDENTITY FULL;
