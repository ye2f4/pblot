import React, { useState, useEffect, memo, useCallback } from 'react';
import { useHistory } from '@docusaurus/router';
import { supabase } from '@site/src/supabase/supabaseClient';

const CACHE_TTL = 600000;
const LOCATION_STORAGE_KEY = 'weather_selected_location';
const getCacheKey = (locCode) => `blog_weather_cache_${locCode}`;

const weatherMeta = {
    sunny: { icon: '☀️', anim: 'iconPulse' },
    clear: { icon: '☀️', anim: 'iconPulse' },
    cloudy: { icon: '☁️', anim: 'iconFloat' },
    overcast: { icon: '☁️', anim: 'iconFloat' },
    rain: { icon: '🌧️', anim: 'iconDrop' },
    shower: { icon: '🌦️', anim: 'iconDrop' },
    thunder: { icon: '⛈️', anim: 'iconFlash' },
    snow: { icon: '❄️', anim: 'iconSpin' },
    fog: { icon: '🌫️', anim: 'iconFade' },
    default: { icon: '🌤️', anim: 'iconFloat' },
};

const RandomParticle = memo(() => {
    const [style, setStyle] = useState({});
    useEffect(() => {
        const size = Math.random() * 6 + 3;
        const left = Math.random() * 90 + 5;
        const delay = Math.random() * 4;
        const duration = Math.random() * 5 + 3;
        setStyle({
            position: 'absolute',
            left: `${left}%`,
            top: `${Math.random() * 80 + 10}%`,
            width: size,
            height: size,
            borderRadius: '50%',
            background: 'rgba(66,133,244,0.15)',
            animation: `particleFloat ${duration}s ease-in-out infinite`,
            animationDelay: `${delay}s`,
            pointerEvents: 'none',
        });
    }, []);
    return <div style={style} />;
});

const globalAnimStyle = `
@keyframes particleFloat {
  0% { transform: translateY(0) scale(1); opacity:0.2; }
  50% { transform: translateY(-10px) scale(1.15); opacity:0.45; }
  100% { transform: translateY(0) scale(1); opacity:0.2; }
}
@keyframes iconPulse {
  0%,100% { transform: scale(1); }
  50% { transform: scale(1.12); }
}
@keyframes iconFloat {
  0%,100% { transform: translateY(0); }
  50% { transform: translateY(-4px); }
}
@keyframes iconDrop {
  0%,100% { transform: translateY(0); }
  50% { transform: translateY(6px); }
}
@keyframes iconFlash {
  0%,100% { opacity:1; }
  50% { opacity:0.35; }
}
@keyframes iconSpin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
@keyframes iconFade {
  0%,100% { opacity:0.65; }
  50% { opacity:1; }
}
@keyframes boxFadeIn {
  from { opacity:0; transform: translateY(15px); }
  to { opacity:1; transform: translateY(0); }
}
`;

