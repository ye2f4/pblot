import { useState, useEffect } from 'react';
import { supabase } from '../../supabase/supabaseClient';

export default function VisitorCount() {
  const [stats, setStats] = useState({
    total: 0,
    today: 0,
    online: 0,
    uv: 0
  });

  useEffect(() => {
    if (!supabase) return;

    const fetchStats = async () => {
      try {
        // 只读模式，不再写入
        const { data } = await supabase
          .from('visit_stats')
          .select('today_visits, total_visits, uv_count, last_reset')
          .eq('id', 1)
          .single();

        const today = new Date().toISOString().split('T')[0];
        const todayVisits = data?.last_reset === today ? (data?.today_visits || 0) : 0;

        const { count: onlineCount } = await supabase
          .from('online_users')
          .select('*', { count: 'exact', head: true });

        setStats({
          total: data?.total_visits || 0,
          today: todayVisits,
          online: onlineCount || 0,
          uv: data?.uv_count || 0
        });
      } catch (e) {
        console.log('VisitorCount 读取统计失败', e.message);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ fontSize: '12px', lineHeight: '1.6', color: '#666' }}>
      <div>👥 在线人数：{stats.online}</div>
      <div>☀️ 今日访问：{stats.today}</div>
      <div>👣 总访问量：{stats.total}</div>
      <div>🧩 独立访客：{stats.uv}</div>
    </div>
  );
}
