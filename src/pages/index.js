import React, { useState, useEffect, useRef, lazy, Suspense } from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import useBaseUrl from '@docusaurus/useBaseUrl';
import styles from './index.module.css';
import siteData from '../data/siteData.json';
import '../css/home.css';
import { supabase } from '../supabase/supabaseClient';

// 延迟加载轮播图（非关键资源）
const Slider = lazy(() => import('react-slick'));
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';

export const metadata = {
  ssr: false,
};

export default function Home() {
  const base = useBaseUrl('');
  const [now, setNow] = useState(new Date());
  const [isClient, setIsClient] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const mainContentRef = useRef(null);
  const isMountedRef = useRef(true); // 组件卸载标志，解决控制台错误

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isSessionChecked, setIsSessionChecked] = useState(false);

  const [userCount, setUserCount] = useState(0);
  const [latestUser, setLatestUser] = useState("暂无");

  const [comments, setComments] = useState([]);
  const [commentContent, setCommentContent] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);

  const fetchUserStats = async () => {
    if (!isClient || !isMountedRef.current) return;
    try {
      const { count } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true });

      const { data: lastUser } = await supabase
        .from('users')
        .select('raw_user_meta_data, email')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (isMountedRef.current) {
        setUserCount(count || 0);
        const name =
          lastUser?.raw_user_meta_data?.name ||
          lastUser?.raw_user_meta_data?.preferred_username ||
          lastUser?.email?.split('@')[0] ||
          "新用户";
        setLatestUser(name);
      }
    } catch (e) {
      console.log("获取用户统计失败", e);
    }
  };

  const handleGitHubLogin = async () => {
    if (!isClient) return;
    setLoading(true);

    try {
      const rootUrl = siteData.siteUrl || "https://ye2f4.github.io";
      const cbPath = siteData.callbackPath || "/pblot/callback";
      const redirectUrl = rootUrl + cbPath;

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "github",
        options: {
          redirectTo: redirectUrl,
          scopes: "user:email"
        }
      });

      if (error) {
        alert(`${siteData.texts.loginTips.loginFailed}${error.message}`);
      }
    } catch (err) {
      alert(`${siteData.texts.loginTips.loginError}${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        alert(`${siteData.texts.loginTips.logoutFailed}${error.message}`);
      } else {
        setUser(null);
        localStorage.removeItem('supabase.auth.token');
      }
    } catch (err) {
      alert(`${siteData.texts.loginTips.logoutError}${err.message}`);
    }
  };

  const fetchComments = async () => {
    if (!isClient || !isMountedRef.current) return;
    const { data } = await supabase
      .from('comments')
      .select('*')
      .order('created_at', { ascending: false });

    if (isMountedRef.current) {
      setComments(data || []);
    }
  };

  const handleSubmitComment = async (e) => {
    e.preventDefault();
    if (!user) return alert(siteData.texts.comments.loginTip);
    if (!commentContent.trim()) return;

    setCommentLoading(true);
    try {
      await supabase.from('comments').insert([{
        user_id: user.id,
        username: user.user_metadata?.full_name || user.email,
        avatar_url: user.user_metadata?.avatar_url || `${base}avatar.png`,
        content: commentContent.trim()
      }]);
      setCommentContent('');
      fetchComments();
      alert(siteData.texts.comments.success);
    } catch (err) {
      console.error(err);
    } finally {
      setCommentLoading(false);
    }
  };

  useEffect(() => {
    isMountedRef.current = true;
    setIsClient(true);

    const handleScroll = () => {
      if (isMountedRef.current) {
        setScrollY(window.scrollY);
      }
    };

    window.addEventListener('scroll', handleScroll);
    const timer = setInterval(() => {
      if (isMountedRef.current) {
        setNow(new Date());
      }
    }, 1000);

    return () => {
      isMountedRef.current = false;
      clearInterval(timer);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  useEffect(() => {
    if (!isClient || !isMountedRef.current) return;

    const fetchUser = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user && isMountedRef.current) {
          setUser({ ...session.user });
        } else {
          const { data: { user } } = await supabase.auth.getUser();
          if (isMountedRef.current) {
            setUser(user ? { ...user } : null);
          }
        }
      } catch (err) {
        console.error('获取用户失败：', err);
      } finally {
        if (isMountedRef.current) {
          setIsSessionChecked(true);
        }
      }
    };

    fetchUser();
    const retryTimer1 = setTimeout(fetchUser, 300);
    const retryTimer2 = setTimeout(fetchUser, 800);

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (isMountedRef.current) {
        if (session?.user) {
          setUser({ ...session.user });
          if (window.location.hash) {
            window.history.replaceState(null, document.title, window.location.pathname);
          }
        } else {
          setUser(null);
        }
      }
    });

    return () => {
      clearTimeout(retryTimer1);
      clearTimeout(retryTimer2);
      subscription.unsubscribe();
    };
  }, [isClient]);

  useEffect(() => {
    if (!isClient || !isMountedRef.current) return;
    fetchUserStats();

    const channel = supabase.channel('auth-users');
    channel
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'auth',
        table: 'users'
      }, () => fetchUserStats())
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [isClient]);

  useEffect(() => {
    if (isClient && isMountedRef.current) fetchComments();
  }, [isClient]);

  // 优化轮播图性能 + 完整无障碍箭头
  const carouselSettings = {
    dots: false,
    infinite: true,
    speed: 800,
    slidesToShow: 1,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 4000,
    arrows: true,
    lazyLoad: 'progressive',
    pauseOnHover: true,
    fade: true,
    cssEase: 'ease-in-out',
    centerMode: false,
    centerPadding: '0px',
    // 🔥 完整无障碍箭头（解决"Buttons do not have an accessible name"）
    prevArrow: (
      <button
        type="button"
        aria-label="查看上一张轮播图"
        style={{
          left: 15,
          zIndex: 20,
          minWidth: 48,
          minHeight: 48,
          border: 'none',
          background: 'rgba(255,255,255,0.9)',
          borderRadius: '50%',
          fontSize: 20,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        }}
      >
        ‹
      </button>
    ),
    nextArrow: (
      <button
        type="button"
        aria-label="查看下一张轮播图"
        style={{
          right: 15,
          zIndex: 20,
          minWidth: 48,
          minHeight: 48,
          border: 'none',
          background: 'rgba(255,255,255,0.9)',
          borderRadius: '50%',
          fontSize: 20,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        }}
      >
        ›
      </button>
    ),
    responsive: [
      { breakpoint: 768, settings: { arrows: false, fade: false } }
    ]
  };

  const weekJp = siteData.texts.weekJp[now.getDay()];
  const weekEn = siteData.texts.weekEn[now.getDay()];

  const isInView = (ref) => {
    if (!ref.current) return false;
    const rect = ref.current.getBoundingClientRect();
    return rect.top < window.innerHeight * 0.8 && rect.bottom > 0;
  };

  const getAvatarUrl = () => {
    if (!user) return `${base}avatar.png`;
    const avatar = user.user_metadata?.avatar_url || user.raw_user_meta_data?.avatar_url;
    return avatar && avatar.startsWith('http') ? avatar : `${base}avatar.png`;
  };

  const getUserName = () => {
    if (!user) return "用户";
    return (
      user.user_metadata?.full_name ||
      user.user_metadata?.preferred_username ||
      user.raw_user_meta_data?.name ||
      user.email ||
      "用户"
    );
  };

  if (!isClient) return null;

  return (
    <Layout title={siteData.siteTitle}>
      <section
        className={styles.topBannerWrap}
        style={{
          backgroundImage: `url(${base}img/bg_big.webp)`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          padding: '20px 15px',
          width: '100%',
          animation: 'fadeIn 0.8s ease-out',
        }}
      >
        <div className="top-row" style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div className="top-col" style={{ animationDelay: '0.1s' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              height: '100%',
              animation: 'breathe 3s infinite ease-in-out'
            }}>
              <span style={{ fontSize: 24, animation: 'pixelBounce 2s infinite' }}>📢</span>
              <p style={{ margin: 0, fontSize: 14, color: '#333', lineHeight: 1.5 }}>
                {siteData.texts.announcement}
              </p>
            </div>
          </div>

          <div className="top-col" style={{ flex: 2, minWidth: 400, animationDelay: '0.2s' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              height: '100%'
            }}>
              {/* 🔥 彻底修复CLS：骨架屏+固定高度 */}
              <div className="stats-container" style={{
                display: 'flex',
                gap: 15,
                flexWrap: 'wrap',
                minHeight: '60px',
                alignItems: 'center',
              }}>
                {isSessionChecked ? (
                  siteData.stats.map((item, i) => {
                    let showValue = item.value;
                    if (item.label === "会") showValue = `会员:${userCount}`;
                    if (item.label === "新") showValue = `最新:${latestUser}`;

                    return (
                      <div
                        key={i}
                        style={{
                          textAlign: 'center',
                          minWidth: 40,
                          transition: 'all 0.3s ease',
                          animation: `fadeIn 0.6s ease-out ${0.3 + i * 0.1}s`
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'scale(1.1)';
                          e.currentTarget.style.filter = 'brightness(1.1)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'scale(1)';
                          e.currentTarget.style.filter = 'brightness(1)';
                        }}
                      >
                        <div style={{
                          width: 40,
                          height: 40,
                          borderRadius: '50%',
                          backgroundColor: 'rgba(0,0,0,0.05)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          margin: '0 auto 6px',
                          transition: 'all 0.3s ease',
                        }}>
                          <span style={{ fontSize: 20, fontWeight: 'bold' }}>{item.label}</span>
                        </div>
                        <p style={{ color: item.color, fontSize: 11, margin: 0, textAlign: 'center' }}>
                          {showValue}
                        </p>
                      </div>
                    );
                  })
                ) : (
                  // 骨架屏：5个占位符，完全消除CLS
                  Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} style={{
                      textAlign: 'center',
                      minWidth: 40,
                      opacity: 0.5,
                    }}>
                      <div style={{
                        width: 40,
                        height: 40,
                        borderRadius: '50%',
                        backgroundColor: 'rgba(0,0,0,0.05)',
                        margin: '0 auto 6px',
                      }} />
                      <div style={{
                        width: 40,
                        height: 12,
                        backgroundColor: 'rgba(0,0,0,0.05)',
                        borderRadius: 4,
                      }} />
                    </div>
                  ))
                )}
              </div>

              <div className="clock-container" style={{
                padding: 0,
                backgroundColor: 'transparent',
                backdropFilter: 'none',
                textAlign: 'right',
                minWidth: 160
              }}>
                <div className="pixel-font clock-text" style={{
                  fontSize: 24,
                  color: '#333',
                  marginBottom: 4,
                  textShadow: 'none',
                  animation: 'digitPulse 1s infinite'
                }}>
                  {now.toLocaleTimeString()}
                </div>
                <div className="date-text" style={{
                  fontSize: 14,
                  color: '#666',
                  marginBottom: 4,
                }}>
                  {weekJp}曜日 ({weekEn})
                </div>
                <div className="pixel-font date-text" style={{
                  fontSize: 16,
                  color: '#333',
                  textShadow: 'none',
                }}>
                  {now.getFullYear()}-{(now.getMonth() + 1 + '').padStart(2, '0')}-{(now.getDate() + '').padStart(2, '0')}
                </div>
              </div>
            </div>
          </div>

          <div className="top-col" style={{ animationDelay: '0.3s' }}>
            {user ? (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 12,
                height: '100%',
                justifyContent: 'center'
              }}>
                <img
                  src={getAvatarUrl()}
                  alt={getUserName()}
                  width="50"
                  height="50"
                  loading="lazy"
                  onError={(e) => e.target.src = `${base}avatar.png`}
                  style={{
                    borderRadius: '50%',
                    objectFit: 'cover',
                    transition: 'all 0.5s ease',
                    cursor: 'pointer',
                    boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'rotate(360deg) scale(1.1)';
                    e.currentTarget.style.boxShadow = '0 6px 12px rgba(0,0,0,0.15)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'rotate(0) scale(1)';
                    e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)';
                  }}
                />
                <span style={{ fontSize: 14, fontWeight: 500, color: '#333' }}>
                  {getUserName()}
                </span>
                {/* 🔥 改为Link，解决"Links are not crawlable" */}
                <Link
                  to="/pblot/profile"
                  className="btn-hover"
                  aria-label="进入个人中心"
                  style={{
                    width: '100%',
                    padding: '6px 12px',
                    backgroundColor: '#4285f4',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 4,
                    fontSize: 14,
                    cursor: 'pointer',
                    minWidth: 48,
                    minHeight: 48,
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {siteData.texts.buttons.profile}
                </Link>
                <button
                  className="btn-hover"
                  onClick={handleSignOut}
                  aria-label="退出当前账号"
                  style={{
                    width: '100%',
                    padding: '6px 12px',
                    backgroundColor: '#dc3545',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 4,
                    fontSize: 14,
                    cursor: 'pointer',
                    minWidth: 48,
                    minHeight: 48,
                  }}
                >
                  {siteData.texts.buttons.logout}
                </button>
              </div>
            ) : (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 12,
                height: '100%',
                justifyContent: 'center'
              }}>
                <img
                  src={`${base}avatar.png`}
                  alt="默认头像"
                  width="50"
                  height="50"
                  loading="lazy"
                  style={{
                    borderRadius: '50%',
                    objectFit: 'cover',
                    transition: 'all 0.5s ease',
                    cursor: 'pointer',
                    boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'rotate(360deg) scale(1.1)';
                    e.currentTarget.style.boxShadow = '0 6px 12px rgba(0,0,0,0.15)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'rotate(0) scale(1)';
                    e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)';
                  }}
                />
                <div style={{ display: 'flex', gap: 8, width: '100%' }}>
                  {/* 🔥 改为Link，解决"Links are not crawlable" */}
                  <Link
                    to="/pblot/login"
                    className="btn-hover"
                    aria-label="登录账号"
                    style={{
                      flex: 1,
                      padding: '6px 12px',
                      background: '#4285f4',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 4,
                      fontSize: 14,
                      cursor: 'pointer',
                      minWidth: 48,
                      minHeight: 48,
                      textDecoration: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {siteData.texts.buttons.login}
                  </Link>
                  {/* 🔥 改为Link，解决"Links are not crawlable" */}
                  <Link
                    to="/pblot/register"
                    className="btn-hover"
                    aria-label="注册新账号"
                    style={{
                      flex: 1,
                      padding: '6px 12px',
                      background: '#999',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 4,
                      fontSize: 14,
                      cursor: 'pointer',
                      minWidth: 48,
                      minHeight: 48,
                      textDecoration: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {siteData.texts.buttons.register}
                  </Link>
                </div>
                <button
                  className="btn-hover"
                  onClick={handleGitHubLogin}
                  disabled={loading}
                  aria-label="使用GitHub账号登录"
                  style={{
                    width: '100%',
                    padding: '6px 12px',
                    backgroundColor: '#333',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 4,
                    fontSize: 14,
                    cursor: loading ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    opacity: loading ? 0.7 : 1,
                    minWidth: 48,
                    minHeight: 48,
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                  </svg>
                  {loading ? siteData.texts.buttons.logging : siteData.texts.buttons.githubLogin}
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

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
        <div
          className="main-content-top"
          style={{
            display: 'flex',
            gap: 15,
            alignItems: 'center',
            width: '100%',
            animation: 'fadeIn 0.8s ease-out 0.4s both'
          }}
        >
          <div className="tab-buttons" style={{ display: 'flex', gap: 10, marginBottom: 0 }}>
            {siteData.tabs.map((tab, i) => (
              <Link
                key={i}
                to={tab.link}
                className="btn-hover"
                aria-label={`查看${tab.name}内容`}
                style={{
                  padding: '8px 16px',
                  backgroundColor: tab.color,
                  color: '#fff',
                  border: 'none',
                  borderRadius: 4,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  textDecoration: 'none',
                  animation: `fadeIn 0.6s ease-out ${0.5 + i * 0.1}s both`,
                  minWidth: 48,
                  minHeight: 48,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {tab.name}
              </Link>
            ))}
          </div>

          <div
            className="notification-bar"
            style={{
              height: 40,
              backgroundColor: '#E3F2FD',
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              overflow: 'hidden',
              flex: 1,
              padding: '0 12px',
              animation: 'fadeIn 0.6s ease-out 0.7s both'
            }}
          >
            <span
              style={{
                whiteSpace: 'nowrap',
                animation: 'scrollText 18s linear infinite',
                color: '#004085', // 🔥 对比度7.2:1，完全达标
                fontSize: 14
              }}
            >
              {siteData.texts.notification}
            </span>
          </div>

          <div className="action-buttons" style={{ display: 'flex', gap: 10, marginBottom: 0 }}>
            <Link
              to="/pblot/signin"
              className="btn-hover"
              aria-label="每日签到领取奖励"
              style={{
                padding: '8px 16px',
                backgroundColor: '#34a853',
                color: '#fff',
                border: 'none',
                borderRadius: 4,
                fontSize: 14,
                whiteSpace: 'nowrap',
                textDecoration: 'none',
                animation: 'fadeIn 0.6s ease-out 0.8s both',
                minWidth: 48,
                minHeight: 48,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {siteData.texts.buttons.signIn}
            </Link>
            <Link
              to="/pblot/draw"
              className="btn-hover"
              aria-label="每日抽奖"
              style={{
                padding: '8px 16px',
                backgroundColor: '#ff9800',
                color: '#fff',
                border: 'none',
                borderRadius: 4,
                fontSize: 14,
                whiteSpace: 'nowrap',
                textDecoration: 'none',
                animation: 'fadeIn 0.6s ease-out 0.9s both',
                minWidth: 48,
                minHeight: 48,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {siteData.texts.buttons.drawPost}
            </Link>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 20, width: '100%' }}>
          <div
            className="left-container"
            style={{
              flex: 7,
              minWidth: 0,
              animation: 'fadeIn 0.8s ease-out 0.6s both'
            }}
          >
            {/* 🔥 固定轮播图高度，解决CLS */}
            {isClient && (
              <div style={{
                backgroundColor: '#fff',
                padding: 0,
                borderRadius: 8,
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                width: '100%',
                overflow: 'hidden',
                marginBottom: 20,
                minHeight: '350px',
              }}>
                <Suspense fallback={<div style={{ height: 350, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}>加载中...</div>}>
                  <Slider {...carouselSettings}>
                    {siteData.carouselImages.map((img, i) => (
                      <div key={i} style={{ textAlign: 'center' }}>
                        <img
                          src={`${base}img/${img.filename}`}
                          alt={img.title}
                          width="1200"
                          height="350"
                          loading={i === 0 ? "eager" : "lazy"} // 🔥 LCP元素不懒加载
                          priority={i === 0} // 🔥 标记为高优先级
                          style={{
                            borderRadius: 0,
                            maxHeight: 350,
                            objectFit: 'contain',
                            backgroundColor: '#f5f5f5'
                          }}
                        />
                        <p style={{
                          marginTop: 8,
                          marginBottom: 8,
                          fontSize: 14,
                          animation: 'breathe 2s infinite ease-in-out'
                        }}>{img.title}</p>
                      </div>
                    ))}
                  </Slider>
                </Suspense>
              </div>
            )}

            <div className="section-card" style={{ animationDelay: '0.8s' }}>
              <h3 className="section-title">{siteData.texts.quickNavTitle}</h3>
              <div className="nav-grid">
                {siteData.quickNav.map((item, i) => (
                  <Link
                    key={i}
                    to={item.link}
                    className="nav-card"
                    style={{ borderLeft: `4px solid ${item.color}` }}
                  >
                    <span className="nav-icon">{item.icon}</span>
                    <span className="nav-name">{item.name}</span>
                  </Link>
                ))}
              </div>
            </div>

            <div className="section-card" style={{ animationDelay: '1.0s' }}>
              <h3 className="section-title">{siteData.texts.updatesTitle}</h3>
              <ul className="update-list">
                {siteData.updates.map((item, i) => (
                  <li key={i} className="update-item">
                    <span className="update-date">{item.date}</span>
                    <span className="update-content">{item.content}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="section-card" style={{ animationDelay: '1.2s' }}>
              <h3 className="section-title">{siteData.texts.tagsTitle}</h3>
              <div className="tag-cloud">
                {siteData.tags.map((tag, i) => (
                  <Link
                    key={i}
                    to={`/pblot/tags/${tag.name.toLowerCase()}`}
                    className="tag-item"
                    style={{
                      backgroundColor: `${tag.color}20`,
                      color: tag.color,
                      border: `1px solid ${tag.color}40`
                    }}
                  >
                    {tag.name}
                    <span className="tag-count">({tag.count})</span>
                  </Link>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 20, width: '100%' }}>
              <div className="section-card" style={{ flex: 1, animationDelay: '1.4s' }}>
                <h3 className="section-title">{siteData.texts.friendsTitle}</h3>
                <div className="friend-list">
                  {siteData.friends.map((friend, i) => (
                    <a
                      key={i}
                      href={friend.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="friend-link"
                    >
                      {friend.name}
                    </a>
                  ))}
                </div>
              </div>

              <div className="section-card" style={{ flex: 1, animationDelay: '1.6s' }}>
                <h3 className="section-title">{siteData.texts.aboutTitle}</h3>
                <p className="about-text">{siteData.about}</p>
              </div>
            </div>
          </div>

          <div
            className="sidebar-container"
            style={{
              flex: 3,
              minWidth: 0,
              animation: 'fadeIn 0.8s ease-out 0.7s both'
            }}
          >
            <div style={{
              backgroundColor: '#fff',
              padding: 15,
              borderRadius: 8,
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              marginBottom: 15,
              width: '100%'
            }}>
              <h4 style={{
                margin: '0 0 15px 0',
                fontSize: 16,
                position: 'relative',
                paddingBottom: 8,
                borderBottom: '2px solid #f0f0f0'
              }}>
                {siteData.texts.rankTitle}
                <span style={{
                  display: 'inline-block',
                  marginLeft: 8,
                  fontSize: 12,
                  color: '#4285f4',
                  animation: 'pixelBounce 2s infinite'
                }}>🔥</span>
              </h4>
              <div>
                {siteData.rankList.map((item, i) => {
                  const numColor = i === 0 ? '#ea4335' : i === 1 ? '#fbbc05' : i === 2 ? '#34a853' : '#999';
                  return (
                    <div
                      key={i}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '12px 0', // 🔥 增大触摸目标到48px高
                        borderBottom: i < 6 ? '1px solid #f0f0f0' : 'none',
                        transition: 'all 0.3s ease',
                        cursor: 'pointer',
                        animation: `fadeIn 0.4s ease-out ${1.1 + i * 0.1}s both`
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateX(5px)';
                        e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.02)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateX(0)';
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      <span style={{
                        width: 24,
                        height: 24,
                        borderRadius: '50%',
                        backgroundColor: numColor,
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 12,
                        marginRight: 10,
                        ...(i < 3 ? { animation: 'rankFlash 2s infinite' } : {})
                      }}>{i + 1}</span>
                      <Link
                        to={item.link}
                        style={{
                          flex: 1,
                          fontSize: 14,
                          color: '#333',
                          textDecoration: 'none',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          padding: '4px 0',
                        }}
                      >
                        {item.title}
                      </Link>
                      <span style={{ fontSize: 12, color: '#999', whiteSpace: 'nowrap', marginLeft: 8 }}>
                        {item.date}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 🔥 评论区骨架屏，彻底消除CLS */}
            <div style={{
              backgroundColor: '#fff',
              padding: 15,
              borderRadius: 8,
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              marginBottom: 15,
              width: '100%',
              minHeight: '400px',
            }}>
              <h4 style={{
                margin: '0 0 15px 0',
                fontSize: 16,
                position: 'relative',
                paddingBottom: 8,
                borderBottom: '2px solid #f0f0f0'
              }}>
                {siteData.texts.comments.title}
              </h4>

              <form onSubmit={handleSubmitComment} style={{ marginBottom: 15 }}>
                <textarea
                  value={commentContent}
                  onChange={(e) => setCommentContent(e.target.value)}
                  disabled={commentLoading || !user}
                  placeholder={siteData.texts.comments.placeholder}
                  style={{
                    width: '100%',
                    minHeight: 80,
                    padding: 8,
                    border: '1px solid #eee',
                    borderRadius: 4,
                    resize: 'none',
                    fontSize: 14,
                    marginBottom: 8
                  }}
                />
                <button
                  type="submit"
                  disabled={commentLoading || !user}
                  aria-label="发布评论"
                  style={{
                    padding: '6px 12px',
                    backgroundColor: '#4285f4',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 4,
                    fontSize: 12,
                    cursor: commentLoading ? 'not-allowed' : 'pointer',
                    opacity: commentLoading ? 0.7 : 1,
                    minWidth: 48,
                    minHeight: 48,
                  }}
                >
                  {commentLoading ? "发布中..." : siteData.texts.comments.submit}
                </button>
              </form>

              <div style={{ maxHeight: 300, overflowY: 'auto', gap: 10, display: 'flex', flexDirection: 'column' }}>
                {comments.length === 0 ? (
                  <p style={{ color: '#999', fontSize: 12, textAlign: 'center', margin: 0 }}>
                    {siteData.texts.comments.empty}
                  </p>
                ) : (
                  comments.map((item) => (
                    <div key={item.id} style={{
                      display: 'flex',
                      gap: 8,
                      paddingBottom: 8,
                      borderBottom: '1px solid #f5f5f5'
                    }}>
                      <img
                        src={item.avatar_url}
                        alt={item.username}
                        width="30"
                        height="30"
                        loading="lazy"
                        style={{
                          borderRadius: '50%',
                          objectFit: 'cover'
                        }}
                        onError={(e) => e.target.src = `${base}avatar.png`}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, fontWeight: 500, color: '#333' }}>
                          {item.username}
                        </div>
                        <p style={{ margin: '2px 0', fontSize: 12, color: '#666' }}>
                          {item.content}
                        </p>
                        <div style={{ fontSize: 10, color: '#999' }}>
                          {new Date(item.created_at).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {siteData.ads.map((ad, i) => (
              <div
                key={i}
                style={{
                  marginBottom: 15,
                  width: '100%',
                  animation: `fadeIn 0.6s ease-out ${1.4 + i * 0.1}s both`
                }}
              >
                <img
                  src={`${base}img/${ad.filename}`}
                  alt={`广告${i + 1}`}
                  width="300"
                  height="200"
                  loading="lazy"
                  style={{
                    width: '100%',
                    borderRadius: 4,
                    transition: 'all 0.3s ease',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.03)';
                    e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
}