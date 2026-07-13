-- ============================================
-- groups & group_members RLS 策略补充
-- 修复群主转移等操作因 RLS 缺失导致的权限报错
-- ============================================

-- 启用 groups 表 RLS（如果未启用）
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;

-- 允许所有人读取群聊
CREATE POLICY "允许所有人查看群聊" ON groups
  FOR SELECT USING (true);

-- 允许已认证用户创建群聊
CREATE POLICY "允许已认证用户创建群聊" ON groups
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 允许群主更新群聊（包括群主转移）
CREATE POLICY "允许群主更新群聊" ON groups
  FOR UPDATE USING (auth.uid() = owner_id);

-- 允许群主删除群聊（解散群聊）
CREATE POLICY "允许群主删除群聊" ON groups
  FOR DELETE USING (auth.uid() = owner_id);

-- ============================================
-- group_members RLS
-- ============================================
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;

-- 允许所有人读取群成员
CREATE POLICY "允许所有人查看群成员" ON group_members
  FOR SELECT USING (true);

-- 允许已认证用户加入群聊
CREATE POLICY "允许已认证用户加入群聊" ON group_members
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 允许群成员退出群聊（删除自己）
CREATE POLICY "允许用户退出群聊" ON group_members
  FOR DELETE USING (auth.uid() = user_id);

-- 允许群主移除群成员
CREATE POLICY "允许群主移除成员" ON group_members
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM groups
      WHERE groups.id = group_members.group_id
        AND groups.owner_id = auth.uid()
    )
  );

-- ============================================
-- messages RLS（如果缺失）
-- ============================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'messages') THEN
    -- 启用 RLS
    EXECUTE 'ALTER TABLE messages ENABLE ROW LEVEL SECURITY';

    -- 允许所有人读取消息（如果策略不存在）
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = '允许所有人查看消息' AND tablename = 'messages') THEN
      EXECUTE 'CREATE POLICY "允许所有人查看消息" ON messages FOR SELECT USING (true)';
    END IF;

    -- 允许已认证用户发送消息
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = '允许已认证用户发送消息' AND tablename = 'messages') THEN
      EXECUTE 'CREATE POLICY "允许已认证用户发送消息" ON messages FOR INSERT WITH CHECK (auth.role() = ''authenticated'')';
    END IF;
  END IF;
END;
$$ LANGUAGE plpgsql;
