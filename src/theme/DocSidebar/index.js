import React, { useState, useEffect } from 'react';
import OriginalDocSidebar from '@theme-original/DocSidebar';
import Link from '@docusaurus/Link';
import { supabase } from '@site/src/supabase/supabaseClient';

// 用户投稿以与官方侧边栏菜单项完全一致的样式混入文档侧边栏，
// 不带任何独立标题或图标前缀，避免与文档树割裂。
export default function DocSidebar(props) {
  const [submissions, setSubmissions] = useState([]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { data, error } = await supabase
          .from('user_submissions')
          .select('id,title,created_at')
          .eq('status', 'published')
          .order('created_at', { ascending: false })
          .limit(50);
        if (!error && active && data) setSubmissions(data);
      } catch {
        // 静默
      }
    })();
    return () => { active = false; };
  }, []);

  return (
    <>
      <OriginalDocSidebar {...props} />
      {submissions.length > 0 && (
        <ul className="menu__list" style={{ padding: 0, marginTop: 8 }}>
          {submissions.map((s) => (
            <li key={s.id} className="menu__list-item">
              <Link
                to={`/submissions/?id=${s.id}`}
                className="menu__link"
              >
                {s.title}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
