import { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabase/supabaseClient';

export const useUserStats = (isClient) => {
    const [userCount, setUserCount] = useState(0);
    const [latestUser, setLatestUser] = useState("暂无");
    const isMountedRef = useRef(true);

    const fetchUserStats = async () => {
        if (!isClient || !isMountedRef.current) return;

        try {
            const { count } = await supabase
                .from('users')
                .select('*', { count: 'exact', head: true });

            const { data: lastUser } = await supabase
                .from('users')
                .select('raw_user_meta_data, email')
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            if (isMountedRef.current) {
                setUserCount(count || 0);
                const name =
                    lastUser?.raw_user_meta_data?.name ||
                    lastUser?.raw_user_meta_data?.preferred_username ||
                    lastUser?.email?.split('@')[0] ||
                    "新用户";
                setLatestUser(name);
            }
        } catch (e) {
            console.log("获取用户统计失败", e);
        }
    };

    useEffect(() => {
        if (!isClient || !isMountedRef.current) return;
        isMountedRef.current = true;

        const timer = setTimeout(fetchUserStats, 500);

        // 实时监听新用户注册
        const channel = supabase.channel('auth-users');
        channel
            .on('postgres_changes', { event: 'INSERT', schema: 'auth', table: 'users' }, fetchUserStats)
            .subscribe();

        return () => {
            isMountedRef.current = false;
            clearTimeout(timer);
            channel.unsubscribe();
        };
    }, [isClient]);

    return { userCount, latestUser };
};