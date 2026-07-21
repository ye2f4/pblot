<<<<<<< HEAD
'use client';

import React, { useState, useEffect, useRef } from 'react';
import EmojiPicker from 'emoji-picker-react';
import { supabase } from '@/lib/supabase/client';
import { markAsRead, recordActivity, getActivityMap } from '@/lib/chatNotification';

// 固定常量
const PROFILE_PAGE = '/app/profile';
const DEFAULT_EMOJI_AVATAR = '😀';
const DEFAULT_GROUP_AVATAR = '👥';

// ========== 站长用户ID（空=未配置），自行填写数据库UUID ==========
const WEBMASTER_UID = "31452874-c41a-4e2e-a497-8b67e42ccafa";
const WEBMASTER_NAME = "联系站长";

export default function ChatPage() {
  // ========== 基础用户状态 ==========
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [myProfile, setMyProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);

  // ========== 好友/私聊相关 ==========
  const [userList, setUserList] = useState<any[]>([]);
  const [targetUser, setTargetUser] = useState<any>(null);
  const [privateMsgList, setPrivateMsgList] = useState<any[]>([]);
  const [privateTopIds, setPrivateTopIds] = useState<any[]>([]);

  // ========== 群聊相关 ==========
  const [activeTab, setActiveTab] = useState('friend');
  const [groupList, setGroupList] = useState<any[]>([]);
  const [currentGroup, setCurrentGroup] = useState<any>(null);
  const [groupMsgList, setGroupMsgList] = useState<any[]>([]);
  const [groupTopIds, setGroupTopIds] = useState<any[]>([]);
  const [showGroupSetting, setShowGroupSetting] = useState(false);
  const [groupMembers, setGroupMembers] = useState<any[]>([]);
  const [transferTargetId, setTransferTargetId] = useState('');
  const [showTransferUI, setShowTransferUI] = useState(false);
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [selectedMemberIds, setSelectedMemberIds] = useState<any[]>([]);

  // ========== 输入/表情/@ 相关 ==========
  const [searchKeyword, setSearchKeyword] = useState('');
  const [inputValue, setInputValue] = useState('');
  const [showEmojiPanel, setShowEmojiPanel] = useState(false);
  const [showAtModal, setShowAtModal] = useState(false);
  const [sending, setSending] = useState(false);

  // ========== 移动端/折叠侧边栏相关 ==========
  const [isMobile, setIsMobile] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    const check = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      setSidebarCollapsed(mobile);
    };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // DOM 引用
  const messageEndRef = useRef<any>(null);
  const inputRef = useRef<any>(null);

  const WEBMASTER_AVATAR = 'https://github.com/ye2f4.png';

  const webmasterUser = {
    id: WEBMASTER_UID,
    nickname: WEBMASTER_NAME,
    avatar_url: WEBMASTER_AVATAR,
    isWebmaster: true
  };

  // ===================== 头像渲染 =====================
  const renderAvatar = (avatarUrl: any, userId: string, size = 42, isWebmaster = false) => {
    if (isWebmaster) {
      return (
        <div style={{ width: size, height: size, borderRadius: '50%', background: 'var(--ifm-color-emphasis-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.6, flexShrink: 0, boxShadow: '0 2px 8px rgba(0,0,0,0.1)', cursor: 'pointer', userSelect: 'none' }}>
          {DEFAULT_EMOJI_AVATAR}
        </div>
      );
    }
    const isNetImage = avatarUrl && (avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://'));
    if (isNetImage) {
      return (
        <img src={avatarUrl} alt="头像" loading="lazy" style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, boxShadow: '0 2px 8px rgba(0,0,0,0.1)', cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); window.location.href = `${PROFILE_PAGE}?uid=${userId}`; }} onError={(e) => (e.target as HTMLImageElement).style.display = 'none'} />
      );
    }
    const showEmoji = avatarUrl || DEFAULT_EMOJI_AVATAR;
    return (
      <div style={{ width: size, height: size, borderRadius: '50%', background: 'var(--ifm-color-emphasis-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.6, flexShrink: 0, boxShadow: '0 2px 8px rgba(0,0,0,0.1)', cursor: 'pointer', userSelect: 'none' }} onClick={(e) => { e.stopPropagation(); window.location.href = `${PROFILE_PAGE}?uid=${userId}`; }}>
        {showEmoji}
      </div>
    );
  };

  const renderGroupAvatar = (avatarUrl: any, size = 42) => {
    const emoji = avatarUrl || DEFAULT_GROUP_AVATAR;
    return (
      <div style={{ width: size, height: size, borderRadius: '50%', background: 'var(--ifm-color-emphasis-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.6, flexShrink: 0, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
        {emoji}
      </div>
    );
  };

  // ===================== 数据请求方法 =====================
  const fetchAllUsers = async (selfUid: string) => {
    try {
      const { data, error } = await supabase.from('profiles').select('id, nickname, avatar_url').neq('id', selfUid).neq('id', WEBMASTER_UID);
      if (error) throw error;
      setUserList(data || []);
    } catch (err) {
      console.error("加载联系人失败：", err);
      setError("加载联系人失败，请刷新重试");
    }
  };

  const [allUsersForGroup, setAllUsersForGroup] = useState<any[]>([]);
  const fetchAllUsersForGroup = async (selfUid: string) => {
    try {
      const { data, error } = await supabase.from('profiles').select('id, nickname, avatar_url').neq('id', selfUid);
      if (error) throw error;
      setAllUsersForGroup(data || []);
    } catch (err) {
      console.error("加载群聊选人列表失败：", err);
    }
  };

  const fetchMyGroups = async (selfUid: string) => {
    try {
      const { data: memberData, error: memberErr } = await supabase.from('group_members').select('group_id').eq('user_id', selfUid);
      if (memberErr) throw memberErr;
      if (!memberData || memberData.length === 0) { setGroupList([]); return; }
      const groupIds = memberData.map((item: any) => item.group_id);
      const { data: groups, error: groupErr } = await supabase.from('groups').select('id, group_name, avatar_url, owner_id, is_top').in('id', groupIds).order('is_top', { ascending: false });
      if (groupErr) throw groupErr;
      setGroupList(groups || []);
      setGroupTopIds(groups.filter((g: any) => g.is_top).map((g: any) => g.id));
    } catch (err) {
      console.error("加载群聊失败：", err);
    }
  };

  const fetchPrivateMessages = async (toUserId: string) => {
    if (!currentUser || !toUserId) return;
    try {
      const { data: msgData, error: msgError } = await supabase.from('messages').select('*').is('group_id', null).or(`and(from_user_id.eq.${currentUser.id},to_user_id.eq.${toUserId}),and(from_user_id.eq.${toUserId},to_user_id.eq.${currentUser.id})`).order('created_at', { ascending: true });
      if (msgError) throw msgError;
      if (!msgData) { setPrivateMsgList([]); scrollToBottom(); return; }
      const userIds = [...new Set(msgData.map((m: any) => m.from_user_id))];
      const { data: profileData } = await supabase.from('profiles').select('id, avatar_url').in('id', userIds);
      const map: any = {};
      profileData?.forEach((p: any) => (map[p.id] = p));
      setPrivateMsgList(msgData.map((m: any) => ({ ...m, sender: map[m.from_user_id] || {} })));
      scrollToBottom();
    } catch (err) {
      console.error("加载私聊消息失败：", err);
      setError("加载聊天记录失败，请刷新重试");
    }
  };

  const fetchGroupMessages = async (groupId: string) => {
    if (!currentUser || !groupId) return;
    try {
      const { data: msgData, error: msgError } = await supabase.from('messages').select('*').eq('group_id', groupId).order('created_at', { ascending: true });
      if (msgError) throw msgError;
      if (!msgData) { setGroupMsgList([]); scrollToBottom(); return; }
      const userIds = [...new Set(msgData.map((m: any) => m.from_user_id))];
      const { data: profileData } = await supabase.from('profiles').select('id, avatar_url, nickname').in('id', userIds);
      const map: any = {};
      profileData?.forEach((p: any) => (map[p.id] = p));
      setGroupMsgList(msgData.map((m: any) => ({ ...m, sender: map[m.from_user_id] || {} })));
      scrollToBottom();
    } catch (err) {
      console.error("加载群聊消息失败：", err);
    }
  };

  const sendMessage = async () => {
    const txt = inputValue.trim();
    if (!txt || sending) return;
    if (targetUser?.isWebmaster && !WEBMASTER_UID) { setError("站长ID未配置，无法发送消息，请管理员配置站长UID"); return; }
    setSending(true);
    setError(null);
    try {
      if (activeTab === 'friend' && targetUser) {
        const { error } = await supabase.from('messages').insert([{ from_user_id: currentUser.id, to_user_id: targetUser.id, content: txt, created_at: new Date().toISOString() }]);
        if (error) throw error;
        setInputValue('');
        fetchPrivateMessages(targetUser.id);
      } else if (activeTab === 'group' && currentGroup) {
        const { error } = await supabase.from('messages').insert([{ from_user_id: currentUser.id, to_user_id: currentUser.id, group_id: currentGroup.id, content: txt, created_at: new Date().toISOString() }]);
        if (error) throw error;
        setInputValue('');
        fetchGroupMessages(currentGroup.id);
      }
    } catch (err: any) {
      console.error("发送消息失败：", err);
      setError(`发送失败：${err.message || '未知错误'}`);
    } finally {
      setSending(false);
    }
  };

  const togglePrivateTop = async (userId: string) => {
    if (userId === WEBMASTER_UID) return;
    const isTop = privateTopIds.includes(userId);
    setPrivateTopIds(isTop ? privateTopIds.filter((id) => id !== userId) : [...privateTopIds, userId]);
  };

  const toggleGroupTop = async (groupId: string) => {
    const targetGroup = groupList.find((g) => g.id === groupId);
    const newTopState = !targetGroup.is_top;
    await supabase.from('groups').update({ is_top: newTopState }).eq('id', groupId);
    fetchMyGroups(currentUser.id);
  };

  const createGroup = async () => {
    if (!newGroupName.trim() || selectedMemberIds.length === 0) { setError("群名和成员不能为空"); return; }
    try {
      const { data: newGroup, error: groupErr } = await supabase.from('groups').insert([{ group_name: newGroupName, owner_id: currentUser.id, avatar_url: DEFAULT_GROUP_AVATAR }]).select().single();
      if (groupErr) throw groupErr;
      const allMemberIds = [...selectedMemberIds, currentUser.id];
      const memberList = allMemberIds.map((uid) => ({ group_id: newGroup.id, user_id: uid }));
      await supabase.from('group_members').insert(memberList);
      setShowCreateGroupModal(false);
      setNewGroupName('');
      setSelectedMemberIds([]);
      fetchMyGroups(currentUser.id);
    } catch (err: any) {
      setError("创建群聊失败：" + err.message);
    }
  };

  const quitGroup = async (groupId: string) => {
    await supabase.from('group_members').delete().match({ group_id: groupId, user_id: currentUser.id });
    setCurrentGroup(null);
    setShowGroupSetting(false);
    fetchMyGroups(currentUser.id);
  };

  const dissolveGroup = async (groupId: string) => {
    await supabase.from('groups').delete().eq('id', groupId);
    setCurrentGroup(null);
    setShowGroupSetting(false);
    fetchMyGroups(currentUser.id);
  };

  const fetchGroupMembers = async (groupId: string) => {
    try {
      const { data: members, error } = await supabase.from('group_members').select('user_id').eq('group_id', groupId);
      if (error) throw error;
      const userIds = members.map((m: any) => m.user_id).filter((id: string) => id !== currentUser.id);
      if (userIds.length === 0) { setGroupMembers([]); return; }
      const { data: profiles, error: pErr } = await supabase.from('profiles').select('id, nickname, avatar_url').in('id', userIds);
      if (pErr) throw pErr;
      setGroupMembers(profiles || []);
    } catch (err) {
      console.error('获取群成员失败:', err);
    }
  };

  const transferGroupOwner = async () => {
    if (!transferTargetId || !currentGroup) return;
    try {
      const { error } = await supabase.from('groups').update({ owner_id: transferTargetId }).eq('id', currentGroup.id);
      if (error) throw error;
      setShowTransferUI(false);
      setTransferTargetId('');
      fetchMyGroups(currentUser.id);
    } catch (err: any) {
      console.error('转移群主失败:', err);
      setError('转移群主失败: ' + err.message);
    }
  };

  const scrollToBottom = () => {
    requestAnimationFrame(() => { messageEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); });
  };

  const handleEmojiSelect = (emoji: any) => {
    setInputValue((prev: string) => prev + emoji.emoji);
    setShowEmojiPanel(false);
  };

  const handleInput = (e: any) => {
    setInputValue(e.target.value);
    setShowAtModal(e.target.value.endsWith('@'));
  };

  const insertAt = (u: any) => {
    setInputValue((prev: string) => prev.replace(/@$/, `@${u.nickname} `));
    setShowAtModal(false);
    inputRef.current.focus();
  };

  // ========== 初始化 + 鉴权状态监听 ==========
  useEffect(() => {
    let isMounted = true;
    let authSubObj: any = null;

    const initPageData = async () => {
      if (!isMounted) return;
      setError(null);
      setLoading(true);
      setUserList([]);
      setGroupList([]);
      setPrivateMsgList([]);
      setGroupMsgList([]);
      setTargetUser(null);
      setCurrentGroup(null);
      setMyProfile(null);
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError) throw authError;
        if (!user) { setCurrentUser(null); setLoading(false); return; }
        setCurrentUser(user);
        const uid = user.id;
        const { data: profile } = await supabase.from('profiles').select('id, avatar_url, nickname').eq('id', uid).maybeSingle();
        setMyProfile(profile || { avatar_url: DEFAULT_EMOJI_AVATAR });
        await fetchAllUsers(uid);
        await fetchAllUsersForGroup(uid);
        await fetchMyGroups(uid);
      } catch (err) {
        console.error("初始化失败：", err);
        setError("加载用户信息失败，请刷新重试");
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    initPageData();
    authSubObj = supabase.auth.onAuthStateChange(async (_: any, session: any) => {
      if (!isMounted) return;
      const user = session?.user || null;
      if (user?.id !== currentUser?.id) await initPageData();
    });
    return () => {
      isMounted = false;
      authSubObj?.data?.subscription.unsubscribe();
    };
  }, [currentUser?.id]);

  // 实时消息监听：next-app 无全局 ChatRedDot，改为直接订阅 messages 表 INSERT，
  // 仅当新消息属于「正在查看的会话」时自动刷新并标记已读。
  useEffect(() => {
    if (!currentUser) return;
    const channel = supabase
      .channel('chat-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload: any) => {
        const m = payload.new as any;
        if (m.group_id) {
          if (currentGroup?.id === m.group_id) {
            fetchGroupMessages(currentGroup.id);
            markAsRead(`group:${m.group_id}`);
          }
        } else {
          const otherId = m.from_user_id === currentUser.id ? m.to_user_id : m.from_user_id;
          if (targetUser?.id === otherId) {
            fetchPrivateMessages(targetUser.id);
            markAsRead(`private:${otherId}`);
          }
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [currentUser, targetUser, currentGroup]);

  useEffect(() => { if (targetUser) fetchPrivateMessages(targetUser.id); }, [targetUser]);
  useEffect(() => { if (currentGroup) fetchGroupMessages(currentGroup.id); }, [currentGroup]);

  // 筛选 + 排序
  const filteredUsers = userList.filter((u: any) => u.nickname?.toLowerCase().includes(searchKeyword.toLowerCase()));
  const filteredGroups = groupList.filter((g: any) => g.group_name?.toLowerCase().includes(searchKeyword.toLowerCase()));
  const sortedFriends = [...filteredUsers].sort((a: any, b: any) => {
    const aTop = privateTopIds.includes(a.id) ? 1 : 0;
    const bTop = privateTopIds.includes(b.id) ? 1 : 0;
    return bTop - aTop;
  });
  const finalFriendList = [webmasterUser, ...sortedFriends];
  const activityMap = getActivityMap();
  const sortedGroups = [...filteredGroups].sort((a: any, b: any) => {
    if (a.is_top && !b.is_top) return -1;
    if (!a.is_top && b.is_top) return 1;
    const aTime = activityMap[`group:${a.id}`] || 0;
    const bTime = activityMap[`group:${b.id}`] || 0;
    return bTime - aTime;
  });
  const myAvatar = myProfile?.avatar_url || DEFAULT_EMOJI_AVATAR;
  const myId = currentUser?.id;

  if (loading) return <div style={{ textAlign: 'center', padding: '60px', color: 'var(--ifm-text-color)' }}><img src="/img/LOADING.gif" alt="加载中" width={56} style={{ opacity: 0.92 }} /></div>;
  if (!currentUser) return <div style={{ textAlign: 'center', padding: '60px', color: 'var(--ifm-text-color)' }}>请先登录</div>;

  return (
    <div className="chat-container" style={{ display: 'flex', width: '96%', maxWidth: '1400px', margin: '30px auto', height: 'calc(100vh - 180px)', minHeight: 0, border: '1px solid var(--ifm-color-emphasis-300)', borderRadius: '16px', overflow: 'hidden', background: 'var(--ifm-card-background-color)' }}>
      <div className="chat-sidebar" style={{ width: isMobile ? (sidebarCollapsed ? '0px' : '100%') : '340px', maxHeight: isMobile ? (sidebarCollapsed ? '0px' : '40vh') : 'none', minHeight: isMobile ? (sidebarCollapsed ? '0px' : '0px') : 'none', flexShrink: 0, borderRight: isMobile ? 'none' : '1px solid var(--ifm-color-emphasis-300)', borderBottom: isMobile ? '1px solid var(--ifm-color-emphasis-300)' : 'none', background: 'var(--ifm-color-emphasis-100)', display: 'flex', flexDirection: 'column', overflow: isMobile ? (sidebarCollapsed ? 'hidden' : 'visible') : 'visible', transition: 'all 0.3s ease' }}>
        <div style={{ display: 'flex', borderBottom: '1px solid var(--ifm-color-emphasis-300)', alignItems: 'center' }}>
          {isMobile && !sidebarCollapsed && (
            <button onClick={() => setSidebarCollapsed(true)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '20px', padding: '12px', color: 'var(--ifm-text-color)', lineHeight: 1 }} title="收起侧边栏">‹</button>
          )}
          <div onClick={() => { setActiveTab('friend'); setTargetUser(null); setCurrentGroup(null); }} style={{ flex: 1, textAlign: 'center', padding: '12px 0', cursor: 'pointer', fontWeight: activeTab === 'friend' ? 600 : 400, borderBottom: activeTab === 'friend' ? '2px solid #07c160' : '2px solid transparent', color: 'var(--ifm-text-color)' }}>好友</div>
          <div onClick={() => { setActiveTab('group'); setTargetUser(null); setCurrentGroup(null); }} style={{ flex: 1, textAlign: 'center', padding: '12px 0', cursor: 'pointer', fontWeight: activeTab === 'group' ? 600 : 400, borderBottom: activeTab === 'group' ? '2px solid #07c160' : '2px solid transparent', color: 'var(--ifm-text-color)' }}>群聊</div>
        </div>

        <div style={{ padding: '16px', display: 'flex', gap: '8px', alignItems: 'center' }}>
          <input value={searchKeyword} onChange={(e) => setSearchKeyword(e.target.value)} placeholder={activeTab === 'friend' ? "搜索联系人" : "搜索群聊"} style={{ flex: 1, padding: '9px 16px', borderRadius: '24px', border: '1px solid var(--ifm-color-emphasis-300)', outline: 'none', background: 'var(--ifm-card-background-color)', color: 'var(--ifm-text-color)' }} />
          <button onClick={() => setShowCreateGroupModal(true)} style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#07c160', color: '#fff', border: 'none', fontSize: '20px', cursor: 'pointer', display: activeTab === 'group' ? 'flex' : 'none', alignItems: 'center', justifyContent: 'center' }} title="创建群聊">+</button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {activeTab === 'friend' && finalFriendList.map((user: any) => (
            <div key={user.isWebmaster ? 'webmaster-fixed' : user.id} onClick={() => { setTargetUser(user); if (!user.isWebmaster) { markAsRead(`private:${user.id}`); recordActivity(`private:${user.id}`); } if (isMobile) setSidebarCollapsed(true); }} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 18px', cursor: 'pointer', background: targetUser?.id === user.id ? 'var(--ifm-color-emphasis-300)' : 'transparent', color: 'var(--ifm-text-color)', ...(user.isWebmaster ? { background: 'rgba(7,193,96,0.08)' } : {}) }}>
              {renderAvatar(user.avatar_url, user.id, 42, user.isWebmaster)}
              <span style={{ flex: 1, fontWeight: user.isWebmaster ? 600 : 400 }}>{user.nickname}</span>
              {user.isWebmaster ? (
                <span style={{ color: '#07c160', fontSize: '12px' }}>永久置顶</span>
              ) : (
                <>
                  <span style={{ color: '#f53f3f', fontSize: '12px', marginRight: '6px' }}>{privateTopIds.includes(user.id) && '置顶'}</span>
                  <button onClick={(e) => { e.stopPropagation(); togglePrivateTop(user.id); }} style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '14px', color: 'var(--ifm-text-color)' }}>{privateTopIds.includes(user.id) ? '取消' : '置顶'}</button>
                </>
              )}
            </div>
          ))}

          {activeTab === 'group' && sortedGroups.map((group: any) => (
            <div key={group.id} onClick={() => { setCurrentGroup(group); setShowGroupSetting(false); markAsRead(`group:${group.id}`); recordActivity(`group:${group.id}`); if (isMobile) setSidebarCollapsed(true); }} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 18px', cursor: 'pointer', background: currentGroup?.id === group.id ? 'var(--ifm-color-emphasis-300)' : 'transparent', color: 'var(--ifm-text-color)' }}>
              {renderGroupAvatar(group.avatar_url, 42)}
              <span style={{ flex: 1 }}>{group.group_name}</span>
              <span style={{ color: '#f53f3f', fontSize: '12px', marginRight: '6px' }}>{group.is_top && '置顶'}</span>
              <button onClick={(e) => { e.stopPropagation(); toggleGroupTop(group.id); }} style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '14px', color: 'var(--ifm-text-color)' }}>{group.is_top ? '取消' : '置顶'}</button>
            </div>
          ))}
        </div>
      </div>

      <div className="chat-main" style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>
        {error && (
          <div style={{ background: '#fff2f0', color: '#ff4d4f', padding: '12px 20px', borderBottom: '1px solid #ffccc7', textAlign: 'center' }}>{error}</div>
        )}

        {activeTab === 'friend' && targetUser ? (
          <>
            <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--ifm-color-emphasis-300)', fontWeight: 600, color: 'var(--ifm-text-color)', display: 'flex', alignItems: 'center', gap: '12px' }}>
              {isMobile && sidebarCollapsed && (
                <button onClick={() => setSidebarCollapsed(false)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '20px', color: 'var(--ifm-text-color)', padding: 0, lineHeight: 1 }} title="展开侧边栏">›</button>
              )}
              <span>{targetUser.nickname}</span>
              {targetUser.isWebmaster && <span style={{ color: '#07c160', marginLeft: 10, fontSize: 12 }}>网站管理员</span>}
            </div>
            <div style={{ flex: 1, minHeight: 0, padding: '24px', background: 'var(--ifm-color-emphasis-100)', overflowY: 'auto' }}>
              {privateMsgList.map((msg: any) => {
                const isSelf = msg.from_user_id === myId;
                return (
                  <div key={msg.id} style={{ display: 'flex', justifyContent: isSelf ? 'flex-end' : 'flex-start', marginBottom: '16px', gap: '10px', alignItems: 'flex-end' }}>
                    {!isSelf && renderAvatar(targetUser.avatar_url, targetUser.id, 34, targetUser.isWebmaster)}
                    <div style={{ maxWidth: '65%', padding: '9px 14px', borderRadius: '20px', background: isSelf ? '#07c160' : 'var(--ifm-card-background-color)', color: isSelf ? '#fff' : 'var(--ifm-text-color)', wordBreak: 'break-word', overflowWrap: 'break-word', whiteSpace: 'pre-wrap' }}>{msg.content}</div>
                    {isSelf && renderAvatar(myAvatar, myId, 34)}
                  </div>
                );
              })}
              <div ref={messageEndRef} />
              {targetUser.isWebmaster && !WEBMASTER_UID && (
                <div style={{ textAlign: 'center', color: '#ff4d4f', padding: 20 }}>管理员尚未配置站长ID，暂时无法收发消息</div>
              )}
            </div>

            <div style={{ padding: '16px 20px', borderTop: '1px solid var(--ifm-color-emphasis-300)', position: 'relative' }}>
              {showAtModal && <div style={{ position: 'absolute', bottom: '80px', left: '20px', background: 'var(--ifm-card-background-color)', border: '1px solid var(--ifm-color-emphasis-300)', borderRadius: '10px', width: '220px', maxHeight: '220px', overflowY: 'auto', zIndex: 999 }}>
                {allUsersForGroup.map((u: any) => <div key={u.id} onClick={() => insertAt(u)} style={{ padding: '10px 16px', cursor: 'pointer', color: 'var(--ifm-text-color)' }}>@{u.nickname}</div>)}
              </div>}
              {showEmojiPanel && <div style={{ position: 'absolute', bottom: '80px', left: '20px', zIndex: 999 }}><EmojiPicker onEmojiClick={handleEmojiSelect} /></div>}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <button onClick={() => setShowEmojiPanel(!showEmojiPanel)} style={{ fontSize: '22px', border: 'none', background: 'transparent', cursor: 'pointer' }}>😊</button>
                <input ref={inputRef} value={inputValue} onChange={handleInput} onKeyDown={(e) => e.key === 'Enter' && sendMessage()} placeholder="输入消息，@可提及用户" style={{ flex: 1, padding: '11px 18px', borderRadius: '26px', border: '1px solid var(--ifm-color-emphasis-300)', background: 'var(--ifm-card-background-color)', color: 'var(--ifm-text-color)' }} />
                <button onClick={sendMessage} disabled={sending} style={{ padding: '10px 22px', borderRadius: '26px', background: sending ? '#94e3b9' : '#07c160', color: '#fff', border: 'none', cursor: sending ? 'not-allowed' : 'pointer' }}>{sending ? "发送中" : "发送"}</button>
              </div>
            </div>
          </>
        ) : null}

        {activeTab === 'group' && currentGroup ? (
          <>
            <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--ifm-color-emphasis-300)', fontWeight: 600, display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--ifm-text-color)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {isMobile && sidebarCollapsed && (
                  <button onClick={() => setSidebarCollapsed(false)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '20px', color: 'var(--ifm-text-color)', padding: 0, lineHeight: 1 }} title="展开侧边栏">›</button>
                )}
                <span>{currentGroup.group_name}</span>
              </div>
              <button onClick={() => { setShowGroupSetting(!showGroupSetting); if (!showGroupSetting) fetchGroupMembers(currentGroup.id); }} style={{ border: 'none', background: 'var(--ifm-color-emphasis-100)', padding: '4px 12px', borderRadius: '6px', cursor: 'pointer', color: 'var(--ifm-text-color)' }}>群聊设置</button>
            </div>

            <div style={{ flex: 1, minHeight: 0, padding: '24px', background: 'var(--ifm-color-emphasis-100)', overflowY: 'auto', position: 'relative' }}>
              {groupMsgList.map((msg: any) => {
                const isSelf = msg.from_user_id === myId;
                const sender = msg.sender || {};
                const senderNickname = sender.nickname || '用户';
                return (
                  <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: isSelf ? 'flex-end' : 'flex-start', marginBottom: '12px' }}>
                    {!isSelf && <div style={{ fontSize: 11, color: '#888', marginBottom: 2, marginLeft: 44, maxWidth: '65%' }}>{senderNickname}</div>}
                    <div style={{ display: 'flex', justifyContent: isSelf ? 'flex-end' : 'flex-start', gap: '10px', alignItems: 'flex-end' }}>
                      {!isSelf && renderAvatar(sender.avatar_url, msg.from_user_id, 34)}
                      <div style={{ maxWidth: '65%', padding: '9px 14px', borderRadius: '20px', background: isSelf ? '#07c160' : 'var(--ifm-card-background-color)', color: isSelf ? '#fff' : 'var(--ifm-text-color)', wordBreak: 'break-word', overflowWrap: 'break-word', whiteSpace: 'pre-wrap' }}>{msg.content}</div>
                      {isSelf && renderAvatar(myAvatar, myId, 34)}
                    </div>
                  </div>
                );
              })}
              <div ref={messageEndRef} />

              {showGroupSetting && (
                <div style={{ position: 'absolute', right: '20px', top: '20px', width: '280px', maxHeight: '60vh', overflowY: 'auto', background: 'var(--ifm-card-background-color)', border: '1px solid var(--ifm-color-emphasis-300)', borderRadius: '12px', padding: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 999, color: 'var(--ifm-text-color)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <h4 style={{ margin: 0 }}>群聊设置</h4>
                    <button onClick={() => setShowGroupSetting(false)} style={{ border: 'none', background: 'transparent', fontSize: 18, cursor: 'pointer', color: 'var(--ifm-text-color)', padding: 0, lineHeight: 1 }}>✕</button>
                  </div>
                  <div style={{ fontSize: 13, marginBottom: 12 }}>
                    <p style={{ margin: '4px 0', color: '#888' }}>群主：{currentGroup.owner_id === myId ? '我' : (groupMembers.find((m: any) => m.id === currentGroup.owner_id)?.nickname || '其他成员')}</p>
                    <p style={{ margin: '4px 0', color: '#888' }}>成员数：{groupMembers.length + 1}</p>
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6, color: '#888' }}>
                      群成员
                      {currentGroup.owner_id === myId && <span style={{ color: '#07c160', marginLeft: 8, cursor: 'pointer' }} onClick={() => setShowTransferUI(!showTransferUI)}>[转移群主]</span>}
                    </div>
                    <div style={{ maxHeight: 120, overflowY: 'auto', border: '1px solid var(--ifm-color-emphasis-200)', borderRadius: 8, padding: 6 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 6px', fontSize: 12 }}>
                        {renderAvatar(myAvatar, myId, 24)}
                        <span style={{ flex: 1 }}>{myProfile?.nickname || '我'}</span>
                        <span style={{ color: '#07c160', fontSize: 10 }}>群主</span>
                      </div>
                      {groupMembers.map((m: any) => (
                        <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 6px', fontSize: 12, borderRadius: 4 }}>
                          {renderAvatar(m.avatar_url, m.id, 24)}
                          <span style={{ flex: 1 }}>{m.nickname || '用户'}</span>
                          {m.id === currentGroup.owner_id && <span style={{ color: '#07c160', fontSize: 10 }}>群主</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                  {showTransferUI && currentGroup.owner_id === myId && (
                    <div style={{ marginBottom: 12, padding: 10, background: '#fff8e1', borderRadius: 8, border: '1px solid #ffe082' }}>
                      <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6, color: '#e65100' }}>⚠️ 转移群主给：</div>
                      <select value={transferTargetId} onChange={(e) => setTransferTargetId(e.target.value)} style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid var(--ifm-color-emphasis-300)', background: 'var(--ifm-card-background-color)', color: 'var(--ifm-text-color)', fontSize: 12, marginBottom: 8 }}>
                        <option value="">-- 选择成员 --</option>
                        {groupMembers.filter((m: any) => m.id !== currentGroup.owner_id).map((m: any) => <option key={m.id} value={m.id}>{m.nickname || '用户'}</option>)}
                      </select>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => { setShowTransferUI(false); setTransferTargetId(''); }} style={{ flex: 1, padding: '5px 8px', border: '1px solid #ddd', borderRadius: 4, background: '#fff', cursor: 'pointer', fontSize: 11, color: '#666' }}>取消</button>
                        <button onClick={transferGroupOwner} disabled={!transferTargetId} style={{ flex: 1, padding: '5px 8px', border: 'none', borderRadius: 4, background: transferTargetId ? '#e65100' : '#ccc', color: '#fff', cursor: transferTargetId ? 'pointer' : 'not-allowed', fontSize: 11 }}>确认转移</button>
                      </div>
                    </div>
                  )}
                  <button onClick={() => quitGroup(currentGroup.id)} style={{ width: '100%', padding: '8px', marginTop: '6px', background: '#ff7875', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: 13 }}>退出群聊</button>
                  {currentGroup.owner_id === myId && (
                    <button onClick={() => dissolveGroup(currentGroup.id)} style={{ width: '100%', padding: '8px', marginTop: '8px', background: '#f5222d', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: 13 }}>解散群聊</button>
                  )}
                </div>
              )}
            </div>

            <div style={{ padding: '16px 20px', borderTop: '1px solid var(--ifm-color-emphasis-300)', position: 'relative' }}>
              {showAtModal && <div style={{ position: 'absolute', bottom: '80px', left: '20px', background: 'var(--ifm-card-background-color)', border: '1px solid var(--ifm-color-emphasis-300)', borderRadius: '10px', width: '220px', maxHeight: '220px', overflowY: 'auto', zIndex: 999 }}>
                {allUsersForGroup.map((u: any) => <div key={u.id} onClick={() => insertAt(u)} style={{ padding: '10px 16px', cursor: 'pointer', color: 'var(--ifm-text-color)' }}>@{u.nickname}</div>)}
              </div>}
              {showEmojiPanel && <div style={{ position: 'absolute', bottom: '80px', left: '20px', zIndex: 999 }}><EmojiPicker onEmojiClick={handleEmojiSelect} /></div>}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <button onClick={() => setShowEmojiPanel(!showEmojiPanel)} style={{ fontSize: '22px', border: 'none', background: 'transparent', cursor: 'pointer' }}>😊</button>
                <input ref={inputRef} value={inputValue} onChange={handleInput} onKeyDown={(e) => e.key === 'Enter' && sendMessage()} placeholder="输入消息，@可提及用户" style={{ flex: 1, padding: '11px 18px', borderRadius: '26px', border: '1px solid var(--ifm-color-emphasis-300)', background: 'var(--ifm-card-background-color)', color: 'var(--ifm-text-color)' }} />
                <button onClick={sendMessage} disabled={sending} style={{ padding: '10px 22px', borderRadius: '26px', background: sending ? '#94e3b9' : '#07c160', color: '#fff', border: 'none', cursor: sending ? 'not-allowed' : 'pointer' }}>{sending ? "发送中" : "发送"}</button>
              </div>
            </div>
          </>
        ) : null}

        {(!targetUser && !currentGroup) && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', color: 'var(--ifm-color-emphasis-600)' }}>
            <div>{activeTab === 'friend' ? '选择好友开始私聊' : '选择群聊开始聊天'}</div>
            {isMobile && sidebarCollapsed && (
              <button onClick={() => setSidebarCollapsed(false)} style={{ padding: '10px 24px', borderRadius: '20px', border: 'none', background: '#07c160', color: '#fff', cursor: 'pointer', fontSize: '14px', fontWeight: 500 }}>展开联系人</button>
            )}
          </div>
        )}
      </div>

      {showCreateGroupModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ width: '420px', background: 'var(--ifm-card-background-color)', borderRadius: '16px', padding: '24px', boxShadow: '0 8px 24px rgba(0,0,0,0.15)', color: 'var(--ifm-text-color)' }}>
            <h3 style={{ margin: '0 0 16px' }}>创建新群聊</h3>
            <input value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} placeholder="请输入群聊名称" style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--ifm-color-emphasis-300)', marginBottom: '16px', boxSizing: 'border-box', background: 'var(--ifm-card-background-color)', color: 'var(--ifm-text-color)' }} />
            <div style={{ marginBottom: '16px' }}>
              <p style={{ margin: '0 0 8px' }}>选择群成员：</p>
              <div style={{ maxHeight: '180px', overflowY: 'auto', border: '1px solid var(--ifm-color-emphasis-300)', borderRadius: '8px', padding: '8px' }}>
                {allUsersForGroup.map((u: any) => (
                  <div key={u.id} onClick={() => { setSelectedMemberIds(selectedMemberIds.includes(u.id) ? selectedMemberIds.filter((id) => id !== u.id) : [...selectedMemberIds, u.id]); }} style={{ padding: '6px 8px', cursor: 'pointer', background: selectedMemberIds.includes(u.id) ? 'var(--ifm-color-emphasis-100)' : 'transparent', borderRadius: '4px', margin: '2px 0' }}>{u.nickname}</div>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button onClick={() => { setShowCreateGroupModal(false); setError(null); }} style={{ padding: '8px 16px', border: '1px solid var(--ifm-color-emphasis-300)', borderRadius: '6px', background: 'var(--ifm-card-background-color)', cursor: 'pointer', color: 'var(--ifm-text-color)' }}>取消</button>
              <button onClick={createGroup} style={{ padding: '8px 16px', border: 'none', borderRadius: '6px', background: '#07c160', color: '#fff', cursor: 'pointer' }}>确认创建</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
=======
'use client';

import React, { useState, useEffect, useRef } from 'react';
import EmojiPicker from 'emoji-picker-react';
import { supabase } from '@/lib/supabase/client';
import { markAsRead, recordActivity, getActivityMap } from '@/lib/chatNotification';

// 固定常量
const PROFILE_PAGE = '/app/profile';
const DEFAULT_EMOJI_AVATAR = '😀';
const DEFAULT_GROUP_AVATAR = '👥';

// ========== 站长用户ID（空=未配置），自行填写数据库UUID ==========
const WEBMASTER_UID = "31452874-c41a-4e2e-a497-8b67e42ccafa";
const WEBMASTER_NAME = "联系站长";

export default function ChatPage() {
  // ========== 基础用户状态 ==========
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [myProfile, setMyProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);

  // ========== 好友/私聊相关 ==========
  const [userList, setUserList] = useState<any[]>([]);
  const [targetUser, setTargetUser] = useState<any>(null);
  const [privateMsgList, setPrivateMsgList] = useState<any[]>([]);
  const [privateTopIds, setPrivateTopIds] = useState<any[]>([]);

  // ========== 群聊相关 ==========
  const [activeTab, setActiveTab] = useState('friend');
  const [groupList, setGroupList] = useState<any[]>([]);
  const [currentGroup, setCurrentGroup] = useState<any>(null);
  const [groupMsgList, setGroupMsgList] = useState<any[]>([]);
  const [groupTopIds, setGroupTopIds] = useState<any[]>([]);
  const [showGroupSetting, setShowGroupSetting] = useState(false);
  const [groupMembers, setGroupMembers] = useState<any[]>([]);
  const [transferTargetId, setTransferTargetId] = useState('');
  const [showTransferUI, setShowTransferUI] = useState(false);
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [selectedMemberIds, setSelectedMemberIds] = useState<any[]>([]);

  // ========== 输入/表情/@ 相关 ==========
  const [searchKeyword, setSearchKeyword] = useState('');
  const [inputValue, setInputValue] = useState('');
  const [showEmojiPanel, setShowEmojiPanel] = useState(false);
  const [showAtModal, setShowAtModal] = useState(false);
  const [sending, setSending] = useState(false);

  // ========== 移动端/折叠侧边栏相关 ==========
  const [isMobile, setIsMobile] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    const check = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      setSidebarCollapsed(mobile);
    };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // DOM 引用
  const messageEndRef = useRef<any>(null);
  const inputRef = useRef<any>(null);

  const WEBMASTER_AVATAR = 'https://github.com/ye2f4.png';

  const webmasterUser = {
    id: WEBMASTER_UID,
    nickname: WEBMASTER_NAME,
    avatar_url: WEBMASTER_AVATAR,
    isWebmaster: true
  };

  // ===================== 头像渲染 =====================
  const renderAvatar = (avatarUrl: any, userId: string, size = 42, isWebmaster = false) => {
    if (isWebmaster) {
      return (
        <div style={{ width: size, height: size, borderRadius: '50%', background: 'var(--ifm-color-emphasis-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.6, flexShrink: 0, boxShadow: '0 2px 8px rgba(0,0,0,0.1)', cursor: 'pointer', userSelect: 'none' }}>
          {DEFAULT_EMOJI_AVATAR}
        </div>
      );
    }
    const isNetImage = avatarUrl && (avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://'));
    if (isNetImage) {
      return (
        <img src={avatarUrl} alt="头像" loading="lazy" style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, boxShadow: '0 2px 8px rgba(0,0,0,0.1)', cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); window.location.href = `${PROFILE_PAGE}?uid=${userId}`; }} onError={(e) => (e.target as HTMLImageElement).style.display = 'none'} />
      );
    }
    const showEmoji = avatarUrl || DEFAULT_EMOJI_AVATAR;
    return (
      <div style={{ width: size, height: size, borderRadius: '50%', background: 'var(--ifm-color-emphasis-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.6, flexShrink: 0, boxShadow: '0 2px 8px rgba(0,0,0,0.1)', cursor: 'pointer', userSelect: 'none' }} onClick={(e) => { e.stopPropagation(); window.location.href = `${PROFILE_PAGE}?uid=${userId}`; }}>
        {showEmoji}
      </div>
    );
  };

  const renderGroupAvatar = (avatarUrl: any, size = 42) => {
    const emoji = avatarUrl || DEFAULT_GROUP_AVATAR;
    return (
      <div style={{ width: size, height: size, borderRadius: '50%', background: 'var(--ifm-color-emphasis-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.6, flexShrink: 0, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
        {emoji}
      </div>
    );
  };

  // ===================== 数据请求方法 =====================
  const fetchAllUsers = async (selfUid: string) => {
    try {
      const { data, error } = await supabase.from('profiles').select('id, nickname, avatar_url').neq('id', selfUid).neq('id', WEBMASTER_UID);
      if (error) throw error;
      setUserList(data || []);
    } catch (err) {
      console.error("加载联系人失败：", err);
      setError("加载联系人失败，请刷新重试");
    }
  };

  const [allUsersForGroup, setAllUsersForGroup] = useState<any[]>([]);
  const fetchAllUsersForGroup = async (selfUid: string) => {
    try {
      const { data, error } = await supabase.from('profiles').select('id, nickname, avatar_url').neq('id', selfUid);
      if (error) throw error;
      setAllUsersForGroup(data || []);
    } catch (err) {
      console.error("加载群聊选人列表失败：", err);
    }
  };

  const fetchMyGroups = async (selfUid: string) => {
    try {
      const { data: memberData, error: memberErr } = await supabase.from('group_members').select('group_id').eq('user_id', selfUid);
      if (memberErr) throw memberErr;
      if (!memberData || memberData.length === 0) { setGroupList([]); return; }
      const groupIds = memberData.map((item: any) => item.group_id);
      const { data: groups, error: groupErr } = await supabase.from('groups').select('id, group_name, avatar_url, owner_id, is_top').in('id', groupIds).order('is_top', { ascending: false });
      if (groupErr) throw groupErr;
      setGroupList(groups || []);
      setGroupTopIds(groups.filter((g: any) => g.is_top).map((g: any) => g.id));
    } catch (err) {
      console.error("加载群聊失败：", err);
    }
  };

  const fetchPrivateMessages = async (toUserId: string) => {
    if (!currentUser || !toUserId) return;
    try {
      const { data: msgData, error: msgError } = await supabase.from('messages').select('*').is('group_id', null).or(`and(from_user_id.eq.${currentUser.id},to_user_id.eq.${toUserId}),and(from_user_id.eq.${toUserId},to_user_id.eq.${currentUser.id})`).order('created_at', { ascending: true });
      if (msgError) throw msgError;
      if (!msgData) { setPrivateMsgList([]); scrollToBottom(); return; }
      const userIds = [...new Set(msgData.map((m: any) => m.from_user_id))];
      const { data: profileData } = await supabase.from('profiles').select('id, avatar_url').in('id', userIds);
      const map: any = {};
      profileData?.forEach((p: any) => (map[p.id] = p));
      setPrivateMsgList(msgData.map((m: any) => ({ ...m, sender: map[m.from_user_id] || {} })));
      scrollToBottom();
    } catch (err) {
      console.error("加载私聊消息失败：", err);
      setError("加载聊天记录失败，请刷新重试");
    }
  };

  const fetchGroupMessages = async (groupId: string) => {
    if (!currentUser || !groupId) return;
    try {
      const { data: msgData, error: msgError } = await supabase.from('messages').select('*').eq('group_id', groupId).order('created_at', { ascending: true });
      if (msgError) throw msgError;
      if (!msgData) { setGroupMsgList([]); scrollToBottom(); return; }
      const userIds = [...new Set(msgData.map((m: any) => m.from_user_id))];
      const { data: profileData } = await supabase.from('profiles').select('id, avatar_url, nickname').in('id', userIds);
      const map: any = {};
      profileData?.forEach((p: any) => (map[p.id] = p));
      setGroupMsgList(msgData.map((m: any) => ({ ...m, sender: map[m.from_user_id] || {} })));
      scrollToBottom();
    } catch (err) {
      console.error("加载群聊消息失败：", err);
    }
  };

  const sendMessage = async () => {
    const txt = inputValue.trim();
    if (!txt || sending) return;
    if (targetUser?.isWebmaster && !WEBMASTER_UID) { setError("站长ID未配置，无法发送消息，请管理员配置站长UID"); return; }
    setSending(true);
    setError(null);
    try {
      if (activeTab === 'friend' && targetUser) {
        const { error } = await supabase.from('messages').insert([{ from_user_id: currentUser.id, to_user_id: targetUser.id, content: txt, created_at: new Date().toISOString() }]);
        if (error) throw error;
        setInputValue('');
        fetchPrivateMessages(targetUser.id);
      } else if (activeTab === 'group' && currentGroup) {
        const { error } = await supabase.from('messages').insert([{ from_user_id: currentUser.id, to_user_id: currentUser.id, group_id: currentGroup.id, content: txt, created_at: new Date().toISOString() }]);
        if (error) throw error;
        setInputValue('');
        fetchGroupMessages(currentGroup.id);
      }
    } catch (err: any) {
      console.error("发送消息失败：", err);
      setError(`发送失败：${err.message || '未知错误'}`);
    } finally {
      setSending(false);
    }
  };

  const togglePrivateTop = async (userId: string) => {
    if (userId === WEBMASTER_UID) return;
    const isTop = privateTopIds.includes(userId);
    setPrivateTopIds(isTop ? privateTopIds.filter((id) => id !== userId) : [...privateTopIds, userId]);
  };

  const toggleGroupTop = async (groupId: string) => {
    const targetGroup = groupList.find((g) => g.id === groupId);
    const newTopState = !targetGroup.is_top;
    await supabase.from('groups').update({ is_top: newTopState }).eq('id', groupId);
    fetchMyGroups(currentUser.id);
  };

  const createGroup = async () => {
    if (!newGroupName.trim() || selectedMemberIds.length === 0) { setError("群名和成员不能为空"); return; }
    try {
      const { data: newGroup, error: groupErr } = await supabase.from('groups').insert([{ group_name: newGroupName, owner_id: currentUser.id, avatar_url: DEFAULT_GROUP_AVATAR }]).select().single();
      if (groupErr) throw groupErr;
      const allMemberIds = [...selectedMemberIds, currentUser.id];
      const memberList = allMemberIds.map((uid) => ({ group_id: newGroup.id, user_id: uid }));
      await supabase.from('group_members').insert(memberList);
      setShowCreateGroupModal(false);
      setNewGroupName('');
      setSelectedMemberIds([]);
      fetchMyGroups(currentUser.id);
    } catch (err: any) {
      setError("创建群聊失败：" + err.message);
    }
  };

  const quitGroup = async (groupId: string) => {
    await supabase.from('group_members').delete().match({ group_id: groupId, user_id: currentUser.id });
    setCurrentGroup(null);
    setShowGroupSetting(false);
    fetchMyGroups(currentUser.id);
  };

  const dissolveGroup = async (groupId: string) => {
    await supabase.from('groups').delete().eq('id', groupId);
    setCurrentGroup(null);
    setShowGroupSetting(false);
    fetchMyGroups(currentUser.id);
  };

  const fetchGroupMembers = async (groupId: string) => {
    try {
      const { data: members, error } = await supabase.from('group_members').select('user_id').eq('group_id', groupId);
      if (error) throw error;
      const userIds = members.map((m: any) => m.user_id).filter((id: string) => id !== currentUser.id);
      if (userIds.length === 0) { setGroupMembers([]); return; }
      const { data: profiles, error: pErr } = await supabase.from('profiles').select('id, nickname, avatar_url').in('id', userIds);
      if (pErr) throw pErr;
      setGroupMembers(profiles || []);
    } catch (err) {
      console.error('获取群成员失败:', err);
    }
  };

  const transferGroupOwner = async () => {
    if (!transferTargetId || !currentGroup) return;
    try {
      const { error } = await supabase.from('groups').update({ owner_id: transferTargetId }).eq('id', currentGroup.id);
      if (error) throw error;
      setShowTransferUI(false);
      setTransferTargetId('');
      fetchMyGroups(currentUser.id);
    } catch (err: any) {
      console.error('转移群主失败:', err);
      setError('转移群主失败: ' + err.message);
    }
  };

  const scrollToBottom = () => {
    requestAnimationFrame(() => { messageEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); });
  };

  const handleEmojiSelect = (emoji: any) => {
    setInputValue((prev: string) => prev + emoji.emoji);
    setShowEmojiPanel(false);
  };

  const handleInput = (e: any) => {
    setInputValue(e.target.value);
    setShowAtModal(e.target.value.endsWith('@'));
  };

  const insertAt = (u: any) => {
    setInputValue((prev: string) => prev.replace(/@$/, `@${u.nickname} `));
    setShowAtModal(false);
    inputRef.current.focus();
  };

  // ========== 初始化 + 鉴权状态监听 ==========
  useEffect(() => {
    let isMounted = true;
    let authSubObj: any = null;

    const initPageData = async () => {
      if (!isMounted) return;
      setError(null);
      setLoading(true);
      setUserList([]);
      setGroupList([]);
      setPrivateMsgList([]);
      setGroupMsgList([]);
      setTargetUser(null);
      setCurrentGroup(null);
      setMyProfile(null);
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError) throw authError;
        if (!user) { setCurrentUser(null); setLoading(false); return; }
        setCurrentUser(user);
        const uid = user.id;
        const { data: profile } = await supabase.from('profiles').select('id, avatar_url, nickname').eq('id', uid).maybeSingle();
        setMyProfile(profile || { avatar_url: DEFAULT_EMOJI_AVATAR });
        await fetchAllUsers(uid);
        await fetchAllUsersForGroup(uid);
        await fetchMyGroups(uid);
      } catch (err) {
        console.error("初始化失败：", err);
        setError("加载用户信息失败，请刷新重试");
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    initPageData();
    authSubObj = supabase.auth.onAuthStateChange(async (_: any, session: any) => {
      if (!isMounted) return;
      const user = session?.user || null;
      if (user?.id !== currentUser?.id) await initPageData();
    });
    return () => {
      isMounted = false;
      authSubObj?.data?.subscription.unsubscribe();
    };
  }, [currentUser?.id]);

  // 实时消息监听：next-app 无全局 ChatRedDot，改为直接订阅 messages 表 INSERT，
  // 仅当新消息属于「正在查看的会话」时自动刷新并标记已读。
  useEffect(() => {
    if (!currentUser) return;
    const channel = supabase
      .channel('chat-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload: any) => {
        const m = payload.new as any;
        if (m.group_id) {
          if (currentGroup?.id === m.group_id) {
            fetchGroupMessages(currentGroup.id);
            markAsRead(`group:${m.group_id}`);
          }
        } else {
          const otherId = m.from_user_id === currentUser.id ? m.to_user_id : m.from_user_id;
          if (targetUser?.id === otherId) {
            fetchPrivateMessages(targetUser.id);
            markAsRead(`private:${otherId}`);
          }
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [currentUser, targetUser, currentGroup]);

  useEffect(() => { if (targetUser) fetchPrivateMessages(targetUser.id); }, [targetUser]);
  useEffect(() => { if (currentGroup) fetchGroupMessages(currentGroup.id); }, [currentGroup]);

  // 筛选 + 排序
  const filteredUsers = userList.filter((u: any) => u.nickname?.toLowerCase().includes(searchKeyword.toLowerCase()));
  const filteredGroups = groupList.filter((g: any) => g.group_name?.toLowerCase().includes(searchKeyword.toLowerCase()));
  const sortedFriends = [...filteredUsers].sort((a: any, b: any) => {
    const aTop = privateTopIds.includes(a.id) ? 1 : 0;
    const bTop = privateTopIds.includes(b.id) ? 1 : 0;
    return bTop - aTop;
  });
  const finalFriendList = [webmasterUser, ...sortedFriends];
  const activityMap = getActivityMap();
  const sortedGroups = [...filteredGroups].sort((a: any, b: any) => {
    if (a.is_top && !b.is_top) return -1;
    if (!a.is_top && b.is_top) return 1;
    const aTime = activityMap[`group:${a.id}`] || 0;
    const bTime = activityMap[`group:${b.id}`] || 0;
    return bTime - aTime;
  });
  const myAvatar = myProfile?.avatar_url || DEFAULT_EMOJI_AVATAR;
  const myId = currentUser?.id;

  if (loading) return <div style={{ textAlign: 'center', padding: '60px', color: 'var(--ifm-text-color)' }}><img src="/img/LOADING.gif" alt="加载中" width={56} style={{ opacity: 0.92 }} /></div>;
  if (!currentUser) return <div style={{ textAlign: 'center', padding: '60px', color: 'var(--ifm-text-color)' }}>请先登录</div>;

  return (
    <div className="chat-container" style={{ display: 'flex', width: '96%', maxWidth: '1400px', margin: '30px auto', height: 'calc(100vh - 180px)', minHeight: 0, border: '1px solid var(--ifm-color-emphasis-300)', borderRadius: '16px', overflow: 'hidden', background: 'var(--ifm-card-background-color)' }}>
      <div className="chat-sidebar" style={{ width: isMobile ? (sidebarCollapsed ? '0px' : '100%') : '340px', maxHeight: isMobile ? (sidebarCollapsed ? '0px' : '40vh') : 'none', minHeight: isMobile ? (sidebarCollapsed ? '0px' : '0px') : 'none', flexShrink: 0, borderRight: isMobile ? 'none' : '1px solid var(--ifm-color-emphasis-300)', borderBottom: isMobile ? '1px solid var(--ifm-color-emphasis-300)' : 'none', background: 'var(--ifm-color-emphasis-100)', display: 'flex', flexDirection: 'column', overflow: isMobile ? (sidebarCollapsed ? 'hidden' : 'visible') : 'visible', transition: 'all 0.3s ease' }}>
        <div style={{ display: 'flex', borderBottom: '1px solid var(--ifm-color-emphasis-300)', alignItems: 'center' }}>
          {isMobile && !sidebarCollapsed && (
            <button onClick={() => setSidebarCollapsed(true)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '20px', padding: '12px', color: 'var(--ifm-text-color)', lineHeight: 1 }} title="收起侧边栏">‹</button>
          )}
          <div onClick={() => { setActiveTab('friend'); setTargetUser(null); setCurrentGroup(null); }} style={{ flex: 1, textAlign: 'center', padding: '12px 0', cursor: 'pointer', fontWeight: activeTab === 'friend' ? 600 : 400, borderBottom: activeTab === 'friend' ? '2px solid #07c160' : '2px solid transparent', color: 'var(--ifm-text-color)' }}>好友</div>
          <div onClick={() => { setActiveTab('group'); setTargetUser(null); setCurrentGroup(null); }} style={{ flex: 1, textAlign: 'center', padding: '12px 0', cursor: 'pointer', fontWeight: activeTab === 'group' ? 600 : 400, borderBottom: activeTab === 'group' ? '2px solid #07c160' : '2px solid transparent', color: 'var(--ifm-text-color)' }}>群聊</div>
        </div>

        <div style={{ padding: '16px', display: 'flex', gap: '8px', alignItems: 'center' }}>
          <input value={searchKeyword} onChange={(e) => setSearchKeyword(e.target.value)} placeholder={activeTab === 'friend' ? "搜索联系人" : "搜索群聊"} style={{ flex: 1, padding: '9px 16px', borderRadius: '24px', border: '1px solid var(--ifm-color-emphasis-300)', outline: 'none', background: 'var(--ifm-card-background-color)', color: 'var(--ifm-text-color)' }} />
          <button onClick={() => setShowCreateGroupModal(true)} style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#07c160', color: '#fff', border: 'none', fontSize: '20px', cursor: 'pointer', display: activeTab === 'group' ? 'flex' : 'none', alignItems: 'center', justifyContent: 'center' }} title="创建群聊">+</button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {activeTab === 'friend' && finalFriendList.map((user: any) => (
            <div key={user.isWebmaster ? 'webmaster-fixed' : user.id} onClick={() => { setTargetUser(user); if (!user.isWebmaster) { markAsRead(`private:${user.id}`); recordActivity(`private:${user.id}`); } if (isMobile) setSidebarCollapsed(true); }} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 18px', cursor: 'pointer', background: targetUser?.id === user.id ? 'var(--ifm-color-emphasis-300)' : 'transparent', color: 'var(--ifm-text-color)', ...(user.isWebmaster ? { background: 'rgba(7,193,96,0.08)' } : {}) }}>
              {renderAvatar(user.avatar_url, user.id, 42, user.isWebmaster)}
              <span style={{ flex: 1, fontWeight: user.isWebmaster ? 600 : 400 }}>{user.nickname}</span>
              {user.isWebmaster ? (
                <span style={{ color: '#07c160', fontSize: '12px' }}>永久置顶</span>
              ) : (
                <>
                  <span style={{ color: '#f53f3f', fontSize: '12px', marginRight: '6px' }}>{privateTopIds.includes(user.id) && '置顶'}</span>
                  <button onClick={(e) => { e.stopPropagation(); togglePrivateTop(user.id); }} style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '14px', color: 'var(--ifm-text-color)' }}>{privateTopIds.includes(user.id) ? '取消' : '置顶'}</button>
                </>
              )}
            </div>
          ))}

          {activeTab === 'group' && sortedGroups.map((group: any) => (
            <div key={group.id} onClick={() => { setCurrentGroup(group); setShowGroupSetting(false); markAsRead(`group:${group.id}`); recordActivity(`group:${group.id}`); if (isMobile) setSidebarCollapsed(true); }} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 18px', cursor: 'pointer', background: currentGroup?.id === group.id ? 'var(--ifm-color-emphasis-300)' : 'transparent', color: 'var(--ifm-text-color)' }}>
              {renderGroupAvatar(group.avatar_url, 42)}
              <span style={{ flex: 1 }}>{group.group_name}</span>
              <span style={{ color: '#f53f3f', fontSize: '12px', marginRight: '6px' }}>{group.is_top && '置顶'}</span>
              <button onClick={(e) => { e.stopPropagation(); toggleGroupTop(group.id); }} style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '14px', color: 'var(--ifm-text-color)' }}>{group.is_top ? '取消' : '置顶'}</button>
            </div>
          ))}
        </div>
      </div>

      <div className="chat-main" style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>
        {error && (
          <div style={{ background: '#fff2f0', color: '#ff4d4f', padding: '12px 20px', borderBottom: '1px solid #ffccc7', textAlign: 'center' }}>{error}</div>
        )}

        {activeTab === 'friend' && targetUser ? (
          <>
            <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--ifm-color-emphasis-300)', fontWeight: 600, color: 'var(--ifm-text-color)', display: 'flex', alignItems: 'center', gap: '12px' }}>
              {isMobile && sidebarCollapsed && (
                <button onClick={() => setSidebarCollapsed(false)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '20px', color: 'var(--ifm-text-color)', padding: 0, lineHeight: 1 }} title="展开侧边栏">›</button>
              )}
              <span>{targetUser.nickname}</span>
              {targetUser.isWebmaster && <span style={{ color: '#07c160', marginLeft: 10, fontSize: 12 }}>网站管理员</span>}
            </div>
            <div style={{ flex: 1, minHeight: 0, padding: '24px', background: 'var(--ifm-color-emphasis-100)', overflowY: 'auto' }}>
              {privateMsgList.map((msg: any) => {
                const isSelf = msg.from_user_id === myId;
                return (
                  <div key={msg.id} style={{ display: 'flex', justifyContent: isSelf ? 'flex-end' : 'flex-start', marginBottom: '16px', gap: '10px', alignItems: 'flex-end' }}>
                    {!isSelf && renderAvatar(targetUser.avatar_url, targetUser.id, 34, targetUser.isWebmaster)}
                    <div style={{ maxWidth: '65%', padding: '9px 14px', borderRadius: '20px', background: isSelf ? '#07c160' : 'var(--ifm-card-background-color)', color: isSelf ? '#fff' : 'var(--ifm-text-color)', wordBreak: 'break-word', overflowWrap: 'break-word', whiteSpace: 'pre-wrap' }}>{msg.content}</div>
                    {isSelf && renderAvatar(myAvatar, myId, 34)}
                  </div>
                );
              })}
              <div ref={messageEndRef} />
              {targetUser.isWebmaster && !WEBMASTER_UID && (
                <div style={{ textAlign: 'center', color: '#ff4d4f', padding: 20 }}>管理员尚未配置站长ID，暂时无法收发消息</div>
              )}
            </div>

            <div style={{ padding: '16px 20px', borderTop: '1px solid var(--ifm-color-emphasis-300)', position: 'relative' }}>
              {showAtModal && <div style={{ position: 'absolute', bottom: '80px', left: '20px', background: 'var(--ifm-card-background-color)', border: '1px solid var(--ifm-color-emphasis-300)', borderRadius: '10px', width: '220px', maxHeight: '220px', overflowY: 'auto', zIndex: 999 }}>
                {allUsersForGroup.map((u: any) => <div key={u.id} onClick={() => insertAt(u)} style={{ padding: '10px 16px', cursor: 'pointer', color: 'var(--ifm-text-color)' }}>@{u.nickname}</div>)}
              </div>}
              {showEmojiPanel && <div style={{ position: 'absolute', bottom: '80px', left: '20px', zIndex: 999 }}><EmojiPicker onEmojiClick={handleEmojiSelect} /></div>}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <button onClick={() => setShowEmojiPanel(!showEmojiPanel)} style={{ fontSize: '22px', border: 'none', background: 'transparent', cursor: 'pointer' }}>😊</button>
                <input ref={inputRef} value={inputValue} onChange={handleInput} onKeyDown={(e) => e.key === 'Enter' && sendMessage()} placeholder="输入消息，@可提及用户" style={{ flex: 1, padding: '11px 18px', borderRadius: '26px', border: '1px solid var(--ifm-color-emphasis-300)', background: 'var(--ifm-card-background-color)', color: 'var(--ifm-text-color)' }} />
                <button onClick={sendMessage} disabled={sending} style={{ padding: '10px 22px', borderRadius: '26px', background: sending ? '#94e3b9' : '#07c160', color: '#fff', border: 'none', cursor: sending ? 'not-allowed' : 'pointer' }}>{sending ? "发送中" : "发送"}</button>
              </div>
            </div>
          </>
        ) : null}

        {activeTab === 'group' && currentGroup ? (
          <>
            <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--ifm-color-emphasis-300)', fontWeight: 600, display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--ifm-text-color)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {isMobile && sidebarCollapsed && (
                  <button onClick={() => setSidebarCollapsed(false)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '20px', color: 'var(--ifm-text-color)', padding: 0, lineHeight: 1 }} title="展开侧边栏">›</button>
                )}
                <span>{currentGroup.group_name}</span>
              </div>
              <button onClick={() => { setShowGroupSetting(!showGroupSetting); if (!showGroupSetting) fetchGroupMembers(currentGroup.id); }} style={{ border: 'none', background: 'var(--ifm-color-emphasis-100)', padding: '4px 12px', borderRadius: '6px', cursor: 'pointer', color: 'var(--ifm-text-color)' }}>群聊设置</button>
            </div>

            <div style={{ flex: 1, minHeight: 0, padding: '24px', background: 'var(--ifm-color-emphasis-100)', overflowY: 'auto', position: 'relative' }}>
              {groupMsgList.map((msg: any) => {
                const isSelf = msg.from_user_id === myId;
                const sender = msg.sender || {};
                const senderNickname = sender.nickname || '用户';
                return (
                  <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: isSelf ? 'flex-end' : 'flex-start', marginBottom: '12px' }}>
                    {!isSelf && <div style={{ fontSize: 11, color: '#888', marginBottom: 2, marginLeft: 44, maxWidth: '65%' }}>{senderNickname}</div>}
                    <div style={{ display: 'flex', justifyContent: isSelf ? 'flex-end' : 'flex-start', gap: '10px', alignItems: 'flex-end' }}>
                      {!isSelf && renderAvatar(sender.avatar_url, msg.from_user_id, 34)}
                      <div style={{ maxWidth: '65%', padding: '9px 14px', borderRadius: '20px', background: isSelf ? '#07c160' : 'var(--ifm-card-background-color)', color: isSelf ? '#fff' : 'var(--ifm-text-color)', wordBreak: 'break-word', overflowWrap: 'break-word', whiteSpace: 'pre-wrap' }}>{msg.content}</div>
                      {isSelf && renderAvatar(myAvatar, myId, 34)}
                    </div>
                  </div>
                );
              })}
              <div ref={messageEndRef} />

              {showGroupSetting && (
                <div style={{ position: 'absolute', right: '20px', top: '20px', width: '280px', maxHeight: '60vh', overflowY: 'auto', background: 'var(--ifm-card-background-color)', border: '1px solid var(--ifm-color-emphasis-300)', borderRadius: '12px', padding: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 999, color: 'var(--ifm-text-color)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <h4 style={{ margin: 0 }}>群聊设置</h4>
                    <button onClick={() => setShowGroupSetting(false)} style={{ border: 'none', background: 'transparent', fontSize: 18, cursor: 'pointer', color: 'var(--ifm-text-color)', padding: 0, lineHeight: 1 }}>✕</button>
                  </div>
                  <div style={{ fontSize: 13, marginBottom: 12 }}>
                    <p style={{ margin: '4px 0', color: '#888' }}>群主：{currentGroup.owner_id === myId ? '我' : (groupMembers.find((m: any) => m.id === currentGroup.owner_id)?.nickname || '其他成员')}</p>
                    <p style={{ margin: '4px 0', color: '#888' }}>成员数：{groupMembers.length + 1}</p>
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6, color: '#888' }}>
                      群成员
                      {currentGroup.owner_id === myId && <span style={{ color: '#07c160', marginLeft: 8, cursor: 'pointer' }} onClick={() => setShowTransferUI(!showTransferUI)}>[转移群主]</span>}
                    </div>
                    <div style={{ maxHeight: 120, overflowY: 'auto', border: '1px solid var(--ifm-color-emphasis-200)', borderRadius: 8, padding: 6 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 6px', fontSize: 12 }}>
                        {renderAvatar(myAvatar, myId, 24)}
                        <span style={{ flex: 1 }}>{myProfile?.nickname || '我'}</span>
                        <span style={{ color: '#07c160', fontSize: 10 }}>群主</span>
                      </div>
                      {groupMembers.map((m: any) => (
                        <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 6px', fontSize: 12, borderRadius: 4 }}>
                          {renderAvatar(m.avatar_url, m.id, 24)}
                          <span style={{ flex: 1 }}>{m.nickname || '用户'}</span>
                          {m.id === currentGroup.owner_id && <span style={{ color: '#07c160', fontSize: 10 }}>群主</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                  {showTransferUI && currentGroup.owner_id === myId && (
                    <div style={{ marginBottom: 12, padding: 10, background: '#fff8e1', borderRadius: 8, border: '1px solid #ffe082' }}>
                      <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6, color: '#e65100' }}>⚠️ 转移群主给：</div>
                      <select value={transferTargetId} onChange={(e) => setTransferTargetId(e.target.value)} style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid var(--ifm-color-emphasis-300)', background: 'var(--ifm-card-background-color)', color: 'var(--ifm-text-color)', fontSize: 12, marginBottom: 8 }}>
                        <option value="">-- 选择成员 --</option>
                        {groupMembers.filter((m: any) => m.id !== currentGroup.owner_id).map((m: any) => <option key={m.id} value={m.id}>{m.nickname || '用户'}</option>)}
                      </select>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => { setShowTransferUI(false); setTransferTargetId(''); }} style={{ flex: 1, padding: '5px 8px', border: '1px solid #ddd', borderRadius: 4, background: '#fff', cursor: 'pointer', fontSize: 11, color: '#666' }}>取消</button>
                        <button onClick={transferGroupOwner} disabled={!transferTargetId} style={{ flex: 1, padding: '5px 8px', border: 'none', borderRadius: 4, background: transferTargetId ? '#e65100' : '#ccc', color: '#fff', cursor: transferTargetId ? 'pointer' : 'not-allowed', fontSize: 11 }}>确认转移</button>
                      </div>
                    </div>
                  )}
                  <button onClick={() => quitGroup(currentGroup.id)} style={{ width: '100%', padding: '8px', marginTop: '6px', background: '#ff7875', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: 13 }}>退出群聊</button>
                  {currentGroup.owner_id === myId && (
                    <button onClick={() => dissolveGroup(currentGroup.id)} style={{ width: '100%', padding: '8px', marginTop: '8px', background: '#f5222d', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: 13 }}>解散群聊</button>
                  )}
                </div>
              )}
            </div>

            <div style={{ padding: '16px 20px', borderTop: '1px solid var(--ifm-color-emphasis-300)', position: 'relative' }}>
              {showAtModal && <div style={{ position: 'absolute', bottom: '80px', left: '20px', background: 'var(--ifm-card-background-color)', border: '1px solid var(--ifm-color-emphasis-300)', borderRadius: '10px', width: '220px', maxHeight: '220px', overflowY: 'auto', zIndex: 999 }}>
                {allUsersForGroup.map((u: any) => <div key={u.id} onClick={() => insertAt(u)} style={{ padding: '10px 16px', cursor: 'pointer', color: 'var(--ifm-text-color)' }}>@{u.nickname}</div>)}
              </div>}
              {showEmojiPanel && <div style={{ position: 'absolute', bottom: '80px', left: '20px', zIndex: 999 }}><EmojiPicker onEmojiClick={handleEmojiSelect} /></div>}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <button onClick={() => setShowEmojiPanel(!showEmojiPanel)} style={{ fontSize: '22px', border: 'none', background: 'transparent', cursor: 'pointer' }}>😊</button>
                <input ref={inputRef} value={inputValue} onChange={handleInput} onKeyDown={(e) => e.key === 'Enter' && sendMessage()} placeholder="输入消息，@可提及用户" style={{ flex: 1, padding: '11px 18px', borderRadius: '26px', border: '1px solid var(--ifm-color-emphasis-300)', background: 'var(--ifm-card-background-color)', color: 'var(--ifm-text-color)' }} />
                <button onClick={sendMessage} disabled={sending} style={{ padding: '10px 22px', borderRadius: '26px', background: sending ? '#94e3b9' : '#07c160', color: '#fff', border: 'none', cursor: sending ? 'not-allowed' : 'pointer' }}>{sending ? "发送中" : "发送"}</button>
              </div>
            </div>
          </>
        ) : null}

        {(!targetUser && !currentGroup) && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', color: 'var(--ifm-color-emphasis-600)' }}>
            <div>{activeTab === 'friend' ? '选择好友开始私聊' : '选择群聊开始聊天'}</div>
            {isMobile && sidebarCollapsed && (
              <button onClick={() => setSidebarCollapsed(false)} style={{ padding: '10px 24px', borderRadius: '20px', border: 'none', background: '#07c160', color: '#fff', cursor: 'pointer', fontSize: '14px', fontWeight: 500 }}>展开联系人</button>
            )}
          </div>
        )}
      </div>

      {showCreateGroupModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ width: '420px', background: 'var(--ifm-card-background-color)', borderRadius: '16px', padding: '24px', boxShadow: '0 8px 24px rgba(0,0,0,0.15)', color: 'var(--ifm-text-color)' }}>
            <h3 style={{ margin: '0 0 16px' }}>创建新群聊</h3>
            <input value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} placeholder="请输入群聊名称" style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--ifm-color-emphasis-300)', marginBottom: '16px', boxSizing: 'border-box', background: 'var(--ifm-card-background-color)', color: 'var(--ifm-text-color)' }} />
            <div style={{ marginBottom: '16px' }}>
              <p style={{ margin: '0 0 8px' }}>选择群成员：</p>
              <div style={{ maxHeight: '180px', overflowY: 'auto', border: '1px solid var(--ifm-color-emphasis-300)', borderRadius: '8px', padding: '8px' }}>
                {allUsersForGroup.map((u: any) => (
                  <div key={u.id} onClick={() => { setSelectedMemberIds(selectedMemberIds.includes(u.id) ? selectedMemberIds.filter((id) => id !== u.id) : [...selectedMemberIds, u.id]); }} style={{ padding: '6px 8px', cursor: 'pointer', background: selectedMemberIds.includes(u.id) ? 'var(--ifm-color-emphasis-100)' : 'transparent', borderRadius: '4px', margin: '2px 0' }}>{u.nickname}</div>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button onClick={() => { setShowCreateGroupModal(false); setError(null); }} style={{ padding: '8px 16px', border: '1px solid var(--ifm-color-emphasis-300)', borderRadius: '6px', background: 'var(--ifm-card-background-color)', cursor: 'pointer', color: 'var(--ifm-text-color)' }}>取消</button>
              <button onClick={createGroup} style={{ padding: '8px 16px', border: 'none', borderRadius: '6px', background: '#07c160', color: '#fff', cursor: 'pointer' }}>确认创建</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
>>>>>>> 54107eca (deploy: /app 改动推上线（SiteHeader 移动端侧栏关闭、ui.css 导航高度，及新页面）)
