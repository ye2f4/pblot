import Link from 'next/link';

export default function Home() {
  return (
    <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24 }}>
      <h1 style={{ fontSize: 28, margin: 0 }}>Monoの小窝 · Next.js 子应用</h1>
      <p style={{ color: '#666' }}>SSR 鉴权 + API Routes 示范（与 Docusaurus 共享同一 Supabase）</p>
      <div style={{ display: 'flex', gap: 16 }}>
        <Link href="/login" style={{ padding: '12px 24px', background: '#4285f4', color: '#fff', borderRadius: 8 }}>登录</Link>
        <Link href="/profile" style={{ padding: '12px 24px', background: '#333', color: '#fff', borderRadius: 8 }}>个人中心</Link>
      </div>
    </main>
  );
}
