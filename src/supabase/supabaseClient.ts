import { createClient } from '@supabase/supabase-js';

// 确保使用环境变量，不要硬编码密钥
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true, // 🔥 关键：启用会话持久化
    autoRefreshToken: true, // 自动刷新token
    detectSessionInUrl: true, // 检测URL中的会话信息
    storage: typeof window !== 'undefined' ? window.localStorage : null,
  }
});