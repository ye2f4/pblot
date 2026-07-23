import { supabase } from './client';

// 安全的会话/用户读取：吞掉异常（如网络抖动、会话失效），返回中性值，
// 避免整页因 supabase.auth 抛错而白屏。迁移自 next-app/lib/supabase/safe.ts。
export async function safeGetSession(): Promise<{
  session: any | null;
  user: any | null;
}> {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      return { session: null, user: null };
    }
    return { session: data.session, user: data.session?.user ?? null };
  } catch {
    return { session: null, user: null };
  }
}

export async function safeGetUser(): Promise<{ user: any | null }> {
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error) {
      return { user: null };
    }
    return { user: data.user ?? null };
  } catch {
    return { user: null };
  }
}
