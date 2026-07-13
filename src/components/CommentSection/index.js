// 修复1：修正Docusaurus标准导入路径
import { supabase } from '@site/src/supabase/supabaseClient';
import React, { useState, useEffect, useMemo } from 'react';

export default function CommentSection({
    commentContent, setCommentContent, commentLoading,
    user, base, siteData
}) {
    const defaultAvatar = `${base}avatar.png`;
    const [tip, setTip] = useState('');
    const [comments, setComments] = useState([]);

    // 修复2：useMemo稳定postId，避免无限useEffect请求
    const postId = useMemo(() => window.location.pathname, []);

    // 加载评论
    useEffect(() => {
        const fetchComments = async () => {
            const { data, error } = await supabase
                .from('comments')
                .select('*')
                .eq('post_id', postId)
                .order('created_at', { ascending: true });

            if (!error && data) setComments(data);
        };
        fetchComments();
    }, [postId]);

    // 发布评论（全容错重写）
    const handleSubmitComment = async (e) => {
        e.preventDefault();
        // 校验1：未登录直接拦截
        if (!user?.id) {
            setTip('❌ 请先登录账号');
            setTimeout(() => setTip(''), 2000);
            return;
        }
        const trimContent = commentContent?.trim() || '';
        if (!trimContent) {
            setTip('❌ 评论内容不能为空');
            setTimeout(() => setTip(''), 2000);
            return;
        }

        try {
            // 修复3：改用maybeSingle()，无profile也不会报错
            const { data: profile, error: profileErr } = await supabase
                .from('profiles')
                .select('avatar_url, nickname')
                .eq('id', user.id)
                .maybeSingle();

            // 兜底赋值：无profile时用邮箱、默认头像
            const nick = profile?.nickname || user.email.split('@')[0];
            const avat = profile?.avatar_url || defaultAvatar;

            // 插入评论
            const { data: newComment, error: insertErr } = await supabase
                .from('comments')
                .insert([{
                    user_id: user.id,
                    username: nick,
                    avatar_url: avat,
                    content: trimContent,
                    post_id: postId,
                }])
                .select()
                .single();

            if (insertErr) throw insertErr;

            // 前端局部追加评论，无刷新
            setComments(prev => [...prev, newComment]);
            setCommentContent('');
            setTip('✅ 发布成功');
            setTimeout(() => setTip(''), 2000);

        } catch (err) {
            // 打印完整错误到浏览器控制台，精准定位问题
            console.error('评论发布完整错误：', err);
            setTip(`❌ 发布失败：${err.message || '未知异常'}`);
            setTimeout(() => setTip(''), 2000);
        }
    };

    return (
        <div style={{ backgroundColor: 'var(--ifm-card-background-color)', padding: 15, borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', marginBottom: 15, width: '100%', maxWidth: '100%', boxSizing: 'border-box', minHeight: '380px', border: '1px solid var(--ifm-toc-border-color)' }}>
            <h4 style={{ margin: '0 0 15px 0', fontSize: 16, borderBottom: '2px solid var(--ifm-toc-border-color)', paddingBottom: 8, color: 'var(--ifm-color-emphasis-900)' }}>{siteData?.texts?.comments?.title || '💬 留言区'}</h4>

            {tip && <div style={{ padding: '8px', color: tip.startsWith('✅') ? '#065f46' : '#dc2626', marginBottom: 8, fontSize: 12 }}>{tip}</div>}

            <form onSubmit={handleSubmitComment} style={{ marginBottom: 15 }}>
                <textarea
                    value={commentContent}
                    onChange={(e) => setCommentContent(e.target.value)}
                    disabled={commentLoading || !user}
                    placeholder={siteData?.texts?.comments?.placeholder || '分享你的想法...'}
                    style={{ width: '100%', minHeight: 80, padding: 8, border: '1px solid var(--ifm-toc-border-color)', borderRadius: 8, resize: 'none', fontSize: 14, background: 'var(--ifm-background-surface-color)', color: 'var(--ifm-font-color-base)' }}
                />
                <button
                    type="submit"
                    disabled={commentLoading || !user}
                    style={{ padding: '6px 12px', background: '#4285f4', color: '#fff', border: 'none', borderRadius: 8, marginTop: 8, cursor: 'pointer', fontWeight: 500 }}
                >
                    {commentLoading ? "发布中..." : (siteData?.texts?.comments?.submit || '发表留言')}
                </button>
            </form>

            <div style={{ maxHeight: 300, overflowY: 'auto', gap: 10, display: 'flex', flexDirection: 'column' }}>
                {comments.length === 0 ? (
                    <p style={{ color: 'var(--ifm-color-emphasis-500)', fontSize: 12, textAlign: 'center' }}>{siteData?.texts?.comments?.empty || '暂无留言，快来发言吧'}</p>
                ) : (
                    comments.map((item) => (
                        <div key={item.id} style={{ display: 'flex', gap: 8, paddingBottom: 8, borderBottom: '1px solid var(--ifm-toc-border-color)' }}>
                            {item.avatar_url && !item.avatar_url.startsWith('http') ? (
                                <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--ifm-background-surface-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>
                                    {item.avatar_url}
                                </div>
                            ) : (
                                <img
                                    src={item.avatar_url || defaultAvatar}
                                    style={{ width: 30, height: 30, borderRadius: '50%', objectFit: 'cover' }}
                                    alt="avatar"
                                    onError={(e) => e.target.src = defaultAvatar}
                                />
                            )}
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--ifm-color-emphasis-900)' }}>{item.username}</div>
                                <p style={{ margin: '2px 0', fontSize: 12, color: 'var(--ifm-color-emphasis-600)' }}>{item.content}</p>
                                <div style={{ fontSize: 10, color: 'var(--ifm-color-emphasis-400)' }}>{new Date(item.created_at).toLocaleString()}</div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
