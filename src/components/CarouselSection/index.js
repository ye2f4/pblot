import React, { lazy, Suspense } from 'react';
const Slider = lazy(() => import('react-slick'));
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';
import styles from '../../pages/index.module.css';

export default function CarouselSection({ siteData, base, isClient }) {
    const carouselSettings = {
        dots: false,
        infinite: true,
        speed: 300,
        slidesToShow: 1,
        slidesToScroll: 1,
        autoplay: true,
        autoplaySpeed: 6000,
        arrows: true,
        lazyLoad: false,
        pauseOnHover: true,
        fade: true,
        cssEase: 'ease-in-out',
        centerMode: false,
        centerPadding: '0px',
        prevArrow: (
            <button
                type="button"
                aria-label="上一张"
                style={{
                    position: 'absolute',
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
                aria-label="下一张"
                style={{
                    position: 'absolute',
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

    return (
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
            <Suspense fallback={
                <div style={{
                    height: 350,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#999',
                    backgroundImage: `url(${base}img/bar1.webp)`,
                    backgroundSize: 'contain',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat',
                }}>
                    加载中...
                </div>
            }>
                {isClient && (
                    <Slider {...carouselSettings}>
                        {siteData.carouselImages.map((img, i) => (
                            <div key={i} style={{ textAlign: 'center' }}>
                                <img
                                    src={`${base}img/${img.filename}`}
                                    alt={img.title}
                                    width="1200"
                                    height="350"
                                    loading={i === 0 ? "eager" : "lazy"}
                                    fetchPriority={i === 0 ? "high" : "auto"}
                                    style={{
                                        borderRadius: 0,
                                        maxHeight: 350,
                                        objectFit: 'contain',
                                        backgroundColor: '#f5f5f5'
                                    }}
                                />
                                <p style={{ marginTop: 8, marginBottom: 8, fontSize: 14 }}>
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
