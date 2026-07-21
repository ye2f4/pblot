// 显式引入 @mono/ui 的导航栏/页脚样式（关键：否则 /app 端布局完全错乱）。
// packages/ui 的 exports 暴露的是 styles.css（映射到 src/ui.css）。
// 必须通过 JS import 显式引入，不能只依赖 SiteHeader/SiteFooter 内部
// 的副作用 import（index.ts 顶部的 import './ui.css'），后者在 Vercel
// next-app 独立构建中不可靠，导致 ui.css 未进入 layout 的 CSS bundle。
import '@mono/ui/styles.css';
import './globals.css';
import type { Metadata } from 'next';
import AppNav from '@/components/AppNav';
import AppFooter from '@/components/AppFooter';
import ProfileGuard from '@/components/ProfileGuard';
import { LocaleProvider } from '@/lib/i18n';

export const metadata: Metadata = {
  title: 'Monoの小窝 · App',
  description: 'Next.js 子应用（SSR 鉴权 / API Routes）',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body style={{ margin: 0, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <LocaleProvider>
          <ProfileGuard />
          <AppNav />
          <main style={{ flex: 1 }}>{children}</main>
          <AppFooter />
        </LocaleProvider>
      </body>
    </html>
  );
}
