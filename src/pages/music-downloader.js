import React, { useState } from 'react';
import Layout from '@theme/Layout';

function CopyBox({ text }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (e) {
      setCopied(false);
    }
  };
  return (
    <div style={{ position: 'relative', margin: '10px 0' }}>
      <pre style={{
        background: 'var(--ifm-color-emphasis-900)', color: '#e6e6e6',
        padding: '14px 16px', borderRadius: '10px', fontSize: '13px',
        overflowX: 'auto', margin: 0, fontFamily: 'monospace'
      }}>{text}</pre>
      <button onClick={copy} style={{
        position: 'absolute', top: '8px', right: '8px',
        padding: '4px 10px', borderRadius: '8px', border: 'none',
        background: copied ? '#22c55e' : 'rgba(66,133,244,0.9)',
        color: '#fff', fontSize: '12px', cursor: 'pointer'
      }}>{copied ? '已复制' : '复制'}</button>
    </div>
  );
}

export default function MusicDownloader() {
  const [id, setId] = useState('');
  const [isPlaylist, setIsPlaylist] = useState(false);
  const [onlyList, setOnlyList] = useState(false);
  const [noLrc, setNoLrc] = useState(false);
  const [outDir, setOutDir] = useState('./static/music');

  const hasId = !!id.trim();
  const outArg = (outDir && outDir.trim() && outDir.trim() !== './static/music') ? outDir.trim() : '';

  const mjsCmd = 'node scripts/download-music.mjs ' + (hasId ? id.trim() : '<歌曲ID或歌单ID>')
    + (isPlaylist ? ' --playlist' : '')
    + (onlyList ? ' --list' : '')
    + (outArg ? ' --out ' + outArg : '')
    + (noLrc ? ' --no-lrc' : '');

  const ps1Cmd = '.\\download-music.ps1 -Id ' + (hasId ? id.trim() : '<歌曲ID或歌单ID>')
    + (isPlaylist ? ' -Playlist' : '')
    + (onlyList ? ' -List' : '')
    + (outArg ? ' -Out ' + outArg : '')
    + (noLrc ? ' -NoLrc' : '');

  const card = {
    background: 'var(--ifm-card-background-color)',
    borderRadius: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
    padding: '22px', flex: '1 1 320px'
  };
  const label = { display: 'block', fontSize: '13px', color: 'var(--ifm-color-emphasis-700)', margin: '12px 0 6px' };
  const input = {
    width: '100%', padding: '10px 12px', borderRadius: '10px',
    border: '1px solid var(--ifm-color-emphasis-300)',
    background: 'var(--ifm-background-color)', color: 'var(--ifm-text-color)', fontSize: '14px'
  };
  const check = { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', margin: '10px 0', cursor: 'pointer' };

  return (
    <Layout title="网易云音乐下载" description="通过解析网关把网易云音乐下载到本地">
      <div style={{
        minHeight: '70vh', padding: '40px 20px', background: 'var(--ifm-color-emphasis-100)',
        display: 'flex', justifyContent: 'center'
      }}>
        <div style={{
          width: '100%', maxWidth: '980px', background: 'var(--ifm-card-background-color)',
          borderRadius: '20px', boxShadow: '0 8px 24px rgba(0,0,0,0.08)', padding: '40px'
        }}>
          <div style={{ textAlign: 'center', marginBottom: '8px' }}>
            <h1 style={{ fontSize: '30px', color: 'var(--ifm-text-color)', margin: 0 }}>🎵 网易云音乐下载</h1>
            <p style={{ color: 'var(--ifm-color-emphasis-600)', marginTop: '10px' }}>
              把歌曲/歌单下载到本地 · 不受浏览器版权拦截限制
            </p>
          </div>

          <div style={{
            background: 'rgba(66,133,244,0.08)', border: '1px solid rgba(66,133,244,0.25)',
            borderRadius: '12px', padding: '14px 16px', fontSize: '13px', lineHeight: '1.7',
            color: 'var(--ifm-color-emphasis-700)', marginTop: '20px'
          }}>
            <strong>原理：</strong>浏览器里放不出，是因为解析网关 <code>api.injahow.cn/meting</code> 不返回 CORS 头，
            前端 <code>fetch</code> 二进制会被拦。但<strong>命令行/服务端下载二进制不受限</strong>——
            脚本请求 <code>type=url</code> 直接拿到 mp3 流存盘，所以“下到本地”才稳。
            已知歌单 ID 时，先加 <code>--list</code>（或 <code>-List</code>）查看全部歌曲与各自 ID，再决定下载哪首或整张。
          </div>

          <hr style={{ border: 'none', height: '1px', background: 'var(--ifm-color-emphasis-300)', margin: '28px 0' }} />

          {/* 表单 */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
            <div style={{ ...card, flex: '1 1 360px' }}>
              <h3 style={{ margin: '0 0 6px', fontSize: '17px' }}>① 填写参数</h3>
              <label style={label}>歌曲 ID 或 歌单 ID（数字）</label>
              <input style={input} value={id} onChange={(e) => setId(e.target.value)}
                placeholder="例如 1330348068（起风了）或 3778678（热歌榜）" />

              <label style={label}>输出目录（默认 ./static/music）</label>
              <input style={input} value={outDir} onChange={(e) => setOutDir(e.target.value)} placeholder="./static/music" />

              <label style={check}><input type="checkbox" checked={isPlaylist} onChange={(e) => setIsPlaylist(e.target.checked)} /> 当作「歌单 ID」处理（下载整张歌单）</label>
              <label style={check}><input type="checkbox" checked={onlyList} onChange={(e) => setOnlyList(e.target.checked)} /> 仅查看/列出歌曲，不下载（先看歌单里有什么）</label>
              <label style={check}><input type="checkbox" checked={noLrc} onChange={(e) => setNoLrc(e.target.checked)} /> 不下载歌词（.lrc）</label>
            </div>

            {/* 生成命令 */}
            <div style={{ ...card, flex: '1 1 360px' }}>
              <h3 style={{ margin: '0 0 6px', fontSize: '17px' }}>② 复制命令去终端跑</h3>
              <p style={{ fontSize: '13px', color: 'var(--ifm-color-emphasis-600)', margin: '0 0 8px' }}>
                A. Node 版（需 Node 18+）
              </p>
              <CopyBox text={mjsCmd} />
              <p style={{ fontSize: '13px', color: 'var(--ifm-color-emphasis-600)', margin: '14px 0 8px' }}>
                B. PowerShell 版（零安装，Windows 自带，新电脑直接用）
              </p>
              <CopyBox text={ps1Cmd} />
            </div>
          </div>

          {/* 脚本下载 + 歌单说明 */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', marginTop: '20px' }}>
            <div style={{ ...card, flex: '1 1 360px' }}>
              <h3 style={{ margin: '0 0 10px', fontSize: '17px' }}>③ 下载脚本</h3>
              <p style={{ fontSize: '13px', color: 'var(--ifm-color-emphasis-600)', margin: '0 0 12px' }}>
                把脚本保存到电脑任意位置，终端进到该目录即可使用。
              </p>
              <a href="/download-tools/download-music.mjs" download
                style={{ display: 'block', width: '100%', textAlign: 'center', padding: '10px 0',
                  background: '#4285f4', color: '#fff', borderRadius: '10px', textDecoration: 'none', fontSize: '14px', marginBottom: '10px' }}>
                下载 download-music.mjs（Node 版）
              </a>
              <a href="/download-tools/download-music.ps1" download
                style={{ display: 'block', width: '100%', textAlign: 'center', padding: '10px 0',
                  background: '#16a34a', color: '#fff', borderRadius: '10px', textDecoration: 'none', fontSize: '14px' }}>
                下载 download-music.ps1（PowerShell 版 · 零安装）
              </a>
            </div>

            <div style={{ ...card, flex: '1 1 360px' }}>
              <h3 style={{ margin: '0 0 10px', fontSize: '17px' }}>已知歌单 ID，怎么看/下全部？</h3>
              <p style={{ fontSize: '13px', lineHeight: '1.7', color: 'var(--ifm-color-emphasis-700)', margin: 0 }}>
                1. <strong>先查看</strong>：加 <code>--list</code>（mjs）或 <code>-List</code>（ps1），列出歌单里每首的歌名/歌手/ID，不下载。<br />
                2. <strong>下整张</strong>：去掉 <code>--list</code>，加 <code>--playlist</code>，自动遍历歌单逐首下载 mp3 + lrc。<br />
                3. <strong>下单曲</strong>：从列表里复制任意歌曲的 ID，直接跑不带 <code>--playlist</code> 的命令。<br /><br />
                例：<code>node scripts/download-music.mjs 3778678 --playlist</code> 一键下完整张热歌榜。
              </p>
            </div>
          </div>

          <div style={{ textAlign: 'center', marginTop: '36px' }}>
            <a href="/tools/" style={{
              padding: '10px 24px', background: 'rgba(66,133,244,0.12)', color: '#4285f4',
              borderRadius: '10px', textDecoration: 'none', fontSize: '14px'
            }}>← 返回工具箱</a>
          </div>
        </div>
      </div>
    </Layout>
  );
}
