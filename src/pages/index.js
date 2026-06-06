// 1. 导入React核心依赖
import React, { useState, useEffect } from 'react';
// 导入Docusaurus核心组件（仅保留稳定的基础组件）
import Layout from '@theme/Layout';
import useBaseUrl from '@docusaurus/useBaseUrl';
// 导入样式和静态数据（GitHub Pages推荐静态数据）
import styles from './index.module.css';
import siteData from '../data/siteData.json'; // 静态数据文件

// ========== 导入轮播组件（已安装依赖） ==========
import Slider from 'react-slick';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';

// 2. 主页组件（适配GitHub Pages静态部署）
export default function Home() {
  // 初始化基础路径（关键：适配GitHub Pages子路径，比如 username.github.io/repo/）
  const base = useBaseUrl('');

  // ===== 状态管理 =====
  const [now, setNow] = useState(new Date()); // 时钟
  const [isClient, setIsClient] = useState(false); // 区分服务端/客户端渲染（避免GitHub Pages部署报错）

  // ===== 仅在客户端执行（适配GitHub Pages静态渲染） =====
  useEffect(() => {
    setIsClient(true); // 标记为客户端环境

    // 1. 网络时钟：每秒更新
    const fetchOnlineTime = async () => {
      try {
        const res = await fetch('https://worldtimeapi.org/api/ip');
        const data = await res.json();
        setNow(new Date(data.datetime));
      } catch (err) {
        setNow(new Date()); // 降级到本地时间
      }
    };
    fetchOnlineTime();

    // 2. 时钟定时器
    const timer = setInterval(() => {
      setNow(prev => new Date(prev.getTime() + 1000));
    }, 1000);

    // 清理定时器
    return () => clearInterval(timer);
  }, []);

  // ===== 轮播配置（react-slick，适配静态部署） =====
  const carouselSettings = {
    dots: false,
    infinite: true,
    speed: 500,
    slidesToShow: 1,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 3000,
    arrows: true,
    // 适配GitHub Pages客户端渲染
    lazyLoad: 'ondemand',
    pauseOnHover: true
  };

  // ===== 日期格式化 =====
  const weekJp = ['日', '月', '火', '水', '木', '金', '土'][now.getDay()];
  const weekEn = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][now.getDay()];

  // ===== 页面渲染（仅在客户端渲染轮播，避免服务端报错） =====
  return (
    <Layout title={siteData.siteTitle}>
      {/* 全局样式：适配GitHub Pages，像素字体+响应式 */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');
        .pixel-font {
          font-family: 'Press Start 2P', cursive;
          letter-spacing: 2px;
        }
        /* 响应式适配：GitHub Pages在不同设备显示正常 */
        @media (max-width: 768px) {
          .stats-container {
            flex-wrap: wrap;
            justify-content: center !important;
            gap: 15px !important;
          }
          .main-content {
            flex-direction: column;
          }
          .carousel-container, .sidebar-container {
            flex: 1 1 100% !important;
          }
        }
      `}</style>

      {/* ========== 1. 顶部通栏（背景+统计+时钟） ========== */}
      <section 
        className={styles.topBannerWrap} 
        style={{ 
          backgroundImage: `url(${base}img/bg_big.png)`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          padding: '30px 20px',
          margin: '0 auto',
          maxWidth: '100%'
        }}
      >
        <div style={{
          maxWidth: 1200,
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          {/* 左侧统计项 */}
          <div className="stats-container" style={{ display: 'flex', gap: '30px' }}>
            {siteData.stats.map((item, i) => (
              <div key={i} style={{ textAlign: 'center' }}>
                <div style={{
                  width: 80,
                  height: 80,
                  borderRadius: '50%',
                  backgroundColor: 'rgba(255,255,255,0.8)',
                  backdropFilter: 'blur(8px)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 8,
                }}>
                  <span style={{ fontSize: 40, fontWeight: 'bold' }}>{item.label}</span>
                </div>
                <p style={{ color: item.color, fontSize: 14, margin: 0 }}>{item.value}</p>
              </div>
            ))}
          </div>

          {/* 右侧像素时钟 */}
          <div style={{
            padding: '15px 20px',
            backgroundColor: 'rgba(255,255,255,0.1)',
            backdropFilter: 'blur(8px)',
            borderRadius: 8,
            textAlign: 'right',
          }}>
            <div className="pixel-font" style={{
              fontSize: 42,
              color: '#fff',
              marginBottom: 10,
              textShadow: '0 2px 4px rgba(0,0,0,0.2)',
            }}>
              {now.toLocaleTimeString()}
            </div>
            <div style={{
              fontSize: 22,
              color: '#fff',
              marginBottom: 10,
            }}>
              {weekJp}曜日 ({weekEn})
            </div>
            <div className="pixel-font" style={{
              fontSize: 24,
              color: '#fff',
              textShadow: '0 2px 4px rgba(0,0,0,0.2)',
            }}>
              {now.getFullYear()}-{(now.getMonth()+1+'').padStart(2,'0')}-{(now.getDate()+'').padStart(2,'0')}
            </div>
          </div>
        </div>
      </section>

      {/* ========== 2. 主内容区（轮播+排行榜+广告） ========== */}
      <div className="main-content" style={{
        maxWidth: 1200,
        margin: '20px auto',
        padding: '0 20px',
        display: 'flex',
        gap: 20,
      }}>
        {/* 左侧轮播（仅客户端渲染，避免GitHub Pages服务端报错） */}
        <div className="carousel-container" style={{ flex: 7 }}>
          {/* 标签栏 */}
          <div style={{
            display: 'flex',
            gap: 10,
            marginBottom: 15,
            flexWrap: 'wrap',
          }}>
            {siteData.tabs.map((tab, i) => (
              <button 
                key={i}
                style={{ 
                  padding: '8px 16px', 
                  backgroundColor: tab.color, 
                  color: '#fff', 
                  border: 'none', 
                  borderRadius: 4,
                  cursor: 'pointer'
                }}
              >
                {tab.name}
              </button>
            ))}
          </div>

          {/* React-Slick轮播（客户端渲染） */}
          {isClient && (
            <div style={{
              backgroundColor: '#fff',
              padding: 15,
              borderRadius: 8,
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            }}>
              <Slider {...carouselSettings}>
                {siteData.carouselImages.map((img, i) => (
                  <div key={i} style={{ textAlign: 'center' }}>
                    <img 
                      src={`${base}img/${img.filename}`} 
                      alt={img.title}
                      style={{ width: '100%', borderRadius: 4 }}
                    />
                    <p style={{ marginTop: 8, fontSize: 14 }}>{img.title}</p>
                  </div>
                ))}
              </Slider>
            </div>
          )}
        </div>

        {/* 右侧侧边栏 */}
        <div className="sidebar-container" style={{ flex: 3 }}>
          {/* 功能按钮 */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 15 }}>
            <button style={{ 
              flex: 1, 
              padding: '12px', 
              backgroundColor: '#34a853', 
              color: '#fff', 
              border: 'none', 
              borderRadius: 4, 
              fontSize: 20 
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
              fontSize: 20 
            }}>
              抽贴
            </button>
          </div>

          {/* 排行榜（静态数据，适配GitHub Pages） */}
          <div style={{
            backgroundColor: '#fff',
            padding: 15,
            borderRadius: 8,
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            marginBottom: 15,
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
                      }}
                    >
                      {item.title}
                    </a>
                    <span style={{ fontSize: 12, color: '#999' }}>
                      {item.date}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 广告位 */}
          <div style={{ marginBottom: 15 }}>
            <img 
              src={`${base}img/${siteData.ads[0].filename}`} 
              alt="广告1" 
              style={{ width: '100%', borderRadius: 4 }} 
            />
          </div>
          <div>
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