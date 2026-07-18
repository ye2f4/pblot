#!/usr/bin/env node
/**
 * 本地设备模拟器（真实 IoT 设备代理）
 * --------------------------------------------------
 * 模拟若干台真实硬件设备，向平台：
 *   1. 注册设备（upsert）
 *   2. 周期性上报心跳 + 电量/信号/温度/电压 时序指标
 *   3. 轮询并「执行」平台下发的指令（reboot / backlight_on / backlight_off）
 *
 * 支持两种后端：
 *   DEVICE_BACKEND=supabase  （默认）写入真实 Supabase 项目（需先执行迁移）
 *   DEVICE_BACKEND=local     启动本地 HTTP 服务(:8787)，供前端 ?source=local 离线验证
 *
 * 用法：
 *   node scripts/simulate-devices.mjs                       # 连接 Supabase
 *   DEVICE_BACKEND=local node scripts/simulate-devices.mjs  # 本地离线验证
 */

import http from 'node:http';
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

// ========================= 配置 =========================
const argLocal = process.argv.includes('--local');
const argSupabase = process.argv.includes('--supabase');
const BACKEND = argLocal
  ? 'local'
  : argSupabase
    ? 'supabase'
    : (process.env.DEVICE_BACKEND || 'supabase').toLowerCase();
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://xwhwcmorcmgpfpocmgez.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh3aHdjbW9yY21ncGZwb2NtZ2V6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2ODk2MzQsImV4cCI6MjA5NjI2NTYzNH0.O5YcPuehUMjEofFdoNfE5NDxT71qtcMdYeLCvyyoQgw';
const LOCAL_PORT = Number(process.env.LOCAL_PORT || 8787);
const TICK_MS = Number(process.env.TICK_MS || 5000);

// 退出时的清理钩子（优雅停机：把模拟设备标记为离线）
const cleanupHandlers = [];

// ========================= 模拟设备定义 =========================
const SIM_DEVICES = [
  { device_id: 'SIM-ENV-01', device_name: '室内环境监测终端', baseTemp: 24.6, baseBattery: 78, baseSignal: -52 },
  { device_id: 'SIM-GW-02',  device_name: '户外网关节点',     baseTemp: 18.2, baseBattery: 42, baseSignal: -78 },
  { device_id: 'SIM-SRV-03', device_name: '机房温湿度传感器', baseTemp: 21.0, baseBattery: 95, baseSignal: -60 },
];

const COMMANDS = ['reboot', 'backlight_on', 'backlight_off'];

// ========================= 工具函数 =========================
const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
const rand = (min, max) => Math.random() * (max - min) + min;
const randInt = (min, max) => Math.floor(rand(min, max + 1));
const round2 = (v) => Math.round(v * 100) / 100;
const round3 = (v) => Math.round(v * 1000) / 1000;

// 让一个设备模型向前演化一帧（随机游走）
function stepModel(s) {
  s.battery_percent = clamp(s.battery_percent - rand(0, 0.4), 1, 100);
  s.signal_strength = Math.round(clamp(s.signal_strength + randInt(-4, 4), -110, -30));
  s.temperature = round2(s.temperature + rand(-0.3, 0.3));
  s.voltage = round3(2.8 + (s.battery_percent / 100) * 0.9);
  s.is_online = true;
  s.last_heartbeat = new Date().toISOString();
}

// 在设备模型上「执行」一条指令，返回结果描述
function applyCommand(s, command) {
  switch (command) {
    case 'reboot':
      s.last_heartbeat = new Date().toISOString();
      s.is_online = true;
      return '重启完成';
    case 'backlight_on':
      s.backlight_on = true;
      return '背光已开启';
    case 'backlight_off':
      s.backlight_on = false;
      return '背光已关闭';
    default:
      return `未知指令: ${command}`;
  }
}

