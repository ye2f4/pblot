

import React, { useState, useEffect, useRef, lazy, Suspense } from 'react';
import Layout from '@theme/Layout';
import useBaseUrl from '@docusaurus/useBaseUrl';
import styles from './index.module.css';
import siteData from '../data/siteData.json';
import { throttle } from '../utils/common';
import { supabase } from '../supabase/supabaseClient';
import { AVATAR_CACHE_KEY } from '../supabase/supabaseClient';
import { storage } from '../utils/storage';

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
// 已删除 import PixelClock from '../components/PixelClock';

// 全局常量
const LOCATION_STORAGE_KEY = 'weather_selected_location';

// 懒加载组件
const WeatherWidget = lazy(() => import('../components/WeatherWidget'));
const CommentSection = lazy(() => import('../components/CommentSection'));
const AdSection = lazy(() => import('../components/AdSection'));

// 全局特效组件
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
import MobileAdapt from '../components/MobileOptimization';
import PWA from '../components/PWA';
import SupabaseKeepAlive from '../components/SupabaseKeepAlive';
import ChatRedDot from '../components/ChatRedDot';

export const metadata = { ssr: false };

export default function Home() {
  const base = useBaseUrl('');
  const isMountedRef = useRef(true);
  const [isClient, setIsClient] = useState(false);
  const mainContentRef = useRef(null);

  const [signOutLoading, setSignOutLoading] = useState(false);
  const [userCount, setUserCount] = useState(0);
  const [latestUser, setLatestUser] = useState('新用户');

  // 网络时间
  const [realTs, setRealTs] = useState(Date.now());
  const [timeOffset, setTimeOffset] = useState(0);
  const [showTimeErrModal, setShowTimeErrModal] = useState(false);
  const [errModalText, setErrModalText] = useState('');
  const realNow = new Date(realTs);

  // 时钟数据源（传给MiddleStatsCard）
  const [clockTimeEpoch, setClockTimeEpoch] = useState(Math.floor(Date.now() / 1000));
  const [clockLocationName, setClockLocationName] = useState('北京');

  // 删掉这个！！外面不属于Home组件体内
  useEffect(() => {
    const handler = (e) => setClockTimeEpoch(e.detail);
    window.addEventListener('forceClockTs', handler);
    return () => window.removeEventListener('forceClockTs', handler);
  }, [])

  const { user, loading, isSessionChecked, handleGitHubLogin: rawGithubLogin, handleSignOut: rawHandleSignOut } = useAuth();

  // 退出登录
  const handleSignOut = async () => {
    if (signOutLoading) return;
    setSignOutLoading(true);
    try {
      await rawHandleSignOut();
      storage.remove(AVATAR_CACHE_KEY);
    } catch (err) {
      console.error("退出登录异常：", err);
    } finally {
      setSignOutLoading(false);
    }
  };

  // GitHub登录
  const handleGitHubLogin = async () => {
    if (loading) return;
    try {
      await rawGithubLogin();
      const { data } = await supabase.auth.getSession();
      console.log('弹窗后手动拉取会话', data.session);
    } catch (err) {
      console.error("GitHub登录异常", err);
      alert(err.message || "浏览器拦截弹窗，请切换页面跳转模式");
    }
  };

  // 评论逻辑
  const {
    comments,
    commentContent,
    setCommentContent,
    commentLoading,
    commentsLoaded,
    setCommentsLoaded,
    fetchComments,
    submitComment
  } = useComments(isClient, user, base);

  const syncClockData = () => {
    if (!isMountedRef.current) return;
    try {
      const locStr = localStorage.getItem(LOCATION_STORAGE_KEY);
      if (!locStr) {
        setClockTimeEpoch(Math.floor(realTs / 1000));
        return;
      }
      const location = JSON.parse(locStr);
      setClockLocationName(location.name);
      const cacheKey = `blog_weather_cache_${location.code}`;
      const cacheRaw = localStorage.getItem(cacheKey);
      let offsetSec = 0;

      if (cacheRaw) {
        const cacheObj = JSON.parse(cacheRaw);
        const realData = cacheObj.data;
        offsetSec = realData?.utc_offset_seconds;
        const tzAbbr = realData?.timezone_abbreviation;

        // 兜底：通过时区缩写匹配
        if (!offsetSec && tzAbbr) {
          const tzMatch = tzAbbr.match(/GMT([+-]\d+)/);
          if (tzMatch) {
            offsetSec = parseInt(tzMatch[1], 10) * 3600;
          }
        }
      }

      // 如果缓存没有偏移量，尝试从经纬度估算（经度每15度约1小时）
      if (!offsetSec) {
        offsetSec = Math.round(location.lon / 15) * 3600;
        console.log("从经纬度估算 offsetSec =", offsetSec, location.lon);
      }

      // 核心：realTs 是网络校准后的 UTC 毫秒时间戳
      // 目标城市本地时间戳 = UTC + offsetSec（秒）
      const utcNow = Math.floor(realTs / 1000);
      const targetLocalEpoch = utcNow + offsetSec;
      console.log("同步城市时间", location.name, "offset", offsetSec, "城市时间戳", targetLocalEpoch);
      setClockTimeEpoch(targetLocalEpoch);
    } catch (e) {
      console.error('解析报错', e);
      setClockTimeEpoch(Math.floor(realTs / 1000));
    }
  };

  // 初始化生命周期
  useEffect(() => {
    isMountedRef.current = true;
    setIsClient(true);
    syncClockData();

    const cacheOffset = localStorage.getItem('time_offset_cache');
    if (cacheOffset) setTimeOffset(Number(cacheOffset));

    // 服务器时间同步：优先读取 /api/time（世界时 API，真实服务器时间戳），
    // 失败则回退 supabase.rpc，再回退本地时间。
    const fetchNetworkTime = async () => {
      try {
        const res = await fetch('/api/time');
        const json = await res.json();
        if (!json || json.success !== true || !json.timestamp) throw new Error('time api invalid');
        const serverTimestamp = json.timestamp; // 毫秒
        const offset = serverTimestamp - Date.now();
        setTimeOffset(offset);
        localStorage.setItem('time_offset_cache', offset);
        setShowTimeErrModal(false);
        return;
      } catch (e) {
        // 回退：supabase 服务器时间戳
        try {
          const { data } = await supabase.rpc('get_current_timestamp');
          const serverTimestamp = +data;
          const offset = serverTimestamp - Date.now();
          setTimeOffset(offset);
          localStorage.setItem('time_offset_cache', offset);
          setShowTimeErrModal(false);
          return;
        } catch (e2) {
          // 最终回退：本地时间
          setTimeOffset(0);
          localStorage.removeItem('time_offset_cache');
          setShowTimeErrModal(true);
          setErrModalText("无法同步服务器时间，使用本地系统时间");
        }
      }
    };

    setTimeout(fetchNetworkTime, 800);
    const reSyncTimer = setInterval(fetchNetworkTime, 600000);
    const renderTimer = setInterval(() => {
      if (isMountedRef.current) setRealTs(Date.now() + timeOffset);
    }, 10);

    // 滚动加载评论
    const handleScroll = throttle(() => {
      if (window.scrollY > 600 && !commentsLoaded && isMountedRef.current) {
        setCommentsLoaded(true);
        fetchComments();
      }
    }, 200);
    window.addEventListener("scroll", handleScroll, { passive: true });

    // 监听本地存储切换城市
    const handleStorageChange = (e) => {
      if (e.key === LOCATION_STORAGE_KEY) syncClockData();
    };
    window.addEventListener('storage', handleStorageChange);

    // 劫持localStorage赋值
    const originalSetItem = localStorage.setItem;
    localStorage.setItem = function (key, value) {
      originalSetItem.call(this, key, value);
      if (key === LOCATION_STORAGE_KEY) syncClockData();
    };

    return () => {
      isMountedRef.current = false;
      clearInterval(reSyncTimer);
      clearInterval(renderTimer);
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener('storage', handleStorageChange);
      localStorage.setItem = originalSetItem;
    };
  }, [commentsLoaded]);

  // 用户统计
  useEffect(() => {
    if (!isClient) return;
    const fetchUserStats = async () => {
      try {
        const { count } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
        setUserCount(count || 0);
      } catch (e) { setUserCount(0); }
      try {
        const { data } = await supabase.from("profiles").select("nickname,real_name,email").order("id", { ascending: false }).limit(1);
        if (data?.[0]) {
          const u = data[0];
          setLatestUser(u.nickname || u.real_name || u.email?.split('@')[0] || '新用户');
        }
      } catch (e) { }
    };
    fetchUserStats();
    const userTimer = setInterval(fetchUserStats, 300000);
    return () => clearInterval(userTimer);
  }, [isClient]);

  // 解析登录哈希token
  useEffect(() => {
    if (!isClient) return;
    const parseHashToken = async () => {
      if (window.location.hash.includes('access_token')) {
        console.log('检测到授权令牌哈希，开始解析');
        const { data, error } = await supabase.auth.getSession();
        if (error) console.error('解析令牌失败', error);
        else console.log('解析成功，会话信息', data.session);
      }
    };
    parseHashToken();
    const hashHandler = () => parseHashToken();
    window.addEventListener('hashchange', hashHandler);
    return () => window.removeEventListener('hashchange', hashHandler);
  }, [isClient]);

  // Auth状态监听
  useEffect(() => {
    if (!isClient) return;
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('=== Auth事件 ===', event, session?.user?.email);
    });
    return () => sub.subscription.unsubscribe();
  }, [isClient]);

  const isInView = (ref) => {
    if (!ref.current) return false;
    const rect = ref.current.getBoundingClientRect();
    return rect.top < window.innerHeight * 0.8 && rect.bottom > 0;
  };

  if (!isClient) return null;

  return (
    <Layout title={siteData.siteTitle} description="Monoの小窝 - 专注ESP32P4智能手表、LVGL开发、Meshtastic Mesh网络、开源硬件、全栈技术分享的个人博客">
      <BackToTop />
      <PageLoading />
      <ClickLove />
      <CopyRight />
      <MouseFollower />
      <SmoothScroll />
      <NavScroll />
      <MobileAdapt />
      <PWA />
      <SupabaseKeepAlive />
      <ChatRedDot />

      {/* TopBanner 彻底移除clockTimeEpoch、clockLocationName两个参数 */}
      <TopBanner
        siteData={siteData}
        base={base}
        user={user}
        loading={loading}
        signOutLoading={signOutLoading}
        isSessionChecked={isSessionChecked}
        userCount={userCount}
        latestUser={latestUser}
        now={realNow}
        handleGitHubLogin={handleGitHubLogin}
        handleSignOut={handleSignOut}
        showTimeErrModal={showTimeErrModal}
        errModalText={errModalText}
        onCloseModal={() => setShowTimeErrModal(false)}
        // 核心时钟参数
        timeEpoch={clockTimeEpoch}
        locationName={clockLocationName}
      />

      <div ref={mainContentRef} className="main-content fadeIn" style={{
        maxWidth: 1200, margin: '20px auto', padding: '0 15px',
        display: 'flex', flexDirection: 'column', gap: 20, width: '100%',
        boxSizing: 'border-box',
        opacity: isInView(mainContentRef) ? 1 : 0,
        transform: isInView(mainContentRef) ? 'translateY(0)' : 'translateY(30px)',
        transition: 'opacity 0.8s ease, transform 0.8s ease'
      }}>
        <MainContentTop siteData={siteData} />
        <div className="content-row" style={{ display: 'flex', gap: 20, width: '100%', flexWrap: 'wrap', overflow: 'hidden', boxSizing: 'border-box' }}>
          <div className="left-container" style={{ flex: '7 1 320px', minWidth: 0, overflow: 'hidden', boxSizing: 'border-box' }}>
            <CarouselSection base={base} isClient={isClient} />
            <QuickNav siteData={siteData} />
            <UpdatesList siteData={siteData} />
            <TagCloud siteData={siteData} />
            <FriendsAndAbout siteData={siteData} />
          </div>
          <div className="sidebar-container" style={{ flex: '3 1 260px', minWidth: 0, overflow: 'hidden', boxSizing: 'border-box' }}>
            {/* 侧边栏早已删除PixelClock渲染块 */}
            <Suspense fallback={<div className="stat-card" style={{ minHeight: 180, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>加载天气...</div>}>
              <WeatherWidget />
            </Suspense>

            <div className="stat-card">
              <RankList siteData={siteData} />
            </div>
            <Suspense fallback={<div className="stat-card" style={{ minHeight: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>加载中...</div>}>
              {commentsLoaded && (
                <CommentSection
                  comments={comments}
                  commentContent={commentContent}
                  setCommentContent={setCommentContent}
                  commentLoading={commentLoading}
                  submitComment={submitComment}
                  user={user}
                  base={base}
                  siteData={siteData}
                />
              )}
            </Suspense>
            <Suspense fallback={null}>
              <div className="stat-card">
                <AdSection ads={siteData.ads} base={base} />
              </div>
            </Suspense>
          </div>
        </div>
      </div>

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