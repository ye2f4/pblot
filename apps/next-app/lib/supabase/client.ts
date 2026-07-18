import { createBrowserClient } from '@supabase/ssr';

// 复用与 Docusaurus 相同的 Supabase 项目；anon key 为公开值，可直接复用
const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://xwhwcmorcmgpfpocmgez.supabase.co';
const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh3aHdjbW9yY21ncGZwb2NtZ2V6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2ODk2MzQsImV4cCI6MjA5NjI2NTYzNH0.O5YcPuehUMjEofFdoNfE5NDxT71qtcMdYeLCvyyoQgw';

// 单例浏览器客户端（对应 Docusaurus 的 supabaseClient）
// 浏览器端不设 cookie domain：JS 写 document.cookie 默认落在当前域（monoblog.cc.cd），
// 使 / 与 /app 天然共享登录态；domain 仅由 next-app 服务端(middleware/server)显式设置以对抗代理 Host 偏差
export const supabase = createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
