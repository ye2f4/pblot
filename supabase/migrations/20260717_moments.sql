-- ============================================================
-- 说说 / 碎碎念（轻量微博）
-- 幂等，可重复执行
-- ============================================================

create table if not exists public.moments (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references auth.users(id) on delete set null,
  author_name   text not null default '匿名',
  author_avatar text,
  content       text not null,
  created_at    timestamptz not null default now(),
  is_pinned     boolean not null default false,
  is_deleted    boolean not null default false,
  deleted_at    timestamptz
);

create index if not exists idx_moments_created_at on public.moments (created_at desc);
create index if not exists idx_moments_pinned on public.moments (is_pinned desc, created_at desc);

alter table public.moments enable row level security;

-- 所有人可读取未删除的说说
drop policy if exists "说说公开读取" on public.moments;
create policy "说说公开读取"
  on public.moments for select
  using (not is_deleted);

-- 登录用户可发布（必须写自己的 user_id）
drop policy if exists "登录用户可发说说" on public.moments;
create policy "登录用户可发说说"
  on public.moments for insert
  with check (auth.uid() is not null and auth.uid() = user_id);

-- 作者可删除（软删除）自己的说说
drop policy if exists "作者可删除说说" on public.moments;
create policy "作者可删除说说"
  on public.moments for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 加入 realtime（避免重复添加）
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'moments'
  ) then
    execute 'alter publication supabase_realtime add table public.moments';
  end if;
end $$;

-- ============================================================
-- 种子数据（站长示例说说，迁移以 postgres 身份运行，不受 RLS 限制）
-- ============================================================
insert into public.moments (user_id, author_name, author_avatar, content)
select null, '站长', null, '欢迎来到我的论坛 🎉 这里是「说说」板块，记录日常碎碎念。'
where not exists (select 1 from public.moments where author_name = '站长' and content like '欢迎来到我的论坛%');

insert into public.moments (user_id, author_name, author_avatar, content)
select null, '站长', null, '新功能上线：友链现在可以在后台统一管理啦，欢迎交换友链～'
where not exists (select 1 from public.moments where author_name = '站长' and content like '新功能上线：友链%');
