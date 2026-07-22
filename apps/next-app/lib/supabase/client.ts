import { createBrowserClient } from '@supabase/ssr';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config';

// 单例浏览器客户端（对应 Docusaurus 的 supabaseClient）
// 浏览器端不设 cookie domain：JS 写 document.cookie 默认落在当前域（monoblog.cc.cd），
// 使 / 与 /app 天然共享登录态；domain 仅由 next-app 服务端(middleware/server)显式设置以对抗代理 Host 偏差
export const supabase = createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
