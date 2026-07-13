import React from 'react';

export default function AdSection({ ads, base }) {
  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;

  if (!ads || ads.length === 0) return null;

  return (
    <>
      {ads.map((ad, i) => (
        <div
          key={i}
          style={{
            marginBottom: isMobile ? '8px' : '15px',
            width: '100%',
            boxSizing: 'border-box',
            overflow: 'hidden',
          }}
        >
          <a 
            href={ad.link}
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: 'block' }}
          >
            <img
              src={`${base}img/${ad.filename}`}
              alt={`广告 ${i + 1}`}
              loading="lazy"
              style={{
                display: 'block',
                width: '100%',
                height: 'auto',
                maxWidth: '100%',
                borderRadius: 6,
                transition: 'transform 0.2s ease',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.02)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
              }}
            />
          </a>
        </div>
      ))}
    </>
  );
}
