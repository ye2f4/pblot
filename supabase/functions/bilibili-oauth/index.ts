<<<<<<< HEAD
// ============================================================
// bilibili-oauth —— 哔哩哔哩自定义 OAuth 接入（Supabase Edge Function）
// ------------------------------------------------------------
// 流程概览：
//   1) 前端调用 /authorize?redirect_uri=<本站回调页>  →  本函数 302 跳转到
//      B 站授权页（redirect_uri 指向本函数的 /callback）。
//   2) 用户在 B 站同意授权后，B 站回跳 /callback?code=...&state=...。
//   3) 本函数校验 state → 用 code 换取 access_token → 调用户信息接口拿
//      openid/name/face → 用 Admin API 创建 / 关联本站用户并换取会话 →
//      302 回跳到前端回调页，并把 access_token/refresh_token 通过 URL
//      fragment 传回（fragment 不上送服务器，更安全）。
//   4) 前端回调页读取 fragment 调 setSession 落本地 cookie，完成登录。
//
// 配置（Supabase Secrets）：
//   BILIBILI_CLIENT_ID        B 站开放平台 client_id（必填）
//   BILIBILI_CLIENT_SECRET    B 站开放平台 client_secret（必填）
//   BILIBILI_AUTHORIZE_URL    授权页地址（可选，默认 https://account.bilibili.com/oauth2/authorize）
//   BILIBILI_SCOPE            申请的 scope（可选，默认空）
//   BILIBILI_STATE_SECRET     用于签名 state 的密钥（可选，默认用 SERVICE_ROLE_KEY）
//   BILIBILI_PASSWORD_SECRET  用于派生用户密码的密钥（可选，默认用 SERVICE_ROLE_KEY）
//
// 重要：B 站开放平台需要把回调地址加入白名单，值为：
//   ${SUPABASE_URL}/functions/v1/bilibili-oauth/callback
// ============================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const BILIBILI_CLIENT_ID = Deno.env.get("BILIBILI_CLIENT_ID") || "";
const BILIBILI_CLIENT_SECRET = Deno.env.get("BILIBILI_CLIENT_SECRET") || "";
const BILIBILI_AUTHORIZE_URL =
  Deno.env.get("BILIBILI_AUTHORIZE_URL") ||
  "https://account.bilibili.com/oauth2/authorize";
const BILIBILI_SCOPE = Deno.env.get("BILIBILI_SCOPE") || "";
const BILIBILI_TOKEN_URL = "https://api.bilibili.com/x/account-oauth2/v1/token";
const BILIBILI_USERINFO_URL =
  "https://member.bilibili.com/arcopen/fn/user/account/info";
const FUNC_BASE = `${SUPABASE_URL}/functions/v1/bilibili-oauth`;
const STATE_SECRET = Deno.env.get("BILIBILI_STATE_SECRET") || SUPABASE_SERVICE_ROLE_KEY;
const PASSWORD_SECRET =
  Deno.env.get("BILIBILI_PASSWORD_SECRET") || SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ---------- base64url 工具 ----------
