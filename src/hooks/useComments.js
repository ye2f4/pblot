import { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabase/supabaseClient';
import { showError } from '../utils/common';
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
        if (!user) return alert(siteData.texts.comments.loginTip);
        if (!commentContent.trim()) return;

        setCommentLoading(true);
        try {
            await supabase.from('comments').insert([{
                user_id: user.id,
                username: user.user_metadata?.full_name || user.email,
                avatar_url: user.user_metadata?.avatar_url || `${base}avatar.png`,
                content: commentContent.trim()
            }]);

            setCommentContent('');
            fetchComments();
            alert(siteData.texts.comments.success);
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
