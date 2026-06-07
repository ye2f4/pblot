import { createClient } from '@supabase/supabase-js';

// 直接使用你的固定地址（无环境变量，100%构建成功）
const SUPABASE_URL = "https://xwhwcmorcmgpfpocmgez.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh3aHdjbW9yY21ncGZwb2NtZ2V6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2ODk2MzQsImV4cCI6MjA5NjI2NTYzNH0.O5YcPuehUMjEofFdoNfE5NDxT71qtcMdYeLCvyyoQgw";

// 构建安全：服务端渲染时不初始化客户端，避免报错
export const supabase = typeof window !== 'undefined' 
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: window.localStorage,
      },
    })
  : ({} as ReturnType<typeof createClient>);