// ========================= 本地 HTTP 后端 =========================
function startLocalServer() {
  // 内存状态
  const state = {
    devices: SIM_DEVICES.map((d) => ({
      id: d.device_id,
      device_id: d.device_id,
      device_name: d.device_name,
      owner_id: null,
      is_online: true,
      battery_percent: d.baseBattery,
      signal_strength: d.baseSignal,
      temperature: d.baseTemp,
      voltage: round3(2.8 + (d.baseBattery / 100) * 0.9),
      backlight_on: false,
      last_heartbeat: new Date().toISOString(),
      created_at: new Date().toISOString(),
      _simulated: true,
    })),
    metrics: {},
    commands: [],
  };

  const pushMetric = (id, dev) => {
    if (!state.metrics[id]) state.metrics[id] = [];
    const arr = state.metrics[id];
    const time = new Date().toLocaleTimeString().slice(0, 5);
    const last = arr[arr.length - 1];
    if (last && last.time === time) {
      last.battery = dev.battery_percent;
      last.signal = dev.signal_strength;
      last.temperature = dev.temperature;
    } else {
      arr.push({ time, battery: dev.battery_percent, signal: dev.signal_strength, temperature: dev.temperature });
    }
    if (arr.length > 500) arr.shift();
  };

  const sanitize = (d) => {
    const { _simulated, ...rest } = d;
    return rest;
  };

  const readBody = (req) =>
    new Promise((resolve, reject) => {
      let data = '';
      req.on('data', (c) => (data += c));
      req.on('end', () => {
        try {
          resolve(data ? JSON.parse(data) : {});
        } catch (e) {
          reject(e);
        }
      });
      req.on('error', reject);
    });

  const server = http.createServer(async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const url = new URL(req.url, `http://localhost:${LOCAL_PORT}`);
    const send = (code, obj) => {
      res.writeHead(code, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(obj));
    };

    try {
      if (req.method === 'GET' && url.pathname === '/health') return send(200, { ok: true });

      if (req.method === 'GET' && url.pathname === '/devices') {
        return send(200, state.devices.map(sanitize).sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
      }

      if (req.method === 'POST' && url.pathname === '/devices') {
        const body = await readBody(req);
        const dev = {
          id: body.device_id || randomUUID(),
          device_id: body.device_id || randomUUID(),
          device_name: body.device_name || '未命名设备',
          owner_id: body.owner_id || null,
          is_online: false,
          battery_percent: Number(body.battery_percent ?? 100),
          signal_strength: Number(body.signal_strength ?? -60),
          temperature: Number(body.temperature ?? 25),
          voltage: Number(body.voltage ?? 3.3),
          backlight_on: false,
          last_heartbeat: new Date().toISOString(),
          created_at: new Date().toISOString(),
          _simulated: false,
        };
        state.devices.unshift(dev);
        console.log(`[注册] 新设备: ${dev.device_name} (${dev.device_id})`);
        return send(200, sanitize(dev));
      }

      const m = url.pathname.match(/^\/devices\/([^/]+)\/metrics$/);
      if (req.method === 'GET' && m) {
        const id = decodeURIComponent(m[1]);
        const limit = Number(url.searchParams.get('limit') || 80);
        return send(200, (state.metrics[id] || []).slice(-limit));
      }

      if (req.method === 'POST' && url.pathname === '/commands') {
        const body = await readBody(req);
        const cmd = {
          id: randomUUID(),
          device_id: body.device_id,
          command: body.command,
          executed: false,
          result: null,
          created_at: new Date().toISOString(),
          executed_at: null,
        };
        state.commands.push(cmd);
        console.log(`[指令] 收到 ${cmd.command} -> 设备 ${cmd.device_id}`);
        return send(200, cmd);
      }

      if (req.method === 'GET' && url.pathname === '/commands') {
        const did = url.searchParams.get('device_id');
        let list = state.commands;
        if (did) list = list.filter((c) => c.device_id === did);
        if (url.searchParams.get('pending') === '1') list = list.filter((c) => !c.executed);
        return send(200, list);
      }

      send(404, { error: 'not found' });
    } catch (e) {
      send(500, { error: String(e) });
    }
  });

  server.listen(LOCAL_PORT, () => {
    console.log(`\n==============================================`);
    console.log(` 本地设备服务已启动: http://localhost:${LOCAL_PORT}`);
    console.log(` 前端验证地址: /hardware/?source=local`);
    console.log(` 已模拟 ${SIM_DEVICES.length} 台设备，每 ${TICK_MS / 1000}s 上报一次`);
    console.log(`==============================================\n`);
    startTickLoop();
  });

  function startTickLoop() {
    setInterval(() => {
      // 1) 处理待执行指令
      for (const cmd of state.commands) {
        if (cmd.executed) continue;
        const dev = state.devices.find((d) => d.id === cmd.device_id);
        if (!dev) {
          cmd.executed = true;
          cmd.result = '设备不存在';
          cmd.executed_at = new Date().toISOString();
          continue;
        }
        const result = applyCommand(dev, cmd.command);
        cmd.executed = true;
        cmd.result = result;
        cmd.executed_at = new Date().toISOString();
        console.log(`[执行] 设备 ${dev.device_name} <- ${cmd.command} : ${result}`);
      }
      // 2) 上报遥测（仅模拟设备）
      for (const dev of state.devices) {
        if (!dev._simulated) continue;
        stepModel(dev);
        pushMetric(dev.id, dev);
      }
      console.log(`[上报] ${new Date().toLocaleTimeString()} 遥测已刷新`);
    }, TICK_MS);
  }
}

