// api/music-core.mjs
// 网易云音乐服务端代理核心逻辑：Vercel Edge 函数（api/music.js）与本地开发
// 服务（scripts/dev-api.mjs）共用，避免两份实现漂移。
// 使用 .mjs 显式 ESM，使本地 `node scripts/dev-api.mjs` 也能直接 import。

const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  Referer: 'https://music.163.com/',
};

export async function getSong(id) {
  try {
    const [detailRes, lrcRes] = await Promise.all([
      fetch(`https://music.163.com/api/song/detail/?id=${id}&ids=[${id}]`, {
        headers: HEADERS,
        signal: AbortSignal.timeout(6000),
      }),
      fetch(
        `https://music.163.com/api/song/lyric?id=${id}&lv=-1&kv=-1&tv=-1`,
        { headers: HEADERS, signal: AbortSignal.timeout(6000) }
      ).catch(() => null),
    ]);
    const detail = await detailRes.json();
    const song = detail.songs && detail.songs[0];
    if (!song) return { id, error: 'not_found' };
    let lrc = '';
    if (lrcRes && lrcRes.ok) {
      try {
        const d = await lrcRes.json();
        lrc = (d.lrc && d.lrc.lyric) || '';
      } catch (e) {
        /* ignore */
      }
    }
    return {
      id,
      name: song.name,
      artist:
        (song.artists && song.artists[0] && song.artists[0].name) || '未知歌手',
      cover: (song.album && song.album.picUrl) || '',
      url: `https://music.163.com/song/media/outer/url?id=${id}.mp3`,
      lrc,
    };
  } catch (e) {
    return { id, error: String(e) };
  }
}

export async function getPlaylistIds(pid) {
  const res = await fetch(`https://music.163.com/api/playlist/detail?id=${pid}`, {
    headers: HEADERS,
    signal: AbortSignal.timeout(8000),
  });
  const data = await res.json();
  const pl = data.playlist || {};
  return (pl.trackIds || []).map((t) => String(t.id)).filter(Boolean);
}

// 解析 ids/pid → 歌曲数组（最多 40 首）。无参数时抛出错误，由调用方转 400。
export async function fetchMusic({ ids = [], pid = '' } = {}) {
  let idList = [...ids];
  if (!idList.length && pid) {
    idList = await getPlaylistIds(pid);
  }
  if (!idList.length) {
    throw new Error('missing ids');
  }
  idList = idList.slice(0, 40); // 限制数量，避免 Functions 超时
  return Promise.all(idList.map(getSong));
}
