import React from 'react';
import { Analytics } from '@vercel/analytics/react';
import ChatRedDot from '../components/ChatRedDot';
import { SiteConfigProvider } from './SiteConfigProvider';
import { WarningsProvider } from './WarningsProvider';
import WarningModal from '../components/WarningModal';
import DevDeployPanel from '../components/DevDeployPanel';
import SitePolish, { PageTransition } from '../components/SitePolish';

// Docusaurus 全局根组件，全站所有页面都会加载
export default function Root({ children }) {
  return (
    <SiteConfigProvider>
      <WarningsProvider>
        {/* 全站精致度特效：开场动画 + 点击粒子（浮层，无布局影响） */}
        <SitePolish />
        {/* 页面切换淡入：劫持 history 感知路由，切换时重播淡入动画（不重挂载 children） */}
        <PageTransition>{children}</PageTransition>
        {/* 全局注入 Vercel 访客统计，自动上报PV/UV/访问地区/设备 */}
        <Analytics debug={process.env.NODE_ENV === 'development'} />
        {/* 全局聊天未读红点监听：挂在这里才能在所有页面（含 /chat）实时追踪新消息 */}
        <ChatRedDot />
        {/* 全站灾害/应急预警全屏弹窗 */}
        <WarningModal />
        {/* 双轨一键部署浮层（仅 dev 模式显示，生产构建不渲染、不含密钥） */}
        {process.env.NODE_ENV === 'development' && <DevDeployPanel />}
      </WarningsProvider>
    </SiteConfigProvider>
  );
}