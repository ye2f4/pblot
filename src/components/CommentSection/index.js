import React from 'react';
// 所有子组件：TopBanner / AdSection / CommentSection / TagCloud 等第一行加这个
import styles from '../../pages/index.module.css';

export default function CommentSection({
    comments,
    commentContent,
    setCommentContent,
    commentLoading,
    handleSubmitComment,
    user,
    base,
    siteData
}) {
    return (
        <div style={{
            backgroundColor: '#fff',
            padding: 15,
            borderRadius: 8,
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            marginBottom: 15,
            width: '100%',
            minHeight: '400px',
        }}>
            <h4 style={{
                margin: '0 0 15px 0',
                fontSize: 16,
                position: 'relative',
                paddingBottom: 8,
                borderBottom: '2px solid #f0f0f0'
            }}>
                {siteData.texts.comments.title}
            </h4>

            <form onSubmit={handleSubmitComment} style={{ marginBottom: 15 }}>
                <textarea
                    value={commentContent}
                    onChange={(e) => setCommentContent(e.target.value)}
                    disabled={commentLoading || !user}
                    placeholder={siteData.texts.comments.placeholder}
                    style={{
                        width: '100%',
                        minHeight: 80,
                        padding: 8,
                        border: '1px solid #eee',
                        borderRadius: 4,
                        resize: 'none',
                        fontSize: 14,
                        marginBottom: 8
                    }}
                />
                <button
                    type="submit"
                    disabled={commentLoading || !user}
                    aria-label="发布评论"
                    style={{
                        padding: '6px 12px',
                        backgroundColor: '#4285f4',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 4,
                        fontSize: 12,
                        cursor: commentLoading ? 'not-allowed' : 'pointer',
                        opacity: commentLoading ? 0.7 : 1,
                        minWidth: 48,
                        minHeight: 48,
                    }}
                >
                    {commentLoading ? "发布中..." : siteData.texts.comments.submit}
                </button>
            </form>

            <div style={{ maxHeight: 300, overflowY: 'auto', gap: 10, display: 'flex', flexDirection: 'column' }}>
                {comments.length === 0 ? (
                    <p style={{ color: '#999', fontSize: 12, textAlign: 'center', margin: 0 }}>
                        {siteData.texts.comments.empty}
                    </p>
                ) : (
                    comments.map((item) => (
                        <div key={item.id} style={{
                            display: 'flex',
                            gap: 8,
                            paddingBottom: 8,
                            borderBottom: '1px solid #f5f5f5'
                        }}>
                            <img
                                src={item.avatar_url}
                                alt={item.username}
                                width="30"
                                height="30"
                                loading="lazy"
                                style={{
                                    borderRadius: '50%',
                                    objectFit: 'cover'
                                }}
                                onError={(e) => e.target.src = `${base}avatar.png`}
                            />
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 12, fontWeight: 500, color: '#333' }}>
                                    {item.username}
                                </div>
                                <p style={{ margin: '2px 0', fontSize: 12, color: '#666' }}>
                                    {item.content}
                                </p>
                                <div style={{ fontSize: 10, color: '#999' }}>
                                    {new Date(item.created_at).toLocaleString()}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}