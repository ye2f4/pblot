import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config';

// 服务端客户端：从 cookie 读取会话（替代 Docusaurus 的 localStorage 会话）
const COOKIE_DOMAIN = process.env.NEXT_PUBLIC_SUPABASE_COOKIE_DOMAIN || undefined;

export function createClient() {
  const cookieStore = cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      cookieOptions: {
        // 生产环境统一把会话 cookie 落到主域名，与主站共享登录态
        ...(COOKIE_DOMAIN ? { domain: COOKIE_DOMAIN } : {}),
      },
    },
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // 在 Server Component 中调用 setAll 会抛错；
          // 会话刷新已由 middleware 处理，这里可忽略
        }
      },
    },
  });
}