const WeatherWidget = memo(() => {
    const history = useHistory();
    const [weatherData, setWeatherData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [errorText, setErrorText] = useState('');
    const [visible, setVisible] = useState(false);
    const particleList = Array.from({ length: 4 }, (_, i) => i);

    const [activeLocation, setActiveLocation] = useState(() => {
        const saved = localStorage.getItem(LOCATION_STORAGE_KEY);
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (e) { }
        }
        return { lat: 39.9042, lon: 116.4074, name: '北京', code: 'beijing' };
    });

    const readLocalCache = (locCode) => {
        const cacheKey = getCacheKey(locCode);
        const cacheRaw = localStorage.getItem(cacheKey);
        if (!cacheRaw) return null;
        try {
            const cacheObj = JSON.parse(cacheRaw);
            if (Date.now() - cacheObj.cacheTime < CACHE_TTL) return cacheObj.data;
            localStorage.removeItem(cacheKey);
            return null;
        } catch (e) {
            localStorage.removeItem(cacheKey);
            return null;
        }
    };

    const fetchWeatherApi = useCallback(async (loc) => {
        setLoading(true);
        setErrorText('');
        const cacheKey = getCacheKey(loc.code);
        try {
            // 前端直调官方接口，完整参数拉全字段
            const params = new URLSearchParams({
                latitude: loc.lat,
                longitude: loc.lon,
                current: "temperature_2m",
                timezone: "auto"
            });
            const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`, {
                signal: AbortSignal.timeout(8000)
            });
            if (!res.ok) throw new Error('气象接口请求失败');
            const data = await res.json();
            console.log("直拿完整OM数据", data);
            if (!data?.current) throw new Error('气象数据为空');
            // WeatherWidget fetchWeatherApi 里存储不要改，现在读取端适配外层data即可
            localStorage.setItem(cacheKey, JSON.stringify({ data, cacheTime: Date.now() }));
            setWeatherData(data);
        } catch (err) {
            setErrorText(err.message || '天气加载异常');
            console.error('请求错误', err);
        } finally {
            setLoading(false);
        }
    }, []);

    const goLocationPage = () => history.push('/locations');

    useEffect(() => {
        const showTimer = setTimeout(() => setVisible(true), 60);
        const cached = readLocalCache(activeLocation.code);
        if (cached) {
            setWeatherData(cached);
            setLoading(false);
        } else {
            fetchWeatherApi(activeLocation);
        }
        const refreshTimer = setInterval(() => fetchWeatherApi(activeLocation), CACHE_TTL);
        return () => {
            clearTimeout(showTimer);
            clearInterval(refreshTimer);
        };
    }, [fetchWeatherApi, activeLocation]);

    useEffect(() => {
        const handleVisibility = () => {
            if (!document.hidden) {
                const saved = localStorage.getItem(LOCATION_STORAGE_KEY);
                if (saved) {
                    try {
                        const newLoc = JSON.parse(saved);
                        if (newLoc.code !== activeLocation.code) {
                            setActiveLocation(newLoc);
                            localStorage.removeItem(getCacheKey(activeLocation.code));
                            fetchWeatherApi(newLoc);
                        }
                    } catch (e) { }
                }
            }
        };
        document.addEventListener('visibilitychange', handleVisibility);
        return () => document.removeEventListener('visibilitychange', handleVisibility);
    }, [activeLocation, fetchWeatherApi]);

    const containerStyle = {
        position: 'relative',
        overflow: 'hidden',
        width: '100%',
        boxSizing: 'border-box',
        padding: '14px 16px',
        borderRadius: '18px',
        background: 'linear-gradient(135deg, rgba(66,133,244,0.06), rgba(100,160,255,0.12))',
        boxShadow: '0 3px 14px rgba(66,133,244,0.1)',
        animation: visible ? 'boxFadeIn 0.5s ease-out forwards' : 'none',
        opacity: 0,
        transform: 'translateY(15px)',
        transition: 'box-shadow 0.3s ease, transform 0.2s ease',
        fontFamily: 'system-ui, -apple-system, sans-serif',
    };

    const handleBoxHover = (e) => {
        e.currentTarget.style.boxShadow = '0 5px 18px rgba(66,133,244,0.16)';
        e.currentTarget.style.transform = 'translateY(-2px)';
    };
    const handleBoxLeave = (e) => {
        e.currentTarget.style.boxShadow = '0 3px 14px rgba(66,133,244,0.1)';
        e.currentTarget.style.transform = 'translateY(0)';
    };

    // Open-Meteo无实况文字，固定默认图标
    const getIconInfo = () => {
        return weatherMeta.default;
    };
    const { icon, anim } = getIconInfo();

    return (
        <>
            <style dangerouslySetInnerHTML={{ __html: globalAnimStyle }} />
            <div
                style={containerStyle}
                onMouseEnter={handleBoxHover}
                onMouseLeave={handleBoxLeave}
            >
                {particleList.map((id) => <RandomParticle key={id} />)}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 500, color: '#1ce306' }}>{activeLocation.name} · 实时气象</span>
                    <button
                        onClick={goLocationPage}
                        style={{
                            fontSize: '11px',
                            padding: '3px 8px',
                            borderRadius: '999px',
                            border: '1px solid rgba(66,133,244,0.25)',
                            background: 'rgba(66,133,244,0.08)',
                            color: '#0060fc',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                        }}
                        onMouseEnter={(e) => {
                            e.target.style.background = 'rgba(66,133,244,0.18)';
                            e.target.style.borderColor = 'rgba(66,133,244,0.4)';
                        }}
                        onMouseLeave={(e) => {
                            e.target.style.background = 'rgba(66,133,244,0.08)';
                            e.target.style.borderColor = 'rgba(66,133,244,0.25)';
                        }}
                    >
                        📍 切换位置
                    </button>
                </div>

                {loading && (
                    <div style={{ textAlign: 'center', padding: '16px 0' }}>
                        <span style={{ fontSize: '28px', display: 'inline-block', animation: 'iconFloat 2s ease-in-out infinite' }}>🌤️</span>
                        <p style={{ margin: '6px 0 0', color: 'var(--ifm-color-emphasis-600)', fontSize: '13px' }}>加载天气...</p>
                    </div>
                )}

                {errorText && !loading && (
                    <div style={{ textAlign: 'center', padding: '16px 0' }}>
                        <span style={{ fontSize: '28px', color: 'var(--ifm-color-danger)' }}>⚠️</span>
                        <p style={{ margin: '6px 0 0', color: 'var(--ifm-color-danger)', fontSize: '12px' }}>{errorText}</p>
                    </div>
                )}

                {weatherData && !loading && !errorText && (
                    <>
                        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <div>
                                <div style={{ fontSize: '36px', fontWeight: 700, color: 'var(--ifm-color-emphasis-900)', lineHeight: 1 }}>
                                    {weatherData.current.temperature_2m}<span style={{ fontSize: '16px', fontWeight: 400 }}>℃</span>
                                </div>
                            </div>
                            <span style={{
                                fontSize: '42px',
                                display: 'inline-block',
                                animation: `${anim} 2.8s ease-in-out infinite`,
                                filter: 'drop-shadow(0 2px 4px rgba(66,133,244,0.2))'
                            }}>{icon}</span>
                        </div>
                    </>
                )}
            </div>
        </>
    );
});

export default WeatherWidget;