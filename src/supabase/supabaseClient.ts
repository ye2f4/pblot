import { createClient } from '@supabase/supabase-js';
import { isBrowser } from '../utils/env';
export const AVATAR_CACHE_KEY = 'supabase_avatar_cache';
export const AVATAR_CACHE_EXPIRE = 24 * 60 * 60 * 1000;

const SUPABASE_URL = "https://xwhwcmorcmgpfpocmgez.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh3aHdjbW9yY21ncGZwb2NtZ2V6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2ODk2MzQsImV4cCI6MjA5NjI2NTYzNH0.O5YcPuehUMjEofFdoNfE5NDxT71qtcMdYeLCvyyoQgw";

const ssrEmptyClient = {
  auth: {
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => { } } } }),
    signInWithOAuth: async () => ({ error: null }),
    signOut: async () => ({ error: null }),
    getSession: async () => ({ data: { session: null } }),
  },
  from: () => ({
    select: () => ({ eq: () => ({ single: async () => ({ data: null, error: null }) }) })
  })
};

export const supabase = isBrowser
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true, // 重中之重，自动抓取#token
      flow: 'pkce',
      storage: window.localStorage,
         // 新增：会话安全配置
        storageKey: 'sb-session',
      cookieOptions: {
        secure: true,
        sameSite: 'strict',
        maxAge: 60 * 60 * 24 * 7, // 7天
      }
    }
  })
  : ssrEmptyClient;