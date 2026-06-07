// 1. 导入React核心依赖
import React, { useState, useEffect } from 'react';
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

  // 时钟逻辑
  useEffect(() => {
    setIsClient(true);
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
    return () => clearInterval(timer);
  }, []);

  const carouselSettings = {
    dots: false,
    infinite: true,
    speed: 500,
    slidesToShow: 1,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 3000,
    arrows: true,
    lazyLoad: 'ondemand',
    pauseOnHover: true,
    responsive: [
      { breakpoint: 768, settings: { arrows: false } } // 手机端隐藏箭头
    ]
  };

  const weekJp = ['日', '月', '火', '水', '木', '金', '土'][now.getDay()];
  const weekEn = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][now.getDay()];

  return (
    <Layout title={siteData.siteTitle}>
      {/* 全局响应式样式 */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');
        .pixel-font { font-family: 'Press Start 2P', cursive; letter-spacing: 2px; }
        
        /* 基础响应式重置 */
        * { box-sizing: border-box; }
        body { margin: 0; padding: 0; }
        
        /* 顶部三栏响应式 */
        .top-row { display: flex; gap: 15px; flex-wrap: wrap; align-items: stretch; }
        .top-col { flex: 1; min-width: 200px; background: #fff; border-radius: 12px; padding: 15px; }
        
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

      {/* 顶部通栏（背景图保留） */}
      <section 
        className={styles.topBannerWrap} 
        style={{ 
          backgroundImage: `url(${base}img/bg_big.png)`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          padding: '20px 15px',
          width: '100%'
        }}
      >
        <div className="top-row" style={{ maxWidth: 1200, margin: '0 auto' }}>
          {/* ========== 左：公告栏 ========== */}
          <div className="top-col">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, height: '100%' }}>
              <span style={{ fontSize: 24 }}>📢</span>
              <p style={{ margin: 0, fontSize: 14, color: '#333', lineHeight: 1.5 }}>
                欢迎来到Mono的小窝！本站为个人技术分享站点~
              </p>
            </div>
          </div>

          {/* ========== 中：统计+时钟（白色背景衬托原有内容） ========== */}
          {/* 修复：minWidth: 400px → minWidth: "400px" */}
          <div className="top-col" style={{ flex: 2, minWidth: "400px" }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              height: '100%'
            }}>
              {/* 原有统计项，仅调整大小适配新容器 */}
              <div className="stats-container" style={{ display: 'flex', gap: 15, flexWrap: 'wrap' }}>
                {siteData.stats.map((item, i) => (
                  <div key={i} style={{ textAlign: 'center', minWidth: "40px" }}>
                    <div style={{
                      width: 40,
                      height: 40,
                      borderRadius: '50%',
                      backgroundColor: 'rgba(0,0,0,0.05)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 6px',
                    }}>
                      <span style={{ fontSize: 20, fontWeight: 'bold' }}>{item.label}</span>
                    </div>
                    <p style={{ color: item.color, fontSize: 11, margin: 0, textAlign: 'center' }}>{item.value}</p>
                  </div>
                ))}
              </div>

              {/* 原有时钟，调整颜色适配白色背景 */}
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

          {/* ========== 右：用户界面（头像+登录按钮） ========== */}
          <div className="top-col">
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 12,
              height: '100%',
              justifyContent: 'center'
            }}>
              {/* 圆形头像 */}
              <img 
                src={`${base}avatar.png`} 
                alt="头像"
                style={{
                  width: 50,
                  height: 50,
                  borderRadius: '50%',
                  objectFit: 'cover',
                }}
              />
              {/* 登录/注册按钮 */}
              <div style={{ display: 'flex', gap: 8, width: '100%' }}>
                <button style={{
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
                <button style={{
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
              {/* GitHub登录按钮 */}
              <button style={{
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

      {/* ========== 以下所有内容完全不动，和你原来的代码一模一样 ========== */}
      {/* 主内容区（响应式分栏） */}
      <div className="main-content" style={{
        maxWidth: 1200,
        margin: '20px auto',
        padding: '0 15px',
        display: 'flex',
        gap: 20,
        width: '100%'
      }}>
        {/* 左侧轮播区 */}
        <div className="carousel-container" style={{ flex: 7, minWidth: 0 }}>
          {/* 标签栏（自动换行） */}
          <div className="tab-buttons" style={{ display: 'flex', gap: 10, marginBottom: 15 }}>
            {siteData.tabs.map((tab, i) => (
              <button 
                key={i}
                style={{ 
                  padding: "8px 16px", 
                  backgroundColor: tab.color, 
                  color: '#fff', 
                  border: 'none', 
                  borderRadius: 4,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap'
                }}
              >
                {tab.name}
              </button>
            ))}
          </div>

          {/* 轮播图（响应式适配） */}
          {isClient && (
            <div style={{
              backgroundColor: '#fff',
              padding: 15,
              borderRadius: 8,
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              width: '100%'
            }}>
              <Slider {...carouselSettings}>
                {siteData.carouselImages.map((img, i) => (
                  <div key={i} style={{ textAlign: 'center' }}>
                    <img 
                      src={`${base}img/${img.filename}`} 
                      alt={img.title}
                      style={{ width: '100%', borderRadius: 4, maxHeight: "300px", objectFit: 'cover' }}
                    />
                    <p style={{ marginTop: 8, fontSize: 14 }}>{img.title}</p>
                  </div>
                ))}
              </Slider>
            </div>
          )}
        </div>

        {/* 右侧侧边栏（响应式适配） */}
        <div className="sidebar-container" style={{ flex: 3, minWidth: 0 }}>
          {/* 功能按钮（手机端上下堆叠） */}
          <div className="action-buttons" style={{ display: 'flex', gap: 10, marginBottom: 15 }}>
            <button style={{ 
              flex: 1, 
              padding: "12px", 
              backgroundColor: '#34a853', 
              color: '#fff', 
              border: 'none', 
              borderRadius: 4, 
              fontSize: 16,
              whiteSpace: 'nowrap'
            }}>
              签到
            </button>
            <button style={{ 
              flex: 1, 
              padding: "12px", 
              backgroundColor: '#ff9800', 
              color: '#fff', 
              border: 'none', 
              borderRadius: 4, 
              fontSize: 16,
              whiteSpace: 'nowrap'
            }}>
              抽贴
            </button>
          </div>

          {/* 排行榜（响应式宽度） */}
          <div style={{
            backgroundColor: '#fff',
            padding: 15,
            borderRadius: 8,
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            marginBottom: 15,
            width: '100%'
          }}>
            <h4 style={{ margin: '0 0 15px 0', fontSize: 16 }}>最新主题</h4>
            <div>
              {siteData.rankList.map((item, i) => {
                const numColor = i === 0 ? '#ea4335' : i === 1 ? '#fbbc05' : i === 2 ? '#34a853' : '#999';
                return (
                  <div key={i} style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '8px 0',
                    borderBottom: i < 6 ? '1px solid #f0f0f0' : 'none',
                  }}>
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

          {/* 广告位（响应式宽度） */}
          <div style={{ marginBottom: 15, width: '100%' }}>
            <img 
              src={`${base}img/${siteData.ads[0].filename}`} 
              alt="广告1" 
              style={{ width: '100%', borderRadius: 4 }} 
            />
          </div>
          <div style={{ width: '100%' }}>
            <img 
              src={`${base}img/${siteData.ads[1].filename}`} 
              alt="广告2" 
              style={{ width: '100%', borderRadius: 4 }} 
            />
          </div>
        </div>
      </div>
    </Layout>
  );
}