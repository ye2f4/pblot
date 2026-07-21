// 健壮的鉴权封装：所有页面/组件统一通过这里获取用户与会话，
// 避免 supabase.auth.getUser()/getSession() 在浏览器中因「会话刷新请求挂起」
// 而永不 resolve，导致页面永久卡在「加载中」。
//
// 设计要点：
// 1. 给每次鉴权请求加硬超时（AUTH_TIMEOUT_MS）。一旦超时，直接降级为「未登录」，
//    绝不长时间阻塞 UI。
// 2. 任何错误（网络/CORS/失效会话）都被捕获并降级为「未登录」，不再抛出未处理的
//    Promise rejection 让 loading 永远不翻 false。
// 3. 失败时尝试清除本地失效会话，使用户可以重新登录拿到有效会话。

import { supabase } from './client';

const AUTH_TIMEOUT_MS = 8000;

function withTimeout<T>(p: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
}

async function clearBadSession() {
  try {
    // signOut 会清掉本地 cookie/localStorage 中的失效会话，
    // 使用超时包裹，避免它本身也挂起。
    await withTimeout(supabase.auth.signOut(), 3000, undefined as any);
  } catch {
    /* 忽略：清不掉也没关系，页面已降级为未登录 */
  }
}

export async function safeGetUser(): Promise<{ user: any | null; error: any }> {
  const res: any = await withTimeout(
    supabase.auth.getUser(),
    AUTH_TIMEOUT_MS,
    { data: { user: null }, error: new Error('auth request timed out') }
  );
  if (res?.error) {
    console.warn('[safeGetUser] 鉴权失败，降级为未登录：', res.error?.message || res.error);
    await clearBadSession();
    return { user: null, error: res.error };
  }
  const user = res?.data?.user ?? null;
  return { user, error: null };
}

export async function safeGetSession(): Promise<{ session: any | null; error: any }> {
  const res: any = await withTimeout(
    supabase.auth.getSession(),
    AUTH_TIMEOUT_MS,
    { data: { session: null }, error: new Error('auth request timed out') }
  );
  if (res?.error) {
    console.warn('[safeGetSession] 会话获取失败，降级为未登录：', res.error?.message || res.error);
    await clearBadSession();
    return { session: null, error: res.error };
  }
  const session = res?.data?.session ?? null;
  return { session, error: null };
}