function b64url(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof ArrayBuffer ? new Uint8Array(buf) : buf;
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function fromB64url(s: string): Uint8Array {
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/"));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}
async function hmac(secret: string, data: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  return b64url(sig);
}

// 签名 state：base64url(JSON).HMAC
async function signState(payload: Record<string, unknown>): Promise<string> {
  const body = b64url(new TextEncoder().encode(JSON.stringify(payload)));
  const sig = await hmac(STATE_SECRET, body);
  return `${body}.${sig}`;
}
async function verifyState(
  token: string | null,
): Promise<{ ok: boolean; feRedirect?: string }> {
  if (!token) return { ok: false };
  const parts = token.split(".");
  if (parts.length !== 2) return { ok: false };
  const [body, sig] = parts;
  const expect = await hmac(STATE_SECRET, body);
  // 定长比较，防时序攻击（简单实现，框架足够）
  if (sig !== expect) return { ok: false };
  try {
    const payload = JSON.parse(new TextDecoder().decode(fromB64url(body)));
    if (typeof payload?.feRedirect !== "string") return { ok: false };
    return { ok: true, feRedirect: payload.feRedirect };
  } catch {
    return { ok: false };
  }
}

// 由 openid 派生稳定密码（无需持久化，创建与登录时使用同一算法）
async function derivePassword(openid: string): Promise<string> {
  return await hmac(PASSWORD_SECRET, `bili:${openid}`);
}

function htmlError(message: string, status = 400): Response {
  return new Response(
    `<!doctype html><html><head><meta charset="utf-8"><title>登录失败</title></head><body style="font-family:sans-serif;display:flex;height:100vh;align-items:center;justify-content:center"><div style="text-align:center"><h2>哔哩哔哩登录失败</h2><p style="color:#666">${message}</p><p><a href="/">返回首页</a></p></div></body></html>`,
    { status, headers: { "Content-Type": "text/html; charset=utf-8" } },
  );
}

// ---------- 路由 1：引导授权 ----------
function handleAuthorize(url: URL): Response {
  if (!BILIBILI_CLIENT_ID || !BILIBILI_CLIENT_SECRET) {
    return htmlError("B 站凭证未配置（BILIBILI_CLIENT_ID / BILIBILI_CLIENT_SECRET）。请在 Supabase 后台配置 Secrets 后重试。", 503);
  }
  const feRedirect = url.searchParams.get("redirect_uri") || "";
  // 仅允许 http/https 回调地址，避免开放重定向
  if (!/^https?:\/\//i.test(feRedirect)) {
    return htmlError("redirect_uri 不合法", 400);
  }

  const csrf = crypto.randomUUID();
  return signState({ csrf, feRedirect }).then((state) => {
    const params = new URLSearchParams({
      client_id: BILIBILI_CLIENT_ID,
      redirect_uri: `${FUNC_BASE}/callback`,
      response_type: "code",
      state,
    });
    if (BILIBILI_SCOPE) params.set("scope", BILIBILI_SCOPE);

    return Response.redirect(
      `${BILIBILI_AUTHORIZE_URL}?${params.toString()}`,
      302,
    );
  });
}

// ---------- 路由 2：处理回调 ----------
async function handleCallback(url: URL): Response {
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const verify = await verifyState(state);
  if (!verify.ok || !verify.feRedirect) {
    return htmlError("state 校验失败，可能是跨站请求伪造或链接已过期。", 403);
  }
  const feRedirect = verify.feRedirect;

  if (!code) {
    return Response.redirect(`${feRedirect}?bili_error=no_code`, 302);
  }

  try {
    // 1) code -> access_token
    const tokenRes = await fetch(BILIBILI_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: BILIBILI_CLIENT_ID,
        client_secret: BILIBILI_CLIENT_SECRET,
        grant_type: "authorization_code",
        code,
        redirect_uri: `${FUNC_BASE}/callback`,
      }).toString(),
    });
    const tokenJson = await tokenRes.json();
    const accessToken = tokenJson?.access_token;
    if (!accessToken) {
      return Response.redirect(`${feRedirect}?bili_error=token`, 302);
    }

    // 2) 用户信息
    const infoRes = await fetch(BILIBILI_USERINFO_URL, {
      method: "GET",
      headers: { Accept: "application/json", "Access-Token": accessToken },
    });
    const infoJson = await infoRes.json();
    const data = infoJson?.data;
    const openid: string = data?.openid;
    const name: string = data?.name || "bilibili用户";
    const face: string = data?.face || "";
    if (!openid) {
      return Response.redirect(`${feRedirect}?bili_error=userinfo`, 302);
    }

    // 3) 创建 / 关联用户并换取会话
    const email = `bili_${openid}@bilibili.local`;
    const password = await derivePassword(openid);
    const userMetadata = {
      provider: "bilibili",
      bilibili_openid: openid,
      name,
      nickname: name,
      avatar_url: face,
      email,
    };

    let session = null as { access_token: string; refresh_token: string } | null;

    const signIn = await supabaseAdmin.auth.signInWithPassword({ email, password });
    if (signIn.data.session) {
      session = signIn.data.session;
    } else {
      const created = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: userMetadata,
      });
      if (created.error) {
        // 可能用户已存在但首次登录失败，再尝试一次
        const retry = await supabaseAdmin.auth.signInWithPassword({ email, password });
        if (retry.data.session) session = retry.data.session;
      } else {
        const signIn2 = await supabaseAdmin.auth.signInWithPassword({ email, password });
        session = signIn2.data.session;
      }
    }

    if (!session) {
      return Response.redirect(`${feRedirect}?bili_error=session`, 302);
    }

    // 4) 关联 / 刷新 profiles.bilibili_openid
    const uid = (session as any).user?.id;
    if (uid) {
      await supabaseAdmin
        .from("profiles")
        .update({
          bilibili_openid: openid,
          nickname: name,
          avatar_url: face,
        })
        .eq("id", uid);
    }

    // 5) 回跳前端，token 经 fragment 传递
    const fragment = new URLSearchParams({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
    });
    if ((session as any).expires_in) {
      fragment.set("expires_in", String((session as any).expires_in));
    }
    return Response.redirect(`${feRedirect}#${fragment.toString()}`, 302);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "未知错误";
    console.error("bilibili-oauth 回调异常:", msg);
    return Response.redirect(`${feRedirect}?bili_error=exception`, 302);
  }
}

