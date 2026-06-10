import React, { useState, useEffect, useRef } from 'react';
import EmojiPicker from 'emoji-picker-react';
import Layout from '@theme/Layout';
import { supabase } from '@site/src/supabase/supabaseClient';

// 固定常量（无缺失，无报错）
const PROFILE_PAGE = '/profile';
const DEFAULT_EMOJI_AVATAR = '😀';

export const metadata = {
  ssr: false
};

export default function ChatPage() {
  // 状态
  const [currentUser, setCurrentUser] = useState(null);
  const [myProfile, setMyProfile] = useState(null); // 自己的资料（强加载）
  const [userList, setUserList] = useState([]);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [targetUser, setTargetUser] = useState(null);
  const [messageList, setMessageList] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [showEmojiPanel, setShowEmojiPanel] = useState(false);
  const [showAtModal, setShowAtModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false); // 发送中状态，防重复提交
  const [error, setError] = useState(null); // 错误提示

  const messageEndRef = useRef(null);
  const inputRef = useRef(null);

  // ===================== 终极头像渲染（无闪烁、无错误URL、纯DIV渲染Emoji） =====================
  const renderAvatar = (avatarUrl, userId, size = 42) => {
    const isNetImage = avatarUrl && (avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://'));

    // 网络图片
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

    // Emoji / 默认头像（纯DIV，无图片请求）
    const showEmoji = avatarUrl || DEFAULT_EMOJI_AVATAR;
    return (
      <div
        style={{
          width: size, height: size, borderRadius: '50%', background: '#f0f7ff',
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

  // ===================== 【核心修复】登录后立刻加载自己的头像（数据库同步） =====================
  useEffect(() => {
    const init = async () => {
      setError(null);
      try {
        // 1. 获取登录用户
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError) throw authError;
        
        if (!user) {
          setCurrentUser(null);
          setLoading(false);
          return;
        }
        setCurrentUser(user);

        // 2. 强制从数据库拿自己的头像（100%同步）
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('id, avatar_url')
          .eq('id', user.id)
          .single();
        
        if (profileError) throw profileError;
        
        setMyProfile(profile || { avatar_url: DEFAULT_EMOJI_AVATAR });
      } catch (err) {
        console.error("初始化聊天页面失败：", err);
        setError("加载用户信息失败，请刷新重试");
      } finally {
        setLoading(false);
      }
    };

    init();

    // 监听登录状态
    const { data: listener } = supabase.auth.onAuthStateChange(async (_, session) => {
      const user = session?.user || null;
      setCurrentUser(user);
      if (user) {
        try {
          const { data } = await supabase.from('profiles').select('avatar_url').eq('id', user.id).single();
          setMyProfile(data || { avatar_url: DEFAULT_EMOJI_AVATAR });
        } catch (err) {
          console.error("加载用户头像失败：", err);
          setMyProfile({ avatar_url: DEFAULT_EMOJI_AVATAR });
        }
      } else {
        setMyProfile(null);
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  // 获取联系人列表
  const fetchAllUsers = async () => {
    if (!currentUser) return;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, nickname, avatar_url')
        .neq('id', currentUser.id);
      
      if (error) throw error;
      setUserList(data || []);
    } catch (err) {
      console.error("加载联系人列表失败：", err);
      setError("加载联系人失败，请刷新重试");
    }
  };

  // 获取聊天记录
  const fetchMessages = async (toUserId) => {
    if (!currentUser || !toUserId) return;
    try {
      const { data: msgData, error: msgError } = await supabase
        .from('messages')
        .select('*')
        .or(`and(from_user_id.eq.${currentUser.id},to_user_id.eq.${toUserId}),and(from_user_id.eq.${toUserId},to_user_id.eq.${currentUser.id})`)
        .order('created_at', { ascending: true });

      if (msgError) throw msgError;
      if (!msgData) { setMessageList([]); scrollToBottom(); return; }

      const userIds = [...new Set(msgData.map(m => m.from_user_id))];
      const { data: profileData, error: profileError } = await supabase.from('profiles').select('id, avatar_url').in('id', userIds);
      if (profileError) throw profileError;
      
      const map = {}; 
      profileData?.forEach(p => map[p.id] = p);

      setMessageList(msgData.map(m => ({ ...m, sender: map[m.from_user_id] || {} })));
      scrollToBottom();
    } catch (err) {
      console.error("加载聊天记录失败：", err);
      setError("加载聊天记录失败，请刷新重试");
    }
  };

  // 平滑滚动（无抖动）
  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      messageEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    });
  };

  // 发送消息【核心修复：增加错误捕获和loading】
  const sendMessage = async () => {
    const txt = inputValue.trim();
    if (!txt || !targetUser || !currentUser || sending) return;
    
    setSending(true);
    setError(null);
    try {
      const { error: insertError } = await supabase.from('messages').insert([{
        from_user_id: currentUser.id,
        to_user_id: targetUser.id,
        content: txt
      }]);

      if (insertError) throw insertError;
      
      setInputValue('');
      fetchMessages(targetUser.id);
    } catch (err) {
      console.error("发送消息失败：", err);
      // 关键：这里会打印出具体的错误信息，比如RLS权限问题
      setError(`发送失败：${err.message || '未知错误，请检查网络或重试'}`);
    } finally {
      setSending(false);
    }
  };

  // 实时消息
  useEffect(() => {
    if (!currentUser) return;
    const channel = supabase.channel('chat')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => {
        if (targetUser) fetchMessages(targetUser.id);
      }).subscribe();
    return () => channel.unsubscribe();
  }, [currentUser, targetUser]);

  useEffect(() => { if (currentUser) fetchAllUsers(); }, [currentUser]);
  useEffect(() => { if (targetUser) fetchMessages(targetUser.id); }, [targetUser]);

  // 搜索过滤
  const filteredUsers = userList.filter(u =>
    u.nickname?.toLowerCase().includes(searchKeyword.toLowerCase())
  );

  // 表情、@用户
  const handleEmojiSelect = (emoji) => { setInputValue(prev => prev + emoji.emoji); setShowEmojiPanel(false); };
  const handleInput = (e) => { setInputValue(e.target.value); setShowAtModal(e.target.value.endsWith('@')); };
  const insertAt = (u) => { setInputValue(prev => prev.replace(/@$/, `@${u.nickname} `)); setShowAtModal(false); inputRef.current.focus(); };

  if (loading) return <Layout title="聊天"><div style={{ textAlign: 'center', padding: '60px' }}>加载中...</div></Layout>;
  if (!currentUser) return <Layout title="聊天"><div style={{ textAlign: 'center', padding: '60px' }}>请先登录</div></Layout>;

  // 🔥 最终头像：直接读取数据库，绝不默认
  const myAvatar = myProfile?.avatar_url || DEFAULT_EMOJI_AVATAR;
  const myId = currentUser.id;

  return (
    <Layout title="在线聊天">
      <div style={{
        display: 'flex', width: '96%', maxWidth: '1400px', margin: '30px auto',
        height: 'calc(100vh - 180px)', border: '1px solid #e5e7eb', borderRadius: '16px',
        overflow: 'hidden', background: '#fff'
      }}>
        {/* 左侧联系人 */}
        <div style={{ width: '340px', borderRight: '1px solid #e5e7eb', background: '#f9fafb', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '16px' }}>
            <input value={searchKeyword} onChange={(e) => setSearchKeyword(e.target.value)}
              placeholder="搜索联系人" style={{ width: '100%', padding: '9px 16px', borderRadius: '24px', border: '1px solid #e2e8f0' }} />
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {filteredUsers.map(user => (
              <div key={user.id} onClick={() => setTargetUser(user)}
                style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 18px', cursor: 'pointer', background: targetUser?.id === user.id ? '#e2e8f0' : 'transparent' }}>
                {renderAvatar(user.avatar_url, user.id, 42)}
                <span>{user.nickname}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 右侧聊天 */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {/* 错误提示 */}
          {error && (
            <div style={{
              background: '#fff2f0', color: '#ff4d4f', padding: '12px 20px', 
              borderBottom: '1px solid #ffccc7', textAlign: 'center'
            }}>
              {error}
            </div>
          )}
          
          {targetUser ? (
            <>
              <div style={{ padding: '16px 24px', borderBottom: '1px solid #e5e7eb', fontWeight: 600 }}>
                {targetUser.nickname}
              </div>
              <div style={{ flex: 1, padding: '24px', background: '#f8fafc', overflowY: 'auto' }}>
                {messageList.map(msg => {
                  const isSelf = msg.from_user_id === myId;
                  return (
                    <div key={msg.id} style={{ display: 'flex', justifyContent: isSelf ? 'flex-end' : 'flex-start', marginBottom: '16px', gap: '10px', alignItems: 'flex-end' }}>
                      {!isSelf && renderAvatar(targetUser.avatar_url, targetUser.id, 34)}
                      <div style={{
                        maxWidth: '65%', padding: '9px 14px', borderRadius: '20px',
                        background: isSelf ? '#07c160' : '#fff', color: isSelf ? '#fff' : '#1e293b'
                      }}>{msg.content}</div>
                      {isSelf && renderAvatar(myAvatar, myId, 34)}
                    </div>
                  );
                })}
                <div ref={messageEndRef} />
              </div>

              {/* 输入栏 */}
              <div style={{ padding: '16px 20px', borderTop: '1px solid #e5e7eb', position: 'relative' }}>
                {showAtModal && <div style={{ position: 'absolute', bottom: '80px', left: '20px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', width: '220px', maxHeight: '220px', overflowY: 'auto', zIndex: 999 }}>
                  {userList.map(u => <div key={u.id} onClick={() => insertAt(u)} style={{ padding: '10px 16px', cursor: 'pointer' }}>@{u.nickname}</div>)}
                </div>}
                {showEmojiPanel && <div style={{ position: 'absolute', bottom: '80px', left: '20px', zIndex: 999 }}>
                  <EmojiPicker onEmojiClick={handleEmojiSelect} />
                </div>}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <button onClick={() => setShowEmojiPanel(!showEmojiPanel)} style={{ fontSize: '22px', border: 'none', background: 'transparent', cursor: 'pointer' }}>😊</button>
                  <input ref={inputRef} value={inputValue} onChange={handleInput} onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                    placeholder="输入消息，@可提及用户" style={{ flex: 1, padding: '11px 18px', borderRadius: '26px', border: '1px solid #e2e8f0' }} />
                  <button 
                    onClick={sendMessage} 
                    disabled={sending}
                    style={{ 
                      padding: '10px 22px', 
                      borderRadius: '26px', 
                      background: sending ? '#94e3b9' : '#07c160', 
                      color: '#fff', 
                      border: 'none', 
                      cursor: sending ? 'not-allowed' : 'pointer' 
                    }}
                  >
                    {sending ? "发送中" : "发送"}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div style={{ flex: 1, display: 'grid', placeItems: 'center', color: '#94a3b8' }}>选择联系人开始聊天</div>
          )}
        </div>
      </div>
    </Layout>
  );
}

