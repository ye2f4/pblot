

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
      if (!locStr) return;
      const location = JSON.parse(locStr);
      setClockLocationName(location.name);
      const cacheKey = `blog_weather_cache_${location.code}`;
      const cacheRaw = localStorage.getItem(cacheKey);
      if (cacheRaw) {
        const cacheObj = JSON.parse(cacheRaw);
        console.log("【完整OM返回结构】", JSON.stringify(cacheObj, null, 2));

        // 关键：真实气象数据在 cacheObj.data 里面
        const realData = cacheObj.data;
        let offsetSec = realData.utc_offset_seconds;
        const localTimeStr = realData.current?.time;
        const tzAbbr = realData.timezone_abbreviation;

        console.log("提取值 offsetSec =", offsetSec, " localTimeStr =", localTimeStr, "缩写", tzAbbr);

        // 兜底时区对照表
        if (!offsetSec && tzAbbr) {
          const tzMap = {
            "GMT-4": -14400,
            "GMT+8": 28800,
            "GMT+1": 3600,
            "GMT+9": 32400,
            "GMT-5": -18000,
            "GMT+0": 0
          };
          offsetSec = tzMap[tzAbbr] ?? 0;
          console.log("靠缩写匹配 offsetSec =", offsetSec, tzAbbr);
        }

        if (offsetSec && localTimeStr) {
          const [datePart, timePart] = localTimeStr.split('T');
          const [y, m, d] = datePart.split('-').map(Number);
          const [h, mi] = timePart.split(':').map(Number);
          // 标准UTC时间戳计算
          const utcMs = Date.UTC(y, m - 1, d, h, mi) - offsetSec * 1000;
          const timeStamp = Math.floor(utcMs / 1000);
          console.log("✅ 计算成功 城市Unix秒戳", timeStamp);
          setClockTimeEpoch(timeStamp);
        } else {
          console.warn("❌ 无有效时区时间，使用本机时间", offsetSec, localTimeStr);
          setClockTimeEpoch(Math.floor(Date.now() / 1000));
        }
      } else {
        setClockTimeEpoch(Math.floor(Date.now() / 1000));
      }
    } catch (e) {
      console.error('解析报错', e);
      setClockTimeEpoch(Math.floor(Date.now() / 1000));
    }
  };

  // 初始化生命周期
  useEffect(() => {
    isMountedRef.current = true;
    setIsClient(true);
    syncClockData();

    const cacheOffset = localStorage.getItem('time_offset_cache');
    if (cacheOffset) setTimeOffset(Number(cacheOffset));

    // 服务器时间同步
    const fetchNetworkTime = async () => {
      try {
        const { data } = await supabase.rpc('get_current_timestamp');
        const serverTimestamp = +data;
        const offset = serverTimestamp - Date.now();
        setTimeOffset(offset);
        localStorage.setItem('time_offset_cache', offset);
        setShowTimeErrModal(false);
      } catch (e) {
        setTimeOffset(0);
        localStorage.removeItem('time_offset_cache');
        setShowTimeErrModal(true);
        setErrModalText("无法同步服务器时间，使用本地系统时间");
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
        const { data } = await supabase.from("profiles").select("nickname,full_name,email").order("id", { ascending: false }).limit(1);
        if (data?.[0]) {
          const u = data[0];
          setLatestUser(u.nickname || u.full_name || u.email?.split('@')[0] || '新用户');
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
    <Layout title={siteData.siteName}>
      <BackToTop />
      <PageLoading />
      <ClickLove />
      <CopyRight />
      <MouseFollower />
      <SmoothScroll />
      <NavScroll />
      <MobileAdapt />
      <PWA />

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
  useEffect(() => {
    console.log("【Home顶层】clockTimeEpoch =", clockTimeEpoch, "城市 =", clockLocationName);
  }, [clockTimeEpoch, clockLocationName]);

}