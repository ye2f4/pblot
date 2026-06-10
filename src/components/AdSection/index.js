import React from 'react';

export default function AdSection({ ads, base }) {
  if (!ads || ads.length === 0) return null;

  return (
    <>
      {ads.map((ad, i) => (
        <div
          key={i}
          style={{
            marginBottom: '15px',
            width: 'auto',
            height: 'auto',
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
                width: 'auto',
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
