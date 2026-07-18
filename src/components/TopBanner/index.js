import React, { useState, useEffect, useRef } from 'react';
import Link from '@docusaurus/Link';
import articlesData from '../../data/articles.json';
import styles from '../../pages/index.module.css';
import { supabase, AVATAR_CACHE_EXPIRE } from '../../supabase/supabaseClient';
import { isBrowser } from '../../utils/env';
import { storage } from '../../utils/storage';
import MiddleStatsCard from '../MiddleStatsCard';
import { triggerGlobalProfileRefresh, AVATAR_CACHE_KEY } from '../../utils/globalProfileUtil';

// 登录主题色配置
const loginTheme = {
  primaryBg: '#509feb', primaryHoverBg: '#3e8cd8',
  bilibiliBg: '#fa78a0', githubBg: '#272b30', githubHoverBg: '#373c42',
  logoutBg: '#f53f3f', logoutHoverBg: '#d32f2f',
};

// 优先读取数据库 nickname，兜底授权信息
const getUserName = (user = null, nickName = '') => {
  if (nickName && nickName.trim()) return nickName.trim();
  if (!user || !user.user_metadata) return "用户";
  return (
    user.user_metadata.full_name ||
    user.user_metadata.preferred_username ||
    user.raw_user_meta_data?.name ||
    user.email ||
    "用户"
  );
};

// 头像渲染函数
const renderUserAvatar = (avatarEmoji) => {
  if (!avatarEmoji) {
    return (
      <div style={{
        width: 36, height: 36, borderRadius: '50%',
        background: 'linear-gradient(135deg, #e8f4ff, #d1eaff)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 18, boxShadow: '0 2px 6px rgba(0,0,0,0.1)'
      }}>
        😊
      </div>
    );
  }
  if (avatarEmoji.startsWith('http')) {
    return (
      <img
        src={avatarEmoji}
        alt="头像"
        style={{
          width: 36, height: 36, borderRadius: '50%',
          objectFit: 'cover', boxShadow: '0 2px 6px rgba(0,0,0,0.1)'
        }}
        onError={(e) => e.target.style.display = 'none'}
      />
    );
  }
  return (
    <div style={{
      width: 36, height: 36, borderRadius: '50%',
      background: 'linear-gradient(135deg, #e8f4ff, #d1eaff)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 18, boxShadow: '0 2px 6px rgba(0,0,0,0.1)'
    }}>
      {avatarEmoji}
    </div>
  );
};

