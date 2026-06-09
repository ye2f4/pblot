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

    const updateStats = async () => {
      try {
        const today = new Date().toISOString().split('T')[0];
        const { data: current } = await supabase
          .from('visit_stats')
          .select('*')
          .eq('id', 1)
          .single();

        let todayCount = current?.today_visits || 0;
        if (current?.last_reset !== today) todayCount = 0;

        const newTotal = (current?.total_visits || 0) + 1;
        const newToday = todayCount + 1;

        await supabase
          .from('visit_stats')
          .update({
            total_visits: newTotal,
            today_visits: newToday,
            last_reset: today
          })
          .eq('id', 1);

        const sessionId = localStorage.getItem('visitor_session') || crypto.randomUUID();
        localStorage.setItem('visitor_session', sessionId);

        await supabase
          .from('online_users')
          .upsert([{ session_id: sessionId, last_active: new Date() }], {
            onConflict: 'session_id'
          });

        await supabase
          .from('online_users')
          .delete()
          .lt('last_active', new Date(Date.now() - 300000).toISOString());

        const { count: onlineCount } = await supabase
          .from('online_users')
          .select('*', { count: 'exact', head: true });

        setStats({
          total: newTotal,
          today: newToday,
          online: onlineCount || 0,
          uv: current?.uv_count || 0
        });
      } catch (e) {
        console.log('统计加载失败', e);
      }
    };

    updateStats();
    const interval = setInterval(updateStats, 5000);
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