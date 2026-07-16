import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '../supabase/supabaseClient';

const SiteConfigContext = createContext({
  config: {},
  loading: true,
  refresh: async () => {},
});

// 全局 Provider：在 Root 挂载，启动时拉取 site_config（公开读），
// 供全站组件按点路径合并进 siteData，实现「后台改参数、前端立即生效」。
export function SiteConfigProvider({ children }) {
  const [config, setConfig] = useState({});
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('site_config')
        .select('key, value');
      if (error) throw error;
      const map = {};
      (data || []).forEach((r) => {
        map[r.key] = r.value;
      });
      setConfig(map);
    } catch (e) {
      console.warn('[SiteConfig] 加载动态配置失败（将使用静态 siteData）：', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <SiteConfigContext.Provider value={{ config, loading, refresh }}>
      {children}
    </SiteConfigContext.Provider>
  );
}

export function useSiteConfig() {
  return useContext(SiteConfigContext);
}

// 把「点路径 -> 值」的配置 map 应用到基础 siteData，返回合并后的新对象。
// 例如 { "texts.announcement": "新公告" } 会覆盖 merged.texts.announcement。
export function applySiteConfig(base, configMap) {
  if (!configMap || Object.keys(configMap).length === 0) return base;
  const merged = JSON.parse(JSON.stringify(base));
  Object.entries(configMap).forEach(([path, value]) => {
    const parts = path.split('.');
    let cur = merged;
    for (let i = 0; i < parts.length - 1; i++) {
      if (typeof cur[parts[i]] !== 'object' || cur[parts[i]] === null) {
        cur[parts[i]] = {};
      }
      cur = cur[parts[i]];
    }
    cur[parts[parts.length - 1]] = value;
  });
  return merged;
}
