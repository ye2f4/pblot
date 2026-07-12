import { supabase } from '../supabase/supabaseClient';
export const AVATAR_CACHE_KEY = "avatar_cache";

/**
 * 【全局唯一触发入口】资料保存成功后调用
 * 作用：清除缓存 + 拉取最新profile + 派发全局事件，所有页面自动刷新UI
 */
export async function triggerGlobalProfileRefresh() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  // 1. 删除头像本地缓存（核心修复）
  localStorage.removeItem(AVATAR_CACHE_KEY);

  // 2. 请求最新完整资料
  const { data: profileData } = await supabase
    .from('profiles')
    .select('id,nickname,avatar_url,signature,real_name,gender,birthday,address')
    .eq('id', user.id)
    .single();

  // 3. 全局派发事件，所有组件监听自动刷新
  window.dispatchEvent(
    new CustomEvent('globalProfileUpdated', {
      detail: profileData
    })
  );
  console.log("✅ 全局Profile事件已派发", profileData);
}