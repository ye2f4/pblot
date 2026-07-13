-- ============================================
-- groups & group_members RLS 策略补充（幂等版，先删后建）
-- 修复群主转移等操作因 RLS 缺失导致的权限报错
-- ============================================

-- 1. groups 表
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "允许所有人查看群聊" ON groups;
CREATE POLICY "允许所有人查看群聊" ON groups
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "允许已认证用户创建群聊" ON groups;
CREATE POLICY "允许已认证用户创建群聊" ON groups
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "允许群主更新群聊" ON groups;
CREATE POLICY "允许群主更新群聊" ON groups
  FOR UPDATE USING (auth.uid() = owner_id)
  WITH CHECK (true);

DROP POLICY IF EXISTS "允许群主删除群聊" ON groups;
CREATE POLICY "允许群主删除群聊" ON groups
  FOR DELETE USING (auth.uid() = owner_id);

-- 2. group_members 表
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "允许所有人查看群成员" ON group_members;
CREATE POLICY "允许所有人查看群成员" ON group_members
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "允许已认证用户加入群聊" ON group_members;
CREATE POLICY "允许已认证用户加入群聊" ON group_members
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "允许用户退出群聊" ON group_members;
CREATE POLICY "允许用户退出群聊" ON group_members
  FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "允许群主移除成员" ON group_members;
CREATE POLICY "允许群主移除成员" ON group_members
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM groups
      WHERE groups.id = group_members.group_id
        AND groups.owner_id = auth.uid()
    )
  );

-- 3. messages 表
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "允许所有人查看消息" ON messages;
CREATE POLICY "允许所有人查看消息" ON messages
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "允许已认证用户发送消息" ON messages;
CREATE POLICY "允许已认证用户发送消息" ON messages
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');
