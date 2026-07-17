#!/usr/bin/env node
/**
 * download-music.mjs —— 下载网易云音乐到本地（官方直连优先，解析网关回退）
 *
 * 两种取音源方式：
 *   1) 官方 Linux API 直连（默认，推荐）
 *      - https://music.163.com/api/song/enhance/player/url?ids=[id]&br=320000
 *          返回完整音轨的真实 CDN 直链（实测 320kbps、整曲、非 30s 预览）
 *      - https://music.163.com/api/song/detail?ids=[id]      取歌名/歌手
 *      - https://music.163.com/api/playlist/detail?id=pid     取歌单曲目 id 列表
 *      - https://music.163.com/api/song/lyric?id=id          取 LRC 歌词
 *      注意：CDN 直链带时效(expi≈20min)与 Referer 校验，下载时必须带 Referer。
 *
 *   2) 第三方解析网关回退（官方被限流/无直链时）
 *      - api.injahow.cn/meting  （注意：该网关对部分歌曲只返回 30s 试听）
 *
 * 付费/VIP 曲：官方免费接口通常不返回整曲直链；默认自动跳过，避免下到 30s 试听。
 *              加 --include-paid 可强制尝试（走网关，仍可能只是试听）。
 *
 * 输出目录优先级：--out > 环境变量 MUSIC_OUT > download-music.config.json > 默认 ./static/music
 *
 * 用法：
 *   node scripts/download-music.mjs <歌曲ID或歌单ID> [选项]
 *
 * 选项：
 *   --playlist      把参数当作“歌单ID”，下载歌单内所有歌曲
 *   --list          仅列出歌曲（歌名/歌手/ID），不下载（常与 --playlist 配合查看歌单内容）
 *   --out <目录>    输出目录（命令行最高优先级）
 *   --br <码率>     音质码率，默认 320000（320kbps），可填 128000/192000/320000
 *   --no-lrc        不下载歌词
 *   --no-official   强制只用第三方解析网关
 *   --include-paid  不排除付费/VIP 曲（默认跳过，避免下载 30s 试听）
 *   -h, --help      显示帮助
 *
 * 示例：
 *   node scripts/download-music.mjs 1330348068
 *   node scripts/download-music.mjs 3778678 --playlist
 *   node scripts/download-music.mjs 3778678 --playlist --list      # 只看看歌单里有啥
 *   node scripts/download-music.mjs 1330348068 --out ./static/music --no-lrc
 *
 * 依赖：Node.js >= 18（自带全局 fetch）
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const OFF = 'https://music.163.com/api/';
const MET = 'https://api.injahow.cn/meting/';
const UA = 'Mozilla/5.0';
const REF = 'https://music.163.com/';

const HELP = `
网易云音乐下载工具（.mjs / 需 Node 18+）

用法:
  node download-music.mjs <歌曲ID|歌单ID> [选项]

默认走 music.163.com 官方直连（完整音轨）；官方不可用时回退到解析网关。
付费/VIP 曲默认自动跳过（避免下载 30s 试听），--include-paid 可强制尝试。

输出目录优先级：--out > 环境变量 MUSIC_OUT > download-music.config.json > 默认 ./static/music

选项:
  --playlist     把参数当“歌单ID”，下载歌单内全部歌曲
  --list         仅列出歌曲(歌名/歌手/ID)，不下载
  --out <dir>    输出目录（命令行最高优先级）
  --br <码率>    音质码率，默认 320000（可 128000/192000/320000）
  --no-lrc       不下载歌词
  --no-official  强制只用第三方解析网关
  --include-paid 不排除付费/VIP 曲（默认跳过，避免下载 30s 试听）
  -h, --help     显示本帮助

示例:
  node download-music.mjs 1330348068
  node download-music.mjs 3778678 --playlist
  node download-music.mjs 3778678 --playlist --list
`;

// 输出目录配置：--out > 环境变量 MUSIC_OUT > download-music.config.json > 默认 ./static/music
function loadOutDir() {
  let dir;
  try {
    const cf = path.resolve(process.cwd(), 'download-music.config.json');
    if (fs.existsSync(cf)) {
      const j = JSON.parse(fs.readFileSync(cf, 'utf8'));
      if (j && j.outDir) dir = path.resolve(j.outDir);
    }
  } catch (_) { /* 配置缺失或损坏则忽略 */ }
  if (process.env.MUSIC_OUT) dir = path.resolve(process.env.MUSIC_OUT);
  return dir;
}

