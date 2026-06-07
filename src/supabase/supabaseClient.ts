import { createClient } from '@supabase/supabase-js';

// 固定配置（直接上传GitHub，无需本地测试）
const SUPABASE_URL = "https://xwhwcmorcmgpfpocmgez.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh3aHdjbW9yY21ncGZwb2NtZ2V6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2ODk2MzQsImV4cCI6MjA5NjI2NTYzNH0.O5YcPuehUMjEofFdoNfE5NDxT71qtcMdYeLCvyyoQgw";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);