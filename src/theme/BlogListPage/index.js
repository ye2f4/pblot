import React, { useState, useEffect } from 'react';
import OriginalBlogListPage from '@theme-original/BlogListPage';
import { supabase } from '@site/src/supabase/supabaseClient';

// 把已发布用户投稿映射成与官方 blogPost 同构的对象，
// 这样它们会被官方 BlogPostItem 以完全相同样式渲染，混入博客列表，看不出区别。
function toBlogPost(s) {
  const d = new Date(s.created_at);
  const valid = !isNaN(d.getTime());
  const authorName = s.author_name || '投稿者';
  return {
    key: 'submission-' + s.id,
    content: (
      <p style={{ marginBottom: 0 }}>
        {s.excerpt || s.title}
      </p>
    ),
    contentTitle: null,
    metadata: {
      permalink: `/submissions/?id=${s.id}`,
      title: s.title,
      description: s.excerpt || '',
      date: valid ? s.created_at : new Date().toISOString(),
      formattedDate: valid ? d.toLocaleDateString('zh-CN') : '',
      hasTruncateMarker: false,
      editUrl: undefined,
      readingTime: { words: 0, minutes: 0 },
      tags: (Array.isArray(s.tags) ? s.tags : []).map((t) => ({
        label: t,
        permalink: '#',
        unlisted: false,
      })),
      authors: [{ key: 'sub-' + s.id, name: authorName, title: undefined, url: undefined, imageURL: undefined }],
      frontMatter: {},
    },
  };
}

export default function BlogListPage(props) {
  const [submissionPosts, setSubmissionPosts] = useState([]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { data, error } = await supabase
          .from('user_submissions')
          .select('id,title,tags,created_at,author_name,excerpt,cover_image,view_count')
          .eq('status', 'published')
          .order('created_at', { ascending: false })
          .limit(50);
        if (!error && active && data) {
          setSubmissionPosts(data.map(toBlogPost));
        }
      } catch {
        // 静默：不影响原有博客展示
      }
    })();
    return () => { active = false; };
  }, []);

  // 合并官方博客帖与用户投稿，按时间倒序，投稿以官方卡片样式混入列表
  const merged = [...submissionPosts, ...props.blogPosts].sort((a, b) => {
    const ta = new Date(a.metadata.date).getTime() || 0;
    const tb = new Date(b.metadata.date).getTime() || 0;
    return tb - ta;
  });

  return <OriginalBlogListPage {...props} blogPosts={merged} />;
}
