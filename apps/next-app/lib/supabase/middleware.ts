import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config';

// 每次请求刷新 Supabase 会话 cookie，保证 SSR 始终拿到最新登录态
const COOKIE_DOMAIN = process.env.NEXT_PUBLIC_SUPABASE_COOKIE_DOMAIN || undefined;

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      cookieOptions: {
        // 生产环境统一把会话 cookie 落到主域名，与主站共享登录态
        ...(COOKIE_DOMAIN ? { domain: COOKIE_DOMAIN } : {}),
      },
    },
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  // OAuth PKCE 回调：URL 中带 ?code 时，把它交换成会话 cookie，
  // 否则 SSR（如 profile 页）会在 code 被换取前误判未登录而重定向到登录页。
  const code = request.nextUrl.searchParams.get('code');
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // 去掉 code 参数，保留其余 query（如 uid），并重定向回用户实际访问的域名
      // （经 Vercel rewrite 代理时由 x-forwarded-host 提供，避免跳到 Vercel 裸域名）。
      const forwardedHost = request.headers.get('x-forwarded-host');
      const protocol = request.headers.get('x-forwarded-proto') ?? 'https';
      const host = forwardedHost ?? request.nextUrl.host;
      const nextUrl = request.nextUrl.clone();
      nextUrl.searchParams.delete('code');
      const target = `${protocol}://${host}${nextUrl.pathname}${nextUrl.search}`;
      // response 已被 setAll 写入新会话 cookie，复用其 headers 完成重定向
      return NextResponse.redirect(target, { headers: response.headers });
    }
  }

  // 触发会话刷新（必须 await，否则 cookie 不会写入）
  await supabase.auth.getUser();

  return response;
}
