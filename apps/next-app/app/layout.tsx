import './globals.css';
import type { Metadata } from 'next';
import AppNav from '@/components/AppNav';

export const metadata: Metadata = {
  title: 'Monoの小窝 · App',
  description: 'Next.js 子应用（SSR 鉴权 / API Routes）',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body style={{ margin: 0 }}>
        <AppNav />
        {children}
      </body>
    </html>
  );
}
