import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.33.1";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

serve(async (req: Request) => {
  const allowDomains = [
    "https://monoblog.cc.cd",
    "http://localhost:3000"
  ];
  const origin = req.headers.get("origin") || "";
  const corsHeaders = {
    "Access-Control-Allow-Methods": "POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
  if (allowDomains.includes(origin)) {
    corsHeaders["Access-Control-Allow-Origin"] = origin;
  }

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    const {
      username,
      password,
      nickname,
      avatar_url,
      signature,
      gender,
      birthday,
      real_name
    } = payload;

    // 必填项校验
    if (!username || !password || !nickname) {
      return new Response(JSON.stringify({ error: "用户名、密码、昵称不能为空" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      return new Response(JSON.stringify({ error: "用户名需3-20位，仅支持字母、数字、下划线" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 查重：用户名 / 昵称
    const { data: existCheck } = await supabaseAdmin
      .from("profiles")
      .select("id,username,nickname")
      .or(`username.eq.${username},nickname.eq.${nickname}`)
      .maybeSingle();

    if (existCheck) {
      if (existCheck.username === username) {
        return new Response(JSON.stringify({ error: "用户名已存在" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
      if (existCheck.nickname === nickname) {
        return new Response(JSON.stringify({ error: "昵称已被占用" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
    }

    // 创建auth内部账号
    const randomSuffix = crypto.randomUUID();
    const internalEmail = `${randomSuffix}_${username}@internal-no-mail.local`;
    const { data: authUserRes, error: authCreateErr } = await supabaseAdmin.auth.admin.createUser({
      email: internalEmail,
      password,
      email_confirm: true,
      user_metadata: { username: username.toLowerCase() }
    });

    if (authCreateErr || !authUserRes.user) {
      console.error("创建Auth用户失败：", authCreateErr);
      return new Response(JSON.stringify({ error: "账号创建失败" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    const userId = authUserRes.user.id;

    // 完整写入所有注册资料【核心修复】
    const { error: insertProfileErr } = await supabaseAdmin.from("profiles").insert({
      id: userId,
      username: username.toLowerCase(),
      nickname,
      avatar_url: avatar_url ?? "😀",
      signature: signature ?? "这家伙很懒~",
      gender: gender ?? "unknown",
      birthday: birthday || null,
      real_name: real_name ?? ""
    });

    if (insertProfileErr) {
      console.error("写入profile失败，回滚账号：", insertProfileErr);
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return new Response(JSON.stringify({ error: "用户资料保存失败" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify({ success: true, uid: userId }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (err) {
    console.error("注册函数全局异常：", err);
    return new Response(JSON.stringify({ error: "服务器异常，请稍后重试" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});