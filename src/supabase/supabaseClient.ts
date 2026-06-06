import { createClient } from "@supabase/supabase-js";

// 修复：仅服务端构建时加载 ws 库
let ws;
if (typeof window === "undefined") {
  ws = require("ws");
}

const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || "";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  // 关键修复：给 Node 环境指定 WebSocket
  realtime: {
    transport: ws,
  },
});
