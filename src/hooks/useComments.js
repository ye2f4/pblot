import { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabase/supabaseClient';
import { showError } from '../utils/common';
import { showAlert } from '../utils/dialog';
import siteData from '../data/siteData.json';

export const useComments = (isClient, user, base) => {
    const [comments, setComments] = useState([]);
    const [commentContent, setCommentContent] = useState('');
    const [commentLoading, setCommentLoading] = useState(false);
    const [commentsLoaded, setCommentsLoaded] = useState(false);
    const isMountedRef = useRef(true);

    const fetchComments = async () => {
        if (!isClient || !isMountedRef.current) return;

        const { data } = await supabase
            .from('comments')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(10);

        if (isMountedRef.current) setComments(data || []);
    };

    const handleSubmitComment = async (e) => {
        e.preventDefault();
        if (!user) return showAlert(siteData.texts.comments.loginTip);
        if (!commentContent.trim()) return;

        setCommentLoading(true);
        try {
            // 从 profiles 表读取最新 nickName 和 avatar_url，统一使用数据库键名
            const { data: profile } = await supabase
                .from('profiles')
                .select('nickname, avatar_url')
                .eq('id', user.id)
                .maybeSingle();

            const displayName = profile?.nickname || user.user_metadata?.full_name || user.email?.split('@')[0] || '用户';
            const avatar = profile?.avatar_url || user.user_metadata?.avatar_url || `${base}avatar.png`;

            await supabase.from('comments').insert([{
                user_id: user.id,
                username: displayName,
                avatar_url: avatar,
                content: commentContent.trim()
            }]);

            setCommentContent('');
            fetchComments();
            showAlert(siteData.texts.comments.success);
        } catch (err) {
            showError(err);
        } finally {
            setCommentLoading(false);
        }
    };

    return {
        comments,
        commentContent,
        setCommentContent,
        commentLoading,
        commentsLoaded,
        setCommentsLoaded,
        fetchComments,
        handleSubmitComment
    };
};
