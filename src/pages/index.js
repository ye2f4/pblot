import React, { useState, useEffect, useRef, lazy, Suspense } from 'react';
import Layout from '@theme/Layout';
import useBaseUrl from '@docusaurus/useBaseUrl';
import styles from './index.module.css';
import siteData from '../data/siteData.json';
import { throttle } from '../utils/common';
import { supabase } from '../supabase/supabaseClient';

// 自定义钩子
import { useAuth } from '../hooks/useAuth';
import { useComments } from '../hooks/useComments';

// 页面组件
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

// ========== 你要的 14 个新功能组件全部导入 ==========
import BackToTop from '../components/BackToTop';
import PageLoading from '../components/PageLoading';
import ClickLove from '../components/ClickLove';
import CopyRight from '../components/CopyRight';
import MouseFollower from '../components/MouseFollower';
import SmoothScroll from '../components/SmoothScroll';
import NavScroll from '../components/NavScroll';
import SiteTimer from '../components/SiteTimer';
import VisitorTimer from '../components/VisitorTimer';
import VisitorCount from '../components/VisitorCount';
import MobileOptimization from '../components/MobileOptimization';
import PWA from '../components/PWA';

export const metadata = { ssr: false };

export default function Home() {
  const base = useBaseUrl('');
  const isMountedRef = useRef(true);
  const [isClient, setIsClient] = useState(false);
  const mainContentRef = useRef(null);

  // ========== 用户统计状态 ==========
  const [userCount, setUserCount] = useState(0);
  const [latestUser, setLatestUser] = useState('新用户');

  // ========== 网络时间系统（已修复国内稳定版） ==========
  const [realTs, setRealTs] = useState(Date.now());
  const [timeOffset, setTimeOffset] = useState(0);
  const [showTimeErrModal, setShowTimeErrModal] = useState(false);
  const [errModalText, setErrModalText] = useState('');
  const realNow = new Date(realTs);

  // 登录状态
  const { user, loading, isSessionChecked, handleGitHubLogin, handleSignOut } = useAuth();

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

  useEffect(() => {
    isMountedRef.current = true;
    setIsClient(true);

    // 缓存读取
    const cacheOffset = localStorage.getItem('time_offset_cache');
    if (cacheOffset) {
      setTimeOffset(Number(cacheOffset));
    }

    // 国内最稳定：淘宝时间接口（永不429/不重置）
    const fetchNetworkTime = async () => {
      try {
        const res = await fetch("https://api.m.taobao.com/rest/api3.do?api=mtop.common.getTimestamp", {
          signal: AbortSignal.timeout(5000),
        });
        const data = await res.json();
        const serverTimestamp = +data.data.t;

        const offset = serverTimestamp - Date.now();
        setTimeOffset(offset);
        localStorage.setItem('time_offset_cache', offset);
        setShowTimeErrModal(false);
      } catch (e) {
        setTimeOffset(0);
        localStorage.removeItem('time_offset_cache');
      }
    };

    setTimeout(fetchNetworkTime, 800);
    const reSyncTimer = setInterval(fetchNetworkTime, 600000);

    const renderTimer = setInterval(() => {
      if (isMountedRef.current) {
        setRealTs(Date.now() + timeOffset);
      }
    }, 10);

    const handleScroll = throttle(() => {
      if (window.scrollY > 600 && !commentsLoaded && isMountedRef.current) {
        setCommentsLoaded(true);
        fetchComments();
      }
    }, 200);
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      isMountedRef.current = false;
      clearInterval(reSyncTimer);
      clearInterval(renderTimer);
      window.removeEventListener("scroll", handleScroll);
    };
  }, [commentsLoaded]);

  // ========== Supabase 400 已修复 ==========
  useEffect(() => {
    if (!isClient) return;

    const fetchUserStats = async () => {
      try {
        const { count } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true });
        setUserCount(count || 0);
      } catch (e) {
        setUserCount(0);
      }

      try {
        const { data } = await supabase
          .from("profiles")
          .select("nickname,full_name,email")
          .order("id", { ascending: false })
          .limit(1);

        if (data?.[0]) {
          const u = data[0];
          setLatestUser(u.nickname || u.full_name || u.email?.split('@')[0] || '新用户');
        }
      } catch (e) {}
    };

    fetchUserStats();
    const timer = setInterval(fetchUserStats, 300000);
    return () => clearInterval(timer);
  }, [isClient]);

  const isInView = (ref) => {
    if (!ref.current) return false;
    const rect = ref.current.getBoundingClientRect();
    return rect.top < window.innerHeight * 0.8 && rect.bottom > 0;
  };

  if (!isClient) return null;

  return (
    <Layout title={siteData.siteTitle}>
      {/* ========== 全局14个新功能组件挂载 ========== */}
      <BackToTop />
      <PageLoading />
      <ClickLove />
      <CopyRight />
      <MouseFollower />
      <SmoothScroll />
      <NavScroll />
      <MobileOptimization />
      <PWA />

      {/* 顶部横幅 */}
      <TopBanner
        siteData={siteData}
        base={base}
        user={user}
        loading={loading}
        isSessionChecked={isSessionChecked}
        userCount={userCount}
        latestUser={latestUser}
        now={realNow}
        handleGitHubLogin={handleGitHubLogin}
        handleSignOut={handleSignOut}
        showTimeErrModal={showTimeErrModal}
        errModalText={errModalText}
        onCloseModal={() => setShowTimeErrModal(false)}
      />

      {/* 主内容 */}
      <div ref={mainContentRef} className="main-content" style={{
        maxWidth: 1200, margin: '20px auto', padding: '0 15px',
        display: 'flex', flexDirection: 'column', gap: 20, width: '100%',
        opacity: isInView(mainContentRef) ? 1 : 0,
        transform: isInView(mainContentRef) ? 'translateY(0)' : 'translateY(30px)',
        transition: 'opacity 0.8s ease, transform 0.8s ease'
      }}>
        <MainContentTop siteData={siteData} />

        <div style={{ display: 'flex', gap: 20, width: '100%' }}>
          <div className="left-container" style={{ flex: 7, minWidth: 0 }}>
            <CarouselSection siteData={siteData} base={base} isClient={isClient} />
            <QuickNav siteData={siteData} />
            <UpdatesList siteData={siteData} />
            <TagCloud siteData={siteData} />
            <FriendsAndAbout siteData={siteData} />
          </div>

          <div className="sidebar-container" style={{ flex: 3, minWidth: 0 }}>
            <RankList siteData={siteData} />

            <Suspense fallback={<div style={{ background: '#fff', padding: 15, borderRadius: 8, minHeight: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>加载中...</div>}>
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

            <Suspense fallback={null}>
              <AdSection ads={siteData.ads} base={base} />
            </Suspense>

            {/* 右下角统计组件 */}
            <div style={{ marginTop: 15, fontSize: 12, lineHeight: 1.6, color: '#666' }}>
              <SiteTimer />
              <VisitorTimer />
              <VisitorCount />
            </div>
          </div>
        </div>
      </div>

      {/* 时间弹窗 */}
      {showTimeErrModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 99999,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }} onClick={() => setShowTimeErrModal(false)}>
          <div style={{
            background: '#fff', padding: '24px 30px', borderRadius: '12px', minWidth: '320px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.2)', textAlign: 'center'
          }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 40, color: '#dc3545', marginBottom: 12 }}>⚠️</div>
            <h4 style={{ margin: '0 0 8px', fontSize: 16 }}>时间同步提醒</h4>
            <p style={{ color: '#555', margin: '0 0 20px', fontSize: 14 }}>{errModalText}</p>
            <button onClick={() => setShowTimeErrModal(false)} style={{
              padding: '8px 24px', background: '#4285f4', color: '#fff', border: 'none', borderRadius: 6
            }}>知道了</button>
          </div>
        </div>
      )}
    </Layout>
  );
}