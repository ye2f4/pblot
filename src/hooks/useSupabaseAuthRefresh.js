import { useEffect, useState } from 'react';
import { supabase } from '../supabase/supabaseClient';

// 全局统一登录态，彻底解决退出重登状态残留
export function useSupabaseAuthRefresh() {
  const [latestUser, setLatestUser] = useState(null);

  useEffect(() => {
    let sub = null;

    // 初始获取最新用户
    const initUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setLatestUser(user ?? null);
    };
    initUser();

    // 全局监听登录/退出/换号
    sub = supabase.auth.onAuthStateChange((_, session) => {
      setLatestUser(session?.user ?? null);
    });

    return () => {
      // 修复：先判断订阅实例存在，再调用取消订阅，避免undefined报错
      sub?.unsubscribe();
    };
  }, []);

  return latestUser;
}
