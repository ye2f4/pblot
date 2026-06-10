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
        <div style={{ backgroundColor: '#fff', padding: 15, borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.1)', marginBottom: 15, width: '100%', minHeight: '400px' }}>
            <h4 style={{ margin: '0 0 15px 0', fontSize: 16, borderBottom: '2px solid #f0f0f0', paddingBottom: 8 }}>{siteData.texts.comments.title}</h4>

            {tip && <div style={{ padding: '8px', color: tip.startsWith('✅') ? '#065f46' : '#dc2626', marginBottom: 8, fontSize: 12 }}>{tip}</div>}

            <form onSubmit={handleSubmitComment} style={{ marginBottom: 15 }}>
                <textarea
                    value={commentContent}
                    onChange={(e) => setCommentContent(e.target.value)}
                    disabled={commentLoading || !user}
                    placeholder={siteData.texts.comments.placeholder}
                    style={{ width: '100%', minHeight: 80, padding: 8, border: '1px solid #eee', borderRadius: 4, resize: 'none', fontSize: 14 }}
                />
                <button
                    type="submit"
                    disabled={commentLoading || !user}
                    style={{ padding: '6px 12px', background: '#4285f4', color: '#fff', border: 'none', borderRadius: 4, marginTop:8 }}
                >
                    {commentLoading ? "发布中..." : siteData.texts.comments.submit}
                </button>
            </form>

            <div style={{ maxHeight: 300, overflowY: 'auto', gap: 10, display: 'flex', flexDirection: 'column' }}>
                {comments.length === 0 ? (
                    <p style={{ color: '#999', fontSize: 12, textAlign: 'center' }}>{siteData.texts.comments.empty}</p>
                ) : (
                    comments.map((item) => (
                        <div key={item.id} style={{ display: 'flex', gap: 8, paddingBottom: 8, borderBottom: '1px solid #f5f5f5' }}>
                            {/* 头像渲染逻辑不变，兼容emoji/图片 */}
                            {item.avatar_url && !item.avatar_url.startsWith('http') ? (
                                <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#f0f7ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>
                                    {item.avatar_url}
                                </div>
                            ) : (
                                <img 
                                    src={item.avatar_url || defaultAvatar} 
                                    style={{ width: 30, height: 30, borderRadius: '50%', objectFit: 'cover' }} 
                                    alt="avatar"
                                    onError={(e)=>e.target.src=defaultAvatar}
                                />
                            )}
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 12, fontWeight: 500 }}>{item.username}</div>
                                <p style={{ margin: '2px 0', fontSize: 12, color: '#666' }}>{item.content}</p>
                                <div style={{ fontSize: 10, color: '#999' }}>{new Date(item.created_at).toLocaleString()}</div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
