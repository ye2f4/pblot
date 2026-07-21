<<<<<<< HEAD
// 音乐播放状态共享：让首页公告栏（MainContentTop）与音乐挂件（TopBanner）联动。
// TopBanner 作为发布方写入播放状态/歌词，MainContentTop 作为订阅方读取。
import React, { createContext, useContext, useState, useMemo } from 'react';

export const MusicContext = createContext(null);

export function MusicProvider({ children }) {
  // 共享给公告栏的播放状态
  const [share, setShare] = useState({
    isPlaying: false, // 是否正在播放
    currentSong: null, // 当前歌曲 { title, artist, ... }
    lyrics: null, // 歌词数组 [{ t, text }]
    activeLyric: -1, // 当前高亮歌词行索引
  });

  const value = useMemo(() => ({ share, setShare }), [share]);

  return <MusicContext.Provider value={value}>{children}</MusicContext.Provider>;
}

// 订阅方（如 MainContentTop）使用：const { share } = useMusic();
// 发布方（如 TopBanner）使用：const { setShare } = useMusic();
export function useMusic() {
  const ctx = useContext(MusicContext);
  if (!ctx) {
    // 未包裹 Provider 时给出安全兜底，避免崩溃
    return { share: { isPlaying: false, currentSong: null, lyrics: null, activeLyric: -1 }, setShare: () => {} };
  }
  return ctx;
}
=======
// 音乐播放状态共享：让首页公告栏（MainContentTop）与音乐挂件（TopBanner）联动。
// TopBanner 作为发布方写入播放状态/歌词，MainContentTop 作为订阅方读取。
import React, { createContext, useContext, useState, useMemo } from 'react';

export const MusicContext = createContext(null);

export function MusicProvider({ children }) {
  // 共享给公告栏的播放状态
  const [share, setShare] = useState({
    isPlaying: false, // 是否正在播放
    currentSong: null, // 当前歌曲 { title, artist, ... }
    lyrics: null, // 歌词数组 [{ t, text }]
    activeLyric: -1, // 当前高亮歌词行索引
  });

  const value = useMemo(() => ({ share, setShare }), [share]);

  return <MusicContext.Provider value={value}>{children}</MusicContext.Provider>;
}

// 订阅方（如 MainContentTop）使用：const { share } = useMusic();
// 发布方（如 TopBanner）使用：const { setShare } = useMusic();
export function useMusic() {
  const ctx = useContext(MusicContext);
  if (!ctx) {
    // 未包裹 Provider 时给出安全兜底，避免崩溃
    return { share: { isPlaying: false, currentSong: null, lyrics: null, activeLyric: -1 }, setShare: () => {} };
  }
  return ctx;
}
>>>>>>> 54107eca (deploy: /app 改动推上线（SiteHeader 移动端侧栏关闭、ui.css 导航高度，及新页面）)
