// 公开 Supabase 配置——直接写死在源码，故意不走环境变量。
// anon key 本就是公开值（每个浏览器都会拿到），无保密需求；
// 之前从 Vercel 环境变量读取时，后台编辑误带 BOM 零宽字符，被内联进
// 客户端 chunk 导致哈希错位、与本地提交的静态对不上。写死后构建内联同一份常量，
// BOM 问题从根上消失。与主站 src/supabase/supabaseClient.ts 使用同一组公开值。
export const SUPABASE_URL = 'https://xwhwcmorcmgpfpocmgez.supabase.co';

export const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh3aHdjbW9yY21ncGZwb2NtZ2V6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2ODk2MzQsImV4cCI6MjA5NjI2NTYzNH0.O5YcPuehUMjEofFdoNfE5NDxT71qtcMdYeLCvyyoQgw';
