#!/usr/bin/env node
/**
 * 带本地图形控制面板的 ESP32 设备模拟器
 * --------------------------------------------------
 * 在“裸 HTTP 设备模拟器”基础上增加：
 *   - 一个本地 Web 控制面板（默认 http://localhost:8788）
 *       · 手动模式：滑块调节 温度/电量/信号/电压，按钮切换背光
 *       · 电脑性能模式：把 CPU 温度、CPU 负载、内存占用、笔记本电池
 *         实时映射成设备数据，用来验证 /hardware/ 界面的动态变化
 *   - 仍通过 Supabase REST（与真实 ESP32 固件相同的 4 个调用）上报
 *
 * 用法：
 *   pnpm simulate-esp32                       # 启动模拟器 + 控制面板
 *   CONTROL_UI=0 pnpm simulate-esp32          # 仅模拟器（无 GUI）
 *   CONTROL_PORT=9000 DEVICE_ID=ESP32-02 pnpm simulate-esp32
 *
 * 浏览器打开 http://localhost:8788 即可操控；前端 /hardware/ 实时刷新。
 */

import http from 'node:http';
import os from 'node:os';

// ========================= 配置 =========================
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://xwhwcmorcmgpfpocmgez.supabase.co';
const ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh3aHdjbW9yY21ncGZwb2NtZ2V6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2ODk2MzQsImV4cCI6MjA5NjI2NTYzNH0.O5YcPuehUMjEofFdoNfE5NDxT71qtcMdYeLCvyyoQgw';
const DEVICE_ID = process.env.DEVICE_ID || 'ESP32-LOCAL-01';
const DEVICE_NAME = process.env.DEVICE_NAME || '本地ESP32模拟设备';
const TICK_MS = Number(process.env.TICK_MS || 5000);
const CONTROL_PORT = Number(process.env.CONTROL_PORT || 8788);
const ENABLE_UI = (process.env.CONTROL_UI || '1') !== '0';

const HEADERS = {
  'apikey': ANON_KEY,
  'Authorization': `Bearer ${ANON_KEY}`,
  'Content-Type': 'application/json',
};

// ========================= 状态 =========================
const state = {
  mode: 'manual',        // 'manual' | 'system'
  temperature: 24.5,
  battery: 88,
  signal: -55,
  voltage: 3.3,
  backlight: false,
};
let deviceUuid = null;
let lastReport = null;
const systemCache = {
  cpuTemp: null, cpuLoad: null,
  memUsed: null, memTotal: null,
  batteryPercent: null, hasBattery: false,
  available: false,
};

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
const round2 = (v) => Math.round(v * 100) / 100;
const round3 = (v) => Math.round(v * 1000) / 1000;

// ========================= 系统信息读取 =========================
let si = null;
try {
  si = (await import('systeminformation')).default;
} catch {
  si = null;
}

async function refreshSystem() {
  if (!si) {
    // 降级：仅用 Node 内置 os 提供内存与 CPU 核心数（读不到温度/电池）
    systemCache.memTotal = os.totalmem();
    systemCache.memUsed = os.totalmem() - os.freemem();
    systemCache.cpuLoad = null;
    systemCache.cpuTemp = null;
    systemCache.hasBattery = false;
    systemCache.batteryPercent = null;
    systemCache.available = false;
    return;
  }
  try {
    const [cpu, mem, load, bat] = await Promise.all([
      si.cpuTemperature(),
      si.mem(),
      si.currentLoad(),
      si.battery().catch(() => null),
    ]);
    systemCache.cpuTemp = cpu && cpu.main > 0 ? cpu.main : systemCache.cpuTemp;
    systemCache.cpuLoad = load ? load.currentLoad : null;
    systemCache.memTotal = mem.total;
    systemCache.memUsed = mem.used;
    systemCache.hasBattery = !!(bat && bat.hasBattery);
    systemCache.batteryPercent = bat && bat.percent != null ? bat.percent : null;
    systemCache.available = true;
  } catch {
    systemCache.available = false;
  }
}

// 系统模式：把电脑性能映射成设备字段，制造动态变化
function applySystemToState() {
  if (state.mode !== 'system') return;
  const load = systemCache.cpuLoad ?? 0;
  // 温度：优先真实 CPU 温度，否则按负载估算
  state.temperature = systemCache.cpuTemp != null
    ? clamp(systemCache.cpuTemp, 0, 100)
    : clamp(35 + load * 0.4, 0, 100);
  // 电量：有电池用真实值，否则按负载轻微波动（保持演示动态）
  if (systemCache.hasBattery && systemCache.batteryPercent != null) {
    state.battery = clamp(systemCache.batteryPercent, 0, 100);
  } else {
    state.battery = clamp(state.battery - Math.random() * 0.2, 1, 100);
  }
  // 信号：电脑无信号概念，给一个随负载轻微抖动的固定值
  state.signal = Math.round(clamp(-50 + (Math.random() * 6 - 3), -110, -30));
  state.voltage = round3(2.8 + (state.battery / 100) * 0.9);
}