const args = process.argv.slice(2);
if (args.length === 0 || args.includes('-h') || args.includes('--help')) {
  console.log(HELP);
  process.exit(args.length === 0 ? 1 : 0);
}

const builtinOut = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'static', 'music');
let id = '';
let isPlaylist = false;
let onlyList = false;
let outDir = loadOutDir() || builtinOut;
let withLrc = true;
let br = 320000;
let useOfficial = true;
let skipPaid = true;
let skippedCount = 0;

for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === '--playlist') isPlaylist = true;
  else if (a === '--list') onlyList = true;
  else if (a === '--out') outDir = path.resolve(args[++i] || '.');
  else if (a === '--br') br = parseInt(args[++i] || '320000', 10);
  else if (a === '--no-lrc') withLrc = false;
  else if (a === '--no-official') useOfficial = false;
  else if (a === '--include-paid') skipPaid = false;
  else if (!a.startsWith('--')) id = a;
}
if (!id) {
  console.error('缺少歌曲/歌单 ID');
  process.exit(1);
}

async function offFetch(sub, params, asJson = true) {
  const url = OFF + sub + (params ? '?' + new URLSearchParams(params).toString() : '');
  const res = await fetch(url, { headers: { 'User-Agent': UA, 'Referer': REF } });
  if (!res.ok) throw new Error('官方 HTTP ' + res.status + ' @ ' + sub);
  return asJson ? res.json() : res;
}

async function meting(params) {
  const url = MET + '?' + new URLSearchParams(params).toString();
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error('HTTP ' + res.status + ' for ' + url);
  return res;
}

function extractId(url) {
  const m = String(url).match(/[?&]id=(\d+)/);
  return m ? m[1] : '';
}

