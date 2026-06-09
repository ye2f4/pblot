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

export const metadata = { ssr: false };

export default function Home() {
  const base = useBaseUrl('');
  const isMountedRef = useRef(true);
  const [isClient, setIsClient] = useState(false);
  const mainContentRef = useRef(null);

  // ========== 用户统计状态 ==========
  const [userCount, setUserCount] = useState(0);
  const [latestUser, setLatestUser] = useState('新用户');

  // ========== 网络时间系统（纯网络授时，国内可用接口） ==========
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

  // ========== 1. 国内稳定网络时间（无IP、无CORS、100%可用） ==========
  useEffect(() => {
    isMountedRef.current = true;
    setIsClient(true);

    const fetchNetworkTime = async () => {
      try {
        const res = await fetch("https://world-time-api3.p.rapidapi.com/timezone/Asia/Shanghai", {
          method: "GET",
          headers: {
            "x-rapidapi-host": "world-time-api3.p.rapidapi.com",
            "x-rapidapi-key": "20153450c4msh9e0de275355bb13p14e656jsnb821705e6b5d", // 替换你页面完整密钥
            "Content-Type": "application/json"
          },
          cache: "no-cache",
          signal: AbortSignal.timeout(6000),
        });

        if (!res.ok) throw new Error(`接口异常 ${res.status}`);
        const data = await res.json();

        // 适配返回格式提取时间戳（不同服务商字段略有差异，报错就切换/ip.txt端点）
        let serverTs;
        if (data.timestamp) serverTs = data.timestamp * 1000;
        else if (data.UnixTime) serverTs = data.UnixTime * 1000;
        else serverTs = new Date(data.datetime).getTime();

        const offset = serverTs - Date.now();
        setTimeOffset(offset);
        setShowTimeErrModal(false);
      } catch (e) {
        console.log("RapidAPI时间同步失败：", e);
        setTimeOffset(0);
        setShowTimeErrModal(true);
        setErrModalText("RapidAPI网络时间拉取失败，已使用本地设备时间");
      }
    };

    fetchNetworkTime();
    const reSyncTimer = setInterval(fetchNetworkTime, 300000);

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
  }, [commentsLoaded, timeOffset]);

  // ========== 2. 修复 Supabase 400 错误（最终版） ==========
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
          .from('profiles')
          .select('nickname, full_name, email')
          .order('id', { ascending: false })
          .limit(1);

        if (data?.[0]) {
          const u = data[0];
          setLatestUser(
            u.nickname || u.full_name || u.email?.split('@')[0] || '新用户'
          );
        } else {
          setLatestUser('新用户');
        }
      } catch (e) {
        setLatestUser('新用户');
      }
    };

    fetchUserStats();
    const timer = setInterval(fetchUserStats, 300000);
    return () => clearInterval(timer);
  }, [isClient]);

  // 元素视口判断（滚动渐入动画）
  const isInView = (ref) => {
    if (!ref.current) return false;
    const rect = ref.current.getBoundingClientRect();
    return rect.top < window.innerHeight * 0.8 && rect.bottom > 0;
  };

  if (!isClient) return null;

  return (
    <Layout title={siteData.siteTitle}>
      {/* 顶部横幅：传递网络时间 + 弹窗状态 */}
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
          opacity: isInView(mainContentRef) ? 1 : 0,
          transform: isInView(mainContentRef) ? 'translateY(0)' : 'translateY(30px)',
          transition: 'opacity 0.8s ease, transform 0.8s ease'
        }}
      >
        <MainContentTop siteData={siteData} />

        <div style={{ display: 'flex', gap: 20, width: '100%' }}>
          {/* 左侧内容 */}
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

      {/* 全局时间错误弹窗 */}
      {showTimeErrModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.4)',
          zIndex: 99999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }} onClick={() => setShowTimeErrModal(false)}>
          <div style={{
            background: '#fff',
            padding: '24px 30px',
            borderRadius: '12px',
            minWidth: '320px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
            textAlign: 'center'
          }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 40, color: '#dc3545', marginBottom: 12 }}>⚠️</div>
            <h4 style={{ margin: '0 0 8px', fontSize: 16, color: '#222' }}>时间同步提醒</h4>
            <p style={{ color: '#555', margin: '0 0 20px', fontSize: 14 }}>{errModalText}</p>
            <button onClick={() => setShowTimeErrModal(false)} style={{
              padding: '8px 24px',
              background: '#4285f4',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              fontSize: 14,
              cursor: 'pointer'
            }}>知道了</button>
          </div>
        </div>
      )}
    </Layout>
  );
}