serve(async (req: Request) => {
  try {
    const url = new URL(req.url);
    if (url.pathname.endsWith("/callback")) {
      return await handleCallback(url);
    }
    if (req.method === "GET") {
      return handleAuthorize(url);
    }
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "未知错误";
    console.error("bilibili-oauth 异常:", msg);
    return htmlError(msg, 500);
  }
});
=======
// ============================================================
// bilibili-oauth —— 哔哩哔哩自定义 OAuth 接入（Supabase Edge Function）
// ------------------------------------------------------------
// 流程概览：
//   1) 前端调用 /authorize?redirect_uri=<本站回调页>  →  本函数 302 跳转到
//      B 站授权页（redirect_uri 指向本函数的 /callback）。
//   2) 用户在 B 站同意授权后，B 站回跳 /callback?code=...&state=...。
//   3) 本函数校验 state → 用 code 换取 access_token → 调用户信息接口拿
//      openid/name/face → 用 Admin API 创建 / 关联本站用户并换取会话 →
//      302 回跳到前端回调页，并把 access_token/refresh_token 通过 URL
//      fragment 传回（fragment 不上送服务器，更安全）。
//   4) 前端回调页读取 fragment 调 setSession 落本地 cookie，完成登录。
//
// 配置（Supabase Secrets）：
//   BILIBILI_CLIENT_ID        B 站开放平台 client_id（必填）
//   BILIBILI_CLIENT_SECRET    B 站开放平台 client_secret（必填）
//   BILIBILI_AUTHORIZE_URL    授权页地址（可选，默认 https://account.bilibili.com/oauth2/authorize）
//   BILIBILI_SCOPE            申请的 scope（可选，默认空）
//   BILIBILI_STATE_SECRET     用于签名 state 的密钥（可选，默认用 SERVICE_ROLE_KEY）
//   BILIBILI_PASSWORD_SECRET  用于派生用户密码的密钥（可选，默认用 SERVICE_ROLE_KEY）
//
// 重要：B 站开放平台需要把回调地址加入白名单，值为：
//   ${SUPABASE_URL}/functions/v1/bilibili-oauth/callback
// ============================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const BILIBILI_CLIENT_ID = Deno.env.get("BILIBILI_CLIENT_ID") || "";
const BILIBILI_CLIENT_SECRET = Deno.env.get("BILIBILI_CLIENT_SECRET") || "";
const BILIBILI_AUTHORIZE_URL =
  Deno.env.get("BILIBILI_AUTHORIZE_URL") ||
  "https://account.bilibili.com/oauth2/authorize";
