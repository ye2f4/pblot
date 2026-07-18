import React, { lazy, Suspense, useState, useEffect, useMemo } from 'react';
// 混合策略：react-slick 保持懒加载以降低 TBT（主 bundle），
// 但首帧立即渲染静态 <img> 作为 LCP 元素，不用等 JS chunk 加载。
const Slider = lazy(() => import('react-slick'));
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';
import siteData from '../../data/siteData.json';
import Link from '@docusaurus/Link';
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

// 图片占位骨架，减少 CLS
const ImagePlaceholder = () => (
    <div style={{
        width: '100%', aspectRatio: '16 / 9', minHeight: 150,
        background: 'var(--ifm-color-emphasis-100)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--ifm-color-emphasis-400)', fontSize: 14,
    }}>
        加载中...
    </div>
);

// 首帧静态图片：在 react-slick chunk 加载前立即渲染，作为 LCP 候选元素。
// 一旦 Slider 加载完成，此图自动隐藏。
function StaticFirstSlide({ img, base, firstImgUrl }) {
    return (
        <div style={{ textAlign: 'center', maxWidth: '100%' }}>
            <img
                src={firstImgUrl}
                alt={img.title || ''}
                loading="eager"
                fetchPriority="high"
                width={800}
                height={450}
                style={{
                    width: '100%', maxWidth: '100%',
                    aspectRatio: '16 / 9', minHeight: '150px',
                    objectFit: 'cover', display: 'block',
                    backgroundColor: 'var(--ifm-color-emphasis-100)',
                }}
            />
            {img.title ? (
                <p style={{ marginTop: 8, marginBottom: 8, fontSize: 14, color: 'var(--ifm-text-color)' }}>
                    {img.title}
                </p>
            ) : null}
        </div>
    );
}

// 轮播 placeholder：Slider 加载期间的骨架
const SliderFallback = () => <ImagePlaceholder />;

export default function CarouselSection({ base, isClient }) {
    const carouselCfg = siteData.carouselConfig || {};
    const [sliderReady, setSliderReady] = useState(false);

    // Slider 加载完成后标记 ready，切换显示
    useEffect(() => {
        // 在下一个微任务标记，确保 Slider 已挂载
        const id = requestAnimationFrame(() => setSliderReady(true));
        return () => cancelAnimationFrame(id);
    }, []);

    const carouselSettings = useMemo(() => ({
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
    }), [carouselCfg.dots, carouselCfg.infinite, carouselCfg.speed, carouselCfg.autoplaySpeed, carouselCfg.pauseOnHover, carouselCfg.fade]);

    const images = useMemo(() =>
        (siteData.carouselImages && siteData.carouselImages.length > 0)
            ? siteData.carouselImages
            : [{ filename: '0.webp', title: '' }, { filename: '1.webp', title: '' }],
    []);

    const firstImg = images[0] || { filename: '0.webp', title: '' };
    const firstImgUrl = `${base}img/${firstImg.filename}`;

    if (!isClient) {
        return (
            <div className={styles.carouselWrap} style={{
                backgroundColor: 'var(--ifm-card-background-color)',
                padding: 0, borderRadius: 8,
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                width: '100%', maxWidth: '100%',
                overflow: 'hidden', marginBottom: 20,
            }}>
                <StaticFirstSlide img={firstImg} base={base} firstImgUrl={firstImgUrl} />
            </div>
        );
    }

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
            {/* 静态首图：始终渲染以保证 LCP，sliderReady 后隐藏 */}
            <div style={{ display: sliderReady ? 'none' : 'block' }}>
                <StaticFirstSlide img={firstImg} base={base} firstImgUrl={firstImgUrl} />
            </div>

            {/* 完整轮播：懒加载，ready 后才显示 */}
            <div style={{ display: sliderReady ? 'block' : 'none' }}>
                <Suspense fallback={<SliderFallback />}>
                    <Slider {...carouselSettings}>
                        {images.map((img, i) => {
                            const imgUrl = `${base}img/${img.filename}`;
                            const slideContent = (
                                <div style={{ textAlign: 'center', maxWidth: '100%' }}>
                                    <img
                                        src={imgUrl}
                                        alt={img.title || ''}
                                        loading={i === 0 ? "eager" : "lazy"}
                                        fetchPriority={i === 0 ? "high" : "auto"}
                                        width={800}
                                        height={450}
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
                            );
                            if (img.link) {
                                return (
                                    <Link key={i} to={img.link} style={{ textDecoration: 'none', display: 'block' }}>
                                        {slideContent}
                                    </Link>
                                );
                            }
                            return <div key={i}>{slideContent}</div>;
                        })}
                    </Slider>
                </Suspense>
            </div>
        </div>
    );
}
