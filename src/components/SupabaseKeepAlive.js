import { useEffect, useRef } from 'react';
import { supabase } from '../supabase/supabaseClient';

export default function SupabaseKeepAlive() {
  const intervalRef = useRef(null);

  useEffect(() => {
    if (!supabase) return;

    const ping = async () => {
      try {
        // 并行 ping 所有核心表
        await Promise.allSettled([
          supabase.from('visit_stats').select('id').limit(1),
          supabase.from('online_users').select('session_id').limit(1),
          supabase.from('hourly_visits').select('id').limit(1),
          supabase.from('visitor_locations').select('id').limit(1),
          supabase.from('forum_posts').select('id').limit(1),
          supabase.rpc('get_current_timestamp'),
        ]);
      } catch (e) {
        // 静默处理
      }
    };

    // 首次立即 ping
    ping();

    // 每 5 分钟 ping 一次，防止 Supabase 免费项目休眠
    intervalRef.current = setInterval(ping, 300000);

    // 页面可见性变化时也 ping
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') ping();
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(intervalRef.current);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  return null;
}
