import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import ProfileEditor from './ProfileEditor';

// 始终动态渲染：依赖会话 cookie 与数据库 profile，禁用静态缓存
export const dynamic = 'force-dynamic';

type ProfileRow = {
  username: string | null;
  nickname: string | null;
  email: string | null;
  signature: string | null;
  gender: string | null;
  birthday: string | null;
  address: string | null;
  avatar_url: string | null;
  real_name: string | null;
};

// 由 Docusaurus src/pages/profile.js 迁移（SSR 外壳部分）：
// 服务端读取会话与 profiles，缺失时自动补建默认行，再把数据传给客户端编辑器。
// 会话打通：服务端从 cookie 读取（与主站共享 monoblog.cc.cd 的登录态）。
export default async function ProfilePage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 未登录 → 跳转到同域下的登录页（/app 子路径）
  if (!user) {
    redirect('/app/login');
  }

  const { data: profileData } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  // 资料行缺失（如历史账号触发器未生效）：自动补建默认行
  let profile: ProfileRow;
  if (!profileData) {
    const meta = user.user_metadata ?? {};
    const newRow = {
      id: user.id,
      username: meta.username ?? null,
      nickname: meta.preferred_username ?? meta.name ?? '新用户',
      email: user.email ?? null,
      signature: '这家伙很懒~',
      gender: 'unknown',
      avatar_url: '😀',
      real_name: '',
      birthday: null,
      address: '',
    };
    const { error } = await supabase.from('profiles').upsert(newRow, { onConflict: 'id' });
    if (error) console.error('自动补建 profile 失败', error);
    profile = newRow as ProfileRow;
  } else {
    profile = profileData as ProfileRow;
  }

  return (
    <ProfileEditor
      userId={user.id}
      initialProfile={{
        username: profile.username ?? '',
        nickname: profile.nickname ?? '',
        email: profile.email ?? user.email ?? '',
        signature: profile.signature ?? '',
        gender: profile.gender ?? 'unknown',
        birthday: profile.birthday ?? '',
        address: profile.address ?? '',
        avatar_url: profile.avatar_url ?? '😀',
        real_name: profile.real_name ?? '',
      }}
    />
  );
}
