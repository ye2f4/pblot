// 聊天页实时/未读状态辅助（由 Docusaurus src/utils/chatNotification 迁移为 TS）。
// 仅使用 localStorage，无服务端依赖。realtime 改为在 chat 页内用 postgres_changes 订阅。

export const EVENT_NEW_MSG = 'newMsgEvent';

export function markAsRead(key: string) {
  try {
    localStorage.setItem(`read_${key}`, Date.now().toString());
  } catch {
    /* ignore */
  }
}

export function recordActivity(key: string) {
  try {
    localStorage.setItem(`activity_${key}`, Date.now().toString());
  } catch {
    /* ignore */
  }
}

export function getActivityMap(): Record<string, number> {
  const map: Record<string, number> = {};
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('activity_')) {
        map[k.replace('activity_', '')] = Number(localStorage.getItem(k));
      }
    }
  } catch {
    /* ignore */
  }
  return map;
}
