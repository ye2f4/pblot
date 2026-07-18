

import React, { useState, useEffect, useRef, lazy, Suspense, useMemo } from 'react';
import Layout from '@theme/Layout';
import useBaseUrl from '@docusaurus/useBaseUrl';
import styles from './index.module.css';
import siteData from '../data/siteData.json';
import { useSiteConfig, applySiteConfig } from '../theme/SiteConfigProvider';
import { throttle } from '../utils/common';
import { supabase } from '../supabase/supabaseClient';
import { showAlert } from '@/utils/dialog';
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


export const metadata = {
  ssr: false,
  title: 'Monoの小窝 | ESP32P4·LVGL·Meshtastic 技术分享与开源硬件',
  description: '专注 ESP32P4 智能手表、LVGL 开发、Meshtastic Mesh 网络、开源硬件、React 教程与个人技术分享。',
};

export default function Home() {
  const base = useBaseUrl('');
  const isMountedRef = useRef(true);
  const [isClient, setIsClient] = useState(false);
  const mainContentRef = useRef(null);

  // 合并后台动态配置（site_config 表）到静态 siteData，覆盖公告/标题等参数
  const { config } = useSiteConfig();
  const mergedSiteData = useMemo(() => applySiteConfig(siteData, config), [config]);

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
  // clockTimeEpoch 始终是「绝对 UTC 时间戳(秒)」；时区偏移单独用 clockTzOffsetSec 传递，
  // 由显示端按指定时区渲染，避免「epoch 上叠加城市偏移 + 本地时区显示」造成的双重偏移。
  const [clockTimeEpoch, setClockTimeEpoch] = useState(Math.floor(Date.now() / 1000));
  const [clockLocationName, setClockLocationName] = useState('北京');
  const [clockTzOffsetSec, setClockTzOffsetSec] = useState(0);
  // 优先用 IANA 时区(如 "Asia/Shanghai")传递，显示端用 Intl 渲染，
  // 自带夏令时(DST)处理，彻底解决柏林等时区"慢 1 小时"以及北极无明确偏移的边界问题。
  const [clockTimeZone, setClockTimeZone] = useState('');

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
      showAlert(err.message || "浏览器拦截弹窗，请切换页面跳转模式");
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
        // 未选择城市：显示浏览器本地时间。
        // 浏览器本地时区自带 DST，用本地相对 UTC 的偏移即可正确显示；
        // 这里不传 IANA，交给显示端走偏移渲染。
        setClockTimeEpoch(Math.floor(realTs / 1000));
        setClockTzOffsetSec(-new Date().getTimezoneOffset() * 60);
        setClockTimeZone('');
        return;
      }
      const location = JSON.parse(locStr);
      setClockLocationName(location.name);
      const cacheKey = `blog_weather_cache_${location.code}`;
      const cacheRaw = localStorage.getItem(cacheKey);

      // 优先取 IANA 时区：① 城市自带(静态列表已配) ② 天气缓存里 open-meteo 返回的 timezone
      let tz = location.timezone || '';
      let offsetSec = 0;

      if (cacheRaw) {
        const cacheObj = JSON.parse(cacheRaw);
        const realData = cacheObj.data;
        if (!tz && realData?.timezone) tz = realData.timezone;
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

      // 如果缓存/城市都没有偏移量，尝试从经纬度估算（仅作最终兜底，不含 DST）
      if (!offsetSec) {
        offsetSec = Math.round(location.lon / 15) * 3600;
        console.log("从经纬度估算 offsetSec =", offsetSec, location.lon);
      }

      // 核心：realTs 是网络校准后的绝对 UTC 毫秒时间戳。
      // 这里只传「绝对 UTC 时间戳」+ IANA 时区(若有) + 偏移兜底。
      // 显示端优先用 Intl 按 IANA 渲染(自动处理 DST)，无 IANA 时回退偏移渲染。
      const utcNow = Math.floor(realTs / 1000);
      console.log("同步城市时间", location.name, "timeZone", tz, "offset", offsetSec, "UTC时间戳", utcNow);
      setClockTimeEpoch(utcNow);
      setClockTzOffsetSec(offsetSec);
      setClockTimeZone(tz);
    } catch (e) {
      console.error('解析报错', e);
      setClockTimeEpoch(Math.floor(realTs / 1000));
      setClockTzOffsetSec(-new Date().getTimezoneOffset() * 60);
      setClockTimeZone('');
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
    }, 1000);

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
      // 切换城市、或天气缓存(含 IANA 时区)就绪时，都重新同步时钟。
      // 这样自定义地点(如北极)在 WeatherWidget 写入 open-meteo 返回的 timezone 后，
      // 能自动切换到 Intl 按时区渲染，无需刷新页面。
      if (key === LOCATION_STORAGE_KEY || key.startsWith('blog_weather_cache_')) syncClockData();
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
        // 按注册时间倒序取最新用户（id 是 UUID 非时间序，不能用于排序）
        const { data } = await supabase.from("profiles").select("nickname,real_name,email,created_at").order("created_at", { ascending: false }).limit(1);
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


      {/* TopBanner 彻底移除clockTimeEpoch、clockLocationName两个参数 */}
      <TopBanner
        siteData={mergedSiteData}
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
        timeZoneOffset={clockTzOffsetSec}
        timeZone={clockTimeZone}
      />

      <div ref={mainContentRef} className="main-content fadeIn" style={{
        maxWidth: 1200, margin: '20px auto', padding: '0 15px',
        display: 'flex', flexDirection: 'column', gap: 20, width: '100%',
        boxSizing: 'border-box',
        minHeight: '600px',
        opacity: isInView(mainContentRef) ? 1 : 0,
        transform: isInView(mainContentRef) ? 'translateY(0)' : 'translateY(30px)',
        transition: 'opacity 0.4s ease, transform 0.4s ease'
      }}>
        <MainContentTop siteData={mergedSiteData} />
        <div className="content-row" style={{ display: 'flex', gap: 20, width: '100%', flexWrap: 'wrap', overflow: 'hidden', boxSizing: 'border-box' }}>
          <div className="left-container" style={{ flex: '7 1 320px', minWidth: 0, overflow: 'hidden', boxSizing: 'border-box' }}>
            <CarouselSection base={base} isClient={isClient} />
            <QuickNav siteData={mergedSiteData} />
            <UpdatesList siteData={mergedSiteData} />
            <TagCloud siteData={mergedSiteData} />
            <FriendsAndAbout siteData={mergedSiteData} />
          </div>
          <div className="sidebar-container" style={{ flex: '3 1 260px', minWidth: 0, overflow: 'hidden', boxSizing: 'border-box' }}>
            {/* 侧边栏早已删除PixelClock渲染块 */}
            <Suspense fallback={<div className="stat-card" style={{ minHeight: 180, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>加载天气...</div>}>
              <WeatherWidget />
            </Suspense>

            <div className="stat-card">
              <RankList siteData={mergedSiteData} />
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
                  siteData={mergedSiteData}
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