const BILIBILI_SCOPE = Deno.env.get("BILIBILI_SCOPE") || "";
const BILIBILI_TOKEN_URL = "https://api.bilibili.com/x/account-oauth2/v1/token";
const BILIBILI_USERINFO_URL =
  "https://member.bilibili.com/arcopen/fn/user/account/info";
const FUNC_BASE = `${SUPABASE_URL}/functions/v1/bilibili-oauth`;
const STATE_SECRET = Deno.env.get("BILIBILI_STATE_SECRET") || SUPABASE_SERVICE_ROLE_KEY;
const PASSWORD_SECRET =
  Deno.env.get("BILIBILI_PASSWORD_SECRET") || SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ---------- base64url 工具 ----------
function b64url(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof ArrayBuffer ? new Uint8Array(buf) : buf;
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function fromB64url(s: string): Uint8Array {
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/"));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}
async function hmac(secret: string, data: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  return b64url(sig);
}

// 签名 state：base64url(JSON).HMAC
async function signState(payload: Record<string, unknown>): Promise<string> {
  const body = b64url(new TextEncoder().encode(JSON.stringify(payload)));
  const sig = await hmac(STATE_SECRET, body);
  return `${body}.${sig}`;
}
async function verifyState(
  token: string | null,
): Promise<{ ok: boolean; feRedirect?: string }> {
  if (!token) return { ok: false };
  const parts = token.split(".");
  if (parts.length !== 2) return { ok: false };
  const [body, sig] = parts;
  const expect = await hmac(STATE_SECRET, body);
  // 定长比较，防时序攻击（简单实现，框架足够）
  if (sig !== expect) return { ok: false };
  try {
    const payload = JSON.parse(new TextDecoder().decode(fromB64url(body)));
    if (typeof payload?.feRedirect !== "string") return { ok: false };
    return { ok: true, feRedirect: payload.feRedirect };
  } catch {
    return { ok: false };
  }
}

// 由 openid 派生稳定密码（无需持久化，创建与登录时使用同一算法）
async function derivePassword(openid: string): Promise<string> {
  return await hmac(PASSWORD_SECRET, `bili:${openid}`);
}

function htmlError(message: string, status = 400): Response {
  return new Response(
    `<!doctype html><html><head><meta charset="utf-8"><title>登录失败</title></head><body style="font-family:sans-serif;display:flex;height:100vh;align-items:center;justify-content:center"><div style="text-align:center"><h2>哔哩哔哩登录失败</h2><p style="color:#666">${message}</p><p><a href="/">返回首页</a></p></div></body></html>`,
    { status, headers: { "Content-Type": "text/html; charset=utf-8" } },
  );
}

// ---------- 路由 1：引导授权 ----------
function handleAuthorize(url: URL): Response {
  if (!BILIBILI_CLIENT_ID || !BILIBILI_CLIENT_SECRET) {
    return htmlError("B 站凭证未配置（BILIBILI_CLIENT_ID / BILIBILI_CLIENT_SECRET）。请在 Supabase 后台配置 Secrets 后重试。", 503);
  }
  const feRedirect = url.searchParams.get("redirect_uri") || "";
  // 仅允许 http/https 回调地址，避免开放重定向
  if (!/^https?:\/\//i.test(feRedirect)) {
    return htmlError("redirect_uri 不合法", 400);
  }

  const csrf = crypto.randomUUID();
  return signState({ csrf, feRedirect }).then((state) => {
    const params = new URLSearchParams({
      client_id: BILIBILI_CLIENT_ID,
      redirect_uri: `${FUNC_BASE}/callback`,
      response_type: "code",
      state,
    });
    if (BILIBILI_SCOPE) params.set("scope", BILIBILI_SCOPE);

    return Response.redirect(
      `${BILIBILI_AUTHORIZE_URL}?${params.toString()}`,
      302,
    );
  });
}

// ---------- 路由 2：处理回调 ----------
async function handleCallback(url: URL): Response {
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const verify = await verifyState(state);
  if (!verify.ok || !verify.feRedirect) {
    return htmlError("state 校验失败，可能是跨站请求伪造或链接已过期。", 403);
  }
  const feRedirect = verify.feRedirect;

  if (!code) {
    return Response.redirect(`${feRedirect}?bili_error=no_code`, 302);
  }

  try {
    // 1) code -> access_token
    const tokenRes = await fetch(BILIBILI_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: BILIBILI_CLIENT_ID,
        client_secret: BILIBILI_CLIENT_SECRET,
        grant_type: "authorization_code",
        code,
        redirect_uri: `${FUNC_BASE}/callback`,
      }).toString(),
    });
    const tokenJson = await tokenRes.json();
    const accessToken = tokenJson?.access_token;
    if (!accessToken) {
      return Response.redirect(`${feRedirect}?bili_error=token`, 302);
    }

    // 2) 用户信息
    const infoRes = await fetch(BILIBILI_USERINFO_URL, {
      method: "GET",
      headers: { Accept: "application/json", "Access-Token": accessToken },
    });
    const infoJson = await infoRes.json();
    const data = infoJson?.data;
    const openid: string = data?.openid;
    const name: string = data?.name || "bilibili用户";
    const face: string = data?.face || "";
    if (!openid) {
      return Response.redirect(`${feRedirect}?bili_error=userinfo`, 302);
    }

    // 3) 创建 / 关联用户并换取会话
    const email = `bili_${openid}@bilibili.local`;
    const password = await derivePassword(openid);
    const userMetadata = {
      provider: "bilibili",
      bilibili_openid: openid,
      name,
      nickname: name,
      avatar_url: face,
      email,
    };

    let session = null as { access_token: string; refresh_token: string } | null;

    const signIn = await supabaseAdmin.auth.signInWithPassword({ email, password });
    if (signIn.data.session) {
      session = signIn.data.session;
    } else {
      const created = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: userMetadata,
      });
      if (created.error) {
        // 可能用户已存在但首次登录失败，再尝试一次
        const retry = await supabaseAdmin.auth.signInWithPassword({ email, password });
        if (retry.data.session) session = retry.data.session;
      } else {
        const signIn2 = await supabaseAdmin.auth.signInWithPassword({ email, password });
        session = signIn2.data.session;
      }
    }

    if (!session) {
      return Response.redirect(`${feRedirect}?bili_error=session`, 302);
    }

    // 4) 关联 / 刷新 profiles.bilibili_openid
    const uid = (session as any).user?.id;
    if (uid) {
      await supabaseAdmin
        .from("profiles")
        .update({
          bilibili_openid: openid,
          nickname: name,
          avatar_url: face,
        })
        .eq("id", uid);
    }

    // 5) 回跳前端，token 经 fragment 传递
    const fragment = new URLSearchParams({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
    });
    if ((session as any).expires_in) {
      fragment.set("expires_in", String((session as any).expires_in));
    }
    return Response.redirect(`${feRedirect}#${fragment.toString()}`, 302);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "未知错误";
    console.error("bilibili-oauth 回调异常:", msg);
    return Response.redirect(`${feRedirect}?bili_error=exception`, 302);
  }
}

serve(async (req: Request) => {
  try {
    const url = new URL(req.url);
    if (url.pathname.endsWith("/callback")) {
      return await handleCallback(url);
    }
    if (req.method === "GET") {
      return handleAuthorize(url);
    }
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "未知错误";
    console.error("bilibili-oauth 异常:", msg);
    return htmlError(msg, 500);
  }
});
>>>>>>> 54107eca (deploy: /app 改动推上线（SiteHeader 移动端侧栏关闭、ui.css 导航高度，及新页面）)
