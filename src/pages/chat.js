import React, { useState, useEffect, useRef } from 'react';
import EmojiPicker from 'emoji-picker-react';
import Layout from '@theme/Layout';
import { supabase } from '@site/src/supabase/supabaseClient';
import { triggerGlobalProfileRefresh } from '@site/src/utils/globalProfileUtil';
import { markAsRead, incrementUnread, recordActivity, getActivityMap } from '../utils/chatNotification';

// 固定常量
const PROFILE_PAGE = '/profile';
const DEFAULT_EMOJI_AVATAR = '😀';
const DEFAULT_GROUP_AVATAR = '👥';

// ========== 【重点！！你只需修改这里】站长用户ID，空=未配置，自行填写数据库UUID ==========
// 填写方法：复制 supabase profiles 表中站长账号的 id 字符串粘贴到引号内
const WEBMASTER_UID = "31452874-c41a-4e2e-a497-8b67e42ccafa";
// 站长展示名称（固定）
const WEBMASTER_NAME = "联系站长";

export const metadata = {
  ssr: false
};

export default function ChatPage() {
  // ========== 基础用户状态 ==========
  const [currentUser, setCurrentUser] = useState(null);
  const [myProfile, setMyProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ========== 好友/私聊相关 ==========
  const [userList, setUserList] = useState([]);
  const [targetUser, setTargetUser] = useState(null);
  const [privateMsgList, setPrivateMsgList] = useState([]);
  const [privateTopIds, setPrivateTopIds] = useState([]);

  // ========== 群聊相关 ==========
  const [activeTab, setActiveTab] = useState('friend');
  const [groupList, setGroupList] = useState([]);
  const [currentGroup, setCurrentGroup] = useState(null);
  const [groupMsgList, setGroupMsgList] = useState([]);
  const [groupTopIds, setGroupTopIds] = useState([]);
  const [showGroupSetting, setShowGroupSetting] = useState(false);
  const [groupMembers, setGroupMembers] = useState([]);
  const [transferTargetId, setTransferTargetId] = useState('');
  const [showTransferUI, setShowTransferUI] = useState(false);
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [selectedMemberIds, setSelectedMemberIds] = useState([]);

  // ========== 输入/表情/@ 相关 ==========
  const [searchKeyword, setSearchKeyword] = useState('');
  const [inputValue, setInputValue] = useState('');
  const [showEmojiPanel, setShowEmojiPanel] = useState(false);
  const [showAtModal, setShowAtModal] = useState(false);
  const [sending, setSending] = useState(false);

  // DOM 引用
  const messageEndRef = useRef(null);
  const inputRef = useRef(null);

  // 站长真实头像 URL
  const WEBMASTER_AVATAR = 'https://github.com/ye2f4.png';

  // 组装固定站长对象（永久置顶）
  const webmasterUser = {
    id: WEBMASTER_UID,
    nickname: WEBMASTER_NAME,
    avatar_url: WEBMASTER_AVATAR,
    isWebmaster: true // 自定义标记：站长专属
  };

  // ===================== 头像渲染 =====================
  const renderAvatar = (avatarUrl, userId, size = 42, isWebmaster = false) => {
    // 站长强制使用默认头像
    if (isWebmaster) {
      return (
        <div
          style={{
            width: size, height: size, borderRadius: '50%', background: 'var(--ifm-color-emphasis-100)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: size * 0.6, flexShrink: 0, boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            cursor: 'pointer', userSelect: 'none'
          }}
        >
          {DEFAULT_EMOJI_AVATAR}
        </div>
      );
    }

    const isNetImage = avatarUrl && (avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://'));

    if (isNetImage) {
      return (
        <img
          src={avatarUrl}
          alt="头像"
          loading="lazy"
          style={{
            width: size, height: size, borderRadius: '50%', objectFit: 'cover',
            flexShrink: 0, boxShadow: '0 2px 8px rgba(0,0,0,0.1)', cursor: 'pointer'
          }}
          onClick={(e) => { e.stopPropagation(); window.location.href = `${PROFILE_PAGE}?uid=${userId}`; }}
          onError={(e) => e.target.style.display = 'none'}
        />
      );
    }

    const showEmoji = avatarUrl || DEFAULT_EMOJI_AVATAR;
    return (
      <div
        style={{
          width: size, height: size, borderRadius: '50%', background: 'var(--ifm-color-emphasis-100)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: size * 0.6, flexShrink: 0, boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          cursor: 'pointer', userSelect: 'none'
        }}
        onClick={(e) => { e.stopPropagation(); window.location.href = `${PROFILE_PAGE}?uid=${userId}`; }}
      >
        {showEmoji}
      </div>
    );
  };

  const renderGroupAvatar = (avatarUrl, size = 42) => {
    const emoji = avatarUrl || DEFAULT_GROUP_AVATAR;
    return (
      <div
        style={{
          width: size, height: size, borderRadius: '50%', background: 'var(--ifm-color-emphasis-100)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: size * 0.6, flexShrink: 0, boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}
      >
        {emoji}
      </div>
    );
  };

  // ===================== 数据请求方法 =====================
  // 好友列表（排除站长）
  const fetchAllUsers = async (selfUid) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, nickname, avatar_url')
        .neq('id', selfUid)
        .neq('id', WEBMASTER_UID);

      if (error) throw error;
      setUserList(data || []);
    } catch (err) {
      console.error("加载联系人失败：", err);
      setError("加载联系人失败，请刷新重试");
    }
  };

  // 群聊选人列表（包含除自己之外的所有用户，包括站长）
  const [allUsersForGroup, setAllUsersForGroup] = useState([]);
  const fetchAllUsersForGroup = async (selfUid) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, nickname, avatar_url')
        .neq('id', selfUid);

      if (error) throw error;
      setAllUsersForGroup(data || []);
    } catch (err) {
      console.error("加载群聊选人列表失败：", err);
    }
  };

  const fetchMyGroups = async (selfUid) => {
    try {
      const { data: memberData, error: memberErr } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', selfUid);

      if (memberErr) throw memberErr;
      if (!memberData || memberData.length === 0) {
        setGroupList([]);
        return;
      }

      const groupIds = memberData.map(item => item.group_id);
      const { data: groups, error: groupErr } = await supabase
        .from('groups')
        .select('id, group_name, avatar_url, owner_id, is_top')
        .in('id', groupIds)
        .order('is_top', { ascending: false });

      if (groupErr) throw groupErr;
      setGroupList(groups || []);
      setGroupTopIds(groups.filter(g => g.is_top).map(g => g.id));
    } catch (err) {
      console.error("加载群聊失败：", err);
    }
  };

  const fetchPrivateMessages = async (toUserId) => {
    if (!currentUser || !toUserId) return;
    // 空ID不请求（站长未配置时）
    if (!toUserId) {
      setPrivateMsgList([]);
      return;
    }
    try {
      const { data: msgData, error: msgError } = await supabase
        .from('messages')
        .select('*')
        .is('group_id', null)
        .or(`and(from_user_id.eq.${currentUser.id},to_user_id.eq.${toUserId}),and(from_user_id.eq.${toUserId},to_user_id.eq.${currentUser.id})`)
        .order('created_at', { ascending: true });

      if (msgError) throw msgError;
      if (!msgData) { setPrivateMsgList([]); scrollToBottom(); return; }

      const userIds = [...new Set(msgData.map(m => m.from_user_id))];
      const { data: profileData } = await supabase.from('profiles').select('id, avatar_url').in('id', userIds);
      const map = {};
      profileData?.forEach(p => map[p.id] = p);

      setPrivateMsgList(msgData.map(m => ({ ...m, sender: map[m.from_user_id] || {} })));
      scrollToBottom();
    } catch (err) {
      console.error("加载私聊消息失败：", err);
      setError("加载聊天记录失败，请刷新重试");
    }
  };

  const fetchGroupMessages = async (groupId) => {
    if (!currentUser || !groupId) return;
    try {
      const { data: msgData, error: msgError } = await supabase
        .from('messages')
        .select('*')
        .eq('group_id', groupId)
        .order('created_at', { ascending: true });

      if (msgError) throw msgError;
      if (!msgData) { setGroupMsgList([]); scrollToBottom(); return; }

      const userIds = [...new Set(msgData.map(m => m.from_user_id))];
      const { data: profileData } = await supabase.from('profiles').select('id, avatar_url, nickname').in('id', userIds);
      const map = {};
      profileData?.forEach(p => map[p.id] = p);

      setGroupMsgList(msgData.map(m => ({ ...m, sender: map[m.from_user_id] || {} })));
      scrollToBottom();
    } catch (err) {
      console.error("加载群聊消息失败：", err);
    }
  };

  const sendMessage = async () => {
    const txt = inputValue.trim();
    if (!txt || sending) return;

    // 禁止未配置站长ID时发送
    if (targetUser?.isWebmaster && !WEBMASTER_UID) {
      setError("站长ID未配置，无法发送消息，请管理员配置站长UID");
      return;
    }

    setSending(true);
    setError(null);
    try {
      if (activeTab === 'friend' && targetUser) {
        const { error } = await supabase.from('messages').insert([{
          from_user_id: currentUser.id,
          to_user_id: targetUser.id,
          content: txt,
          created_at: new Date()
        }]);
        if (error) throw error;
        setInputValue('');
        fetchPrivateMessages(targetUser.id);
      } else if (activeTab === 'group' && currentGroup) {
        // 群消息不设 to_user_id（用 from_user_id 代替以满足表 NOT NULL 约束）
        const { error } = await supabase.from('messages').insert([{
          from_user_id: currentUser.id,
          to_user_id: currentUser.id,
          group_id: currentGroup.id,
          content: txt,
          created_at: new Date()
        }]);
        if (error) throw error;
        setInputValue('');
        fetchGroupMessages(currentGroup.id);
      }
    } catch (err) {
      console.error("发送消息失败：", err);
      setError(`发送失败：${err.message || '未知错误'}`);
    } finally {
      setSending(false);
    }
  };

  const togglePrivateTop = async (userId) => {
    // 禁止置顶/取消置顶站长
    if (userId === WEBMASTER_UID) return;
    const isTop = privateTopIds.includes(userId);
    if (isTop) {
      setPrivateTopIds(privateTopIds.filter(id => id !== userId));
    } else {
      setPrivateTopIds([...privateTopIds, userId]);
    }
  };

  const toggleGroupTop = async (groupId) => {
    const targetGroup = groupList.find(g => g.id === groupId);
    const newTopState = !targetGroup.is_top;
    await supabase.from('groups').update({ is_top: newTopState }).eq('id', groupId);
    fetchMyGroups(currentUser.id);
  };

  const createGroup = async () => {
    if (!newGroupName.trim() || selectedMemberIds.length === 0) {
      setError("群名和成员不能为空");
      return;
    }
    try {
      const { data: newGroup, error: groupErr } = await supabase
        .from('groups')
        .insert([{
          group_name: newGroupName,
          owner_id: currentUser.id,
          avatar_url: DEFAULT_GROUP_AVATAR
        }])
        .select()
        .single();

      if (groupErr) throw groupErr;

      const allMemberIds = [...selectedMemberIds, currentUser.id];
      const memberList = allMemberIds.map(uid => ({ group_id: newGroup.id, user_id: uid }));
      await supabase.from('group_members').insert(memberList);

      setShowCreateGroupModal(false);
      setNewGroupName('');
      setSelectedMemberIds([]);
      fetchMyGroups(currentUser.id);
    } catch (err) {
      setError("创建群聊失败：" + err.message);
    }
  };

  const quitGroup = async (groupId) => {
    await supabase.from('group_members').delete().match({ group_id: groupId, user_id: currentUser.id });
    setCurrentGroup(null);
    setShowGroupSetting(false);
    fetchMyGroups(currentUser.id);
  };

  const dissolveGroup = async (groupId) => {
    await supabase.from('groups').delete().eq('id', groupId);
    setCurrentGroup(null);
    setShowGroupSetting(false);
    fetchMyGroups(currentUser.id);
  };

  // 获取群成员列表（用于群主转移）
  const fetchGroupMembers = async (groupId) => {
    try {
      const { data: members, error } = await supabase
        .from('group_members')
        .select('user_id')
        .eq('group_id', groupId);
      if (error) throw error;
      const userIds = members.map(m => m.user_id).filter(id => id !== currentUser.id);
      if (userIds.length === 0) {
        setGroupMembers([]);
        return;
      }
      const { data: profiles, error: pErr } = await supabase
        .from('profiles')
        .select('id, nickname, avatar_url')
        .in('id', userIds);
      if (pErr) throw pErr;
      setGroupMembers(profiles || []);
    } catch (err) {
      console.error('获取群成员失败:', err);
    }
  };

  // 转移群主
  const transferGroupOwner = async () => {
    if (!transferTargetId || !currentGroup) return;
    try {
      const { error } = await supabase
        .from('groups')
        .update({ owner_id: transferTargetId })
        .eq('id', currentGroup.id);
      if (error) throw error;
      setShowTransferUI(false);
      setTransferTargetId('');
      fetchMyGroups(currentUser.id);
    } catch (err) {
      console.error('转移群主失败:', err);
      setError('转移群主失败: ' + err.message);
    }
  };

  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      messageEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    });
  };

  const handleEmojiSelect = (emoji) => {
    setInputValue(prev => prev + emoji.emoji);
    setShowEmojiPanel(false);
  };

  const handleInput = (e) => {
    setInputValue(e.target.value);
    setShowAtModal(e.target.value.endsWith('@'));
  };

  const insertAt = (u) => {
    setInputValue(prev => prev.replace(/@$/, `@${u.nickname} `));
    setShowAtModal(false);
    inputRef.current.focus();
  };

  // ========== 初始化 + 全局资料刷新监听 ==========
  useEffect(() => {
    let isMounted = true;
    let authSubObj = null;

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

        if (!user) {
          setCurrentUser(null);
          setLoading(false);
          return;
        }

        setCurrentUser(user);
        const uid = user.id;
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, avatar_url, nickname')
          .eq('id', uid)
          .maybeSingle();
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

    authSubObj = supabase.auth.onAuthStateChange(async (_, session) => {
      if (!isMounted) return;
      const user = session?.user || null;
      if (user?.id !== currentUser?.id) {
        await initPageData();
      }
    });

    const handleProfileUpdate = async () => {
      if (!currentUser) return;
      await fetchAllUsers(currentUser.id);
    };
    window.addEventListener('globalProfileUpdated', handleProfileUpdate);

    return () => {
      isMounted = false;
      authSubObj?.data?.subscription.unsubscribe();
      window.removeEventListener('globalProfileUpdated', handleProfileUpdate);
    };
  }, [currentUser?.id]);

  // 实时消息监听（含未读跟踪）
  useEffect(() => {
    if (!currentUser) return;
    const channel = supabase.channel('chat-real-time')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        const msg = payload.new;
        // 忽略自己发的消息
        if (msg.from_user_id === currentUser.id) return;

        // 私聊：正在看该会话则刷新，否则增加未读
        if (!msg.group_id) {
          const convId = `private:${msg.from_user_id}`;
          recordActivity(convId);
          if (targetUser?.id === msg.from_user_id) {
            fetchPrivateMessages(targetUser.id);
          } else {
            incrementUnread(convId);
          }
        }
        // 群聊：正在看该群则刷新，否则增加未读
        if (msg.group_id) {
          const convId = `group:${msg.group_id}`;
          recordActivity(convId);
          if (currentGroup?.id === msg.group_id) {
            fetchGroupMessages(currentGroup.id);
          } else {
            incrementUnread(convId);
          }
        }
      }).subscribe();

    return () => {
      channel?.unsubscribe();
    };
  }, [currentUser, targetUser, currentGroup]);

  useEffect(() => {
    if (targetUser) fetchPrivateMessages(targetUser.id);
  }, [targetUser]);

  useEffect(() => {
    if (currentGroup) fetchGroupMessages(currentGroup.id);
  }, [currentGroup]);

  // 筛选好友列表 + 【固定置顶站长在最顶部】
  const filteredUsers = userList.filter(u =>
    u.nickname?.toLowerCase().includes(searchKeyword.toLowerCase())
  );
  const filteredGroups = groupList.filter(g =>
    g.group_name?.toLowerCase().includes(searchKeyword.toLowerCase())
  );

  // 排序：站长永久第一，其余按置顶排序
  const sortedFriends = [...filteredUsers].sort((a, b) => {
    const aTop = privateTopIds.includes(a.id) ? 1 : 0;
    const bTop = privateTopIds.includes(b.id) ? 1 : 0;
    return bTop - aTop;
  });

  // 最终列表 = 首位站长 + 普通好友
  const finalFriendList = [webmasterUser, ...sortedFriends];

  // 群聊排序：有新消息的靠前
  const activityMap = getActivityMap();
  const sortedGroups = [...filteredGroups].sort((a, b) => {
    // 置顶优先
    if (a.is_top && !b.is_top) return -1;
    if (!a.is_top && b.is_top) return 1;
    // 然后按最近活跃时间排序（新消息在前）
    const aTime = activityMap[`group:${a.id}`] || 0;
    const bTime = activityMap[`group:${b.id}`] || 0;
    return bTime - aTime;
  });

  const myAvatar = myProfile?.avatar_url || DEFAULT_EMOJI_AVATAR;
  const myId = currentUser?.id;

  if (loading) return <Layout title="聊天"><div style={{ textAlign: 'center', padding: '60px', color:'var(--ifm-text-color)' }}>加载中...</div></Layout>;
  if (!currentUser) return <Layout title="聊天"><div style={{ textAlign: 'center', padding: '60px', color:'var(--ifm-text-color)' }}>请先登录</div></Layout>;

  return (
    <Layout title="在线聊天">
      <div className="chat-container" style={{
        display: 'flex', width: '96%', maxWidth: '1400px', margin: '30px auto',
        height: 'calc(100vh - 180px)', border: '1px solid var(--ifm-color-emphasis-300)', borderRadius: '16px',
        overflow: 'hidden', background: 'var(--ifm-card-background-color)'
      }}>
        <div className="chat-sidebar" style={{ width: '340px', borderRight: '1px solid var(--ifm-color-emphasis-300)', background: 'var(--ifm-color-emphasis-100)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', borderBottom: '1px solid var(--ifm-color-emphasis-300)' }}>
            <div
              onClick={() => { setActiveTab('friend'); setTargetUser(null); setCurrentGroup(null); }}
              style={{
                flex: 1, textAlign: 'center', padding: '12px 0', cursor: 'pointer',
                fontWeight: activeTab === 'friend' ? 600 : 400,
                borderBottom: activeTab === 'friend' ? '2px solid #07c160' : '2px solid transparent',
                color:'var(--ifm-text-color)'
              }}
            >好友</div>
            <div
              onClick={() => { setActiveTab('group'); setTargetUser(null); setCurrentGroup(null); }}
              style={{
                flex: 1, textAlign: 'center', padding: '12px 0', cursor: 'pointer',
                fontWeight: activeTab === 'group' ? 600 : 400,
                borderBottom: activeTab === 'group' ? '2px solid #07c160' : '2px solid transparent',
                color:'var(--ifm-text-color)'
              }}
            >群聊</div>
          </div>

          <div style={{ padding: '16px', display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              placeholder={activeTab === 'friend' ? "搜索联系人" : "搜索群聊"}
              style={{
                flex: 1, padding: '9px 16px', borderRadius: '24px',
                border: '1px solid var(--ifm-color-emphasis-300)', outline: 'none',
                background:'var(--ifm-card-background-color)',
                color:'var(--ifm-text-color)'
              }}
            />
            <button
              onClick={() => setShowCreateGroupModal(true)}
              style={{
                width: '36px', height: '36px', borderRadius: '50%',
                background: '#07c160', color: '#fff', border: 'none',
                fontSize: '20px', cursor: 'pointer', display: activeTab === 'group' ? 'flex' : 'none',
                alignItems: 'center', justifyContent: 'center'
              }}
              title="创建群聊"
            >+</button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto' }}>
            {activeTab === 'friend' && finalFriendList.map(user => (
              <div
                key={user.isWebmaster ? 'webmaster-fixed' : user.id}
                onClick={() => {
                  setTargetUser(user);
                  if (!user.isWebmaster) {
                    markAsRead(`private:${user.id}`);
                    recordActivity(`private:${user.id}`);
                  }
                }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 18px',
                  cursor: 'pointer', 
                  background: targetUser?.id === user.id ? 'var(--ifm-color-emphasis-300)' : 'transparent',
                  color:'var(--ifm-text-color)',
                  // 站长增加浅色背景区分
                  ...(user.isWebmaster ? {background:'rgba(7,193,96,0.08)'} : {})
                }}
              >
                {renderAvatar(user.avatar_url, user.id, 42, user.isWebmaster)}
                <span style={{ flex: 1, fontWeight: user.isWebmaster ? 600 : 400 }}>{user.nickname}</span>
                
                {/* 站长永久置顶标签、禁止操作按钮 */}
                {user.isWebmaster ? (
                  <span style={{ color: '#07c160', fontSize: '12px' }}>永久置顶</span>
                ) : (
                  <>
                    <span style={{ color: '#f53f3f', fontSize: '12px', marginRight: '6px' }}>
                      {privateTopIds.includes(user.id) && '置顶'}
                    </span>
                    <button
                      onClick={(e) => { e.stopPropagation(); togglePrivateTop(user.id); }}
                      style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '14px', color:'var(--ifm-text-color)' }}
                    >{privateTopIds.includes(user.id) ? '取消' : '置顶'}</button>
                  </>
                )}
              </div>
            ))}

            {activeTab === 'group' && sortedGroups.map(group => (
              <div
                key={group.id}
                onClick={() => {
                  setCurrentGroup(group);
                  setShowGroupSetting(false);
                  markAsRead(`group:${group.id}`);
                  recordActivity(`group:${group.id}`);
                }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 18px',
                  cursor: 'pointer', background: currentGroup?.id === group.id ? 'var(--ifm-color-emphasis-300)' : 'transparent',
                  color:'var(--ifm-text-color)'
                }}
              >
                {renderGroupAvatar(group.avatar_url, 42)}
                <span style={{ flex: 1 }}>{group.group_name}</span>
                <span style={{ color: '#f53f3f', fontSize: '12px', marginRight: '6px' }}>
                  {group.is_top && '置顶'}
                </span>
                <button
                  onClick={(e) => { e.stopPropagation(); toggleGroupTop(group.id); }}
                  style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '14px', color:'var(--ifm-text-color)' }}
                >{group.is_top ? '取消' : '置顶'}</button>
              </div>
            ))}
          </div>
        </div>

        <div className="chat-main" style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>
          {error && (
            <div style={{
              background: '#fff2f0', color: '#ff4d4f', padding: '12px 20px',
              borderBottom: '1px solid #ffccc7', textAlign: 'center'
            }}>{error}</div>
          )}

          {activeTab === 'friend' && targetUser ? (
            <>
              <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--ifm-color-emphasis-300)', fontWeight: 600, color:'var(--ifm-text-color)' }}>
                {targetUser.nickname}
                {targetUser.isWebmaster && <span style={{ color:'#07c160',marginLeft:10,fontSize:12 }}>网站管理员</span>}
              </div>
              <div style={{ flex: 1, padding: '24px', background: 'var(--ifm-color-emphasis-100)', overflowY: 'auto' }}>
                {privateMsgList.map(msg => {
                  const isSelf = msg.from_user_id === myId;
                  return (
                    <div key={msg.id} style={{ display: 'flex', justifyContent: isSelf ? 'flex-end' : 'flex-start', marginBottom: '16px', gap: '10px', alignItems: 'flex-end' }}>
                      {!isSelf && renderAvatar(targetUser.avatar_url, targetUser.id, 34, targetUser.isWebmaster)}
                      <div style={{
                        maxWidth: '65%', padding: '9px 14px', borderRadius: '20px',
                        background: isSelf ? '#07c160' : 'var(--ifm-card-background-color)',
                        color: isSelf ? '#fff' : 'var(--ifm-text-color)'
                      }}>{msg.content}</div>
                      {isSelf && renderAvatar(myAvatar, myId, 34)}
                    </div>
                  );
                })}
                <div ref={messageEndRef} />

                {/* 站长未配置提示 */}
                {targetUser.isWebmaster && !WEBMASTER_UID && (
                  <div style={{textAlign:'center',color:'#ff4d4f',padding:20}}>
                    管理员尚未配置站长ID，暂时无法收发消息
                  </div>
                )}
              </div>

              <div style={{ padding: '16px 20px', borderTop: '1px solid var(--ifm-color-emphasis-300)', position: 'relative' }}>
                {showAtModal && <div style={{ position: 'absolute', bottom: '80px', left: '20px', background: 'var(--ifm-card-background-color)', border: '1px solid var(--ifm-color-emphasis-300)', borderRadius: '10px', width: '220px', maxHeight: '220px', overflowY: 'auto', zIndex: 999 }}>
                  {allUsersForGroup.map(u => <div key={u.id} onClick={() => insertAt(u)} style={{ padding: '10px 16px', cursor: 'pointer', color:'var(--ifm-text-color)' }}>@{u.nickname}</div>)}
                </div>}
                {showEmojiPanel && <div style={{ position: 'absolute', bottom: '80px', left: '20px', zIndex: 999 }}>
                  <EmojiPicker onEmojiClick={handleEmojiSelect} />
                </div>}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <button onClick={() => setShowEmojiPanel(!showEmojiPanel)} style={{ fontSize: '22px', border: 'none', background: 'transparent', cursor: 'pointer' }}>😊</button>
                  <input
                    ref={inputRef}
                    value={inputValue}
                    onChange={handleInput}
                    onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                    placeholder="输入消息，@可提及用户"
                    style={{ flex: 1, padding: '11px 18px', borderRadius: '26px', border: '1px solid var(--ifm-color-emphasis-300)', background:'var(--ifm-card-background-color)', color:'var(--ifm-text-color)' }}
                  />
                  <button
                    onClick={sendMessage}
                    disabled={sending}
                    style={{
                      padding: '10px 22px', borderRadius: '26px',
                      background: sending ? '#94e3b9' : '#07c160',
                      color: '#fff', border: 'none', cursor: sending ? 'not-allowed' : 'pointer'
                    }}
                  >{sending ? "发送中" : "发送"}</button>
                </div>
              </div>
            </>
          ) : null}

          {activeTab === 'group' && currentGroup ? (
            <>
              <div style={{
                padding: '16px 24px', borderBottom: '1px solid var(--ifm-color-emphasis-300)',
                fontWeight: 600, display: 'flex', justifyContent: 'space-between', alignItems: 'center', color:'var(--ifm-text-color)'
              }}>
                <span>{currentGroup.group_name}</span>
                <button
                  onClick={() => {
                  setShowGroupSetting(!showGroupSetting);
                  if (!showGroupSetting) fetchGroupMembers(currentGroup.id);
                }}
                  style={{ border: 'none', background: 'var(--ifm-color-emphasis-100)', padding: '4px 12px', borderRadius: '6px', cursor: 'pointer', color:'var(--ifm-text-color)' }}
                >群聊设置</button>
              </div>

              <div style={{ flex: 1, padding: '24px', background: 'var(--ifm-color-emphasis-100)', overflowY: 'auto', position: 'relative' }}>
                {groupMsgList.map(msg => {
                  const isSelf = msg.from_user_id === myId;
                  const sender = msg.sender || {};
                  const senderNickname = sender.nickname || '用户';
                  return (
                    <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: isSelf ? 'flex-end' : 'flex-start', marginBottom: '12px' }}>
                      {!isSelf && (
                        <div style={{ fontSize: 11, color: '#888', marginBottom: 2, marginLeft: 44, maxWidth: '65%' }}>
                          {senderNickname}
                        </div>
                      )}
                      <div style={{ display: 'flex', justifyContent: isSelf ? 'flex-end' : 'flex-start', gap: '10px', alignItems: 'flex-end' }}>
                        {!isSelf && renderAvatar(sender.avatar_url, msg.from_user_id, 34)}
                        <div style={{
                          maxWidth: '65%', padding: '9px 14px', borderRadius: '20px',
                          background: isSelf ? '#07c160' : 'var(--ifm-card-background-color)',
                          color: isSelf ? '#fff' : 'var(--ifm-text-color)'
                        }}>{msg.content}</div>
                        {isSelf && renderAvatar(myAvatar, myId, 34)}
                      </div>
                    </div>
                  );
                })}
                <div ref={messageEndRef} />

                {showGroupSetting && (
                  <div style={{
                    position: 'absolute', right: '20px', top: '20px', width: '280px',
                    maxHeight: '60vh', overflowY: 'auto',
                    background: 'var(--ifm-card-background-color)', border: '1px solid var(--ifm-color-emphasis-300)', borderRadius: '12px',
                    padding: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 999, color:'var(--ifm-text-color)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <h4 style={{ margin: 0 }}>群聊设置</h4>
                      <button onClick={() => setShowGroupSetting(false)} style={{
                        border: 'none', background: 'transparent', fontSize: 18, cursor: 'pointer',
                        color: 'var(--ifm-text-color)', padding: 0, lineHeight: 1
                      }}>✕</button>
                    </div>

                    <div style={{ fontSize: 13, marginBottom: 12 }}>
                      <p style={{ margin: '4px 0', color: '#888' }}>
                        群主：{currentGroup.owner_id === myId ? '我' : (groupMembers.find(m => m.id === currentGroup.owner_id)?.nickname || '其他成员')}
                      </p>
                      <p style={{ margin: '4px 0', color: '#888' }}>
                        成员数：{groupMembers.length + 1}
                      </p>
                    </div>

                    {/* 群成员列表 */}
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6, color: '#888' }}>
                        群成员
                        {currentGroup.owner_id === myId && (
                          <span style={{ color: '#07c160', marginLeft: 8, cursor: 'pointer' }}
                            onClick={() => setShowTransferUI(!showTransferUI)}
                          >[转移群主]</span>
                        )}
                      </div>
                      <div style={{ maxHeight: 120, overflowY: 'auto', border: '1px solid var(--ifm-color-emphasis-200)', borderRadius: 8, padding: 6 }}>
                        {/* 群主（自己） */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 6px', fontSize: 12 }}>
                          {renderAvatar(myAvatar, myId, 24)}
                          <span style={{ flex: 1 }}>{myProfile?.nickname || '我'}</span>
                          <span style={{ color: '#07c160', fontSize: 10 }}>群主</span>
                        </div>
                        {/* 其他成员 */}
                        {groupMembers.map(m => (
                          <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 6px', fontSize: 12, borderRadius: 4 }}>
                            {renderAvatar(m.avatar_url, m.id, 24)}
                            <span style={{ flex: 1 }}>{m.nickname || '用户'}</span>
                            {m.id === currentGroup.owner_id && (
                              <span style={{ color: '#07c160', fontSize: 10 }}>群主</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* 群主转移 UI */}
                    {showTransferUI && currentGroup.owner_id === myId && (
                      <div style={{
                        marginBottom: 12, padding: 10, background: '#fff8e1',
                        borderRadius: 8, border: '1px solid #ffe082'
                      }}>
                        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6, color: '#e65100' }}>
                          ⚠️ 转移群主给：
                        </div>
                        <select
                          value={transferTargetId}
                          onChange={(e) => setTransferTargetId(e.target.value)}
                          style={{
                            width: '100%', padding: '6px 8px', borderRadius: 6,
                            border: '1px solid var(--ifm-color-emphasis-300)',
                            background: 'var(--ifm-card-background-color)',
                            color: 'var(--ifm-text-color)', fontSize: 12, marginBottom: 8
                          }}
                        >
                          <option value="">-- 选择成员 --</option>
                          {groupMembers.filter(m => m.id !== currentGroup.owner_id).map(m => (
                            <option key={m.id} value={m.id}>{m.nickname || '用户'}</option>
                          ))}
                        </select>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            onClick={() => { setShowTransferUI(false); setTransferTargetId(''); }}
                            style={{
                              flex: 1, padding: '5px 8px', border: '1px solid #ddd',
                              borderRadius: 4, background: '#fff', cursor: 'pointer',
                              fontSize: 11, color: '#666'
                            }}
                          >取消</button>
                          <button
                            onClick={transferGroupOwner}
                            disabled={!transferTargetId}
                            style={{
                              flex: 1, padding: '5px 8px', border: 'none',
                              borderRadius: 4, background: transferTargetId ? '#e65100' : '#ccc',
                              color: '#fff', cursor: transferTargetId ? 'pointer' : 'not-allowed',
                              fontSize: 11
                            }}
                          >确认转移</button>
                        </div>
                      </div>
                    )}

                    <button
                      onClick={() => quitGroup(currentGroup.id)}
                      style={{
                        width: '100%', padding: '8px', marginTop: '6px',
                        background: '#ff7875', color: '#fff', border: 'none',
                        borderRadius: '6px', cursor: 'pointer', fontSize: 13
                      }}
                    >退出群聊</button>
                    {currentGroup.owner_id === myId && (
                      <button
                        onClick={() => dissolveGroup(currentGroup.id)}
                        style={{
                          width: '100%', padding: '8px', marginTop: '8px',
                          background: '#f5222d', color: '#fff', border: 'none',
                          borderRadius: '6px', cursor: 'pointer', fontSize: 13
                        }}
                      >解散群聊</button>
                    )}
                  </div>
                )}
              </div>

              <div style={{ padding: '16px 20px', borderTop: '1px solid var(--ifm-color-emphasis-300)', position: 'relative' }}>
                {showAtModal && <div style={{ position: 'absolute', bottom: '80px', left: '20px', background: 'var(--ifm-card-background-color)', border: '1px solid var(--ifm-color-emphasis-300)', borderRadius: '10px', width: '220px', maxHeight: '220px', overflowY: 'auto', zIndex: 999 }}>
                  {allUsersForGroup.map(u => <div key={u.id} onClick={() => insertAt(u)} style={{ padding: '10px 16px', cursor: 'pointer', color:'var(--ifm-text-color)' }}>@{u.nickname}</div>)}
                </div>}
                {showEmojiPanel && <div style={{ position: 'absolute', bottom: '80px', left: '20px', zIndex: 999 }}>
                  <EmojiPicker onEmojiClick={handleEmojiSelect} />
                </div>}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <button onClick={() => setShowEmojiPanel(!showEmojiPanel)} style={{ fontSize: '22px', border: 'none', background: 'transparent', cursor: 'pointer' }}>😊</button>
                  <input
                    ref={inputRef}
                    value={inputValue}
                    onChange={handleInput}
                    onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                    placeholder="输入消息，@可提及用户"
                    style={{ flex: 1, padding: '11px 18px', borderRadius: '26px', border: '1px solid var(--ifm-color-emphasis-300)', background:'var(--ifm-card-background-color)', color:'var(--ifm-text-color)' }}
                  />
                  <button
                    onClick={sendMessage}
                    disabled={sending}
                    style={{
                      padding: '10px 22px', borderRadius: '26px',
                      background: sending ? '#94e3b9' : '#07c160',
                      color: '#fff', border: 'none', cursor: sending ? 'not-allowed' : 'pointer'
                    }}
                  >{sending ? "发送中" : "发送"}</button>
                </div>
              </div>
            </>
          ) : null}

          {(!targetUser && !currentGroup) && (
            <div style={{ flex: 1, display: 'grid', placeItems: 'center', color: 'var(--ifm-color-emphasis-600)' }}>
              {activeTab === 'friend' ? '选择好友开始私聊' : '选择群聊开始聊天'}
            </div>
          )}
        </div>
      </div>

      {showCreateGroupModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.4)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 9999
        }}>
          <div style={{
            width: '420px', background: 'var(--ifm-card-background-color)', borderRadius: '16px',
            padding: '24px', boxShadow: '0 8px 24px rgba(0,0,0,0.15)', color:'var(--ifm-text-color)'
          }}>
            <h3 style={{ margin: '0 0 16px' }}>创建新群聊</h3>
            <input
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              placeholder="请输入群聊名称"
              style={{
                width: '100%', padding: '10px 14px', borderRadius: '8px',
                border: '1px solid var(--ifm-color-emphasis-300)', marginBottom: '16px', boxSizing: 'border-box',
                background:'var(--ifm-card-background-color)', color:'var(--ifm-text-color)'
              }}
            />
            <div style={{ marginBottom: '16px' }}>
              <p style={{ margin: '0 0 8px' }}>选择群成员：</p>
              <div style={{ maxHeight: '180px', overflowY: 'auto', border: '1px solid var(--ifm-color-emphasis-300)', borderRadius: '8px', padding: '8px' }}>
                {allUsersForGroup.map(u => (
                  <div
                    key={u.id}
                    onClick={() => {
                      if (selectedMemberIds.includes(u.id)) {
                        setSelectedMemberIds(selectedMemberIds.filter(id => id !== u.id));
                      } else {
                        setSelectedMemberIds([...selectedMemberIds, u.id]);
                      }
                    }}
                    style={{
                      padding: '6px 8px', cursor: 'pointer',
                      background: selectedMemberIds.includes(u.id) ? 'var(--ifm-color-emphasis-100)' : 'transparent',
                      borderRadius: '4px', margin: '2px 0'
                    }}
                  >{u.nickname}</div>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => { setShowCreateGroupModal(false); setError(null); }}
                style={{ padding: '8px 16px', border: '1px solid var(--ifm-color-emphasis-300)', borderRadius: '6px', background: 'var(--ifm-card-background-color)', cursor: 'pointer', color:'var(--ifm-text-color)' }}
              >取消</button>
              <button
                onClick={createGroup}
                style={{ padding: '8px 16px', border: 'none', borderRadius: '6px', background: '#07c160', color: '#fff', cursor: 'pointer' }}
              >确认创建</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