// ── 工具函数（源自 XinghuisamaBlogs 音乐播放器主题）──
const fmtTime = (t) => {
  if (!t || isNaN(t)) return '00:00';
  const m = Math.floor(t / 60).toString().padStart(2, '0');
  const s = Math.floor(t % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
};

const DEFAULT_COVER =
  "data:image/svg+xml;utf8," + encodeURIComponent(
    "<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'>" +
    "<defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>" +
    "<stop offset='0' stop-color='#818cf8'/><stop offset='1' stop-color='#6366f1'/>" +
    "</linearGradient></defs><rect width='120' height='120' fill='url(#g)'/>" +
    "<text x='50%' y='56%' font-size='56' text-anchor='middle' dominant-baseline='middle' fill='#fff'>♪</text></svg>"
  );

// 音乐挂件（XinghuisamaBlogs 主题）：毛玻璃卡片 + 旋转唱片 + 进度控制
// 两种数据源：
//  - local   ：本地 MP3 列表（文件放 static/music/，配 music.mp3List）
//  - netease ：网易云直链（用 api.injahow.cn/meting 取 mp3 直链，可配 music.songIds 或 music.playlistId）
function MusicWidget({ siteData, base = '' }) {
  const music = siteData?.music || {};
  const title = music.title || '🎵 背景音乐';
  const mode = music.mode || (music.playlistId ? 'netease' : 'local');
  const autoplay = !!music.autoplay;

  const [playlist, setPlaylist] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [status, setStatus] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const audioRef = useRef(null);

  // 构建播放列表
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    if (mode === 'netease') {
      const idsRaw = music.songIds;
      const ids = Array.isArray(idsRaw)
        ? idsRaw
        : (typeof idsRaw === 'string' && idsRaw.trim() ? idsRaw.split(/[\n,，]/).map((s) => s.trim()).filter(Boolean) : []);
      const pid = String(music.playlistId || '').trim();
      const build = (songs) => (songs || [])
        .filter(Boolean)
        .map((s) => ({
          title: s.name || '未知歌曲',
          artist: s.artist || '未知歌手',
          cover: s.cover || s.pic || DEFAULT_COVER,
          src: s.url,
        }))
        .filter((s) => s.src);

      const run = async () => {
        try {
          let list = [];
          if (ids.length) {
            const res = await Promise.all(ids.map((id) =>
              fetch(`https://api.injahow.cn/meting/?server=netease&type=song&id=${id}`).then((r) => r.json()).catch(() => null)
            ));
            list = build(res.filter((r) => r && r.length).map((r) => r[0]));
          } else if (pid) {
            const res = await fetch(`https://api.injahow.cn/meting/?server=netease&type=playlist&id=${pid}`).then((r) => r.json()).catch(() => null);
            list = build(res);
          }
          if (!isMounted) return;
          if (list.length) setPlaylist(list);
          else setStatus('音乐流被拦截，可能是版权限制');
          setIsLoading(false);
        } catch (e) {
          if (isMounted) { setStatus('云端连接失败，请检查网络'); setIsLoading(false); }
        }
      };
      run();
    } else {
      const list = (Array.isArray(music.mp3List) ? music.mp3List : [])
        .filter(Boolean)
        .map((f) => {
          const isObj = f && typeof f === 'object';
          const file = isObj ? String(f.file || '') : String(f);
          const name = file.replace(/^\/+/, '').replace(/\.[^.]+$/, '');
          return {
            title: (isObj && f.title) || name || '本地音乐',
            artist: (isObj && f.artist) || '本地音乐',
            cover: (isObj && f.cover) || DEFAULT_COVER,
            src: (base || '') + 'music/' + encodeURIComponent(file.replace(/^\/+/, '')),
          };
        })
        .filter((s) => s.src);
      if (!isMounted) return;
      setPlaylist(list);
      setIsLoading(false);
      if (!list.length) setStatus('请配置 music.mp3List');
    }
    return () => { isMounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, JSON.stringify(music.songIds || []), music.playlistId, JSON.stringify(music.mp3List || []), base]);

  // 切歌时若处于播放态则继续播放
  useEffect(() => {
    if (playlist.length === 0) return;
    if (isPlaying && audioRef.current) {
      audioRef.current.play().catch(() => setIsPlaying(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, playlist]);

  const togglePlay = () => {
    const a = audioRef.current;
    if (!a) return;
    if (isPlaying) a.pause(); else a.play().catch(() => setIsPlaying(false));
    setIsPlaying(!isPlaying);
  };
  const nextSong = () => setCurrentIndex((p) => (p + 1) % playlist.length);
  const prevSong = () => setCurrentIndex((p) => (p - 1 + playlist.length) % playlist.length);
  const handleTimeUpdate = () => {
    const a = audioRef.current;
    if (!a) return;
    const { currentTime, duration } = a;
    setCurrentTime(currentTime);
    setDuration(duration || 0);
    setProgress((currentTime / (duration || 1)) * 100);
  };
  const handleSeek = (e) => {
    const np = Number(e.target.value);
    setProgress(np);
    const a = audioRef.current;
    if (a && a.duration) { a.currentTime = (np / 100) * a.duration; setCurrentTime(a.currentTime); }
  };

  if (isLoading) {
    return (
      <div className="rounded-3xl bg-white/40 dark:bg-slate-800/50 backdrop-blur-md border border-white/40 dark:border-white/10 shadow-xl p-4 flex flex-col items-center justify-center transition-colors duration-700 min-h-[150px]">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-3"></div>
        <span className="text-slate-800 dark:text-white font-bold tracking-widest animate-pulse text-sm">{title} · CONNECTING...</span>
      </div>
    );
  }
  if (playlist.length === 0) {
    return (
      <div className="rounded-3xl bg-white/40 dark:bg-slate-800/50 backdrop-blur-md border border-white/40 dark:border-white/10 shadow-xl p-4 flex flex-col items-center justify-center min-h-[150px] transition-colors duration-700">
        <span className="text-slate-600 dark:text-slate-300 font-bold mb-2">{status}</span>
      </div>
    );
  }

  const currentSong = playlist[currentIndex];

  return (
    <>
      <style>{`
        .xb-range::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 12px; height: 12px; border-radius: 50%; background: #6366f1; cursor: pointer; transition: transform 0.1s; }
        .xb-range::-webkit-slider-thumb:hover { transform: scale(1.3); }
      `}</style>

      <div className="rounded-3xl bg-white/40 dark:bg-slate-800/50 backdrop-blur-md border border-white/40 dark:border-white/10 shadow-xl p-4 flex flex-col justify-between transition-all duration-700 relative group overflow-hidden min-h-[150px] min-w-0">
        <audio
          ref={audioRef}
          src={currentSong.src}
          onTimeUpdate={handleTimeUpdate}
          onEnded={nextSong}
          onLoadedMetadata={handleTimeUpdate}
          autoPlay={autoplay}
        />

        <div className="flex items-center gap-3 relative z-10 mb-3 mt-1">
          <div className={`w-12 h-12 rounded-full border-2 border-white/50 shadow-lg flex-shrink-0 overflow-hidden relative ${isPlaying ? 'animate-[spin_6s_linear_infinite]' : ''}`}>
            <img src={currentSong.cover} alt="cover" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/10"></div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-white/80 backdrop-blur-sm rounded-full border border-gray-300 shadow-inner"></div>
          </div>
          <div className="flex-col overflow-hidden w-full">
            <div className="flex items-center justify-between mb-1 min-w-0 gap-1">
              <span className="text-[10px] font-black text-indigo-500 dark:text-indigo-400 tracking-widest uppercase bg-white/50 dark:bg-slate-900/50 px-2 py-0.5 rounded-sm shadow-sm transition-colors duration-700">{mode === 'netease' ? 'Cloud Music' : 'Local Music'}</span>
              <span className="text-xs font-bold text-slate-600 dark:text-slate-300 bg-white/40 dark:bg-slate-700/50 px-2 rounded-full transition-colors duration-700">{currentIndex + 1} / {playlist.length}</span>
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white truncate drop-shadow-sm transition-colors duration-700">{currentSong.title}</h3>
            <p className="text-sm text-slate-700 dark:text-slate-300 font-medium truncate drop-shadow-sm transition-colors duration-700">{currentSong.artist}</p>
          </div>
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-300 font-bold mb-2 transition-colors duration-700">
            <span className="w-10 text-right">{fmtTime(currentTime)}</span>
            <input
              type="range" min="0" max="100" value={progress} onChange={handleSeek}
              className="xb-range flex-1 min-w-0 h-1.5 bg-white/40 dark:bg-slate-700/50 rounded-full appearance-none outline-none cursor-pointer shadow-inner"
              style={{ background: `linear-gradient(to right, #818cf8 ${progress}%, rgba(255,255,255,0.2) ${progress}%)` }}
            />
            <span className="w-10">{fmtTime(duration)}</span>
          </div>

          <div className="flex items-center justify-center gap-4">
            <button onClick={prevSong} className="text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors drop-shadow-sm">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" /></svg>
            </button>
            <button onClick={togglePlay} className="w-10 h-10 bg-indigo-500 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-indigo-600 hover:scale-110 transition-all border-2 border-white/50 dark:border-slate-600">
              {isPlaying
                ? <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>
                : <svg className="w-5 h-5 ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>}
            </button>
            <button onClick={nextSong} className="text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors drop-shadow-sm">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" /></svg>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export default function TopBanner({
  siteData = {},
  base = '',
  user = null,
  loading = false,
  signOutLoading = false,
  isSessionChecked = false,
  userCount = 0,
  latestUser = '新用户',
  now = new Date(),
  handleGitHubLogin = () => { },
  handleSignOut = () => { },
  timeEpoch = Math.floor(Date.now() / 1000),
  locationName = "Beijing",
  timeZoneOffset = 0,
  timeZone = ""
}) {
  // 最新博客速览：取 articles.json 中 type==='blog' 的文章，按日期倒序取前 4 篇
  const blogList = (articlesData?.articles || [])
    .filter((a) => a.type === 'blog' && a.date)
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
    .slice(0, 4);
  const [avatarEmoji, setAvatarEmoji] = useState('');
  const [dbNickname, setDbNickname] = useState('');

  // 挂载全局刷新方法
  window.refreshUserProfile = async () => {
    await triggerGlobalProfileRefresh();
  };

  // 从数据库拉取最新头像、昵称
  const fetchUserProfileData = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('avatar_url,nickname')
        .eq('id', userId)
        .single();

      if (error) throw error;

      const avatar = data?.avatar_url || '';
      const nick = data?.nickname || '';
      setAvatarEmoji(avatar);
      setDbNickname(nick);

      // 写入本地缓存
      storage.set(AVATAR_CACHE_KEY, JSON.stringify({
        userId,
        avatar,
        nickname: nick,
        timestamp: Date.now()
      }));
    } catch (err) {
      console.warn("TopBanner 刷新资料失败：", err);
    }
  };

  // 初始化用户资料 + 全局监听
  useEffect(() => {
    if (!isBrowser || !user) {
      setAvatarEmoji('');
      setDbNickname('');
      return;
    }

    const userId = user.id;

    // 清理过期/不匹配缓存
    const cacheStr = storage.get(AVATAR_CACHE_KEY);
    if (cacheStr) {
      try {
        const cacheData = JSON.parse(cacheStr);
        if (!cacheData.nickname || cacheData.userId !== userId) {
          storage.remove(AVATAR_CACHE_KEY);
        }
      } catch (e) {
        storage.remove(AVATAR_CACHE_KEY);
      }
    }

    // 读取有效缓存
    const newCacheStr = storage.get(AVATAR_CACHE_KEY);
    let validCache = null;
    if (newCacheStr) {
      const cacheData = JSON.parse(newCacheStr);
      if (cacheData.userId === userId && Date.now() - cacheData.timestamp < AVATAR_CACHE_EXPIRE) {
        validCache = cacheData;
      }
    }

    if (validCache) {
      setAvatarEmoji(validCache.avatar || '');
      setDbNickname(validCache.nickname || '');
    } else {
      fetchUserProfileData(userId);
    }

    // 监听全局资料更新事件
    const onProfileUpdate = (ev) => {
      const data = ev.detail;
      if (data.id !== user.id) return;
      setAvatarEmoji(data.avatar_url);
      setDbNickname(data.nickname);

      // 同步更新缓存
      storage.set(AVATAR_CACHE_KEY, JSON.stringify({
        userId: user.id,
        avatar: data.avatar_url,
        nickname: data.nickname,
        timestamp: Date.now()
      }));
    };

    window.addEventListener('globalProfileUpdated', onProfileUpdate);

    return () => {
      window.removeEventListener('globalProfileUpdated', onProfileUpdate);
    };

  }, [user]);

  return (
    <section className={styles.topBannerWrap} style={{
      backgroundImage: `url(${base}img/bg_big.webp)`,
      padding: '24px',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      position: 'relative',
      borderRadius: '24px',
      margin: '16px auto',
      width: '100%',
      maxWidth: '1200px',
    }}>
      <div className={styles.bannerGrid}>
        <div style={{
          borderRadius: '18px',
          background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(248,249,250,0.9) 100%)',
          backdropFilter: 'blur(8px)',
          borderLeft: '5px solid #f4bc42',
          boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
          padding: '18px 22px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          minWidth: 0,
          overflow: 'hidden',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <span style={{ fontSize: 32, animation: 'pixelBounce 2s infinite' }}>📢</span>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#1a1a1a' }}>
              {siteData?.texts?.welcomeTitle || '欢迎来到Monoの小窝'}
            </h3>
          </div>
          <div>
            {siteData?.music?.playlistId || (Array.isArray(siteData?.music?.mp3List) && siteData?.music?.mp3List.length) ? (
              <MusicWidget siteData={siteData} base={base} />
            ) : siteData?.features?.showBlogPreview !== false ? (
              <>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#888', marginBottom: 4 }}>
                  📝 最新博客
                </div>
                {blogList.length > 0 ? (
                  blogList.map((p) => (
                    <Link
                      key={p.url}
                      to={p.url}
                      style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10,
                        fontSize: 13, color: '#333', padding: '5px 0', textDecoration: 'none',
                        borderBottom: '1px dashed #eee',
                      }}
                      onMouseOver={(e) => { e.currentTarget.style.color = '#509feb'; }}
                      onMouseOut={(e) => { e.currentTarget.style.color = '#333'; }}
                    >
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.title}</span>
                      <span style={{ color: '#999', flexShrink: 0, fontSize: 12 }}>{p.date}</span>
                    </Link>
                  ))
                ) : (
                  <div style={{ fontSize: 13, color: '#999', padding: '6px 0' }}>暂无博客文章</div>
                )}
                <div style={{ marginTop: 8 }}>
                  <Link
                    to="/blog/"
                    style={{ fontSize: 13, color: '#509feb', fontWeight: 600, textDecoration: 'none' }}
                  >
                    浏览全部博客 →
                  </Link>
                </div>
              </>
            ) : (
              <div style={{ fontSize: 13, color: '#666', padding: '6px 0', lineHeight: 1.6 }}>
                {siteData?.branding?.tagline || '欢迎来到本站，探索更多技术分享~'}
              </div>
            )}
          </div>
        </div>

        <MiddleStatsCard
          key={`${locationName}-${timeEpoch}-${dbNickname}-${avatarEmoji}`}
          timeEpoch={timeEpoch}
          locationName={locationName}
          timeZoneOffset={timeZoneOffset}
          timeZone={timeZone}
          siteData={siteData}
          isSessionChecked={isSessionChecked}
          userCount={userCount}
          latestUser={latestUser}
          now={now}
          currentNickname={dbNickname}
          currentAvatar={avatarEmoji}
          user={user}
          style={{
            animation: 'heatPulse 3.2s ease-in-out infinite'
          }}
        />

        <div style={{
          borderRadius: '18px',
          background: 'rgba(255,255,255,0.95)',
          backdropFilter: 'blur(8px)',
          boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
          padding: '20px 22px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          gap: 12,
          minWidth: 0,
          overflow: 'hidden',
        }}>
          {loading ? (
            <div style={{ textAlign: 'center', color: '#999' }}>加载中...</div>
          ) : !user ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ fontSize: 14, color: '#666' }}>
                {siteData?.texts?.visitorWelcome || '欢迎访客，登录解锁完整功能'}
              </div>

              {/* 登录、注册强制同一行，弹性均分 */}
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <Link
                  to="/login"
                  style={{
                    flex: 1, textAlign: 'center',
                    background: siteData?.loginTheme?.primaryBg || loginTheme.primaryBg,
                    color: '#fff', border: 'none',
                    padding: '11px 16px', borderRadius: '12px',
                    textDecoration: 'none', fontSize: 14, fontWeight: 500,
                    transition: 'all 0.25s ease',
                    boxShadow: '0 2px 8px rgba(80,159,235,0.22)'
                  }}
                  onMouseOver={(e) => { e.target.style.background = siteData?.loginTheme?.primaryHoverBg || loginTheme.primaryHoverBg; e.target.style.boxShadow = '0 4px 12px rgba(80,159,235,0.32)'; }}
                  onMouseOut={(e) => { e.target.style.background = siteData?.loginTheme?.primaryBg || loginTheme.primaryBg; e.target.style.boxShadow = '0 2px 8px rgba(80,159,235,0.22)'; }}
                >
                  {siteData?.texts?.buttons?.login || '立即登录'}
                </Link>

                <Link
                  to="/register"
                  style={{
                    flex: 1, textAlign: 'center',
                    background: siteData?.loginTheme?.primaryBg || loginTheme.primaryBg,
                    color: '#fff', border: 'none',
                    padding: '11px 16px', borderRadius: '12px',
                    textDecoration: 'none', fontSize: 14, fontWeight: 500,
                    transition: 'all 0.25s ease',
                    boxShadow: '0 2px 8px rgba(80,159,235,0.22)'
                  }}
                  onMouseOver={(e) => { e.target.style.background = siteData?.loginTheme?.primaryHoverBg || loginTheme.primaryHoverBg; e.target.style.boxShadow = '0 4px 12px rgba(80,159,235,0.32)'; }}
                  onMouseOut={(e) => { e.target.style.background = siteData?.loginTheme?.primaryBg || loginTheme.primaryBg; e.target.style.boxShadow = '0 2px 8px rgba(80,159,235,0.22)'; }}
                >
                  {siteData?.texts?.buttons?.register || '立即注册'}
                </Link>
              </div>

              {/* B站按钮 */}
              <button
                disabled
                style={{
                  width: '100%', border: 'none',
                  background: siteData?.loginTheme?.bilibiliBg || loginTheme.bilibiliBg,
                  color: '#fff', padding: '11px 16px',
                  borderRadius: '12px', fontSize: 14, fontWeight: 500,
                  cursor: 'not-allowed', opacity: 0.92,
                  transition: 'all 0.25s ease',
                  boxShadow: '0 2px 8px rgba(250,120,160,0.22)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
                }}
              >
                <span>📺</span>
                {siteData?.texts?.buttons?.bilibiliLogin || 'Bilibili 登录（开发中）'}
              </button>

              {/* GitHub登录 */}
              <button
                onClick={handleGitHubLogin}
                style={{
                  width: '100%', border: 'none',
                  background: siteData?.loginTheme?.githubBg || loginTheme.githubBg,
                  color: '#fff', padding: '11px 16px',
                  borderRadius: '12px', fontSize: 14, fontWeight: 500,
                  cursor: 'pointer', transition: 'all 0.25s ease',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.13)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
                }}
                onMouseOver={(e) => { e.target.style.background = siteData?.loginTheme?.githubHoverBg || loginTheme.githubHoverBg; e.target.style.boxShadow = '0 4px 12px rgba(0,0,0,0.20)'; }}
                onMouseOut={(e) => { e.target.style.background = siteData?.loginTheme?.githubBg || loginTheme.githubBg; e.target.style.boxShadow = '0 2px 8px rgba(0,0,0,0.13)'; }}
              >
                <span>🐱</span>
                {siteData?.texts?.buttons?.githubLogin || 'GitHub 登录'}
              </button>

            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: '#333' }}>
                {renderUserAvatar(avatarEmoji)}
                <span>{siteData?.texts?.welcomeBack || '👋 欢迎回来，'}<strong>{dbNickname || getUserName(user)}</strong></span>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <Link
                  to="/profile"
                  style={{
                    flex: 1,
                    minWidth: '100px',
                    textAlign: 'center',
                    border: '1px solid #ccc',
                    padding: '9px 0',
                    borderRadius: '10px',
                    fontSize: 13,
                    color: '#333',
                    textDecoration: 'none',
                    transition: '0.2s'
                  }}
                  onMouseOver={(e) => e.target.style.borderColor = '#509feb'}
                  onMouseOut={(e) => e.target.style.borderColor = '#ccc'}
                >
                  {siteData?.texts?.buttons?.profile || '个人中心'}
                </Link>
                <button
                  onClick={handleSignOut}
                  disabled={signOutLoading}
                  style={{
                    flex: 1,
                    minWidth: '100px',
                    border: 'none',
                    background: siteData?.loginTheme?.logoutBg || loginTheme.logoutBg,
                    color: '#fff',
                    padding: '9px 0',
                    borderRadius: '10px',
                    fontSize: 13,
                    cursor: signOutLoading ? 'not-allowed' : 'pointer',
                    transition: '0.2s'
                  }}
                  onMouseOver={(e) => { if (!signOutLoading) e.target.style.background = siteData?.loginTheme?.logoutHoverBg || loginTheme.logoutHoverBg; }}
                  onMouseOut={(e) => { if (!signOutLoading) e.target.style.background = siteData?.loginTheme?.logoutBg || loginTheme.logoutBg; }}
                >
                  {signOutLoading ? (siteData?.texts?.buttons?.loggingOut || '退出中') : (siteData?.texts?.buttons?.logout || '退出登录')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}