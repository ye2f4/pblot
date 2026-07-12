import { useEffect, useState, useRef } from 'react';
import { supabase } from '../supabase/supabaseClient';

export function useSupabaseAuthRefresh() {
  const [latestUser, setLatestUser] = useState(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    let sub = null;

    const initUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (mountedRef.current) {
        setLatestUser(user ?? null);
      }
    };
    initUser();

    sub = supabase.auth.onAuthStateChange((_event, session) => {
      if (mountedRef.current) {
        setLatestUser(session?.user ?? null);
      }
    });

    return () => {
      mountedRef.current = false;
      sub?.unsubscribe();
    };
  }, []);

  return latestUser;
}