// ========================= Supabase 云端后端 =========================
async function startSupabase() {
  const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // 内存中的设备模型（用于随机游走）
  const sim = {};
  for (const d of SIM_DEVICES) {
    sim[d.device_id] = {
      device_name: d.device_name,
      battery_percent: d.baseBattery,
      signal_strength: d.baseSignal,
      temperature: d.baseTemp,
      voltage: round3(2.8 + (d.baseBattery / 100) * 0.9),
      backlight_on: false,
      is_online: true,
    };
  }

  const report = (d) => {
    const s = sim[d.device_id];
    return sb.rpc('report_device_telemetry', {
      p_device_id: d.device_id,
      p_device_name: s.device_name,
      p_is_online: true,
      p_battery: Math.round(s.battery_percent),
      p_signal: Math.round(s.signal_strength),
      p_temperature: round2(s.temperature),
      p_voltage: round3(s.voltage),
      p_backlight: s.backlight_on,
    });
  };

  // 初次注册
  for (const d of SIM_DEVICES) {
    const { error } = await report(d);
    if (error) {
      console.error(`[注册失败] ${d.device_id}:`, error.message);
      console.error('请先执行 supabase/migrations/20260715_hardware_monitoring.sql 迁移');
      process.exit(1);
    }
  }

  // 建立 device_id(文本) -> UUID 映射，用于轮询指令
  const idMap = {};
  for (const d of SIM_DEVICES) {
    const { data } = await sb.from('devices').select('id').eq('device_id', d.device_id).maybeSingle();
    if (data) idMap[d.device_id] = data.id;
  }
  console.log(`\n==============================================`);
  console.log(` 已连接 Supabase 并注册 ${Object.keys(idMap).length} 台模拟设备`);
  console.log(` device UUID 映射:`, idMap);
  console.log(` 每 ${TICK_MS / 1000}s 上报一次遥测并轮询指令`);
  console.log(`==============================================\n`);

  // 优雅停机：退出前把本模拟器管理的设备标记为离线
  cleanupHandlers.push(async () => {
    const uuids = Object.values(idMap);
    if (!uuids.length) return;
    const { error } = await sb
      .from('devices')
      .update({ is_online: false, last_heartbeat: new Date().toISOString() })
      .in('device_id', uuids);
    if (error) console.error('[退出] 标记离线失败:', error.message);
    else console.log(`[退出] 已将 ${uuids.length} 台模拟设备标记为离线`);
  });

  setInterval(async () => {
    try {
      // 1) 拉取待执行指令
      const uuids = Object.values(idMap);
      if (uuids.length) {
        const { data: pending, error } = await sb
          .from('device_commands')
          .select('*')
          .in('device_id', uuids)
          .eq('executed', false);
        if (error) throw error;
        for (const cmd of pending || []) {
          const textId = Object.keys(idMap).find((k) => idMap[k] === cmd.device_id);
          const s = sim[textId];
          let result = '未知指令';
          if (s) result = applyCommand(s, cmd.command);
          const { error: upErr } = await sb
            .from('device_commands')
            .update({ executed: true, result, executed_at: new Date().toISOString() })
            .eq('id', cmd.id);
          if (upErr) console.error('[指令回写失败]', upErr.message);
          else console.log(`[执行] ${textId} <- ${cmd.command} : ${result}`);
        }
      }
      // 2) 上报遥测
      for (const d of SIM_DEVICES) {
        const { error } = await report(d);
        if (error) console.error(`[上报失败] ${d.device_id}:`, error.message);
      }
      console.log(`[上报] ${new Date().toLocaleTimeString()} 遥测已刷新`);
    } catch (e) {
      console.error('[错误]', e.message || e);
    }
  }, TICK_MS);
}

// ========================= 启动 =========================
const shutdown = async () => {
  console.log('\n正在停止模拟器...');
  for (const fn of cleanupHandlers) {
    try {
      await fn();
    } catch (e) {
      console.error('[退出] 清理异常:', e);
    }
  }
  console.log('模拟器已停止');
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

if (BACKEND === 'local') {
  startLocalServer();
} else {
  startSupabase().catch((e) => {
    console.error('启动失败:', e);
    process.exit(1);
  });
}
