import React, { lazy, Suspense } from 'react';
const Slider = lazy(() => import('react-slick'));
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';
import siteData from '../../data/siteData.json';
import styles from '../../pages/index.module.css';

// 自定义箭头组件（React 函数组件，避免 currentSlide/slideCount 等 react-slick 内部 props 落到 DOM 上）
function PrevArrow(props) {
  const { className, style, onClick } = props;
  return (
    <button
      type="button"
      aria-label="上一张"
      className={className}
      style={{
        ...style,
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
      onClick={onClick}
    >
      ‹
    </button>
  );
}

function NextArrow(props) {
  const { className, style, onClick } = props;
  return (
    <button
      type="button"
      aria-label="下一张"
      className={className}
      style={{
        ...style,
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
      onClick={onClick}
    >
      ›
    </button>
  );
}

export default function CarouselSection({ base, isClient }) {
    const carouselCfg = siteData.carouselConfig || {};
    const carouselSettings = {
        dots: carouselCfg.dots ?? false,
        infinite: carouselCfg.infinite ?? true,
        speed: carouselCfg.speed ?? 300,
        slidesToShow: 1,
        slidesToScroll: 1,
        autoplay: true,
        autoplaySpeed: carouselCfg.autoplaySpeed ?? 6000,
        arrows: true,
        lazyLoad: false,
        pauseOnHover: carouselCfg.pauseOnHover ?? true,
        fade: carouselCfg.fade ?? true,
        cssEase: 'ease-in-out',
        centerMode: false,
        centerPadding: '0px',
        prevArrow: <PrevArrow />,
        nextArrow: <NextArrow />,
        responsive: [
            { breakpoint: 768, settings: { arrows: false, fade: false } }
        ]
    };

    const images = (siteData.carouselImages && siteData.carouselImages.length > 0) ? siteData.carouselImages : [
        { filename: '0.webp', title: '' }, { filename: '1.webp', title: '' }
    ];

    return (
        <div className={styles.carouselWrap} style={{
            backgroundColor: 'var(--ifm-card-background-color)',
            padding: 0,
            borderRadius: 8,
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            width: '100%',
            maxWidth: '100%',
            overflow: 'hidden',
            marginBottom: 20,
        }}>
            <Suspense fallback={
                <div style={{
                    aspectRatio: '16 / 7', maxWidth: '100%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#999', background: 'var(--ifm-color-emphasis-100)',
                }}>
                    加载中...
                </div>
            }>
                {isClient && (
                    <Slider {...carouselSettings}>
                        {images.map((img, i) => (
                            <div key={i} style={{ textAlign: 'center', maxWidth: '100%' }}>
                                <img
                                    src={`${base}img/${img.filename}`}
                                    alt={img.title || ''}
                                    loading={i === 0 ? "eager" : "lazy"}
                                    fetchPriority={i === 0 ? "high" : "auto"}
                                    style={{
                                        width: '100%',
                                        maxWidth: '100%',
                                        aspectRatio: '16 / 9',
                                        minHeight: '150px',
                                        objectFit: 'cover',
                                        display: 'block',
                                        backgroundColor: 'var(--ifm-color-emphasis-100)'
                                    }}
                                />
                                <p style={{ marginTop: 8, marginBottom: 8, fontSize: 14, color: 'var(--ifm-text-color)' }}>
                                    {img.title}
                                </p>
                            </div>
                        ))}
                    </Slider>
                )}
            </Suspense>
        </div>
    );
}