// ========================= 4 个 HTTP 调用（= ESP32 固件要做的） =========================
async function reportTelemetry() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/report_device_telemetry`, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify({
      p_device_id: DEVICE_ID,
      p_device_name: DEVICE_NAME,
      p_is_online: true,
      p_battery: Math.round(state.battery),
      p_signal: Math.round(state.signal),
      p_temperature: round2(state.temperature),
      p_voltage: round3(state.voltage),
      p_backlight: state.backlight,
    }),
  });
  if (!res.ok) throw new Error(`上报失败 ${res.status}: ${await res.text()}`);
  return res.json();
}

async function getDeviceUuid() {
  const url = `${SUPABASE_URL}/rest/v1/devices?device_id=eq.${encodeURIComponent(DEVICE_ID)}&select=id`;
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`查 UUID 失败 ${res.status}`);
  const arr = await res.json();
  return arr[0]?.id || null;
}

async function pollCommands(uuid) {
  const url = `${SUPABASE_URL}/rest/v1/device_commands?device_id=eq.${uuid}&executed=eq.false&select=*`;
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`轮询指令失败 ${res.status}`);
  return res.json();
}

async function ackCommand(id, result) {
  const url = `${SUPABASE_URL}/rest/v1/device_commands?id=eq.${id}`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: HEADERS,
    body: JSON.stringify({ executed: true, result, executed_at: new Date().toISOString() }),
  });
  if (!res.ok) throw new Error(`回写失败 ${res.status}: ${await res.text()}`);
}

async function markOffline() {
  const url = `${SUPABASE_URL}/rest/v1/devices?device_id=eq.${encodeURIComponent(DEVICE_ID)}`;
  try {
    await fetch(url, {
      method: 'PATCH',
      headers: HEADERS,
      body: JSON.stringify({ is_online: false, last_heartbeat: new Date().toISOString() }),
    });
    console.log('[退出] 已将本设备标记为离线');
  } catch (e) {
    console.error('[退出] 标记离线失败:', e.message);
  }
}

// 在设备上“执行”一条指令（真实硬件里这里会去拉 GPIO / 重启等）
function applyCommand(command) {
  switch (command) {
    case 'reboot':
      return '重启完成';
    case 'backlight_on':
      state.backlight = true;
      return '背光已开启';
    case 'backlight_off':
      state.backlight = false;
      return '背光已关闭';
    default:
      return `未知指令: ${command}`;
  }
}

// ========================= 主循环 =========================
async function tick() {
  try {
    if (state.mode === 'system') applySystemToState();
    const uuid = await reportTelemetry();
    if (!deviceUuid) deviceUuid = uuid;
    lastReport = new Date().toLocaleTimeString();

    if (deviceUuid) {
      const pending = await pollCommands(deviceUuid);
      for (const cmd of pending || []) {
        const result = applyCommand(cmd.command);
        await ackCommand(cmd.id, result);
        console.log(`[执行] <- ${cmd.command} : ${result}`);
      }
    }
    console.log(`[上报] ${lastReport} 模式=${state.mode} 温度=${state.temperature}°C 电量=${Math.round(state.battery)}% 信号=${state.signal}dBm`);
  } catch (e) {
    console.error('[错误]', e.message || e);
  }
}

// ========================= 本地图形控制面板 =========================
function buildHtml() {
  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>ESP32 模拟器控制面板</title>
<style>
  * { box-sizing: border-box; }
  body { margin:0; font-family: -apple-system, "Segoe UI", Roboto, "PingFang SC", sans-serif;
         background:#0f172a; color:#e2e8f0; padding:24px; }
  h1 { font-size:20px; margin:0 0 4px; }
  .sub { color:#94a3b8; font-size:13px; margin-bottom:20px; }
  .card { background:#1e293b; border-radius:14px; padding:18px 20px; margin-bottom:16px; }
  .card h2 { font-size:15px; margin:0 0 14px; color:#7dd3fc; }
  .row { display:flex; align-items:center; gap:12px; margin:12px 0; }
  .row label { width:72px; font-size:14px; color:#cbd5e1; }
  .row input[type=range] { flex:1; }
  .val { width:84px; text-align:right; font-variant-numeric:tabular-nums; color:#f8fafc; }
  .mode-btns button, .backlight button { padding:8px 16px; border:none; border-radius:8px;
         font-size:14px; cursor:pointer; background:#334155; color:#e2e8f0; }
  .mode-btns button.active { background:#0ea5e9; color:#fff; }
  .backlight button.on { background:#f59e0b; color:#1e293b; }
  .backlight button.off { background:#475569; color:#e2e8f0; }
  .sys { display:grid; grid-template-columns:repeat(2,1fr); gap:10px 20px; font-size:14px; }
  .sys div span { color:#94a3b8; }
  .sys div b { color:#f8fafc; font-variant-numeric:tabular-nums; }
  .status { font-size:13px; color:#94a3b8; }
  .status b { color:#4ade80; }
  a { color:#7dd3fc; }
  .hint { font-size:12px; color:#64748b; margin-top:6px; }
</style>
</head>
<body>
  <h1>ESP32 模拟器控制面板</h1>
  <div class="sub">设备：<span id="dev"></span> · 后端：<span id="backend"></span></div>

  <div class="card">
    <h2>运行模式</h2>
    <div class="mode-btns">
      <button id="m-manual" onclick="setMode('manual')">手动调参</button>
      <button id="m-system" onclick="setMode('system')">读取电脑性能</button>
    </div>
    <div class="hint" id="modeHint"></div>
  </div>

  <div class="card" id="manualCard">
    <h2>手动参数</h2>
    <div class="row"><label>温度</label><input type="range" id="temperature" min="-10" max="80" step="0.1"><span class="val" id="temperature-v"></span></div>
    <div class="row"><label>电量</label><input type="range" id="battery" min="0" max="100" step="1"><span class="val" id="battery-v"></span></div>
    <div class="row"><label>信号</label><input type="range" id="signal" min="-110" max="-30" step="1"><span class="val" id="signal-v"></span></div>
    <div class="row"><label>电压</label><input type="range" id="voltage" min="2.5" max="4.2" step="0.001"><span class="val" id="voltage-v"></span></div>
    <div class="row"><label>背光</label>
      <div class="backlight">
        <button id="bl-on" class="on" onclick="setBacklight(true)">开启</button>
        <button id="bl-off" class="off" onclick="setBacklight(false)">关闭</button>
      </div>
    </div>
  </div>

  <div class="card" id="systemCard" style="display:none">
    <h2>电脑性能（实时映射为设备数据）</h2>
    <div class="sys">
      <div><span>CPU 温度：</span><b id="s-temp">—</b></div>
      <div><span>CPU 负载：</span><b id="s-load">—</b></div>
      <div><span>内存占用：</span><b id="s-mem">—</b></div>
      <div><span>电池电量：</span><b id="s-batt">—</b></div>
    </div>
    <div class="hint" id="sysHint"></div>
  </div>

  <div class="card">
    <h2>上报状态</h2>
    <div class="status">最近上报：<b id="last">—</b></div>
    <div class="status" style="margin-top:6px">当前设备读数：<span id="cur"></span></div>
    <div class="hint">前端查看：<a href="/hardware/" target="_blank">打开 /hardware/ 监控页</a>（需与本项目同域名/端口运行）</div>
  </div>

<script>
  const $ = (id) => document.getElementById(id);
  let cur = { temperature:0, battery:0, signal:0, voltage:0, backlight:false, mode:'manual' };
  let sys = {};

  async function post(body){
    await fetch('/api/state', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) });
  }
  function setMode(m){ post({ mode:m }); }
  function setBacklight(v){ post({ backlight: v }); }
  function bindSlider(id){
    $(id).addEventListener('input', () => {
      const v = parseFloat($(id).value);
      post({ [id]: v });
    });
  }
  ['temperature','battery','signal','voltage'].forEach(bindSlider);

  function fmtBytes(b){ return (b/1073741824).toFixed(1) + ' GB'; }

  async function refresh(){
    const r = await fetch('/api/state');
    const d = await r.json();
    cur = d.state; sys = d.system;
    $('dev').textContent = d.deviceId + ' / ' + d.deviceName;
    $('backend').textContent = d.backend;
    $('m-manual').classList.toggle('active', cur.mode==='manual');
    $('m-system').classList.toggle('active', cur.mode==='system');
    $('manualCard').style.display = cur.mode==='manual' ? '' : 'none';
    $('systemCard').style.display = cur.mode==='system' ? '' : 'none';
    $('modeHint').textContent = cur.mode==='manual'
      ? '拖动滑块即可改变上报值，前端曲线会实时跟随变化。'
      : '以下为电脑真实性能，正实时映射为设备数据。';
    if (cur.mode==='manual'){
      $('temperature').value = cur.temperature; $('temperature-v').textContent = cur.temperature.toFixed(1)+' °C';
      $('battery').value = cur.battery;          $('battery-v').textContent = Math.round(cur.battery)+' %';
      $('signal').value = cur.signal;           $('signal-v').textContent = Math.round(cur.signal)+' dBm';
      $('voltage').value = cur.voltage;         $('voltage-v').textContent = cur.voltage.toFixed(3)+' V';
      $('bl-on').classList.toggle('on', cur.backlight);  $('bl-on').classList.toggle('off', !cur.backlight);
      $('bl-off').classList.toggle('off', cur.backlight); $('bl-off').classList.toggle('on', !cur.backlight);
    } else {
      $('s-temp').textContent = sys.cpuTemp!=null ? sys.cpuTemp.toFixed(1)+' °C' : '不可用';
      $('s-load').textContent = sys.cpuLoad!=null ? sys.cpuLoad.toFixed(1)+' %' : '不可用';
      $('s-mem').textContent  = sys.memUsed!=null ? fmtBytes(sys.memUsed)+' / '+fmtBytes(sys.memTotal) : '不可用';
      $('s-batt').textContent = sys.hasBattery ? (sys.batteryPercent!=null? Math.round(sys.batteryPercent)+' %':'检测中') : '无电池(台式机)';
      $('sysHint').textContent = sys.available ? '' : '未加载 systeminformation，仅显示内存等有限信息。';
    }
    $('last').textContent = d.lastReport || '—';
    $('cur').textContent = '温度 '+cur.temperature.toFixed(1)+'°C · 电量 '+Math.round(cur.battery)+'% · 信号 '+Math.round(cur.signal)+'dBm · 电压 '+cur.voltage.toFixed(2)+'V · 背光 '+(cur.backlight?'开':'关');
  }
  refresh();
  setInterval(refresh, 1500);
</script>
</body>
</html>`;
}

