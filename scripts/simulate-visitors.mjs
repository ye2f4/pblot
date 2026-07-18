#!/usr/bin/env node
/**
 * 访问地图访客模拟器（实时模拟访客）
 * --------------------------------------------------
 * 周期性向 Supabase 的 visitor_locations 表插入「带真实城市坐标」的
 * 假访客记录。访问地图(/visit-map/)每 30s 轮询一次该表，因此新记录
 * 会在约半分钟内自动出现在地图上，形成「实时有访客来自各地」的效果。
 *
 * 每条记录使用唯一的 session_id，故每次都会成为地图上的一个新标记
 * （与真实访客去重逻辑一致：真实访客用浏览器 session 去重，模拟用
 * 随机 session 制造新访客）。坐标在所选城市中心附近做 ±0.3° 抖动，
 * 让分布更自然。
 *
 * 用法：
 *   node scripts/simulate-visitors.mjs                       # 默认：每 4s 来 1 个访客（无限）
 *   VISITOR_INTERVAL_MS=2000 VISITOR_BATCH=3 node scripts/simulate-visitors.mjs
 *   node scripts/simulate-visitors.mjs --count 50            # 只模拟 50 个访客后退出
 *   node scripts/simulate-visitors.mjs --dry                  # 只打印将要写入的内容，不入库
 *   node scripts/simulate-visitors.mjs --clean                # 删除全部模拟记录(session_id 以 sim_ 开头)
 *
 * 环境变量：
 *   SUPABASE_URL / SUPABASE_ANON_KEY   连接凭据（缺省用 .env，再缺省用硬编码兜底）
 *   VISITOR_INTERVAL_MS                每次写入间隔(ms)，默认 4000
 *   VISITOR_BATCH                      每次写入的访客数，默认 1
 *   VISITOR_COUNT                      总共模拟多少访客后停止，0=无限，默认 0
 */

import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

// 若项目根目录有 .env（dotenv 已是依赖），优先从中读取连接串
try {
  const { config } = await import('dotenv');
  config();
} catch { /* 没有 dotenv 也可：用硬编码兜底 */ }

// ========================= 配置 =========================
const arg = (name) => process.argv.includes(`--${name}`);

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://xwhwcmorcmgpfpocmgez.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh3aHdjbW9yY21ncGZwb2NtZ2V6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2ODk2MzQsImV4cCI6MjA5NjI2NTYzNH0.O5YcPuehUMjEofFdoNfE5NDxT71qtcMdYeLCvyyoQgw';

const TICK_MS = Number(process.env.VISITOR_INTERVAL_MS || 4000);
const BATCH = Math.max(1, Number(process.env.VISITOR_BATCH || 1));
const MAX_COUNT = Number(process.env.VISITOR_COUNT || process.argv.find((a) => a.startsWith('--count='))?.split('=')[1] || 0);
const DRY = arg('dry');
const CLEAN = arg('clean');

