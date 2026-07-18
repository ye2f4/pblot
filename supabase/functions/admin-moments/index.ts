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

function pickFields(body: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  if (body.content !== undefined) out.content = String(body.content).trim();
  if (body.author_name !== undefined) out.author_name = String(body.author_name || "").trim() || "站长";
  if (body.author_avatar !== undefined) out.author_avatar = String(body.author_avatar || "").trim() || null;
  if (body.is_pinned !== undefined) out.is_pinned = !!body.is_pinned;
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

  // 列表（后台可见全部，含已删除，便于恢复/审计）
  if (action === "list") {
    const { data, error } = await supabaseAdmin
      .from("moments")
      .select("*")
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) return json({ error: error.message }, 500);
    return json({ ok: true, moments: data });
  }

  // 后台发布（站长身份）
  if (action === "create") {
    const fields = pickFields(body);
    if (!fields.content) return json({ error: "内容不能为空" }, 400);
    if (String(fields.content).length > 500) return json({ error: "内容过长（上限 500 字）" }, 400);
    const { data, error } = await supabaseAdmin
      .from("moments")
      .insert(fields)
      .select()
      .single();
    if (error) return json({ error: error.message }, 500);
    return json({ ok: true, moment: data });
  }

  // 更新（置顶/取消置顶）
  if (action === "update") {
    const id = body?.id;
    if (!id) return json({ error: "缺少 id" }, 400);
    const fields = pickFields(body);
    const { data, error } = await supabaseAdmin
      .from("moments")
      .update(fields)
      .eq("id", id)
      .select()
      .single();
    if (error) return json({ error: error.message }, 500);
    return json({ ok: true, moment: data });
  }

  // 软删除
  if (action === "delete") {
    const id = body?.id;
    if (!id) return json({ error: "缺少 id" }, 400);
    const { error } = await supabaseAdmin
      .from("moments")
      .update({ is_deleted: true, deleted_at: new Date().toISOString() })
      .eq("id", id);
    if (error) return json({ error: error.message }, 500);
    return json({ ok: true });
  }

  return json({ error: "未知 action" }, 400);
});
