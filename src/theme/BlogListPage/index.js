import React from 'react';
import BlogListPage from '@theme-original/BlogListPage';
import UserSubmissionsPanel from '@site/src/components/UserSubmissionsPanel';

export default function BlogListPageWrapper(props) {
  return (
    <>
      <BlogListPage {...props} />
      <UserSubmissionsPanel />
    </>
  );
}
