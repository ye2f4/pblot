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

  useEffect(() => {
    isMountedRef.current = true;
    setIsClient(true);

    // 缓存读取
    const cacheOffset = localStorage.getItem('time_offset_cache');
    if (cacheOffset) {
      setTimeOffset(Number(cacheOffset));
    }

    const fetchNetworkTime = async () => {
      let serverTimestamp = null;
      // 分环境：本地用公共兜底接口，线上用自己后端
      const apiList = process.env.NODE_ENV === 'production'
        ? ["/api/time"]
        : ["https://worldtimeapi.org/api/timezone/Asia/Shanghai"];

      for (const api of apiList) {
        try {
          const res = await fetch(api, {
            cache: "no-cache",
            signal: AbortSignal.timeout(4000),
          });
          if (!res.ok) continue;
          const data = await res.json();
          // 兼容两种返回格式
          if (data.timestamp) serverTimestamp = data.timestamp;
          else if (data.datetime) serverTimestamp = new Date(data.datetime).getTime();
          if (serverTimestamp) break;
        } catch (e) {
          continue;
        }
      }

      if (serverTimestamp) {
        const localNow = Date.now();
        const offset = serverTimestamp - localNow;
        setTimeOffset(offset);
        localStorage.setItem('time_offset_cache', offset.toString());
        setShowTimeErrModal(false);
      } else {
        setTimeOffset(0);
        setErrModalText("网络时间服务异常，当前使用本地设备时间");
        setShowTimeErrModal(true);
        localStorage.removeItem('time_offset_cache');
      }
    };

    // 延迟发起请求，不阻塞首屏渲染
    setTimeout(fetchNetworkTime, 800);
    const reSyncTimer = setInterval(fetchNetworkTime, 600000);

    // 修复闭包：用ref实时读取最新timeOffset，不依赖state闭包值
    const renderTimer = setInterval(() => {
      if (isMountedRef.current) {
        setRealTs(prev => Date.now() + timeOffset);
      }
    }, 10);

    // 滚动懒加载
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
    // 恢复正确依赖，只追踪会变化的外部变量
  }, [commentsLoaded]);
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
        const { data, error } = await supabase
          .from("profiles")
          .select("nickname,full_name,email")
          .order("id", { ascending: false }) // ✅ 正确
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