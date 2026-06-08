import { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabase/supabaseClient';
import { showError } from '../utils/common';
import siteData from '../data/siteData.json';

export const useAuth = () => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(false);
    const [isSessionChecked, setIsSessionChecked] = useState(false);
    const isMountedRef = useRef(true);

    // GitHub登录
    const handleGitHubLogin = async () => {
        setLoading(true);
        try {
            const rootUrl = siteData.siteUrl || "https://ye2f4.github.io";
            const cbPath = siteData.callbackPath || "/pblot/callback";
            const redirectUrl = rootUrl + cbPath;

            const { error } = await supabase.auth.signInWithOAuth({
                provider: "github",
                options: { redirectTo: redirectUrl, scopes: "user:email" }
            });

            if (error) alert(`${siteData.texts.loginTips.loginFailed}${error.message}`);
        } catch (err) {
            alert(`${siteData.texts.loginTips.loginError}${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    // 退出登录
    const handleSignOut = async () => {
        try {
            const { error } = await supabase.auth.signOut();
            if (error) alert(`${siteData.texts.loginTips.logoutFailed}${error.message}`);
            else setUser(null);
        } catch (err) {
            alert(`${siteData.texts.loginTips.logoutError}${err.message}`);
        }
    };

    // 初始化认证状态
    useEffect(() => {
        isMountedRef.current = true;

        const fetchUser = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (session?.user && isMountedRef.current) {
                    setUser({ ...session.user });
                } else {
                    const { data: { user } } = await supabase.auth.getUser();
                    if (isMountedRef.current) setUser(user ? { ...user } : null);
                }
            } catch (err) {
                showError('获取用户失败：', err);
            } finally {
                if (isMountedRef.current) setIsSessionChecked(true);
            }
        };

        fetchUser();

        // 监听认证状态变化
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (isMountedRef.current) {
                if (session?.user) {
                    setUser({ ...session.user });
                    if (window.location.hash) {
                        window.history.replaceState(null, document.title, window.location.pathname);
                    }
                } else {
                    setUser(null);
                }
            }
        });

        return () => {
            isMountedRef.current = false;
            subscription.unsubscribe();
        };
    }, []);

    return {
        user,
        loading,
        isSessionChecked,
        handleGitHubLogin,
        handleSignOut
    };
};