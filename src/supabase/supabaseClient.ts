import { createClient } from '@supabase/supabase-js';
import { AVATAR_CACHE_KEY, AVATAR_CACHE_EXPIRE } from '../constants';

// 保留你原有地址 & 匿名密钥（不修改硬编码）
const SUPABASE_URL = "https://xwhwcmorcmgpfpocmgez.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh3aHdjbW9yY21ncGZwb2NtZ2V6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2ODk2MzQsImV4cCI6MjA5NjI2NTYzNH0.O5YcPuehUMjEofFdoNfE5NDxT71qtcMdYeLCvyyoQgw";

// SSR 桩对象：避免服务端调用 auth/from 时报错
const ssrEmptyClient = {
  auth: {
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    signInWithOAuth: async () => ({ error: null }),
    signOut: async () => ({ error: null }),
  },
  from: () => ({
    select: () => ({
      eq: () => ({
        single: async () => ({ data: null, error: null })
      })
    })
  })
};

// 仅浏览器初始化真实客户端，SSR 返回安全桩对象
export const supabase = typeof window !== 'undefined'
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: window.localStorage,
        flow: 'pkce' // 启用 PKCE 授权流，提升OAuth安全性
      },
    })
  : ssrEmptyClient;

// 全局导出缓存常量
export { AVATAR_CACHE_KEY, AVATAR_CACHE_EXPIRE };