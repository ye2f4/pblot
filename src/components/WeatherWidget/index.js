import React, { useState, useEffect, memo, useCallback, useMemo } from 'react';
import { useHistory } from '@docusaurus/router';
import { supabase } from '@site/src/supabase/supabaseClient';
import styles from './styles.module.css';

const CACHE_TTL = 600000;
const LOCATION_STORAGE_KEY = 'weather_selected_location';
const getCacheKey = (locCode) => `blog_weather_cache_${locCode}`;

const ITEMS_PER_PAGE = 5;

// WMO 天气代码 -> 图标（区分昼夜）+ 动画
const weatherMeta = {
  0: { icon: '☀️', nightIcon: '🌙', anim: 'iconPulse' },
  1: { icon: '🌤️', nightIcon: '🌙', anim: 'iconFloat' },
  2: { icon: '⛅', nightIcon: '☁️', anim: 'iconFloat' },
  3: { icon: '☁️', nightIcon: '☁️', anim: 'iconFloat' },
  45: { icon: '🌫️', nightIcon: '🌫️', anim: 'iconFade' },
  48: { icon: '🌫️', nightIcon: '🌫️', anim: 'iconFade' },
  51: { icon: '🌦️', nightIcon: '🌦️', anim: 'iconDrop' },
  53: { icon: '🌦️', nightIcon: '🌦️', anim: 'iconDrop' },
  55: { icon: '🌦️', nightIcon: '🌦️', anim: 'iconDrop' },
  56: { icon: '🌧️', nightIcon: '🌧️', anim: 'iconDrop' },
  57: { icon: '🌧️', nightIcon: '🌧️', anim: 'iconDrop' },
  61: { icon: '🌧️', nightIcon: '🌧️', anim: 'iconDrop' },
  63: { icon: '🌧️', nightIcon: '🌧️', anim: 'iconDrop' },
  65: { icon: '🌧️', nightIcon: '🌧️', anim: 'iconDrop' },
  66: { icon: '🌧️', nightIcon: '🌧️', anim: 'iconDrop' },
  67: { icon: '🌧️', nightIcon: '🌧️', anim: 'iconDrop' },
  71: { icon: '🌨️', nightIcon: '🌨️', anim: 'iconSpin' },
  73: { icon: '🌨️', nightIcon: '🌨️', anim: 'iconSpin' },
  75: { icon: '❄️', nightIcon: '❄️', anim: 'iconSpin' },
  77: { icon: '🌨️', nightIcon: '🌨️', anim: 'iconSpin' },
  80: { icon: '🌦️', nightIcon: '🌦️', anim: 'iconDrop' },
  81: { icon: '🌦️', nightIcon: '🌦️', anim: 'iconDrop' },
  82: { icon: '⛈️', nightIcon: '⛈️', anim: 'iconDrop' },
  85: { icon: '🌨️', nightIcon: '🌨️', anim: 'iconSpin' },
  86: { icon: '❄️', nightIcon: '❄️', anim: 'iconSpin' },
  95: { icon: '⛈️', nightIcon: '⛈️', anim: 'iconFlash' },
  96: { icon: '⛈️', nightIcon: '⛈️', anim: 'iconFlash' },
  99: { icon: '⛈️', nightIcon: '⛈️', anim: 'iconFlash' },
  default: { icon: '🌤️', nightIcon: '🌙', anim: 'iconFloat' },
};

const getWeatherMeta = (code, isDay) => {
  const meta = weatherMeta[code] || weatherMeta.default;
  return { icon: isDay ? meta.icon : meta.nightIcon, anim: meta.anim };
};

const StarField = memo(() => {
  const stars = useMemo(
    () =>
      Array.from({ length: 22 }, () => ({
        top: Math.random() * 100,
        left: Math.random() * 100,
        size: Math.random() * 1.5 + 1,
        delay: Math.random() * 3,
        dur: Math.random() * 2 + 2,
      })),
    []
  );
  return (
    <div className={styles.stars}>
      {stars.map((s, i) => (
        <span
          key={i}
          className={styles.star}
          style={{
            top: `${s.top}%`,
            left: `${s.left}%`,
            width: `${s.size}px`,
            height: `${s.size}px`,
            animationDelay: `${s.delay}s`,
            animationDuration: `${s.dur}s`,
          }}
        />
      ))}
    </div>
  );
});

