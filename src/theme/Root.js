import React from 'react';
import { Analytics } from '@vercel/analytics/react';
import ChatRedDot from '../components/ChatRedDot';
import { SiteConfigProvider } from './SiteConfigProvider';

// Docusaurus 全局根组件，全站所有页面都会加载
export default function Root({ children }) {
  return (
    <SiteConfigProvider>
      {children}
      {/* 全局注入 Vercel 访客统计，自动上报PV/UV/访问地区/设备 */}
      <Analytics debug={process.env.NODE_ENV === 'development'} />
      {/* 全局聊天未读红点监听：挂在这里才能在所有页面（含 /chat）实时追踪新消息 */}
      <ChatRedDot />
    </SiteConfigProvider>
  );
}