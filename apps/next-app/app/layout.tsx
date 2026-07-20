import './globals.css';
import type { Metadata } from 'next';
import AppNav from '@/components/AppNav';
import AppFooter from '@/components/AppFooter';
import ProfileGuard from '@/components/ProfileGuard';

export const metadata: Metadata = {
  title: 'Monoの小窝 · App',
  description: 'Next.js 子应用（SSR 鉴权 / API Routes）',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body style={{ margin: 0, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <ProfileGuard />
        <AppNav />
        <main style={{ flex: 1 }}>{children}</main>
        <AppFooter />
      </body>
    </html>
  );
}
