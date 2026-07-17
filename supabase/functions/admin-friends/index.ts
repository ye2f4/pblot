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
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "*",
});

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
  return (req.headers.get("x-admin-token") || req.headers.get("authorization") || "").replace("Bearer ", "");
}

// 允许写入的字段白名单
function pickFields(body: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  if (body.name !== undefined) out.name = String(body.name).trim();
  if (body.url !== undefined) out.url = String(body.url).trim();
  if (body.avatar !== undefined) out.avatar = String(body.avatar || "").trim() || null;
  if (body.description !== undefined) out.description = String(body.description || "").trim() || null;
  if (body.tag !== undefined) out.tag = String(body.tag || "朋友").trim() || "朋友";
  if (body.sort_order !== undefined) out.sort_order = Number(body.sort_order) || 0;
  if (body.is_approved !== undefined) out.is_approved = !!body.is_approved;
  return out;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });

  const token = getToken(req);
  const authed = token && (await verifyToken(token));
  if (!authed) return json({ error: "未授权或登录已过期" }, 401);

  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    /* ignore */
  }
  const action = body?.action;

  // 列表（后台可见全部，含未启用）
  if (action === "list") {
    const { data, error } = await supabaseAdmin
      .from("friend_links")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("id", { ascending: true });
    if (error) return json({ error: error.message }, 500);
    return json({ ok: true, friends: data });
  }

  // 新增
  if (action === "create") {
    const fields = pickFields(body);
    if (!fields.name || !fields.url) return json({ error: "站点名称与链接必填" }, 400);
    const { data, error } = await supabaseAdmin
      .from("friend_links")
      .insert(fields)
      .select()
      .single();
    if (error) return json({ error: error.message }, 500);
    return json({ ok: true, friend: data });
  }

  // 更新
  if (action === "update") {
    const id = body?.id;
    if (!id) return json({ error: "缺少 id" }, 400);
    const fields = pickFields(body);
    if ("name" in fields && !fields.name) return json({ error: "站点名称不能为空" }, 400);
    if ("url" in fields && !fields.url) return json({ error: "链接不能为空" }, 400);
    const { data, error } = await supabaseAdmin
      .from("friend_links")
      .update(fields)
      .eq("id", id)
      .select()
      .single();
    if (error) return json({ error: error.message }, 500);
    return json({ ok: true, friend: data });
  }

  // 删除
  if (action === "delete") {
    const id = body?.id;
    if (!id) return json({ error: "缺少 id" }, 400);
    const { error } = await supabaseAdmin.from("friend_links").delete().eq("id", id);
    if (error) return json({ error: error.message }, 500);
    return json({ ok: true });
  }

  return json({ error: "未知 action" }, 400);
});
