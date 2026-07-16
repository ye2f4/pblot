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

// 与 admin-auth 一致的 HMAC token 校验
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
    const ok = await crypto.subtle.verify("HMAC", key, fromB64(sig), enc.encode(data));
    if (!ok) return false;
    const payload = JSON.parse(atob(data));
    return typeof payload.exp === "number" && payload.exp > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}

function getToken(req: Request): string {
  return (req.headers.get("x-admin-token") || req.headers.get("authorization") || "").replace("Bearer ", "");
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: CORS });
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

  // 列表（含停用项，供后台管理）
  if (action === "list") {
    const { data, error } = await supabaseAdmin
      .from("site_warnings")
      .select("*")
      .order("published_at", { ascending: false })
      .limit(200);
    if (error) return json({ error: error.message }, 500);
    return json({ ok: true, warnings: data });
  }

  // 新增（手动发布）
  if (action === "create") {
    const row = {
      type: body.type,
      level: body.level || "blue",
      region: body.region || null,
      title: body.title,
      message: body.message || null,
      source: body.source || "管理员",
      is_active: body.is_active !== false,
      is_auto: false,
      expires_at: body.expires_at || null,
      lat: typeof body.lat === "number" && Number.isFinite(body.lat) ? body.lat : null,
      lng: typeof body.lng === "number" && Number.isFinite(body.lng) ? body.lng : null,
      impact_at: body.impact_at || null,
      subtype: body.subtype || null,
      shelter: body.shelter || null,
      created_by: "admin",
    };
    if (!row.title) return json({ error: "标题必填" }, 400);
    const { data, error } = await supabaseAdmin.from("site_warnings").insert(row).select().single();
    if (error) return json({ error: error.message }, 500);
    return json({ ok: true, warning: data });
  }

  // 更新（含启停、编辑）
  if (action === "update") {
    const id = body?.id;
    if (!id) return json({ error: "缺少 id" }, 400);
    const patch: Record<string, unknown> = {};
    ["type", "level", "region", "title", "message", "source", "is_active", "expires_at", "lat", "lng", "impact_at", "subtype", "shelter"].forEach((k) => {
      if (body[k] !== undefined) patch[k] = body[k];
    });
    const { data, error } = await supabaseAdmin.from("site_warnings").update(patch).eq("id", id).select().single();
    if (error) return json({ error: error.message }, 500);
    return json({ ok: true, warning: data });
  }

  // 删除
  if (action === "delete") {
    const id = body?.id;
    if (!id) return json({ error: "缺少 id" }, 400);
    const { error } = await supabaseAdmin.from("site_warnings").delete().eq("id", id);
    if (error) return json({ error: error.message }, 500);
    return json({ ok: true });
  }

  return json({ error: "未知 action" }, 400);
});
