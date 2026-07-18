// ========== 聊天消息通知系统（跨组件通信） ==========
// 用于在主页/导航栏显示未读消息红点，以及排序有新消息的会话
// 由主站 src/utils/chatNotification.js 迁移为 TS 版

const STORAGE_KEY = 'chat_unread_counts';
const LAST_READ_KEY = 'chat_last_read';
export const EVENT_NEW_MSG = 'chat:new-message';
export const EVENT_UNREAD_CHANGE = 'chat:unread-change';

export type UnreadCounts = Record<string, number>;

export interface NewMessageInfo {
  convId: string;
  fromUserId: string;
  groupId?: string;
  content: string;
}

/** 获取本地存储的未读计数 */
export function getUnreadCounts(): UnreadCounts {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as UnreadCounts) : {};
  } catch {
    return {};
  }
}

/** 获取未读总数 */
export function getTotalUnread(counts: UnreadCounts): number {
  return Object.values(counts || {}).reduce((sum, c) => sum + (c > 0 ? c : 0), 0);
}

/** 设置本地存储的未读计数并派发事件 */
export function setUnreadCounts(counts: UnreadCounts): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(counts));
    window.dispatchEvent(
      new CustomEvent(EVENT_UNREAD_CHANGE, { detail: { counts, total: getTotalUnread(counts) } })
    );
  } catch {
    /* ignore */
  }
}

/** 获取全局未读总数 */
export function getGlobalUnreadTotal(): number {
  return getTotalUnread(getUnreadCounts());
}

/**
 * 标记某会话为已读（清零未读数）
 * @param convId 会话 ID，格式: "private:userId" 或 "group:groupId"
 */
export function markAsRead(convId: string): void {
  const counts = getUnreadCounts();
  if (counts[convId]) {
    counts[convId] = 0;
    setUnreadCounts(counts);
  }
}

/** 新增未读消息 */
export function incrementUnread(convId: string): void {
  const counts = getUnreadCounts();
  counts[convId] = (counts[convId] || 0) + 1;
  setUnreadCounts(counts);
}

/** 记录最后活跃时间(用于排序) */
export function recordActivity(convId: string): void {
  try {
    const raw = localStorage.getItem(LAST_READ_KEY);
    const data = raw ? (JSON.parse(raw) as Record<string, number>) : {};
    data[convId] = Date.now();
    localStorage.setItem(LAST_READ_KEY, JSON.stringify(data));
  } catch {
    /* ignore */
  }
}

/** 获取所有会话的最后活跃时间 */
export function getActivityMap(): Record<string, number> {
  try {
    const raw = localStorage.getItem(LAST_READ_KEY);
    return raw ? (JSON.parse(raw) as Record<string, number>) : {};
  } catch {
    return {};
  }
}

/** 派发新消息事件（由 Supabase 实时监听触发） */
export function notifyNewMessage(msgInfo: NewMessageInfo): void {
  window.dispatchEvent(new CustomEvent(EVENT_NEW_MSG, { detail: msgInfo }));
}
