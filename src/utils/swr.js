import useSWR from 'swr';
import { supabase } from '@/supabase/supabaseClient';

const fetcher = async (key) => {
  const { data, error } = await supabase
    .from(key.table)
    .select(key.query)
    .order(key.order || 'created_at', { ascending: false });

  if (error) throw error;
  return data;
};

export const useSupabaseQuery = (table, query = '*', order) => {
  return useSWR({ table, query, order }, fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    refreshInterval: 300000, // 5分钟刷新一次
  });
};