// 清理 Supabase 环境变量中的 BOM（U+FEFF）与首尾空白。
// Vercel 后台重新编辑变量时可能误粘贴 BOM 零宽字符，
// 该字符被内联进客户端 chunk 后，会让 Supabase 的 apikey 请求头含多字节字符而报错
// （Invalid header ... cannot contain multi-byte characters）。
// 这里在运行时统一剥离，作为防御层，无论 env 是否带 BOM 都能正常工作。
// 注意：必须用 \uFEFF 转义，源码中不得出现真实 BOM 字符。
function clean(value: string | undefined, fallback: string): string {
  return (value ?? fallback).replace(/\uFEFF/g, '').trim();
}

export const SUPABASE_URL = clean(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  'https://xwhwcmorcmgpfpocmgez.supabase.co',
);

export const SUPABASE_ANON_KEY = clean(
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh3aHdjbW9yY21ncGZwb2NtZ2V6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDg2ODk2MzQsImV4cCI6MjA5NjI2NTYzNH0.O5YcPuehUMjEofFdoNfE5NDxT71qtcMdYeLCvyyoQgw',
);