const WeatherWidget = memo(() => {
  const history = useHistory();
  const [weatherData, setWeatherData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState('');
  const [activeTab, setActiveTab] = useState('hourly');
  const [page, setPage] = useState(0);

  const [activeLocation, setActiveLocation] = useState(() => {
    const saved = localStorage.getItem(LOCATION_STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
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
      const params = new URLSearchParams({
        latitude: loc.lat,
        longitude: loc.lon,
        current: 'temperature_2m,relative_humidity_2m,weather_code,is_day',
        hourly: 'temperature_2m,precipitation_probability,weather_code,is_day',
        daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max',
        timezone: 'auto',
        forecast_days: '7',
      });
      const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`, {
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) throw new Error('气象接口请求失败');
      const data = await res.json();
      if (!data?.current) throw new Error('气象数据为空');
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
  const goFullForecast = () => history.push('/locations');

  useEffect(() => {
    const cached = readLocalCache(activeLocation.code);
    if (cached) {
      setWeatherData(cached);
      setLoading(false);
    } else {
      fetchWeatherApi(activeLocation);
    }
    const refreshTimer = setInterval(() => fetchWeatherApi(activeLocation), CACHE_TTL);
    return () => clearInterval(refreshTimer);
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
          } catch (e) {}
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [activeLocation, fetchWeatherApi]);

  useEffect(() => {
    setPage(0);
  }, [activeTab, activeLocation]);

  // 计算当前小时在 hourly 数组中的起始下标
  const hourlyItems = useMemo(() => {
    if (!weatherData?.hourly?.time) return [];
    const times = weatherData.hourly.time;
    const nowIso = new Date().toISOString().slice(0, 13);
    let start = times.findIndex((t) => t.slice(0, 13) >= nowIso);
    if (start < 0) start = 0;
    const slice = times.slice(start, start + 24);
    return slice.map((t, idx) => {
      const realIdx = start + idx;
      const date = new Date(t);
      const isDay = weatherData.hourly.is_day[realIdx] === 1;
      const meta = getWeatherMeta(weatherData.hourly.weather_code[realIdx], isDay);
      const label = date.getHours() === 0 ? `${date.getMonth() + 1}/${date.getDate()}` : `${date.getHours()}:00`;
      return {
        key: t,
        timeLabel: idx === 0 ? '现在' : label,
        icon: meta.icon,
        anim: meta.anim,
        temp: Math.round(weatherData.hourly.temperature_2m[realIdx]),
        precip: weatherData.hourly.precipitation_probability?.[realIdx] ?? 0,
      };
    });
  }, [weatherData]);

  const dailyItems = useMemo(() => {
    if (!weatherData?.daily?.time) return [];
    const week = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    return weatherData.daily.time.slice(0, 7).map((t, idx) => {
      const date = new Date(t);
      const meta = getWeatherMeta(weatherData.daily.weather_code[idx], true);
      return {
        key: t,
        timeLabel: idx === 0 ? '今天' : week[date.getDay()],
        icon: meta.icon,
        anim: meta.anim,
        tempMax: Math.round(weatherData.daily.temperature_2m_max[idx]),
        tempMin: Math.round(weatherData.daily.temperature_2m_min[idx]),
        precip: weatherData.daily.precipitation_probability_max?.[idx] ?? 0,
      };
    });
  }, [weatherData]);

  const activeItems = activeTab === 'hourly' ? hourlyItems : dailyItems;
  const totalPages = Math.max(1, Math.ceil(activeItems.length / ITEMS_PER_PAGE));
  const pagedItems = activeItems.slice(page * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE + ITEMS_PER_PAGE);

  const currentMeta = weatherData?.current
    ? getWeatherMeta(weatherData.current.weather_code, weatherData.current.is_day === 1)
    : { icon: '🌤️', anim: 'iconFloat' };

  return (
    <div className={styles.weatherCard}>
      <StarField />

      <div className={styles.header}>
        <button className={styles.locationBtn} onClick={goLocationPage}>
          <span className={styles.locationIcon}>📍</span>
          <span>{activeLocation.name}</span>
          <span className={styles.chevron}>▾</span>
        </button>
        <button className={styles.menuBtn} onClick={goLocationPage} title="切换位置">
          ⋯
        </button>
      </div>

      {loading && (
        <div className={styles.loadingBox}>
          <span className={`${styles.loadingIcon} ${styles.iconFloat}`}>🌤️</span>
          <p className={styles.loadingText}>加载天气...</p>
        </div>
      )}

      {errorText && !loading && (
        <div className={styles.errorBox}>
          <span className={styles.errorIcon}>⚠️</span>
          <p className={styles.errorText}>{errorText}</p>
        </div>
      )}

      {weatherData && !loading && !errorText && (
        <>
          <div className={styles.currentRow}>
            <div className={styles.tempBox}>
              <span
                className={styles.weatherIcon}
                style={{ animation: `${currentMeta.anim} 2.8s ease-in-out infinite` }}
              >
                {currentMeta.icon}
              </span>
              <div className={styles.bigTemp}>
                {Math.round(weatherData.current.temperature_2m)}
                <span className={styles.tempUnit}>℃</span>
              </div>
            </div>
            <div className={styles.humidity}>
              <span className={styles.dropIcon}>💧</span>
              {weatherData.current.relative_humidity_2m}% 湿度
            </div>
          </div>

          <div className={styles.tabs}>
            <button
              className={`${styles.tab} ${activeTab === 'hourly' ? styles.tabActive : ''}`}
              onClick={() => setActiveTab('hourly')}
            >
              逐小时
            </button>
            <button
              className={`${styles.tab} ${activeTab === 'daily' ? styles.tabActive : ''}`}
              onClick={() => setActiveTab('daily')}
            >
              逐日
            </button>
          </div>

          <div className={styles.forecastTrack}>
            {pagedItems.map((item) => (
              <div key={item.key} className={styles.forecastItem}>
                <span className={styles.forecastTime}>{item.timeLabel}</span>
                <span
                  className={styles.forecastIcon}
                  style={{ animation: `${item.anim} 2.8s ease-in-out infinite` }}
                >
                  {item.icon}
                </span>
                {activeTab === 'hourly' ? (
                  <>
                    <span className={styles.forecastTemp}>{item.temp}°</span>
                    <span className={styles.forecastPrecip}>🌧 {item.precip}%</span>
                  </>
                ) : (
                  <>
                    <span className={styles.forecastTemp}>{item.tempMax}°</span>
                    <span className={styles.forecastPrecip}>↓{item.tempMin}°</span>
                  </>
                )}
              </div>
            ))}
          </div>

          <div className={styles.footer}>
            <div className={styles.dots}>
              {Array.from({ length: totalPages }, (_, i) => (
                <span
                  key={i}
                  className={`${styles.dot} ${i === page ? styles.dotActive : ''}`}
                  onClick={() => setPage(i)}
                  style={{ cursor: totalPages > 1 ? 'pointer' : 'default' }}
                />
              ))}
            </div>
            <button className={styles.moreBtn} onClick={goFullForecast}>
              查看完整预报 ›
            </button>
          </div>
        </>
      )}
    </div>
  );
});

export default WeatherWidget;
