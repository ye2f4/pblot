import { createClient } from "@supabase/supabase-js";

// 兼容 Docusaurus 服务端构建（修复 WebSocket 报错）
let ws: any;
if (typeof window === "undefined") {
  ws = require("ws");
}

// 从环境变量读取（你在 GitHub Secrets 已配置）
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: {
    transport: ws,
  },
});
