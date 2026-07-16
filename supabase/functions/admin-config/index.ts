import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.33.1";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ADMIN_JWT_SECRET = Deno.env.get("ADMIN_JWT_SECRET")!;

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const CORS = new Headers({
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
  "Access-Control-Allow-Headers": "*",
});

// 与 admin-auth 保持一致的 HMAC 校验
async function verifyToken(token: string): Promise<boolean> {
  try {
    const [data, sig] = token.split(".");
    if (!data || !sig) return false;
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      enc.encode(ADMIN_JWT_SECRET),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"],
    );
    const ok = await crypto.subtle.verify(
      "HMAC",
      key,
      Uint8Array.from(atob(sig), (c) => c.charCodeAt(0)),
      enc.encode(data),
    );
    if (!ok) return false;
    const payload = JSON.parse(atob(data));
    return typeof payload.exp === "number" && payload.exp > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: CORS });
}

function getToken(req: Request): string {
  // 优先读 x-admin-token（避免与 supabase functions.invoke 默认 Authorization 冲突）
  return (req.headers.get("x-admin-token") || req.headers.get("authorization") || "").replace("Bearer ", "");
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });

  const token = getToken(req);
  const authed = token && (await verifyToken(token));
  if (!authed) return json({ error: "未授权或登录已过期" }, 401);

  // 仅开放写入：接收 { config: { "texts.announcement": "...", ... } }
  if (req.method === "POST") {
    try {
      const body = await req.json().catch(() => ({}));
      const updates = body?.config;
      if (!updates || typeof updates !== "object") {
        return json({ error: "config 格式错误" }, 400);
      }

      const now = new Date().toISOString();
      const rows = Object.entries(updates).map(([key, value]) => ({
        key,
        value,
        updated_at: now,
      }));

      const { error } = await supabaseAdmin.from("site_config").upsert(rows);
      if (error) return json({ error: error.message }, 500);

      return json({ ok: true, message: "配置已保存" });
    } catch (err) {
      return json({ error: "保存失败", detail: String(err) }, 500);
    }
  }

  return json({ error: "Method not allowed" }, 405);
});
