// ========== 聊天按钮红点提醒组件 ==========
// 监听全局未读消息变化，在导航栏聊天按钮上显示红点
// 即使在主页也能实时追踪未读消息

import { useEffect, useRef } from 'react';
import { supabase } from '../../supabase/supabaseClient';
import {
  getGlobalUnreadTotal,
  incrementUnread,
  recordActivity,
  EVENT_UNREAD_CHANGE,
} from '../../utils/chatNotification';

const CHAT_BTN_SELECTOR = '.navbar-chat-btn';

export default function ChatRedDot() {
  const channelRef = useRef(null);
  const groupIdsRef = useRef([]);

  const updateBadge = (count) => {
    const btn = document.querySelector(CHAT_BTN_SELECTOR);
    if (!btn) return;

    const oldBadge = btn.querySelector('.chat-unread-badge');
    if (oldBadge) oldBadge.remove();

    if (count > 0) {
      const badge = document.createElement('span');
      badge.className = 'chat-unread-badge';
      badge.textContent = count > 99 ? '99+' : String(count);
      badge.style.cssText = `
        position: absolute;
        top: -6px;
        right: -6px;
        min-width: 18px;
        height: 18px;
        line-height: 18px;
        padding: 0 5px;
        background: #ff4757;
        color: #fff;
        font-size: 11px;
        font-weight: 700;
        border-radius: 10px;
        text-align: center;
        box-shadow: 0 2px 4px rgba(255,71,87,0.4);
        z-index: 10;
      `;
      btn.style.position = 'relative';
      btn.appendChild(badge);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!isMounted || !user) return;

      // 获取用户的群 ID 列表
      try {
        const { data: members } = await supabase
          .from('group_members')
          .select('group_id')
          .eq('user_id', user.id);
        groupIdsRef.current = (members || []).map(m => m.group_id);
      } catch { /* ignore */ }

      updateBadge(getGlobalUnreadTotal());

      // 实时监听所有新消息
      const channel = supabase.channel('chat-notif-global')
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        }, (payload) => {
          const msg = payload.new;
          if (msg.from_user_id === user.id) return; // 自己发的

          if (msg.group_id) {
            // 群消息：检查自己是否在群内
            if (!groupIdsRef.current.includes(msg.group_id)) return;
            const convId = `group:${msg.group_id}`;
            recordActivity(convId);
            incrementUnread(convId);
            notifyNewMessage({ convId, fromUserId: msg.from_user_id, groupId: msg.group_id, content: msg.content });
          } else if (msg.to_user_id === user.id) {
            // 私聊：检查是否发给自己的
            const convId = `private:${msg.from_user_id}`;
            recordActivity(convId);
            incrementUnread(convId);
            notifyNewMessage({ convId, fromUserId: msg.from_user_id, groupId: null, content: msg.content });
          }
        })
        .subscribe();

      channelRef.current = channel;
    };

    init();

    return () => {
      isMounted = false;
      channelRef.current?.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const onUnreadChange = (e) => {
      updateBadge(e.detail?.total ?? getGlobalUnreadTotal());
    };
    window.addEventListener(EVENT_UNREAD_CHANGE, onUnreadChange);

    const observer = new MutationObserver(() => {
      const btn = document.querySelector(CHAT_BTN_SELECTOR);
      if (btn) updateBadge(getGlobalUnreadTotal());
    });
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      window.removeEventListener(EVENT_UNREAD_CHANGE, onUnreadChange);
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    const timer = setInterval(() => updateBadge(getGlobalUnreadTotal()), 5000);
    return () => clearInterval(timer);
  }, []);

  return null;
}