// ========================= 城市坐标池 =========================
// 经纬度为城市中心，记录写入时会做 ±JITTER 抖动，模拟城区内随机落点
const JITTER = 0.3;
const CITY_POOL = [
  { city: '北京', country: '中国', country_code: 'CN', region: '华北', timezone: 'Asia/Shanghai', isp: '中国电信', lat: 39.9042, lng: 116.4074 },
  { city: '上海', country: '中国', country_code: 'CN', region: '华东', timezone: 'Asia/Shanghai', isp: '中国联通', lat: 31.2304, lng: 121.4737 },
  { city: '广州', country: '中国', country_code: 'CN', region: '华南', timezone: 'Asia/Shanghai', isp: '中国移动', lat: 23.1291, lng: 113.2644 },
  { city: '深圳', country: '中国', country_code: 'CN', region: '华南', timezone: 'Asia/Shanghai', isp: '中国移动', lat: 22.5431, lng: 114.0579 },
  { city: '成都', country: '中国', country_code: 'CN', region: '西南', timezone: 'Asia/Shanghai', isp: '中国电信', lat: 30.5728, lng: 104.0668 },
  { city: '杭州', country: '中国', country_code: 'CN', region: '华东', timezone: 'Asia/Shanghai', isp: '中国联通', lat: 30.2741, lng: 120.1551 },
  { city: '武汉', country: '中国', country_code: 'CN', region: '华中', timezone: 'Asia/Shanghai', isp: '中国电信', lat: 30.5928, lng: 114.3055 },
  { city: '西安', country: '中国', country_code: 'CN', region: '西北', timezone: 'Asia/Shanghai', isp: '中国联通', lat: 34.3416, lng: 108.9398 },
  { city: '香港', country: '中国香港', country_code: 'HK', region: '港澳', timezone: 'Asia/Hong_Kong', isp: 'HKT', lat: 22.3193, lng: 114.1694 },
  { city: '台北', country: '中国台湾', country_code: 'TW', region: '台湾', timezone: 'Asia/Taipei', isp: '中华电信', lat: 25.0330, lng: 121.5654 },
  { city: '东京', country: '日本', country_code: 'JP', region: '关东', timezone: 'Asia/Tokyo', isp: 'NTT', lat: 35.6762, lng: 139.6503 },
  { city: '首尔', country: '韩国', country_code: 'KR', region: '首尔特别市', timezone: 'Asia/Seoul', isp: 'SK Telecom', lat: 37.5665, lng: 126.9780 },
  { city: '新加坡', country: '新加坡', country_code: 'SG', region: '中部', timezone: 'Asia/Singapore', isp: 'Singtel', lat: 1.3521, lng: 103.8198 },
  { city: '曼谷', country: '泰国', country_code: 'TH', region: '曼谷', timezone: 'Asia/Bangkok', isp: 'AIS', lat: 13.7563, lng: 100.5018 },
  { city: '新德里', country: '印度', country_code: 'IN', region: '德里', timezone: 'Asia/Kolkata', isp: 'Jio', lat: 28.6139, lng: 77.2090 },
  { city: '悉尼', country: '澳大利亚', country_code: 'AU', region: '新南威尔士', timezone: 'Australia/Sydney', isp: 'Telstra', lat: -33.8688, lng: 151.2093 },
  { city: '伦敦', country: '英国', country_code: 'GB', region: '英格兰', timezone: 'Europe/London', isp: 'BT', lat: 51.5074, lng: -0.1278 },
  { city: '巴黎', country: '法国', country_code: 'FR', region: '法兰西岛', timezone: 'Europe/Paris', isp: 'Orange', lat: 48.8566, lng: 2.3522 },
  { city: '柏林', country: '德国', country_code: 'DE', region: '柏林', timezone: 'Europe/Berlin', isp: 'Deutsche Telekom', lat: 52.5200, lng: 13.4050 },
  { city: '莫斯科', country: '俄罗斯', country_code: 'RU', region: '莫斯科', timezone: 'Europe/Moscow', isp: 'MTS', lat: 55.7558, lng: 37.6173 },
  { city: '纽约', country: '美国', country_code: 'US', region: '纽约州', timezone: 'America/New_York', isp: 'Verizon', lat: 40.7128, lng: -74.0060 },
  { city: '旧金山', country: '美国', country_code: 'US', region: '加利福尼亚', timezone: 'America/Los_Angeles', isp: 'Comcast', lat: 37.7749, lng: -122.4194 },
  { city: '洛杉矶', country: '美国', country_code: 'US', region: '加利福尼亚', timezone: 'America/Los_Angeles', isp: 'AT&T', lat: 34.0522, lng: -118.2437 },
  { city: '圣保罗', country: '巴西', country_code: 'BR', region: '圣保罗', timezone: 'America/Sao_Paulo', isp: 'Vivo', lat: -23.5505, lng: -46.6333 },
  { city: '开普敦', country: '南非', country_code: 'ZA', region: '西开普', timezone: 'Africa/Johannesburg', isp: 'MTN', lat: -33.9249, lng: 18.4241 },
];

