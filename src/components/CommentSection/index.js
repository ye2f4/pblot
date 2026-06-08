import React, { useState } from 'react';
import { supabase } from '@/supabase/supabaseClient';

export default function CommentSection({
    comments, commentContent, setCommentContent, commentLoading,
    user, base, siteData
}) {
    const defaultAvatar = `${base}avatar.png`;
    const [tip, setTip] = useState(''); // 无弹窗提示

    // 发布评论（从profiles拿头像，无弹窗）
    const handleSubmitComment = async (e) => {
        e.preventDefault();
        if (!user) return;
        const trimContent = commentContent?.trim() || '';
        if (!trimContent) return;

        try {
            // 获取用户Emoji头像
            const { data: profile } = await supabase.from('profiles').select('avatar_url, nickname').eq('id', user.id).single();
            await supabase.from('comments').insert([{
                user_id: user.id,
                username: profile?.nickname || user.email,
                avatar_url: profile?.avatar_url || defaultAvatar,
                content: trimContent,
                post_id: window.location.pathname,
            }]);
            setCommentContent('');
            setTip('✅ 发布成功');
            setTimeout(() => setTip(''), 2000);
            // 刷新评论（父组件需同步刷新，这里只做界面提示）
            window.location.reload();
        } catch (err) {
            setTip('❌ 发布失败');
            setTimeout(() => setTip(''), 2000);
        }
    };

    return (
        <div style={{ backgroundColor: '#fff', padding: 15, borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.1)', marginBottom: 15, width: '100%', minHeight: '400px' }}>
            <h4 style={{ margin: '0 0 15px 0', fontSize: 16, borderBottom: '2px solid #f0f0f0', paddingBottom: 8 }}>{siteData.texts.comments.title}</h4>
            
            {tip && <div style={{ padding: '8px', color: '#065f46', marginBottom: 8, fontSize: 12 }}>{tip}</div>}
            
            <form onSubmit={handleSubmitComment} style={{ marginBottom: 15 }}>
                <textarea
                    value={commentContent} onChange={(e) => setCommentContent(e.target.value)}
                    disabled={commentLoading || !user} placeholder={siteData.texts.comments.placeholder}
                    style={{ width: '100%', minHeight: 80, padding: 8, border: '1px solid #eee', borderRadius: 4, resize: 'none', fontSize: 14 }}
                />
                <button type="submit" disabled={commentLoading || !user} style={{ padding: '6px 12px', background: '#4285f4', color: '#fff', border: 'none', borderRadius: 4, minWidth: 48, minHeight: 48 }}>
                    {commentLoading ? "发布中..." : siteData.texts.comments.submit}
                </button>
            </form>

            <div style={{ maxHeight: 300, overflowY: 'auto', gap: 10, display: 'flex', flexDirection: 'column' }}>
                {comments.length === 0 ? (
                    <p style={{ color: '#999', fontSize: 12, textAlign: 'center' }}>{siteData.texts.comments.empty}</p>
                ) : (
                    comments.map((item) => (
                        <div key={item.id} style={{ display: 'flex', gap: 8, paddingBottom: 8, borderBottom: '1px solid #f5f5f5' }}>
                            {/* 正常显示Emoji/图片头像 */}
                            {item.avatar_url && !item.avatar_url.startsWith('http') ? (
                                <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#f0f7ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>
                                    {item.avatar_url}
                                </div>
                            ) : (
                                <img src={item.avatar_url || defaultAvatar} style={{ width: 30, height: 30, borderRadius: '50%', objectFit: 'cover' }} alt="avatar" />
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