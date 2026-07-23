// 论坛复用主站 Supabase 浏览器客户端，确保登录态（localStorage key）天然共享，
// 主站与论坛不再是两个独立会话。这是「supabase 关联问题」的根因修复点。
export { supabase } from '../../supabase/supabaseClient';
