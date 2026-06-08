import React, { useState, useEffect, useRef, lazy, Suspense } from 'react';
import Layout from '@theme/Layout';
import useBaseUrl from '@docusaurus/useBaseUrl';
import styles from './index.module.css';
import siteData from '../data/siteData.json';
import { supabase } from '../supabase/supabaseClient';
import { throttle } from '../utils/common';

// 自定义钩子
import { useAuth } from '../hooks/useAuth';
import { useUserStats } from '../hooks/useUserStats';
import { useComments } from '../hooks/useComments';

// 导入拆分后的组件
import TopBanner from '../components/TopBanner';
import MainContentTop from '../components/MainContentTop';
import CarouselSection from '../components/CarouselSection';
import QuickNav from '../components/QuickNav';
import UpdatesList from '../components/UpdatesList';
import TagCloud from '../components/TagCloud';
import FriendsAndAbout from '../components/FriendsAndAbout';
import RankList from '../components/RankList';

// 懒加载非首屏组件
const CommentSection = lazy(() => import('../components/CommentSection'));
const AdSection = lazy(() => import('../components/AdSection'));

export const metadata = { ssr: false };

export default function Home() {
  const base = useBaseUrl('');
  const isMountedRef = useRef(true);
  const [isClient, setIsClient] = useState(false);
  const [now, setNow] = useState(new Date());
  const mainContentRef = useRef(null);

  // 认证状态
  const { user, loading, isSessionChecked, handleGitHubLogin, handleSignOut } = useAuth();

  // 用户统计
  const { userCount, latestUser } = useUserStats(isClient);

  // 评论逻辑
  const {
    comments,
    commentContent,
    setCommentContent,
    commentLoading,
    commentsLoaded,
    setCommentsLoaded,
    fetchComments,
    handleSubmitComment
  } = useComments(isClient, user, base);

  // 时钟定时器
  useEffect(() => {
    isMountedRef.current = true;
    setIsClient(true);

    const timer = setInterval(() => {
      if (isMountedRef.current) setNow(new Date());
    }, 1000);

    // 滚动加载评论区
    const handleScroll = throttle(() => {
      if (window.scrollY > 600 && !commentsLoaded && isMountedRef.current) {
        setCommentsLoaded(true);
        fetchComments();
      }
    }, 200);

    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      isMountedRef.current = false;
      clearInterval(timer);
      window.removeEventListener('scroll', handleScroll);
    };
  }, [commentsLoaded]);

  if (!isClient) return null;

  return (
    <Layout title={siteData.siteTitle}>
      {/* 顶部横幅 */}
      <TopBanner
        siteData={siteData}
        base={base}
        user={user}
        loading={loading}
        isSessionChecked={isSessionChecked}
        userCount={userCount}
        latestUser={latestUser}
        now={now}
        handleGitHubLogin={handleGitHubLogin}
        handleSignOut={handleSignOut}
      />

      {/* 主内容区 */}
      <div
        ref={mainContentRef}
        className="main-content"
        style={{
          maxWidth: 1200,
          margin: '20px auto',
          padding: '0 15px',
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
          width: '100%',
        }}
      >
        {/* 主内容顶部 */}
        <MainContentTop siteData={siteData} />

        {/* 内容主体 */}
        <div style={{ display: 'flex', gap: 20, width: '100%' }}>
          {/* 左侧内容区 */}
          <div className="left-container" style={{ flex: 7, minWidth: 0 }}>
            <CarouselSection siteData={siteData} base={base} isClient={isClient} />
            <QuickNav siteData={siteData} />
            <UpdatesList siteData={siteData} />
            <TagCloud siteData={siteData} />
            <FriendsAndAbout siteData={siteData} />
          </div>

          {/* 右侧边栏 */}
          <div className="sidebar-container" style={{ flex: 3, minWidth: 0 }}>
            <RankList siteData={siteData} />

            {/* 懒加载评论区 */}
            <Suspense fallback={
              <div style={{
                backgroundColor: '#fff',
                padding: 15,
                borderRadius: 8,
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                marginBottom: 15,
                width: '100%',
                minHeight: '400px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#999',
              }}>
                加载中...
              </div>
            }>
              {commentsLoaded && (
                <CommentSection
                  comments={comments}
                  commentContent={commentContent}
                  setCommentContent={setCommentContent}
                  commentLoading={commentLoading}
                  handleSubmitComment={handleSubmitComment}
                  user={user}
                  base={base}
                  siteData={siteData}
                />
              )}
            </Suspense>

            {/* 懒加载广告区 */}
            <Suspense fallback={null}>
              <AdSection ads={siteData.ads} base={base} />
            </Suspense>
          </div>
        </div>
      </div>
    </Layout>
  );
}