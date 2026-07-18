import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.33.1";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const KEEP_UID = "31452874-c41a-4e2e-a497-8b67e42ccafa";

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }

  try {
    // Step 1: 列出所有用户
    const { data: { users }, error: listErr } = await supabaseAdmin.auth.admin.listUsers();

    if (listErr) {
      return new Response(JSON.stringify({ error: "列出用户失败", detail: JSON.stringify(listErr) }), { status: 500 });
    }

    const allUids = users.map((u) => u.id);
    const deleteUids = allUids.filter((uid) => uid !== KEEP_UID);

    const report = {
      total: allUids.length,
      keep: KEEP_UID,
      keepEmail: users.find((u) => u.id === KEEP_UID)?.email || "unknown",
      deleteCount: deleteUids.length,
      deleted: [] as any[],
    };

    // Step 2: 逐个删除 - 使用 User 管理 API
    for (const uid of deleteUids) {
      const userInfo = users.find((u) => u.id === uid);
      const result = await supabaseAdmin.auth.admin.deleteUser(uid);
      
      report.deleted.push({
        uid,
        email: userInfo?.email || "unknown",
        ok: !result.error,
        error: result.error ? JSON.stringify(result.error) : null,
        data: result.data ? JSON.stringify(result.data) : null,
      });
    }

    // Step 3: 如果用户删除失败，用 GoTrue Admin API 直接删除
    // 对于 auth.admin.deleteUser 失败的用户，尝试用 REST API
    const failedUids = report.deleted.filter(d => !d.ok).map(d => d.uid);
    
    if (failedUids.length > 0) {
      report["direct_api_attempts"] = [];
      for (const uid of failedUids) {
        const url = `${SUPABASE_URL}/auth/v1/admin/users/${uid}`;
        const resp = await fetch(url, {
          method: "DELETE",
          headers: {
            "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            "apikey": SUPABASE_SERVICE_ROLE_KEY,
          },
        });
        const respText = await resp.text();
        report["direct_api_attempts"].push({
          uid,
          status: resp.status,
          ok: resp.ok,
          body: respText,
        });
      }
    }

    // Step 4: 清理关联数据
    // 先清理 profiles
    const { error: profileErr } = await supabaseAdmin
      .from("profiles")
      .delete()
      .neq("id", KEEP_UID);
    report["profiles_cleaned"] = !profileErr;

    // 清理其他关联表
    const tables = ["comments", "sign_ins", "messages", "group_members", 
                    "article_likes", "online_users", "custom_locations", "devices",
                    "visit_stats", "hourly_visits"];
    report["cleanup"] = {};
    for (const table of tables) {
      try {
        const { error } = await supabaseAdmin
          .from(table)
          .delete()
          .neq("user_id", KEEP_UID)
          .neq("id", KEEP_UID);
        report["cleanup"][table] = { ok: !error, err: error?.message };
      } catch (e) {
        report["cleanup"][table] = { ok: false, err: String(e) };
      }
    }

    return new Response(JSON.stringify(report, null, 2), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "服务器异常", detail: String(err) }), { status: 500 });
  }
});
