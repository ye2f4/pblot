// 由 Docusaurus src/utils/chatNotification.js 迁移（仅保留客户端 localStorage 部分）：
// 以下方法不触发数据库，仅用于未读红点、最近访问等客户端体验。

const ACTIVITY_KEY = 'mono_chat_activity';

export function markAsRead(...ids: string[]) {
  if (typeof localStorage === 'undefined') return;
  const raw = localStorage.getItem(ACTIVITY_KEY);
  const map = raw ? JSON.parse(raw) : {};
  ids.forEach((id) => {
    if (map[id]) map[id].unread = false;
  });
  localStorage.setItem(ACTIVITY_KEY, JSON.stringify(map));
}

export function recordActivity(type: string, targetId: string) {
  if (typeof localStorage === 'undefined') return;
  const raw = localStorage.getItem(ACTIVITY_KEY);
  const map = raw ? JSON.parse(raw) : {};
  map[targetId] = {
    unread: true,
    lastType: type,
    ts: Date.now(),
  };
  localStorage.setItem(ACTIVITY_KEY, JSON.stringify(map));
}

export function getActivityMap(): Record<string, { unread: boolean; lastType?: string; ts?: number }> {
  if (typeof localStorage === 'undefined') return {};
  const raw = localStorage.getItem(ACTIVITY_KEY);
  return raw ? JSON.parse(raw) : {};
}