function startControlPanel() {
  const readBody = (req) => new Promise((resolve) => {
    let d = '';
    req.on('data', (c) => (d += c));
    req.on('end', () => { try { resolve(d ? JSON.parse(d) : {}); } catch { resolve({}); } });
  });

  const server = http.createServer(async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

    const url = new URL(req.url, `http://localhost:${CONTROL_PORT}`);
    try {
      if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/index.html')) {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(buildHtml());
        return;
      }
      if (req.method === 'GET' && url.pathname === '/api/state') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          deviceId: DEVICE_ID,
          deviceName: DEVICE_NAME,
          backend: SUPABASE_URL,
          lastReport,
          state,
          system: systemCache,
        }));
        return;
      }
      if (req.method === 'POST' && url.pathname === '/api/state') {
        const body = await readBody(req);
        if (body.mode) state.mode = body.mode;
        if (state.mode === 'manual') {
          if (body.temperature != null) state.temperature = Number(body.temperature);
          if (body.battery != null) state.battery = clamp(Number(body.battery), 0, 100);
          if (body.signal != null) state.signal = Number(body.signal);
          if (body.voltage != null) state.voltage = Number(body.voltage);
        }
        if (body.backlight != null) state.backlight = Boolean(body.backlight);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, state }));
        return;
      }
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'not found' }));
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: String(e) }));
    }
  });

  server.listen(CONTROL_PORT, () => {
    console.log(` 控制面板: http://localhost:${CONTROL_PORT}  （浏览器打开即可调参）`);
  });
}

// ========================= 启动 =========================
const shutdown = async () => {
  console.log('\n正在停止设备...');
  await markOffline();
  console.log('设备已停止');
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

console.log(`\n==============================================`);
console.log(` ESP32 模拟设备(带控制面板)启动`);
console.log(` device_id : ${DEVICE_ID}`);
console.log(` name      : ${DEVICE_NAME}`);
console.log(` backend   : ${SUPABASE_URL}`);
console.log(` 每 ${TICK_MS / 1000}s 上报一次遥测并轮询指令`);
if (ENABLE_UI) console.log(` 控制面板 : http://localhost:${CONTROL_PORT}`);
console.log(`==============================================\n`);

// 系统信息后台定时刷新（控制面板与系统模式共用）
refreshSystem();
setInterval(refreshSystem, 2000);

if (ENABLE_UI) startControlPanel();
tick();
setInterval(tick, TICK_MS);
