import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.33.1";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ADMIN_JWT_SECRET = Deno.env.get("ADMIN_JWT_SECRET")!;
const ADMIN_SETUP_KEY = Deno.env.get("ADMIN_SETUP_KEY")!;

const MAX_ATTEMPTS = 5;
const LOCK_MS = 15 * 60 * 1000; // 失败 5 次锁 15 分钟
const TOKEN_TTL = 30 * 60; // token 有效期 30 分钟

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const CORS = new Headers({
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "*",
});

// 函数实例级失败计数（重启清零，足够阻挡自动化爆破）
const attempts = { count: 0, until: 0 };

function b64(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof ArrayBuffer ? new Uint8Array(buf) : buf;
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

function fromB64(s: string): Uint8Array {
  const bin = atob(s);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

// PBKDF2-SHA256（15 万次）哈希；saltB64 提供时用于校验，否则生成新盐
async function hashPassword(password: string, saltB64?: string): Promise<{ hash: string; salt: string }> {
  const salt = saltB64 ? fromB64(saltB64) : crypto.getRandomValues(new Uint8Array(16));
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: 150000, hash: "SHA-256" },
    keyMaterial,
    256,
  );
  return { hash: b64(bits), salt: b64(salt.buffer) };
}

// 签发 HMAC 签名、带过期的短期 token（格式：base64(payload).base64(sig)）
async function signToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const payload = { sub: "admin", iat: now, exp: now + TOKEN_TTL };
  const enc = new TextEncoder();
  const data = b64(enc.encode(JSON.stringify(payload)));
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(ADMIN_JWT_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  return `${data}.${b64(sig)}`;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: CORS });
}

// 校验输入密码是否匹配存储哈希
async function verifyPassword(password: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from("admin_secrets")
    .select("password_hash, salt")
    .eq("id", 1)
    .maybeSingle();
  if (error || !data) return false;
  const { hash } = await hashPassword(password, data.salt);
  return hash === data.password_hash;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    /* 忽略空 body */
  }
  const action = body?.action;

  // ── 首次初始化密码（需 setup key，仅能成功一次）──
  if (action === "setup") {
    const key = req.headers.get("x-setup-key") || "";
    if (!ADMIN_SETUP_KEY || key !== ADMIN_SETUP_KEY) {
      return json({ error: "setup key 无效" }, 403);
    }
    const { data: existing } = await supabaseAdmin
      .from("admin_secrets")
      .select("id")
      .eq("id", 1)
      .maybeSingle();
    if (existing) {
      return json({ error: "密码已初始化，请使用 change_password 改密" }, 409);
    }
    const pwd = String(body?.password || "");
    if (pwd.length < 8) return json({ error: "密码至少 8 位" }, 400);
    const { hash, salt } = await hashPassword(pwd);
    const { error } = await supabaseAdmin
      .from("admin_secrets")
      .insert({ id: 1, password_hash: hash, salt });
    if (error) return json({ error: error.message }, 500);
    return json({ ok: true, message: "管理密码初始化成功，请登录。" });
  }

  // ── 登录：校验密码，签发 token；含失败锁定 ──
  if (action === "login") {
    if (attempts.count >= MAX_ATTEMPTS && Date.now() < attempts.until) {
      return json(
        { error: `尝试次数过多，已锁定至 ${new Date(attempts.until).toLocaleString()}` },
        429,
      );
    }
    const ok = await verifyPassword(String(body?.password || ""));
    if (!ok) {
      attempts.count += 1;
      if (attempts.count >= MAX_ATTEMPTS) attempts.until = Date.now() + LOCK_MS;
      return json({ error: "密码错误" }, 401);
    }
    attempts.count = 0;
    const token = await signToken();
    return json({ ok: true, token });
  }

  // ── 改密：需原密码正确 ──
  if (action === "change_password") {
    const ok = await verifyPassword(String(body?.old_password || ""));
    if (!ok) return json({ error: "原密码错误" }, 401);
    const np = String(body?.new_password || "");
    if (np.length < 8) return json({ error: "新密码至少 8 位" }, 400);
    const { hash, salt } = await hashPassword(np);
    const { error } = await supabaseAdmin
      .from("admin_secrets")
      .update({ password_hash: hash, salt, updated_at: new Date().toISOString() })
      .eq("id", 1);
    if (error) return json({ error: error.message }, 500);
    return json({ ok: true, message: "密码已更新" });
  }

  return json({ error: "未知 action" }, 400);
});