// ========================= 设备信息池 =========================
const BROWSERS = ['Chrome', 'Safari', 'Edge', 'Firefox', 'Samsung Browser', 'Mobile Safari'];
const OSES = ['Windows 11', 'Windows 10', 'macOS', 'iOS', 'Android', 'Linux'];
const MOBILE_MODELS = ['iPhone 15 Pro', 'iPhone 14', 'Pixel 8', 'Galaxy S24', 'Xiaomi 14', 'Huawei Mate 60', 'iPad Air', 'Redmi Note 13'];
const DESKTOP_MODELS = ['Unknown', 'Unknown', 'MacBook Pro', 'ThinkPad X1', 'Dell XPS 15'];

// ========================= 工具函数 =========================
const rand = (min, max) => Math.random() * (max - min) + min;
const randInt = (min, max) => Math.floor(rand(min, max + 1));
const choice = (arr) => arr[randInt(0, arr.length - 1)];

function genVisitor(now) {
  const c = choice(CITY_POOL);
  const os = choice(OSES);
  const isMobile = os === 'iOS' || os === 'Android';
  return {
    session_id: `sim_${now.getTime().toString(36)}_${randomUUID().slice(0, 8)}`,
    latitude: +(c.lat + rand(-JITTER, JITTER)).toFixed(4),
    longitude: +(c.lng + rand(-JITTER, JITTER)).toFixed(4),
    city: c.city,
    country: c.country,
    country_code: c.country_code,
    region: c.region,
    timezone: c.timezone,
    ip_address: `${randInt(11, 223)}.${randInt(0, 255)}.${randInt(0, 255)}.${randInt(1, 254)}`,
    isp: c.isp,
    is_mobile: isMobile,
    browser: choice(BROWSERS),
    os,
    device_model: isMobile ? choice(MOBILE_MODELS) : choice(DESKTOP_MODELS),
    visit_count: 1,
    first_visit: now.toISOString(),
    last_active: now.toISOString(),
  };
}

// ========================= 启动 =========================
const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
let inserted = 0;

async function runClean() {
  const { error } = await sb
    .from('visitor_locations')
    .delete()
    .like('session_id', 'sim_%');
  if (error) {
    console.error('[清理失败]', error.message);
    process.exit(1);
  }
  console.log('[清理] 已删除全部模拟访客记录(session_id 以 sim_ 开头)');
  process.exit(0);
}

async function insertBatch() {
  const now = new Date();
  const rows = Array.from({ length: BATCH }, () => genVisitor(now));
  if (DRY) {
    for (const r of rows) {
      console.log(`[DRY] ${r.country}/${r.city} (${r.latitude}, ${r.longitude}) ${r.os} · ${r.browser} · ${r.is_mobile ? '移动端' : '桌面端'}`);
    }
    return;
  }
  const { error } = await sb.from('visitor_locations').insert(rows);
  if (error) {
    console.error('[写入失败]', error.message);
    return;
  }
  inserted += rows.length;
  const sample = rows[0];
  console.log(`[+] 已写入 ${rows.length} 名访客（累计 ${inserted}） 示例: ${sample.country}/${sample.city} · ${sample.os} · ${sample.is_mobile ? '移动端' : '桌面端'}`);

  if (MAX_COUNT > 0 && inserted >= MAX_COUNT) {
    console.log(`\n已达到目标访客数 ${MAX_COUNT}，停止模拟。`);
    process.exit(0);
  }
}

// 优雅停机
const shutdown = async () => {
  console.log('\n正在停止访客模拟器...');
  console.log(`本次共模拟写入 ${inserted} 名访客。`);
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

if (CLEAN) {
  runClean();
} else {
  console.log(`\n==============================================`);
  console.log(` 访问地图访客模拟器${DRY ? '（DRY 模式，不入库）' : ''}`);
  console.log(` 数据源: ${SUPABASE_URL}`);
  console.log(` 间隔: ${TICK_MS}ms  每批: ${BATCH}  ${MAX_COUNT ? `总数上限: ${MAX_COUNT}` : '模式: 持续'}`);
  console.log(` 打开 /visit-map/ 即可看到实时涌现的新访客点（地图每 30s 刷新）`);
  console.log(` 按 Ctrl+C 停止`);
  console.log(`==============================================\n`);

  // 立即来一批，避免空等
  insertBatch();
  setInterval(insertBatch, TICK_MS);
}
