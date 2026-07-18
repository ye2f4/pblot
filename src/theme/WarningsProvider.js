import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '../supabase/supabaseClient';

const WarningsContext = createContext({
  warnings: [],
  loading: true,
  refresh: async () => {},
  triggerQuake: async () => {},
});

// 读取当前生效的预警（is_active 且未过期），并定期自动拉取地震速报。
export function WarningsProvider({ children }) {
  const [warnings, setWarnings] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('site_warnings')
        .select('*')
        .eq('is_active', true)
        .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
        .order('published_at', { ascending: false });
      if (error) throw error;
      setWarnings(data || []);
    } catch (e) {
      console.warn('[Warnings] 加载预警失败（将不显示弹窗）：', e);
    } finally {
      setLoading(false);
    }
  }, []);

  // 触发 fetch-quake 函数（匿名可调用），拉取后刷新
  const triggerQuake = useCallback(async () => {
    try {
      await supabase.functions.invoke('fetch-quake');
      await refresh();
    } catch (e) {
      console.warn('[Warnings] 拉取地震速报失败：', e);
    }
  }, [refresh]);

  useEffect(() => {
    refresh();
    // 每 10 分钟自动拉取一次地震速报，保持数据新鲜
    const timer = setInterval(triggerQuake, 10 * 60 * 1000);
    return () => clearInterval(timer);
  }, [refresh, triggerQuake]);

  return (
    <WarningsContext.Provider value={{ warnings, loading, refresh, triggerQuake }}>
      {children}
    </WarningsContext.Provider>
  );
}

export function useWarnings() {
  return useContext(WarningsContext);
}
