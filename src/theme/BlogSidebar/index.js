import React from 'react';
import OriginalBlogSidebar from '@theme-original/BlogSidebar';
import UserSubmissionsPanel from '@site/src/components/UserSubmissionsPanel';

// 用户投稿映射到博客右侧栏底部（替代原先页面底部整宽卡片）
export default function BlogSidebar(props) {
  return (
    <>
      <OriginalBlogSidebar {...props} />
      <UserSubmissionsPanel variant="sidebar" />
    </>
  );
}
