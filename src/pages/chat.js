import React, { useState, useEffect, useRef } from 'react';
import EmojiPicker from 'emoji-picker-react';
import Layout from '@theme/Layout';
import { supabase } from '@site/src/supabase/supabaseClient';

// 固定常量
const PROFILE_PAGE = '/profile';
const DEFAULT_EMOJI_AVATAR = '😀';
const DEFAULT_GROUP_AVATAR = '👥';

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
  const [targetUser, setTargetUser] = useState(null); // 当前私聊对象
  const [privateMsgList, setPrivateMsgList] = useState([]);
  const [privateTopIds, setPrivateTopIds] = useState([]); // 私聊置顶ID

  // ========== 群聊相关（新增） ==========
  const [activeTab, setActiveTab] = useState('friend'); // friend / group
  const [groupList, setGroupList] = useState([]); // 我的群聊列表
  const [currentGroup, setCurrentGroup] = useState(null); // 当前选中群聊
  const [groupMsgList, setGroupMsgList] = useState([]); // 群聊消息
  const [groupTopIds, setGroupTopIds] = useState([]); // 群聊置顶ID
  const [showGroupSetting, setShowGroupSetting] = useState(false); // 群聊设置面板
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false); // 创建群聊弹窗
  const [newGroupName, setNewGroupName] = useState(''); // 新建群名
  const [selectedMemberIds, setSelectedMemberIds] = useState([]); // 新建群选中成员

  // ========== 输入/表情/@ 相关 ==========
  const [searchKeyword, setSearchKeyword] = useState('');
  const [inputValue, setInputValue] = useState('');
  const [showEmojiPanel, setShowEmojiPanel] = useState(false);
  const [showAtModal, setShowAtModal] = useState(false);
  const [sending, setSending] = useState(false);

  // DOM 引用
  const messageEndRef = useRef(null);
  const inputRef = useRef(null);

  // ===================== 头像渲染 =====================
  const renderAvatar = (avatarUrl, userId, size = 42) => {
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

  // 群聊头像渲染
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

  // ===================== 初始化用户信息 =====================
  useEffect(() => {
    const init = async () => {
      setError(null);
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

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('id, avatar_url, nickname')
          .eq('id', uid)
          .maybeSingle();

        if (profileError) throw profileError;
        setMyProfile(profile || { avatar_url: DEFAULT_EMOJI_AVATAR });

        await fetchAllUsers(uid);
        await fetchMyGroups(uid);

      } catch (err) {
        console.error("初始化失败：", err);
        setError("加载用户信息失败，请刷新重试");
      } finally {
        setLoading(false);
      }
    };

    init();

    const { data: listener } = supabase.auth.onAuthStateChange(async (_, session) => {
      const user = session?.user || null;
      setCurrentUser(user);
      if (user) {
        try {
          const { data } = await supabase
            .from('profiles')
            .select('avatar_url')
            .eq('id', user.id)
            .maybeSingle();
          setMyProfile(data || { avatar_url: DEFAULT_EMOJI_AVATAR });
          await fetchAllUsers(user.id);
          await fetchMyGroups(user.id);
        } catch (err) {
          console.error("头像加载失败：", err);
          setMyProfile({ avatar_url: DEFAULT_EMOJI_AVATAR });
        }
      } else {
        setMyProfile(null);
        setUserList([]);
        setGroupList([]);
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  // ===================== 数据请求方法 =====================
  const fetchAllUsers = async (selfUid) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, nickname, avatar_url')
        .neq('id', selfUid);

      if (error) throw error;
      setUserList(data || []);
    } catch (err) {
      console.error("加载联系人失败：", err);
      setError("加载联系人失败，请刷新重试");
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
      const { data: profileData } = await supabase.from('profiles').select('id, avatar_url').in('id', userIds);
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

    setSending(true);
    setError(null);
    try {
      const insertData = {
        from_user_id: currentUser.id,
        content: txt,
        created_at: new Date()
      };

      if (activeTab === 'friend' && targetUser) {
        insertData.to_user_id = targetUser.id;
        insertData.group_id = null;
        const { error } = await supabase.from('messages').insert([insertData]);
        if (error) throw error;
        setInputValue('');
        fetchPrivateMessages(targetUser.id);
      }
      if (activeTab === 'group' && currentGroup) {
        insertData.group_id = currentGroup.id;
        insertData.to_user_id = null;
        const { error } = await supabase.from('messages').insert([insertData]);
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

  // ===================== 置顶操作 =====================
  const togglePrivateTop = async (userId) => {
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

  // ===================== 群聊操作 =====================
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

  // ===================== 工具方法 =====================
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

  // 实时消息监听
  useEffect(() => {
    if (!currentUser) return;
    const channel = supabase.channel('chat-real-time')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        const msg = payload.new;
        if (!msg.group_id && targetUser?.id && (msg.from_user_id === targetUser.id || msg.to_user_id === targetUser.id)) {
          fetchPrivateMessages(targetUser.id);
        }
        if (msg.group_id && currentGroup?.id === msg.group_id) {
          fetchGroupMessages(currentGroup.id);
        }
      }).subscribe();

    return () => channel.unsubscribe();
  }, [currentUser, targetUser, currentGroup]);

  useEffect(() => {
    if (targetUser) fetchPrivateMessages(targetUser.id);
  }, [targetUser]);

  useEffect(() => {
    if (currentGroup) fetchGroupMessages(currentGroup.id);
  }, [currentGroup]);

  const filteredUsers = userList.filter(u =>
    u.nickname?.toLowerCase().includes(searchKeyword.toLowerCase())
  );
  const filteredGroups = groupList.filter(g =>
    g.group_name?.toLowerCase().includes(searchKeyword.toLowerCase())
  );
  const sortedFriends = [...filteredUsers].sort((a, b) => {
    const aTop = privateTopIds.includes(a.id) ? 1 : 0;
    const bTop = privateTopIds.includes(b.id) ? 1 : 0;
    return bTop - aTop;
  });

  const myAvatar = myProfile?.avatar_url || DEFAULT_EMOJI_AVATAR;
  const myId = currentUser?.id;

  if (loading) return <Layout title="聊天"><div style={{ textAlign: 'center', padding: '60px', color:'var(--ifm-text-color)' }}>加载中...</div></Layout>;
  if (!currentUser) return <Layout title="聊天"><div style={{ textAlign: 'center', padding: '60px', color:'var(--ifm-text-color)' }}>请先登录</div></Layout>;

  return (
    <Layout title="在线聊天">
      <div style={{
        display: 'flex', width: '96%', maxWidth: '1400px', margin: '30px auto',
        height: 'calc(100vh - 180px)', border: '1px solid var(--ifm-color-emphasis-300)', borderRadius: '16px',
        overflow: 'hidden', background: 'var(--ifm-card-background-color)'
      }}>
        {/* 左侧栏 */}
        <div style={{ width: '340px', borderRight: '1px solid var(--ifm-color-emphasis-300)', background: 'var(--ifm-color-emphasis-100)', display: 'flex', flexDirection: 'column' }}>
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
                fontSize: '20px', cursor: 'pointer', display: 'flex',
                alignItems: 'center', justifyContent: 'center'
              }}
              title="创建群聊"
            >+</button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto' }}>
            {activeTab === 'friend' && sortedFriends.map(user => (
              <div
                key={user.id}
                onClick={() => setTargetUser(user)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 18px',
                  cursor: 'pointer', background: targetUser?.id === user.id ? 'var(--ifm-color-emphasis-300)' : 'transparent',
                  color:'var(--ifm-text-color)'
                }}
              >
                {renderAvatar(user.avatar_url, user.id, 42)}
                <span style={{ flex: 1 }}>{user.nickname}</span>
                <span style={{ color: '#f53f3f', fontSize: '12px', marginRight: '6px' }}>
                  {privateTopIds.includes(user.id) && '置顶'}
                </span>
                <button
                  onClick={(e) => { e.stopPropagation(); togglePrivateTop(user.id); }}
                  style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '14px', color:'var(--ifm-text-color)' }}
                >{privateTopIds.includes(user.id) ? '取消' : '置顶'}</button>
              </div>
            ))}

            {activeTab === 'group' && filteredGroups.map(group => (
              <div
                key={group.id}
                onClick={() => { setCurrentGroup(group); setShowGroupSetting(false); }}
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

        {/* 右侧聊天区 */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>
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
              </div>
              <div style={{ flex: 1, padding: '24px', background: 'var(--ifm-color-emphasis-100)', overflowY: 'auto' }}>
                {privateMsgList.map(msg => {
                  const isSelf = msg.from_user_id === myId;
                  return (
                    <div key={msg.id} style={{ display: 'flex', justifyContent: isSelf ? 'flex-end' : 'flex-start', marginBottom: '16px', gap: '10px', alignItems: 'flex-end' }}>
                      {!isSelf && renderAvatar(targetUser.avatar_url, targetUser.id, 34)}
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
              </div>

              <div style={{ padding: '16px 20px', borderTop: '1px solid var(--ifm-color-emphasis-300)', position: 'relative' }}>
                {showAtModal && <div style={{ position: 'absolute', bottom: '80px', left: '20px', background: 'var(--ifm-card-background-color)', border: '1px solid var(--ifm-color-emphasis-300)', borderRadius: '10px', width: '220px', maxHeight: '220px', overflowY: 'auto', zIndex: 999 }}>
                  {userList.map(u => <div key={u.id} onClick={() => insertAt(u)} style={{ padding: '10px 16px', cursor: 'pointer', color:'var(--ifm-text-color)' }}>@{u.nickname}</div>)}
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
                  onClick={() => setShowGroupSetting(!showGroupSetting)}
                  style={{ border: 'none', background: 'var(--ifm-color-emphasis-100)', padding: '4px 12px', borderRadius: '6px', cursor: 'pointer', color:'var(--ifm-text-color)' }}
                >群聊设置</button>
              </div>

              <div style={{ flex: 1, padding: '24px', background: 'var(--ifm-color-emphasis-100)', overflowY: 'auto', position: 'relative' }}>
                {groupMsgList.map(msg => {
                  const isSelf = msg.from_user_id === myId;
                  const sender = msg.sender || {};
                  return (
                    <div key={msg.id} style={{ display: 'flex', justifyContent: isSelf ? 'flex-end' : 'flex-start', marginBottom: '16px', gap: '10px', alignItems: 'flex-end' }}>
                      {!isSelf && renderAvatar(sender.avatar_url, msg.from_user_id, 34)}
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

                {showGroupSetting && (
                  <div style={{
                    position: 'absolute', right: '20px', top: '20px', width: '240px',
                    background: 'var(--ifm-card-background-color)', border: '1px solid var(--ifm-color-emphasis-300)', borderRadius: '12px',
                    padding: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 999, color:'var(--ifm-text-color)'
                  }}>
                    <h4 style={{ margin: '0 0 12px' }}>群聊设置</h4>
                    <p style={{ margin: '6px 0' }}>群主：{currentGroup.owner_id === myId ? '我' : '其他成员'}</p>
                    <button
                      onClick={() => quitGroup(currentGroup.id)}
                      style={{
                        width: '100%', padding: '8px', marginTop: '10px',
                        background: '#ff7875', color: '#fff', border: 'none',
                        borderRadius: '6px', cursor: 'pointer'
                      }}
                    >退出群聊</button>
                    {currentGroup.owner_id === myId && (
                      <button
                        onClick={() => dissolveGroup(currentGroup.id)}
                        style={{
                          width: '100%', padding: '8px', marginTop: '8px',
                          background: '#f5222d', color: '#fff', border: 'none',
                          borderRadius: '6px', cursor: 'pointer'
                        }}
                      >解散群聊</button>
                    )}
                  </div>
                )}
              </div>

              <div style={{ padding: '16px 20px', borderTop: '1px solid var(--ifm-color-emphasis-300)', position: 'relative' }}>
                {showAtModal && <div style={{ position: 'absolute', bottom: '80px', left: '20px', background: 'var(--ifm-card-background-color)', border: '1px solid var(--ifm-color-emphasis-300)', borderRadius: '10px', width: '220px', maxHeight: '220px', overflowY: 'auto', zIndex: 999 }}>
                  {userList.map(u => <div key={u.id} onClick={() => insertAt(u)} style={{ padding: '10px 16px', cursor: 'pointer', color:'var(--ifm-text-color)' }}>@{u.nickname}</div>)}
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

      {/* 创建群聊弹窗 */}
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
                {userList.map(u => (
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