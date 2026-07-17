#!/usr/bin/env node
/**
 * download-music.mjs —— 通过公开解析网关下载网易云音乐到本地
 *
 * 原理：
 *   api.injahow.cn/meting 是一个第三方 NetEase 解析代理：
 *     - type=playlist&id=<歌单ID>  -> 列出歌单内歌曲，每首 url 形如 ...type=url&id=<歌曲ID>
 *     - type=song&id=<歌曲ID>      -> 歌曲元数据(name/artist/url/lrc)
 *     - type=url&id=<歌曲ID>       -> 直接返回 mp3 二进制流
 *     - type=lrc&id=<歌曲ID>       -> 返回 LRC 歌词文本(UTF-8)
 *   服务端/命令行 fetch 下载二进制不受浏览器 CORS/版权拦截限制，故可落地为本地文件。
 *
 * 用法：
 *   node scripts/download-music.mjs <歌曲ID或歌单ID> [选项]
 *
 * 选项：
 *   --playlist      把参数当作“歌单ID”，下载歌单内所有歌曲
 *   --list          仅列出歌曲（歌名/歌手/ID），不下载（常与 --playlist 配合查看歌单内容）
 *   --out <目录>    输出目录（默认 ./static/music）
 *   --no-lrc        不下载歌词
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

const API = 'https://api.injahow.cn/meting/';

const HELP = `
网易云音乐下载工具（.mjs / 需 Node 18+）

用法:
  node download-music.mjs <歌曲ID|歌单ID> [选项]

选项:
  --playlist     把参数当“歌单ID”，下载歌单内全部歌曲
  --list         仅列出歌曲(歌名/歌手/ID)，不下载
  --out <dir>    输出目录 (默认 ./static/music)
  --no-lrc       不下载歌词
  -h, --help     显示本帮助

示例:
  node download-music.mjs 1330348068
  node download-music.mjs 3778678 --playlist
  node download-music.mjs 3778678 --playlist --list
`;

const args = process.argv.slice(2);
if (args.length === 0 || args.includes('-h') || args.includes('--help')) {
  console.log(HELP);
  process.exit(args.length === 0 ? 1 : 0);
}

let id = '';
let isPlaylist = false;
let onlyList = false;
let outDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'static', 'music');
let withLrc = true;

for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === '--playlist') isPlaylist = true;
  else if (a === '--list') onlyList = true;
  else if (a === '--out') outDir = path.resolve(args[++i] || '.');
  else if (a === '--no-lrc') withLrc = false;
  else if (!a.startsWith('--')) id = a;
}
if (!id) {
  console.error('缺少歌曲/歌单 ID');
  process.exit(1);
}

async function meting(params) {
  const url = API + '?' + new URLSearchParams(params).toString();
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
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

async function resolveSongs() {
  if (isPlaylist) {
    console.log('解析歌单 ' + id + ' ...');
    const res = await meting({ server: 'netease', type: 'playlist', id });
    const list = await res.json();
    return list
      .map((s) => ({ id: extractId(s.url) || '', name: s.name, artist: s.artist }))
      .filter((s) => s.id);
  }
  console.log('解析单曲 ' + id + ' ...');
  const res = await meting({ server: 'netease', type: 'song', id });
  const list = await res.json();
  const s = list[0];
  if (!s) throw new Error('未找到该歌曲');
  return [{ id, name: s.name, artist: s.artist }];
}

async function downloadSong(song) {
  const base = sanitize(song.name + ' - ' + song.artist);
  const mp3Path = path.join(outDir, base + '.mp3');

  if (fs.existsSync(mp3Path)) {
    console.log('  已存在，跳过: ' + base + '.mp3');
    return;
  }

  const urlRes = await meting({ server: 'netease', type: 'url', id: song.id });
  const buf = Buffer.from(await urlRes.arrayBuffer());
  if (buf.length < 1024) throw new Error('文件过小，可能不是有效音频');
  fs.writeFileSync(mp3Path, buf);
  console.log('  mp3: ' + base + '.mp3  (' + (buf.length / 1024 / 1024).toFixed(2) + ' MB)');

  if (withLrc) {
    try {
      const lrcRes = await meting({ server: 'netease', type: 'lrc', id: song.id });
      const text = await lrcRes.text();
      if (text && text.includes('[')) {
        fs.writeFileSync(path.join(outDir, base + '.lrc'), text, 'utf8');
        console.log('  lrc: ' + base + '.lrc');
      }
    } catch (e) {
      console.log('  lrc 跳过: ' + e.message);
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

  fs.mkdirSync(outDir, { recursive: true });
  console.log('\n共 ' + songs.length + ' 首，输出到 ' + outDir);
  for (const s of songs) {
    try {
      await downloadSong(s);
    } catch (e) {
      console.log('  失败 ' + s.name + ': ' + e.message);
    }
  }
  console.log('完成 -> ' + outDir);
}

main().catch((e) => {
  console.error('错误: ' + e.message);
  process.exit(1);
});
