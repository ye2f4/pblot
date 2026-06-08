import React from 'react';

export default function AdSection({ ads, base }) {
    // 无广告时不渲染
    if (!ads || ads.length === 0) return null;

    return (
        <>
            {ads.map((ad, i) => (
                <div
                    key={i}
                    style={{
                        marginBottom: 15,
                        width: '100%',
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
        </>
    );
}