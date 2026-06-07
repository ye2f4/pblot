// 1. 导入React核心依赖
import React, { useState, useEffect, useRef } from 'react';
import Layout from '@theme/Layout';
import useBaseUrl from '@docusaurus/useBaseUrl';
import styles from './index.module.css';
import siteData from '../data/siteData.json';

// 导入轮播组件
import Slider from 'react-slick';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';

export default function Home() {
  const base = useBaseUrl('');
  const [now, setNow] = useState(new Date());
  const [isClient, setIsClient] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const mainContentRef = useRef(null);

  // 时钟逻辑 + 滚动监听
  useEffect(() => {
    setIsClient(true);
    
    // 滚动监听（用于滚动动画）
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);

    const fetchOnlineTime = async () => {
      try {
        const res = await fetch('https://worldtimeapi.org/api/ip');
        const data = await res.json();
        setNow(new Date(data.datetime));
      } catch (err) {
        setNow(new Date());
      }
    };
    fetchOnlineTime();
    const timer = setInterval(() => setNow(prev => new Date(prev.getTime() + 1000)), 1000);
    
    return () => {
      clearInterval(timer);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // 轮播配置增强（添加动画）
  const carouselSettings = {
    dots: false,
    infinite: true,
    speed: 800, // 放慢速度更丝滑
    slidesToShow: 1,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 4000,
    arrows: true,
    lazyLoad: 'ondemand',
    pauseOnHover: true,
    fade: true, // 渐变切换（更炫酷）
    cssEase: 'ease-in-out',
    responsive: [
      { breakpoint: 768, settings: { arrows: false, fade: false } } // 手机端用滑动而非渐变
    ]
  };

  const weekJp = ['日', '月', '火', '水', '木', '金', '土'][now.getDay()];
  const weekEn = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][now.getDay()];

  // 判断元素是否进入视口（滚动动画）
  const isInView = (ref) => {
    if (!ref.current) return false;
    const rect = ref.current.getBoundingClientRect();
    return rect.top < window.innerHeight * 0.8 && rect.bottom > 0;
  };

  return (
    <Layout title={siteData.siteTitle}>
      {/* 全局动画样式 + 原有样式 */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');
        .pixel-font { font-family: 'Press Start 2P', cursive; letter-spacing: 2px; }
        
        /* 基础响应式重置 */
        * { box-sizing: border-box; }
        body { margin: 0; padding: 0; background-color: #f5f5f5; }
        
        /* ===== 新增：核心动画定义 ===== */
        /* 页面加载渐入 */
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        /* 像素风弹跳 */
        @keyframes pixelBounce {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
        
        /* 呼吸灯效果 */
        @keyframes breathe {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.9; transform: scale(1.02); }
        }
        
        /* 数字跳动（时钟专用） */
        @keyframes digitPulse {
          0%, 100% { text-shadow: 0 0 2px #333; }
          50% { text-shadow: 0 0 8px #4285f4; }
        }
        
        /* 排行榜数字闪烁 */
        @keyframes rankFlash {
          0%, 100% { box-shadow: 0 0 0 rgba(0,0,0,0.1); }
          50% { box-shadow: 0 0 8px rgba(234, 67, 53, 0.4); }
        }
        
        /* 滚动渐入 */
        .scroll-fade-in {
          opacity: 0;
          transform: translateY(30px);
          transition: opacity 0.8s ease, transform 0.8s ease;
        }
        
        .scroll-fade-in.visible {
          opacity: 1;
          transform: translateY(0);
        }
        
        /* ===== 原有样式 ===== */
        /* 顶部三栏响应式 */
        .top-row { display: flex; gap: 15px; flex-wrap: wrap; align-items: stretch; }
        .top-col { 
          flex: 1; 
          min-width: 200px; 
          background: #fff; 
          border-radius: 12px; 
          padding: 15px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.05);
          animation: fadeIn 0.6s ease-out; /* 加载动画 */
        }
        
        /* 按钮通用悬浮动画 */
        .btn-hover {
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
        }
        
        .btn-hover::after {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
          transition: left 0.6s ease;
        }
        
        .btn-hover:hover::after {
          left: 100%;
        }
        
        .btn-hover:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(0,0,0,0.1);
        }
        
        @media (max-width: 768px) {
          .top-row { flex-direction: column !important; gap: 10px !important; }
          .top-col { flex: 1 1 100% !important; min-width: 100% !important; }
          .stats-container { gap: 15px !important; justify-content: center !important; }
          .clock-container { padding: 10px !important; }
          .clock-text { font-size: 24px !important; }
          .date-text { font-size: 16px !important; }
          .main-content { flex-direction: column; gap: 15px !important; }
          .carousel-container, .sidebar-container { flex: 1 1 100% !important; }
          .tab-buttons { flex-wrap: wrap; }
          .action-buttons { flex-direction: column; }
        }

        @media (min-width: 769px) and (max-width: 1024px) {
          .stats-container { gap: 20px !important; }
          .clock-text { font-size: 32px !important; }
          .carousel-container { flex: 6 !important; }
          .sidebar-container { flex: 4 !important; }
        }
      `}</style>

      {/* 顶部通栏（背景图保留 + 加载动画） */}
      <section 
        className={styles.topBannerWrap} 
        style={{ 
          backgroundImage: `url(${base}img/bg_big.png)`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          padding: '20px 15px',
          width: '100%',
          animation: 'fadeIn 0.8s ease-out',
        }}
      >
        <div className="top-row" style={{ maxWidth: 1200, margin: '0 auto' }}>
          {/* ========== 左：公告栏（呼吸动画） ========== */}
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
                欢迎来到Mono的小窝！本站为个人技术分享站点~
              </p>
            </div>
          </div>

          {/* ========== 中：统计+时钟 ========== */}
          <div className="top-col" style={{ flex: 2, minWidth: "400px", animationDelay: '0.2s' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              height: '100%'
            }}>
              {/* 统计项（悬浮缩放） */}
              <div className="stats-container" style={{ display: 'flex', gap: 15, flexWrap: 'wrap' }}>
                {siteData.stats.map((item, i) => (
                  <div 
                    key={i} 
                    style={{ 
                      textAlign: 'center', 
                      minWidth: "40px",
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
                    <p style={{ color: item.color, fontSize: 11, margin: 0, textAlign: 'center' }}>{item.value}</p>
                  </div>
                ))}
              </div>

              {/* 时钟（数字跳动动画） */}
              <div className="clock-container" style={{
                padding: 0,
                backgroundColor: 'transparent',
                backdropFilter: 'none',
                textAlign: 'right',
                minWidth: "160px"
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
                  {now.getFullYear()}-{(now.getMonth()+1+'').padStart(2,'0')}-{(now.getDate()+'').padStart(2,'0')}
                </div>
              </div>
            </div>
          </div>

          {/* ========== 右：用户界面（头像旋转+按钮动画） ========== */}
          <div className="top-col" style={{ animationDelay: '0.3s' }}>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 12,
              height: '100%',
              justifyContent: 'center'
            }}>
              {/* 圆形头像（悬浮旋转） */}
              <img 
                src={`${base}avatar.png`} 
                alt="头像"
                style={{
                  width: 50,
                  height: 50,
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
              {/* 登录/注册按钮（新增hover动画） */}
              <div style={{ display: 'flex', gap: 8, width: '100%' }}>
                <button className="btn-hover" style={{
                  flex: 1,
                  padding: "6px 12px",
                  backgroundColor: '#4285f4',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 4,
                  fontSize: 14,
                  cursor: 'pointer',
                }}>
                  登录
                </button>
                <button className="btn-hover" style={{
                  flex: 1,
                  padding: "6px 12px",
                  backgroundColor: '#999',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 4,
                  fontSize: 14,
                  cursor: 'pointer',
                }}>
                  注册
                </button>
              </div>
              {/* GitHub登录按钮（新增hover动画） */}
              <button className="btn-hover" style={{
                width: '100%',
                padding: "6px 12px",
                backgroundColor: '#333',
                color: '#fff',
                border: 'none',
                borderRadius: 4,
                fontSize: 14,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
                GitHub登录
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ========== 主内容区（滚动动画） ========== */}
      <div 
        ref={mainContentRef}
        className="main-content" 
        style={{
          maxWidth: 1200,
          margin: '20px auto',
          padding: '0 15px',
          display: 'flex',
          gap: 20,
          width: '100%',
          // 滚动动画控制
          opacity: isInView(mainContentRef) ? 1 : 0,
          transform: isInView(mainContentRef) ? 'translateY(0)' : 'translateY(30px)',
          transition: 'opacity 0.8s ease, transform 0.8s ease'
        }}
      >
        {/* 左侧轮播区（滚动渐入） */}
        <div 
          className="carousel-container" 
          style={{ 
            flex: 7, 
            minWidth: 0,
            animation: 'fadeIn 0.8s ease-out 0.4s both'
          }}
        >
          {/* 标签栏（按钮悬浮动画） */}
          <div className="tab-buttons" style={{ display: 'flex', gap: 10, marginBottom: 15 }}>
            {siteData.tabs.map((tab, i) => (
              <button 
                key={i}
                className="btn-hover"
                style={{ 
                  padding: "8px 16px", 
                  backgroundColor: tab.color, 
                  color: '#fff', 
                  border: 'none', 
                  borderRadius: 4,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  animation: `fadeIn 0.6s ease-out ${0.5 + i * 0.1}s both`
                }}
              >
                {tab.name}
              </button>
            ))}
          </div>

          {/* 轮播图（渐变切换+悬浮放大） */}
          {isClient && (
            <div style={{
              backgroundColor: '#fff',
              padding: 15,
              borderRadius: 8,
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              width: '100%',
              animation: 'fadeIn 0.8s ease-out 0.7s both'
            }}>
              <Slider {...carouselSettings}>
                {siteData.carouselImages.map((img, i) => (
                  <div key={i} style={{ textAlign: 'center' }}>
                    <img 
                      src={`${base}img/${img.filename}`} 
                      alt={img.title}
                      style={{ 
                        width: '100%', 
                        borderRadius: 4, 
                        maxHeight: "300px", 
                        objectFit: 'cover',
                        transition: 'transform 0.5s ease',
                        cursor: 'pointer'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'scale(1.02)';
                        e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.15)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'scale(1)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    />
                    <p style={{ 
                      marginTop: 8, 
                      fontSize: 14,
                      animation: 'breathe 2s infinite ease-in-out'
                    }}>{img.title}</p>
                  </div>
                ))}
              </Slider>
            </div>
          )}
        </div>

        {/* 右侧侧边栏（滚动渐入） */}
        <div 
          className="sidebar-container" 
          style={{ 
            flex: 3, 
            minWidth: 0,
            animation: 'fadeIn 0.8s ease-out 0.5s both'
          }}
        >
          {/* 功能按钮（悬浮动画） */}
          <div className="action-buttons" style={{ display: 'flex', gap: 10, marginBottom: 15 }}>
            <button className="btn-hover" style={{ 
              flex: 1, 
              padding: "12px", 
              backgroundColor: '#34a853', 
              color: '#fff', 
              border: 'none', 
              borderRadius: 4, 
              fontSize: 16,
              whiteSpace: 'nowrap',
              animation: 'fadeIn 0.6s ease-out 0.8s both'
            }}>
              签到
            </button>
            <button className="btn-hover" style={{ 
              flex: 1, 
              padding: "12px", 
              backgroundColor: '#ff9800', 
              color: '#fff', 
              border: 'none', 
              borderRadius: 4, 
              fontSize: 16,
              whiteSpace: 'nowrap',
              animation: 'fadeIn 0.6s ease-out 0.9s both'
            }}>
              抽贴
            </button>
          </div>

          {/* 排行榜（数字闪烁+条目悬浮） */}
          <div style={{
            backgroundColor: '#fff',
            padding: 15,
            borderRadius: 8,
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            marginBottom: 15,
            width: '100%',
            animation: 'fadeIn 0.8s ease-out 1s both'
          }}>
            <h4 style={{ 
              margin: '0 0 15px 0', 
              fontSize: 16,
              position: 'relative',
              paddingBottom: 8,
              borderBottom: '2px solid #f0f0f0'
            }}>
              最新主题
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
                      padding: '8px 0',
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
                      width: 20,
                      height: 20,
                      borderRadius: '50%',
                      backgroundColor: numColor,
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 12,
                      marginRight: 10,
                      // 前三名添加闪烁动画
                      ...(i < 3 ? { animation: 'rankFlash 2s infinite' } : {})
                    }}>{i+1}</span>
                    <a 
                      href={`${base}${item.link}`} 
                      style={{
                        flex: 1,
                        fontSize: 14,
                        color: '#333',
                        textDecoration: 'none',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}
                    >
                      {item.title}
                    </a>
                    <span style={{ fontSize: 12, color: '#999', whiteSpace: 'nowrap', marginLeft: 8 }}>
                      {item.date}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 广告位（悬浮放大） */}
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
                alt={`广告${i+1}`} 
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
    </Layout>
  );
}