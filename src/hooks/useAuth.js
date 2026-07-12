import { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabase/supabaseClient';
import { showError } from '../utils/common';
import siteData from '../data/siteData.json';

export const useAuth = () => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(false);
    const [isSessionChecked, setIsSessionChecked] = useState(false);
    const isMountedRef = useRef(true);

    // 清理URL中所有错误参数和哈希
    const clearUrlParams = () => {
        if (window.location.search || window.location.hash) {
            window.history.replaceState(null, document.title, window.location.pathname);
        }
    };

    // GitHub登录（弹窗模式）
    const handleGitHubLogin = async () => {
        setLoading(true);
        try {
            const redirectUrl = window.location.origin;
            const { error } = await supabase.auth.signInWithOAuth({
                provider: "github",
                options: {
                    popup: true,
                    redirectTo: redirectUrl,
                    scopes: "user:email,read:user"
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

    // 备用页面跳转登录
    const handleGitHubLoginPageMode = async () => {
        setLoading(true);
        try {
            const redirectUrl = window.location.origin;
            const { error } = await supabase.auth.signInWithOAuth({
                provider: "github",
                options: {
                    popup: false,
                    redirectTo: redirectUrl,
                    scopes: "user:email,read:user"
                }
            });
            if (error) alert(`${siteData.texts.loginTips.loginFailed}${error.message}`);
        } catch (err) {
            alert(`${siteData.texts.loginTips.loginError}${err.message}`);
            console.error('GitHub登录捕获异常', err);
        } finally {
            setLoading(false);
        }
    };

    // ====================== 【新增】邮箱注册 ======================
    const handleEmailSignUp = async (email, password) => {
        setLoading(true);
        try {
            const { data, error } = await supabase.auth.signUp({
                email,
                password
            });
            if (error) throw error;

            // 后台关闭Confirm Email后，data.session存在代表直接登录成功
            if (data.session?.user && isMountedRef.current) {
                setUser({ ...data.session.user });
                await syncGitHubProfile(data.session);
            }
            return data;
        } catch (err) {
            alert(`注册失败：${err.message}`);
            console.error('邮箱注册异常', err);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    // ====================== 【新增】邮箱密码登录 ======================
    const handleEmailSignIn = async (email, password) => {
        setLoading(true);
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password
            });
            if (error) throw error;

            if (data.session?.user && isMountedRef.current) {
                setUser({ ...data.session.user });
                await syncGitHubProfile(data.session);
            }
            return data;
        } catch (err) {
            alert(`登录失败：${err.message}`);
            console.error('邮箱登录异常', err);
            throw err;
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
                clearUrlParams();
            }
        } catch (err) {
            alert(`${siteData.texts.loginTips.logoutError}${err.message}`);
            console.error('登出捕获异常', err);
        }
    };

    // 同步用户资料到public.profiles
    const syncGitHubProfile = async (session) => {
        if (!session?.user) return;
        
        try {
            const userMeta = session.user.user_metadata;
            const uid = session.user.id;
            const email = session.user.email;

            const { error } = await supabase
                .from('profiles')
                .upsert([
                    {
                        id: uid,
                        nickname: userMeta?.preferred_username || userMeta?.name || '',
                        real_name: userMeta?.full_name || '',
                        avatar_url: userMeta?.avatar_url || '',
                        email: email || ''
                    }
                ]);

            if (error) {
                console.error('同步用户资料失败', error);
            }
        } catch (err) {
            console.error('同步用户资料捕获异常', err);
        }
    };

    // 初始化认证状态
    useEffect(() => {
        isMountedRef.current = true;
        clearUrlParams();

        const fetchUser = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (session?.user && isMountedRef.current) {
                    setUser({ ...session.user });
                    await syncGitHubProfile(session);
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

        const hashHandler = async () => {
            const hash = window.location.hash;
            if (hash.includes('access_token')) {
                const { data: { session }, error } = await supabase.auth.getSession();
                if (error) {
                    console.error('令牌解析失败', error);
                    clearUrlParams();
                    return;
                }
                if (session?.user && isMountedRef.current) {
                    setUser({ ...session.user });
                    await syncGitHubProfile(session);
                }
                clearUrlParams();
            }
        };
        window.addEventListener('hashchange', hashHandler);

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            console.log('Auth状态变更事件：', event, session?.user?.email);
            if (isMountedRef.current) {
                if (session?.user) {
                    setUser({ ...session.user });
                    await syncGitHubProfile(session);
                    clearUrlParams();
                } else {
                    setUser(null);
                }
            }
        });

        return () => {
            isMountedRef.current = false;
            subscription.unsubscribe();
            window.removeEventListener('hashchange', hashHandler);
        };
    }, []);

    return {
        user,
        loading,
        isSessionChecked,
        handleGitHubLogin,
        handleGitHubLoginPageMode,
        handleSignOut,
        handleEmailSignUp,    // 对外暴露注册
        handleEmailSignIn     // 对外暴露登录
    };
};