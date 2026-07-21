'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';

export type Locale = 'zh-CN' | 'en';

// 应用内 UI 文案字典（与 Docusaurus 端 i18n 语言保持一致：zh-CN / en）
const dict = {
  'zh-CN': {
    login: '登录',
    logout: '退出',
    profile: '个人中心',
    search: '搜索',
    toggleTheme: '切换主题',
    language: '语言',
    forum: '论坛',
    chat: '聊天',
    friends: '友链',
    home: '首页',
    loading: '加载中…',
    send: '发送',
    inputPlaceholder: '说点什么…',
  },
  en: {
    login: 'Sign In',
    logout: 'Sign Out',
    profile: 'Profile',
    search: 'Search',
    toggleTheme: 'Toggle theme',
    language: 'Language',
    forum: 'Forum',
    chat: 'Chat',
    friends: 'Friends',
    home: 'Home',
    loading: 'Loading…',
    send: 'Send',
    inputPlaceholder: 'Say something…',
  },
} as const;

type Dict = (typeof dict)['zh-CN'];
type Key = keyof Dict;

type LocaleCtx = {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (k: Key) => string;
};

const LocaleContext = createContext<LocaleCtx>({
  locale: 'zh-CN',
  setLocale: () => {},
  t: (k) => dict['zh-CN'][k],
});

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('zh-CN');

  useEffect(() => {
    let initial: Locale = 'zh-CN';
    try {
      const stored = localStorage.getItem('app-locale') as Locale | null;
      if (stored === 'en' || stored === 'zh-CN') {
        initial = stored;
      } else if (
        typeof navigator !== 'undefined' &&
        navigator.language.toLowerCase().startsWith('en')
      ) {
        initial = 'en';
      }
    } catch {
      /* ignore */
    }
    setLocaleState(initial);
    document.documentElement.lang = initial === 'en' ? 'en' : 'zh-CN';
  }, []);

  const setLocale = (l: Locale) => {
    setLocaleState(l);
    try {
      localStorage.setItem('app-locale', l);
    } catch {
      /* ignore */
    }
    document.documentElement.lang = l === 'en' ? 'en' : 'zh-CN';
  };

  const t = (k: Key) => dict[locale][k];

  return (
    <LocaleContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  return useContext(LocaleContext);
}
