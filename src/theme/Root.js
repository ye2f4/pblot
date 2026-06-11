import React from 'react';
import { Analytics } from '@vercel/analytics/react';

// Docusaurus 全局根组件，全站所有页面都会加载
export default function Root({ children }) {
  return (
    <>
      {children}
      {/* 全局注入 Vercel 访客统计，自动上报PV/UV/访问地区/设备 */}
      <Analytics debug={process.env.NODE_ENV === 'development'} />
    </>
  );
}