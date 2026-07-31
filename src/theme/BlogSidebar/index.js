import React from 'react';
import OriginalBlogSidebar from '@theme-original/BlogSidebar';

// 用户投稿已合并进博客列表主区（见 src/theme/BlogListPage），
// 此处不再单独加一列，避免与文章列表割裂。
export default function BlogSidebar(props) {
  return <OriginalBlogSidebar {...props} />;
}
