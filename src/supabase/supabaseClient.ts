import { createClient } from '@supabase/supabase-js';
import { isBrowser } from '../utils/env';
export const AVATAR_CACHE_KEY = 'supabase_avatar_cache';
export const AVATAR_CACHE_EXPIRE = 24 * 60 * 60 * 1000;

const SUPABASE_URL = "https://xwhwcmorcmgpfpocmgez.supabase.co";
const SUPABASE_ANON_KEY = "你的匿名密钥";

const ssrEmptyClient = {
  auth: {
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
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
        storage: window.localStorage
      }
    })
  : ssrEmptyClient;