import React from 'react';
import OriginalDocSidebar from '@theme-original/DocSidebar';
import UserSubmissionsPanel from '@site/src/components/UserSubmissionsPanel';

// 用户投稿映射到文档左侧栏顶部（替代原先页面底部整宽卡片）
export default function DocSidebar(props) {
  return (
    <>
      <UserSubmissionsPanel variant="sidebar" />
      <OriginalDocSidebar {...props} />
    </>
  );
}
