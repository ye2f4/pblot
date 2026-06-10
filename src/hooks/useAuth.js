import { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabase/supabaseClient';
import { showError } from '../utils/common';
import siteData from '../data/siteData.json';

export const useAuth = () => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(false);
    const [isSessionChecked, setIsSessionChecked] = useState(false);
    const isMountedRef = useRef(true);

    // GitHub登录（修复域名+新增弹窗模式）
    const handleGitHubLogin = async () => {
        setLoading(true);
        try {
            // 自适应当前页面域名，不再拼接旧 /callback 路径
            const redirectUrl = window.location.origin;

            const { error } = await supabase.auth.signInWithOAuth({
                provider: "github",
                options: {
                    popup: true, // 优先弹窗授权，不跳转整页（解决跳转后无响应）
                    redirectTo: redirectUrl,
                    scopes: "user:email"
                }
            });

            if (error) {
                alert(`${siteData.texts.loginTips.loginFailed}${error.message}`);
                console.error('GitHub登录弹窗异常', error);
            }
        } catch (err) {
            alert(`${siteData.texts.loginTips.loginError}${err.message}`);
            console.error('GitHub登录捕获异常', err);
        } finally {
            setLoading(false);
        }
    };

    // 备用页面跳转登录（弹窗被浏览器拦截时手动切换调用）
    const handleGitHubLoginPageMode = async () => {
        setLoading(true);
        try {
            const redirectUrl = window.location.origin;
            const { error } = await supabase.auth.signInWithOAuth({
                provider: "github",
                options: {
                    popup: false,
                    redirectTo: redirectUrl,
                    scopes: "user:email"
                }
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
            if (error) {
                alert(`${siteData.texts.loginTips.logoutFailed}${error.message}`);
                console.error('登出失败', error);
            } else {
                setUser(null);
                // 清除残留哈希
                if (window.location.hash) {
                    window.history.replaceState(null, document.title, window.location.pathname);
                }
            }
        } catch (err) {
            alert(`${siteData.texts.loginTips.logoutError}${err.message}`);
            console.error('登出捕获异常', err);
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
                    console.log('初始化读取已有会话', session.user.email);
                } else {
                    const { data: { user } } = await supabase.auth.getUser();
                    if (isMountedRef.current) setUser(user ? { ...user } : null);
                }
            } catch (err) {
                showError('获取用户失败：', err);
                console.error('初始化用户读取错误', err);
            } finally {
                if (isMountedRef.current) setIsSessionChecked(true);
            }
        };

        fetchUser();

        // 监听全局认证状态变化
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            console.log('Auth状态变更事件', event, session?.user?.email);
            if (isMountedRef.current) {
                if (session?.user) {
                    setUser({ ...session.user });
                    // 登录成功后清除URL里#token哈希，页面干净
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
        handleGitHubLoginPageMode, // 备用页面跳转模式暴露
        handleSignOut
    };
};