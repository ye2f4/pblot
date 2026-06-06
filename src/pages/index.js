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
        
        /* 响应式适配：手机/平板/桌面 */
        @media (max-width: 768px) {
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

      {/* 顶部通栏（响应式统计+时钟） */}
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
        <div style={{
          maxWidth: 1200,
          margin: '0 auto',
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '20px'
        }}>
          {/* 左侧统计项（自动换行） */}
          <div className="stats-container" style={{ display: 'flex', gap: '30px', flexWrap: 'wrap' }}>
            {siteData.stats.map((item, i) => (
              <div key={i} style={{ textAlign: 'center', minWidth: '60px' }}>
                <div style={{
                  width: 60,
                  height: 60,
                  borderRadius: '50%',
                  backgroundColor: 'rgba(255,255,255,0.8)',
                  backdropFilter: 'blur(8px)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 8px',
                }}>
                  <span style={{ fontSize: 28, fontWeight: 'bold' }}>{item.label}</span>
                </div>
                <p style={{ color: item.color, fontSize: 12, margin: 0, textAlign: 'center' }}>{item.value}</p>
              </div>
            ))}
          </div>

          {/* 右侧时钟（响应式缩小） */}
          <div className="clock-container" style={{
            padding: '12px 15px',
            backgroundColor: 'rgba(255,255,255,0.1)',
            backdropFilter: 'blur(8px)',
            borderRadius: 8,
            textAlign: 'right',
            minWidth: '180px'
          }}>
            <div className="pixel-font clock-text" style={{
              fontSize: 36,
              color: '#fff',
              marginBottom: 8,
              textShadow: '0 2px 4px rgba(0,0,0,0.2)',
            }}>
              {now.toLocaleTimeString()}
            </div>
            <div className="date-text" style={{
              fontSize: 18,
              color: '#fff',
              marginBottom: 8,
            }}>
              {weekJp}曜日 ({weekEn})
            </div>
            <div className="pixel-font date-text" style={{
              fontSize: 20,
              color: '#fff',
              textShadow: '0 2px 4px rgba(0,0,0,0.2)',
            }}>
              {now.getFullYear()}-{(now.getMonth()+1+'').padStart(2,'0')}-{(now.getDate()+'').padStart(2,'0')}
            </div>
          </div>
        </div>
      </section>

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
                  padding: '8px 16px', 
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
                      style={{ width: '100%', borderRadius: 4, maxHeight: '300px', objectFit: 'cover' }}
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
              padding: '12px', 
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
              padding: '12px', 
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