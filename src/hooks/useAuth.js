import { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabase/supabaseClient';
import { showError } from '../utils/common';
import siteData from '../data/siteData.json';

export const useAuth = () => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(false);
    const [isSessionChecked, setIsSessionChecked] = useState(false);
    const isMountedRef = useRef(true);

    // 清理URL中所有错误参数和哈希（核心修复）
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
                    scopes: "user:email,read:user" // 必须包含read:user
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

    // 备用页面跳转登录（推荐优先测试）
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

    // 手动同步GitHub用户资料到public.profiles（核心新增）
    const syncGitHubProfile = async (session) => {
        if (!session?.user) return;
        
        try {
            const userMeta = session.user.user_metadata;
            const uid = session.user.id;
            const email = session.user.email;

            // 写入/更新用户资料（upsert：存在则更新，不存在则插入）
            const { error } = await supabase
                .from('profiles')
                .upsert([
                    {
                        id: uid,
                        nickname: userMeta?.preferred_username || '',
                        full_name: userMeta?.full_name || '',
                        avatar_url: userMeta?.avatar_url || '',
                        email: email || ''
                    }
                ]);

            if (error) {
                console.error('同步用户资料失败', error);
            } else {
                console.log('✅ 用户资料已成功同步到public.profiles');
            }
        } catch (err) {
            console.error('同步用户资料捕获异常', err);
        }
    };

    // 初始化认证状态
    useEffect(() => {
        isMountedRef.current = true;

        // 1. 页面加载时先清理错误参数
        clearUrlParams();

        // 2. 读取当前会话
        const fetchUser = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (session?.user && isMountedRef.current) {
                    setUser({ ...session.user });
                    console.log('初始化读取已有会话', session.user.email);
                    await syncGitHubProfile(session); // 同步资料
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

        // 3. 监听URL哈希变化（授权跳转后触发）
        const hashHandler = async () => {
            const hash = window.location.hash;
            if (hash.includes('access_token')) {
                console.log('检测到授权令牌，开始解析会话');
                const { data: { session }, error } = await supabase.auth.getSession();
                if (error) {
                    console.error('令牌解析失败', error);
                    clearUrlParams();
                    return;
                }
                if (session?.user && isMountedRef.current) {
                    setUser({ ...session.user });
                    await syncGitHubProfile(session); // 同步资料
                    console.log('✅ 登录成功', session.user.email);
                }
                clearUrlParams();
            }
        };
        window.addEventListener('hashchange', hashHandler);

        // 4. 监听全局认证状态变更
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            console.log('Auth状态变更事件：', event, session?.user?.email);
            if (isMountedRef.current) {
                if (session?.user) {
                    setUser({ ...session.user });
                    await syncGitHubProfile(session); // 同步资料
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
        handleSignOut
    };
};