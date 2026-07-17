import React from 'react';
import DocItem from '@theme-original/DocItem';
import UserSubmissionsPanel from '@site/components/UserSubmissionsPanel';

export default function DocItemWrapper(props) {
  return (
    <>
      <DocItem {...props} />
      <UserSubmissionsPanel />
    </>
  );
}
