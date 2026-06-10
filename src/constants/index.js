// 页面路由常量
export const ROUTES = {
  LOGIN: '/login',
  REGISTER: '/register',
  PROFILE: '/profile'
};

// 主题颜色常量
export const COLORS = {
  primary: '#4285f4',
  danger: '#dc3545',
  accent: '#f4bc42',
  gray: '#999',
  textMain: '#1a1a1a',
  textDesc: '#666',
  textNormal: '#333'
};

// 头像缓存配置
export const AVATAR_CACHE_KEY = 'supabase_avatar_cache';
export const AVATAR_CACHE_EXPIRE = 24 * 60 * 60 * 1000; // 24小时