function sanitize(name) {
  return String(name || 'unknown')
    .replace(/[\\/:*?"<>|]/g, '_')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120);
}

/* ---------- 解析歌曲列表（官方优先，代理回退） ---------- */

async function resolveSongs() {
  if (useOfficial) {
    try {
      if (isPlaylist) {
        console.log('[官方] 解析歌单 ' + id + ' ...');
        const j = await offFetch('playlist/detail', { id });
        const ids = (j.playlist?.trackIds || []).map((t) => t.id);
        if (!ids.length) throw new Error('歌单为空');
        const songs = [];
        for (let i = 0; i < ids.length; i += 200) {
          const chunk = ids.slice(i, i + 200);
          const dj = await offFetch('song/detail', { ids: '[' + chunk.join(',') + ']' });
          (dj.songs || []).forEach((s) =>
            songs.push({ id: String(s.id), name: s.name, artist: (s.artists || []).map((a) => a.name).join('/') })
          );
        }
        return songs;
      }
      console.log('[官方] 解析单曲 ' + id + ' ...');
      const dj = await offFetch('song/detail', { ids: '[' + id + ']' });
      const s = dj.songs && dj.songs[0];
      if (!s) throw new Error('未找到该歌曲');
      return [{ id, name: s.name, artist: (s.artists || []).map((a) => a.name).join('/') }];
    } catch (e) {
      console.log('[官方] 解析失败，回退解析网关：' + e.message);
    }
  }

  // 回退：第三方解析网关
  if (isPlaylist) {
    console.log('[网关] 解析歌单 ' + id + ' ...');
    const list = await (await meting({ server: 'netease', type: 'playlist', id })).json();
    return list
      .map((s) => ({ id: extractId(s.url) || '', name: s.name, artist: s.artist }))
      .filter((s) => s.id);
  }
  console.log('[网关] 解析单曲 ' + id + ' ...');
  const list = await (await meting({ server: 'netease', type: 'song', id })).json();
  const s = list[0];
  if (!s) throw new Error('未找到该歌曲');
  return [{ id, name: s.name, artist: s.artist }];
}

/* ---------- 取真实音频直链（官方优先，网关回退；付费曲自动跳过） ---------- */

async function resolveAudio(songId) {
  if (useOfficial) {
    try {
      const j = await offFetch('song/enhance/player/url', { ids: '[' + songId + ']', br });
      const d = j.data && j.data[0];
      if (d && d.url) {
        const trial = d.freeTimeTrialPrivilege && d.freeTimeTrialPrivilege.type !== 0;
        if (trial && skipPaid) {
          return { skip: true, reason: '付费/VIP 试听曲(freeTrial)，官方无免费整曲直链' };
        }
        return { url: d.url, size: d.size, br: d.br, via: 'official' };
      }
      if (d && d.fee && d.fee !== 0 && skipPaid) {
        return { skip: true, reason: '付费/VIP 歌曲(fee=' + d.fee + ')，官方无免费整曲直链' };
      }
      if (d) console.log('    [官方] 无可用直链(fee=' + d.fee + ')，回退解析网关');
    } catch (e) {
      console.log('    [官方] 取直链失败，回退解析网关：' + e.message);
    }
  }
  // 走到这里：官方无可用整曲直链
  if (skipPaid) {
    return { skip: true, reason: '付费/VIP 歌曲，代理仅含试听片段，已按设置跳过' };
  }
  // 回退：网关直接返回 mp3 流
  const res = await meting({ server: 'netease', type: 'url', id: songId });
  return { stream: res, size: null, br: null, via: 'proxy' };
}

/* ---------- 取歌词（官方优先，网关回退） ---------- */

async function resolveLrc(songId) {
  if (useOfficial) {
    try {
      const j = await offFetch('song/lyric', { id: songId, lv: 1, kv: 1, tv: -1 });
      const text = j.lrc && j.lrc.lyric;
      if (text && text.includes('[')) return text;
    } catch (_) { /* ignore */ }
  }
  try {
    const text = await (await meting({ server: 'netease', type: 'lrc', id: songId })).text();
    if (text && text.includes('[')) return text;
  } catch (_) { /* ignore */ }
  return null;
}

/* ---------- 下载 ---------- */

async function downloadSong(song) {
  const base = sanitize(song.name + ' - ' + song.artist);
  const mp3Path = path.join(outDir, base + '.mp3');

  if (fs.existsSync(mp3Path)) {
    console.log('  已存在，跳过: ' + base + '.mp3');
    return;
  }

  const audio = await resolveAudio(song.id);
  if (audio.skip) {
    console.log('  ⏭️  跳过(付费): ' + base + ' —— ' + audio.reason);
    skippedCount++;
    return;
  }
  let len = 0;
  if (audio.stream) {
    // 网关直出二进制流
    const buf = Buffer.from(await audio.stream.arrayBuffer());
    if (buf.length < 1024) throw new Error('文件过小，可能不是有效音频');
    fs.writeFileSync(mp3Path, buf);
    len = buf.length;
  } else {
    // 官方 CDN 直链：必须带 Referer，否则 403
    const res = await fetch(audio.url, { headers: { 'User-Agent': UA, 'Referer': REF } });
    if (!res.ok) throw new Error('音频 HTTP ' + res.status);
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 1024) throw new Error('文件过小，可能不是有效音频');
    fs.writeFileSync(mp3Path, buf);
    len = buf.length;
    if (audio.size && len < audio.size * 0.9) {
      console.log('  ⚠ 下载大小(' + len + ') 明显小于官方声明(' + audio.size + ')，可能不完整');
    }
  }
  const brInfo = audio.br ? '  (' + (audio.br / 1000) + 'kbps)' : '';
  console.log('  mp3: ' + base + '.mp3  (' + (len / 1024 / 1024).toFixed(2) + ' MB)' + brInfo);
  if (audio.via === 'proxy' && len < 2 * 1024 * 1024) {
    console.log('  ⚠ 来自解析网关且体积偏小，疑似 30s 试听片段（该曲官方无免费整曲直链）');
  }

  if (withLrc) {
    const text = await resolveLrc(song.id);
    if (text) {
      fs.writeFileSync(path.join(outDir, base + '.lrc'), text, 'utf8');
      console.log('  lrc: ' + base + '.lrc');
    }
  }
}

async function main() {
  const songs = await resolveSongs();
  if (songs.length === 0) {
    console.log('没有可处理的歌曲');
    return;
  }

  if (onlyList) {
    console.log('\n共 ' + songs.length + ' 首：');
    songs.forEach((s, i) => {
      console.log('  ' + String(i + 1).padStart(3, ' ') + '. ' + s.name + ' - ' + s.artist + '  [id=' + s.id + ']');
    });
    console.log('\n复制上面任意歌曲的 id，可直接下载：');
    console.log('  node download-music.mjs ' + songs[0].id);
    return;
  }

  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  console.log('\n共 ' + songs.length + ' 首，输出到 ' + outDir);
  for (const s of songs) {
    try {
      await downloadSong(s);
    } catch (e) {
      console.log('  失败 ' + s.name + ': ' + e.message);
    }
  }
  console.log('完成 -> ' + outDir);
  if (skippedCount) console.log('（其中 ' + skippedCount + ' 首付费曲已自动跳过）');
}

main().catch((e) => {
  console.error('错误: ' + e.message);
  process.exit(1);
});
