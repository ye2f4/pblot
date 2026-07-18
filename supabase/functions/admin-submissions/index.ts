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

// 仅允许的状态值
const STATUSES = ["draft", "pending", "published", "rejected"];

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

  // 列表（后台可见全部状态，支持按 status 过滤）
  if (action === "list") {
    let q = supabaseAdmin
      .from("user_submissions")
      .select("*")
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(200);
    const filter = body?.status;
    if (filter && filter !== "all" && STATUSES.includes(String(filter))) {
      q = q.eq("status", String(filter));
    }
    const { data, error } = await q;
    if (error) return json({ error: error.message }, 500);
    return json({ ok: true, submissions: data });
  }

  // 审核：通过 / 驳回 / 转为草稿，并可留备注
  if (action === "set_status") {
    const id = body?.id;
    const status = body?.status;
    if (!id) return json({ error: "缺少 id" }, 400);
    if (!status || !STATUSES.includes(String(status))) {
      return json({ error: "status 非法" }, 400);
    }
    const patch: Record<string, unknown> = {
      status: String(status),
      reviewed_at: new Date().toISOString(),
    };
    if (body?.review_note !== undefined) patch.review_note = body.review_note || null;
    const { data, error } = await supabaseAdmin
      .from("user_submissions")
      .update(patch)
      .eq("id", id)
      .select()
      .single();
    if (error) return json({ error: error.message }, 500);
    return json({ ok: true, submission: data });
  }

  // 置顶 / 取消置顶
  if (action === "pin") {
    const id = body?.id;
    if (!id) return json({ error: "缺少 id" }, 400);
    const { data: cur, error: e1 } = await supabaseAdmin
      .from("user_submissions")
      .select("is_pinned")
      .eq("id", id)
      .maybeSingle();
    if (e1) return json({ error: e1.message }, 500);
    if (!cur) return json({ error: "投稿不存在" }, 404);
    const { data, error } = await supabaseAdmin
      .from("user_submissions")
      .update({ is_pinned: !cur.is_pinned })
      .eq("id", id)
      .select()
      .single();
    if (error) return json({ error: error.message }, 500);
    return json({ ok: true, submission: data });
  }

  // 删除
  if (action === "delete") {
    const id = body?.id;
    if (!id) return json({ error: "缺少 id" }, 400);
    const { error } = await supabaseAdmin.from("user_submissions").delete().eq("id", id);
    if (error) return json({ error: error.message }, 500);
    return json({ ok: true });
  }

  return json({ error: "未知 action" }, 400);
});
