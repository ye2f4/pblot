import React, { useState, useEffect, useRef } from 'react';
import Layout from '@theme/Layout';
import { translate } from '@docusaurus/Translate';

// Docusaurus 3.x 无 useTranslate hook，用 translate 函数式 API 包装成一致的 t()
const t = (...args) => {
  const [opts, values] = args;
  if (typeof opts === 'string') return translate({ id: opts }, values);
  const vals = values ?? opts?.values ?? (opts?.count !== undefined ? { count: opts.count } : undefined);
  return translate(opts, vals);
};

/* ---------- 内联图标（复刻 lucide 形状，避免引入缺失依赖） ---------- */
const Svg = ({ children, className = '', size = 24, ...rest }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...rest}
  >
    {children}
  </svg>
);
const IconArrowRight = (p) => <Svg {...p}><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></Svg>;
const IconDownload = (p) => <Svg {...p}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></Svg>;
const IconFileText = (p) => <Svg {...p}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><line x1="10" y1="9" x2="8" y2="9" /></Svg>;
const IconRadio = (p) => <Svg {...p}><circle cx="12" cy="12" r="2" /><path d="M4.93 19.07a10 10 0 0 1 0-14.14M19.07 4.93a10 10 0 0 1 0 14.14M7.76 16.24a6 6 0 0 1 0-8.48M16.24 7.76a6 6 0 0 1 0 8.48" /></Svg>;
const IconX = (p) => <Svg {...p}><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></Svg>;
const IconGlobe = (p) => <Svg {...p}><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></Svg>;
const IconSmartphone = (p) => <Svg {...p}><rect x="5" y="2" width="14" height="20" rx="2" ry="2" /><line x1="12" y1="18" x2="12" y2="18" /></Svg>;
const IconUser = (p) => <Svg {...p}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></Svg>;
const IconUsers = (p) => <Svg {...p}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></Svg>;
const IconGithub = (p) => <Svg {...p}><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" /></Svg>;
const IconDiscord = (p) => <Svg {...p}><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" /></Svg>;
const IconMastodon = (p) => <Svg {...p}><path d="M21.58 6.58A12 12 0 0 0 17.5 3.3L17.44 3.3a12 12 0 0 0-11.88 0l-.06 0a12 12 0 0 0-4.08 3.28C.7 9.1.4 12.2.6 15.28l.02.26c.33 3.3 1.36 5.2 2.77 6.46 1.9 1.86 4.04 2.8 6.4 2.96l.2.01c1.5.08 2.96-.16 4.36-.66a12 12 0 0 0 3.8-2.06l.02-.02a1 1 0 0 0-.16-1.5l-.16-.1a1 1 0 0 0-1.32.2 9.5 9.5 0 0 1-3.1 1.7c-1.2.34-2.4.42-3.56.24l-.18-.03c-1.7-.3-3.04-.96-4-1.9a8.6 8.6 0 0 1-1.74-2.86l-.06-.18a9 9 0 0 1-.22-3.5l.06-.3c.16-.78.46-1.5.86-2.16l.12-.2a1 1 0 0 1 1.34-.32l.24.18a1 1 0 0 1 .28 1.28 7 7 0 0 0-.66 1.86l-.04.18a7 7 0 0 0 .24 3.5l.06.18c.37.96.96 1.8 1.74 2.5l.16.12a9.3 9.3 0 0 0 3.16 1.7l.2.04c1.4.2 2.8.06 4.16-.42a9 9 0 0 0 2.84-1.6 1 1 0 0 1 1.4 0l.18.16a1 1 0 0 1 .2 1.34z" /><path d="M14.5 9.8v4.4h-1.7V9.95c0-.74-.32-1.12-1-1.12-.73 0-1.1.3-1.1 1v3.36H9v-4.4c0-.74-.3-1.12-1-1.12-.72 0-1.1.3-1.1 1v3.36H5.6V9.8c0-1.4.92-2.32 2.32-2.32 1 0 1.7.4 2.1 1.2.4-.8 1.1-1.2 2.1-1.2 1.4 0 2.32.92 2.32 2.32z" /></Svg>;
const IconTwitter = (p) => <Svg {...p}><path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 18.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" /></Svg>;
const IconYoutube = (p) => <Svg {...p}><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z" /><polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" /></Svg>;
const IconExternalLink = (p) => <Svg {...p}><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></Svg>;

/* ---------- 社交链接 ---------- */
const SOCIALS = [
  { icon: IconGithub, label: 'GitHub', href: 'https://github.com/ye2f4' },
  { icon: IconDiscord, label: 'Discord', href: '#' },
  { icon: IconMastodon, label: 'Mastodon', href: '#' },
  { icon: IconTwitter, label: 'Twitter', href: '#' },
  { icon: IconYoutube, label: 'YouTube', href: '#' },
];

/* ---------- 数字递增动画 ---------- */
function useCountUp(target, duration = 1200) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let raf;
    const start = performance.now();
    const tick = (now) => {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(Math.round(target * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return value;
}

const Stat = ({ value, suffix = '', label }) => {
  const v = useCountUp(value);
  return (
    <div style={{ textAlign: 'center', padding: '1rem' }}>
      <div style={{ fontSize: '2.5rem', fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: 'hsl(var(--btn-primary))' }}>
        {v.toLocaleString()}{suffix}
      </div>
      <div style={{ color: 'hsl(var(--muted-foreground))', fontSize: '0.95rem', marginTop: '0.25rem' }}>{label}</div>
    </div>
  );
};

/* ---------- 设备弹窗 ---------- */
const DEVICES = [
  { name: 'T-Beam', desc: 'GPS + LoRa 一体机，适合固定节点与追踪', price: '约 ¥180' },
  { name: 'T-Echo', desc: '墨水屏手持终端，便携易用', price: '约 ¥260' },
  { name: 'Heltec V3', desc: '高性价比开发板，社区最热门', price: '约 ¥90' },
  { name: 'RAK WisBlock', desc: '模块化方案，可自定义传感器', price: '约 ¥220' },
  { name: 'Seeed WIO Tracker', desc: '带 4G 备份通道的户外终端', price: '约 ¥300' },
  { name: 'LilyGO T-Deck', desc: '带键盘的全功能掌机', price: '约 ¥380' },
];

/* 设备刷写器：嵌入 Meshtastic 官方 Web Flasher（国内可达，支持中文，允许 iframe）。
   原"浏览设备"静态列表已替换为真实刷写工具。 */
const FLASHER_URL = 'https://flasher.meshtastic.org/';

const DeviceDialog = ({ onClose }) => {
  const [showDevices, setShowDevices] = useState(false);
  return (
    <div
      className="off-grid-dialog-mask"
      onClick={onClose}
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', overflowY: 'auto' }}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'relative',
          width: 'min(72rem, 100%)',
          height: 'min(88vh, 900px)',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: 'var(--radius)',
          border: '1px solid hsl(var(--border))',
          background: 'hsl(var(--popover))',
          color: 'hsl(var(--popover-foreground))',
          overflow: 'hidden',
          zIndex: 1,
          boxShadow: '0 20px 60px rgba(0,0,0,0.35)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.9rem 1.25rem', borderBottom: '1px solid hsl(var(--border))' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', margin: 0, fontWeight: 700 }}>{t({ id: 'offGrid.dialog.title', message: '设备刷写器' })}</h2>
            <div style={{ fontSize: '0.8rem', color: 'hsl(var(--muted-foreground))', marginTop: '0.2rem' }}>
              {t({ id: 'offGrid.dialog.sub', message: '连接设备后在此刷写 / 更新 Meshtastic 固件' })}
            </div>
          </div>
          <button onClick={onClose} aria-label={t({ id: 'offGrid.dialog.close', message: '关闭' })} style={{ background: 'none', border: 'none', color: 'hsl(var(--muted-foreground))', cursor: 'pointer', padding: 4 }}>
            <IconX size={22} />
          </button>
        </div>

        <iframe
          src={FLASHER_URL}
          title="Meshtastic Web Flasher"
          loading="lazy"
          allow="serial; bluetooth; usb"
          style={{ flex: 1, width: '100%', border: 'none', background: '#fff' }}
        />

        <div style={{ borderTop: '1px solid hsl(var(--border))', padding: '0.6rem 1.25rem', background: 'hsl(var(--surface))' }}>
          <button
            onClick={() => setShowDevices((v) => !v)}
            style={{ background: 'none', border: 'none', color: 'hsl(var(--btn-primary))', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', padding: 0 }}
          >
            {showDevices ? t({ id: 'offGrid.dialog.collapseList', message: '收起兼容设备列表' }) : t({ id: 'offGrid.dialog.viewList', message: '查看兼容设备列表' })}
          </button>
          {showDevices && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.75rem', marginTop: '0.75rem', maxHeight: '160px', overflowY: 'auto' }}>
              {DEVICES.map((d) => (
                <div key={d.name} style={{ borderRadius: 'var(--radius)', border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))', padding: '0.75rem' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '0.3rem' }}>{d.name}</div>
                  <p style={{ fontSize: '0.78rem', color: 'hsl(var(--muted-foreground))', margin: '0 0 0.5rem', lineHeight: 1.5 }}>{d.desc}</p>
                  <span style={{ fontSize: '0.8rem', color: 'hsl(var(--btn-primary))', fontWeight: 600 }}>{d.price}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};


/* ---------- 节点群语料库（后期可由 AI 生成扩充） ----------
   每条：{ who: 节点代号, text: 消息内容, self?: true 表示"我" } */
const NODE_NAMES = ['A', 'B', 'C', 'D', 'E', 'F', '野外部落', '中继-01', '山顶哨位', '海岸巡逻', '探路者', '气象站'];

// 离线消息 / 节点动态语料（覆盖上线、信号、位置、GPS、天气、加密、中继、离线等场景）
const NODE_CORPUS = [
  '收到，我在 3 号山头，信号良好',
  '中继节点已上线，覆盖范围扩大约 2 公里',
  '已切换到 LoRa 通道 0，干扰更小',
  'GPS 位置已广播，经纬度已写入节点',
  '前方河谷信号偏弱，建议绕行林木密集区',
  '加密信道已启用，消息端到端保护',
  '离线消息缓存 3 条，重新入网后已投递',
  '风速 12m/s，注意天线固定',
  'B 节点电量 78%，预计还可运行 14 小时',
  '发现新节点：F-野外营地，已自动入网',
  '雨势渐大，建议切换低频段提升穿透',
  '位置共享已开启，当前海拔 1840 米',
  '收到撤离指令，正在向集结点移动',
  '中继链路抖动，已启用备用路由',
  'C 节点进入低功耗模式，仍可被中继唤醒',
  '温度 -6℃，电池续航下降，注意保暖',
  '收到求救信标，坐标已转发给最近的哨位',
  '河道对岸有信号，可尝试桥接点中继',
  '固件已升级到 2.4.1，稳定性提升明显',
  '夜视模式下消息延迟约 1.2 秒，正常',
  'D 节点请求位置同步，已回传',
  '雪线以上信号衰减严重，需增加中继密度',
  '已抵达补给点，物资充足',
  '收到，保持静默监听，有情况再呼叫',
  '卫星电话不可用，全部走 LoRa 网络',
  'E 节点信号满格，作为主中继最合适',
  '收到天气预警：6 小时后有雷暴，建议停机',
  '加密密钥已轮换，旧消息无法解密',
  '离线期间累计收到 7 条消息，已归档',
  '发现未注册节点，已记录指纹待人工确认',
  '山体滑坡阻断原路线，启用备用通道',
  '电量告急，转入仅接收模式省电',
  '收到地图分片，正在拼接区域态势',
  '中继-01 负载 45%，链路健康',
  '夜间低温，建议把设备贴身保温',
  'A 节点移动到谷地，信号暂时丢失',
  '收到，全员平安，无人员伤亡',
  '海岸线信号受湿度影响，速率下调到 500bps',
  '已标记危险区域，后续节点自动规避',
  '测试完毕，网络自愈正常，断开任一节点仍可通信',
  '收到补给清单，核对无误',
  '探路者回报：前方 3 公里有水源',
  '加密握手成功，信道安全等级 AES-256',
  '节点密度提升后，平均延迟降到 0.8 秒',
  '收到，按计划明天清晨 6 点集合',
  '雷暴导致短时报废，雨停后恢复',
  '气象站播报：能见度 200 米，谨慎行进',
];

/* ---------- 节点群 / 离线消息 动态面板 ---------- */
const NodeChat = () => {
  const [messages, setMessages] = useState([
    { id: 0, who: '系统', text: '节点群已连接，正在监听离线消息…', self: false, sys: true },
    { id: 1, who: 'B', text: '中继已上线，欢迎入网', self: false },
    { id: 2, who: '我', text: '已切换到 LoRa 通道 0', self: true },
  ]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef(null);
  const seqRef = useRef(3);
  const corpusIdx = useRef(0);

  // 自动滚动到底部
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, typing]);

  // 模拟节点动态：定时追加一条离线消息
  useEffect(() => {
    let timer;
    const tick = () => {
      setTyping(true);
      timer = setTimeout(() => {
        const idx = corpusIdx.current % NODE_CORPUS.length;
        corpusIdx.current += 1;
        const who = NODE_NAMES[Math.floor(Math.random() * NODE_NAMES.length)];
        const text = NODE_CORPUS[idx];
        setMessages((m) => [...m, { id: seqRef.current++, who, text, self: false }]);
        setTyping(false);
        timer = setTimeout(tick, 4000 + Math.random() * 4000);
      }, 900);
    };
    timer = setTimeout(tick, 2500);
    return () => clearTimeout(timer);
  }, []);

  // AI 节点回复：优先调 /api/ai-chat（复用 XinghuisamaBlogs 线上 Gemini 接口），
  // 失败则降级到我方大语料库（NODE_CORPUS）。
  const getNodeReply = async (userText) => {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 13000);
      const res = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userText }),
        signal: ctrl.signal,
      });
      clearTimeout(timer);
      if (res.ok) {
        const data = await res.json();
        const text = (data.reply || '').trim();
        if (text) {
          return { who: NODE_NAMES[Math.floor(Math.random() * NODE_NAMES.length)], text };
        }
      }
    } catch {
      /* 走降级 */
    }
    // 降级：随机语料
    const idx = corpusIdx.current % NODE_CORPUS.length;
    corpusIdx.current += 1;
    return { who: NODE_NAMES[Math.floor(Math.random() * NODE_NAMES.length)], text: NODE_CORPUS[idx] };
  };

  const handleSend = async () => {
    const txt = input.trim();
    if (!txt || sending) return;
    setSending(true);
    const myMsg = { id: seqRef.current++, who: '我', text: txt, self: true };
    setMessages((m) => [...m, myMsg]);
    setInput('');
    setTyping(true);
    setTimeout(async () => {
      const reply = await getNodeReply(txt);
      setMessages((m) => [...m, { id: seqRef.current++, ...reply, self: false }]);
      setTyping(false);
      setSending(false);
    }, 700 + Math.random() * 600);
  };

  return (
    <div style={{ width: '100%', maxWidth: '360px', borderRadius: 'var(--radius)', border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))', overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 0.85rem', borderBottom: '1px solid hsl(var(--border))', background: 'hsl(var(--muted))' }}>
        <IconRadio size={18} />
        <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{t({ id: 'offGrid.nodeChat.title', message: '节点群 / 离线消息' })}</span>
        <span style={{ marginLeft: 'auto', fontSize: '0.7rem', color: 'hsl(var(--btn-primary))', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'hsl(var(--btn-primary))', display: 'inline-block' }} /> {t({ id: 'offGrid.nodeChat.live', message: '实时' })}
        </span>
      </div>

      <div ref={scrollRef} style={{ padding: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.6rem', minHeight: '260px', maxHeight: '300px', overflowY: 'auto' }}>
        {messages.map((m) => (
          <div key={m.id} style={{ alignSelf: m.self ? 'flex-end' : 'flex-start', maxWidth: '82%' }}>
            <div style={{
              fontSize: '0.7rem', color: 'hsl(var(--muted-foreground))', marginBottom: '0.15rem',
              textAlign: m.self ? 'right' : 'left',
            }}>{m.who}</div>
            <div style={{
              padding: '0.45rem 0.7rem', borderRadius: 'var(--radius)',
              fontSize: '0.82rem', lineHeight: 1.5,
              background: m.sys ? 'transparent' : (m.self ? 'hsl(var(--btn-primary))' : 'hsl(var(--muted))'),
              color: m.sys ? 'hsl(var(--muted-foreground))' : (m.self ? 'hsl(var(--btn-primary-foreground))' : 'hsl(var(--foreground))'),
              fontStyle: m.sys ? 'italic' : 'normal',
              textAlign: m.sys ? 'center' : 'left',
              fontSize: m.sys ? '0.78rem' : '0.82rem',
            }}>{m.text}</div>
          </div>
        ))}
        {typing && (
          <div style={{ alignSelf: 'flex-start', maxWidth: '82%' }}>
            <div style={{ fontSize: '0.7rem', color: 'hsl(var(--muted-foreground))', marginBottom: '0.15rem' }}>节点</div>
            <div style={{ padding: '0.5rem 0.7rem', borderRadius: 'var(--radius)', background: 'hsl(var(--muted))', display: 'inline-flex', gap: '4px' }}>
              {[0, 1, 2].map((i) => (
                <span key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: 'hsl(var(--muted-foreground))', animation: `og-typing 1s ${i * 0.15}s infinite` }} />
              ))}
            </div>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', padding: '0.6rem 0.7rem', borderTop: '1px solid hsl(var(--border))', background: 'hsl(var(--surface))' }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="输入消息，回车发送…"
          style={{ flex: 1, padding: '0.6rem 0.9rem', borderRadius: '26px', border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))', color: 'hsl(var(--foreground))', fontSize: '0.85rem', outline: 'none' }}
        />
        <button
          onClick={handleSend}
          disabled={sending}
          style={{ padding: '0.55rem 1.1rem', borderRadius: '26px', background: sending ? '#94e3b9' : '#07c160', color: '#fff', border: 'none', cursor: sending ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: '0.85rem' }}
        >
          {sending ? t({ id: 'offGrid.nodeChat.sending', message: '发送中' }) : t({ id: 'offGrid.nodeChat.send', message: '发送' })}
        </button>
      </div>
    </div>
  );
};

/* 打字指示器动画 */
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = '@keyframes og-typing { 0%,60%,100%{transform:translateY(0);opacity:.4} 30%{transform:translateY(-4px);opacity:1} }';
  if (!document.getElementById('og-typing-style')) { style.id = 'og-typing-style'; document.head.appendChild(style); }
}

/* ---------- 主区域 ---------- */
/* ---------- 网络地图动态背景（移植自 meshtastic 主页） ---------- */
/* 离网节点群：节点呼吸光晕 + 节点间无线电波扩散 + 背景径向渐变 */
const MAP_NODES = [
  { x: 0.18, y: 0.30 }, { x: 0.32, y: 0.55 }, { x: 0.45, y: 0.22 },
  { x: 0.58, y: 0.48 }, { x: 0.68, y: 0.32 }, { x: 0.78, y: 0.62 },
  { x: 0.40, y: 0.72 }, { x: 0.55, y: 0.80 }, { x: 0.85, y: 0.40 },
  { x: 0.25, y: 0.78 }, { x: 0.62, y: 0.68 }, { x: 0.50, y: 0.40 },
];

const MapBackground = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let raf;
    let width = 0;
    let height = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const isDark = () => document.documentElement.getAttribute('data-theme') === 'dark';

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    // 预计算节点像素位置 + 各自随机相位
    const nodes = MAP_NODES.map((n) => ({
      bx: n.x,
      by: n.y,
      phase: Math.random() * Math.PI * 2,
      speed: 0.6 + Math.random() * 0.8,
    }));

    const start = performance.now();

    const draw = (t) => {
      const elapsed = (t - start) / 1000;
      const dark = isDark();
      ctx.clearRect(0, 0, width, height);

      // 背景径向渐变
      const gx = width * 0.3;
      const gy = height * 0.3;
      const grad = ctx.createRadialGradient(gx, gy, 0, gx, gy, Math.max(width, height) * 0.8);
      if (dark) {
        grad.addColorStop(0, 'rgba(19, 73, 47, 0.22)');
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      } else {
        grad.addColorStop(0, 'rgba(27, 110, 70, 0.14)');
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      }
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      const px = nodes.map((n) => ({ x: n.bx * width, y: n.by * height }));

      // 节点间无线电波（连线脉冲）
      ctx.lineWidth = 1;
      const pulse = (Math.sin(elapsed * 0.8) + 1) / 2;
      for (let i = 0; i < px.length; i++) {
        for (let j = i + 1; j < px.length; j++) {
          const dx = px[i].x - px[j].x;
          const dy = px[i].y - px[j].y;
          const dist = Math.hypot(dx, dy);
          if (dist < Math.min(width, height) * 0.42) {
            const alpha = (1 - dist / (Math.min(width, height) * 0.42)) * 0.18 * (0.5 + pulse * 0.5);
            ctx.strokeStyle = dark
              ? `rgba(132, 224, 168, ${alpha})`
              : `rgba(27, 110, 70, ${alpha})`;
            ctx.beginPath();
            ctx.moveTo(px[i].x, px[i].y);
            ctx.lineTo(px[j].x, px[j].y);
            ctx.stroke();
          }
        }
      }

      // 节点呼吸光晕
      for (let i = 0; i < px.length; i++) {
        const n = nodes[i];
        const breath = (Math.sin(elapsed * n.speed + n.phase) + 1) / 2;
        const r = 2 + breath * 2.5;
        const halo = 10 + breath * 22;
        const cx = px[i].x;
        const cy = px[i].y;

        const hg = ctx.createRadialGradient(cx, cy, 0, cx, cy, halo);
        hg.addColorStop(0, dark
          ? `rgba(132, 224, 168, ${0.35 * (0.4 + breath * 0.6)})`
          : `rgba(27, 110, 70, ${0.35 * (0.4 + breath * 0.6)})`);
        hg.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = hg;
        ctx.beginPath();
        ctx.arc(cx, cy, halo, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = dark ? 'rgba(160, 240, 190, 0.95)' : 'rgba(27, 110, 70, 0.95)';
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();
      }

      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }} />;
};

export default function OffGridPage() {
  const [deviceDialogOpen, setDeviceDialogOpen] = useState(false);

  return (
    <Layout title="离网通信" description="去中心化、不依赖公网的 Meshtastic / LoRa 离网通信">
      <div className="off-grid-page" style={{ position: 'relative', minHeight: '100vh', background: 'hsl(var(--background))', color: 'hsl(var(--foreground))', overflow: 'hidden' }}>
        {/* 社交侧栏（桌面） */}
        <div className="off-grid-social">
          {SOCIALS.map((s) => (
            <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" aria-label={s.label} title={s.label}>
              <s.icon />
            </a>
          ))}
        </div>

        <main className="container" style={{ maxWidth: '80rem', margin: '0 auto', position: 'relative', paddingTop: '3rem', paddingBottom: '4rem' }}>
          {/* ---------- Hero ---------- */}
          <section style={{ position: 'relative', borderRadius: 'var(--radius)', overflow: 'hidden', border: '1px solid hsl(var(--border))', padding: 'clamp(2rem, 6vw, 5rem)', background: 'hsl(var(--surface))' }}>
            <div className="off-grid-mapbg">
              <MapBackground />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2" style={{ position: 'relative', zIndex: 1, gap: '2.5rem', alignItems: 'center' }}>
              <div>
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.35rem 0.8rem',
                  borderRadius: '999px', border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))',
                  fontSize: '0.8rem', color: 'hsl(var(--muted-foreground))', marginBottom: '1.25rem',
                }}>
                  <IconRadio size={16} /> {t({ id: 'offGrid.badge', message: '不依赖公网 · 去中心化' })}
                </div>
                <h1 className="font-mono" style={{ fontSize: 'clamp(2.2rem, 5vw, 3.5rem)', lineHeight: 1.1, margin: '0 0 1rem', fontWeight: 700, letterSpacing: '-0.02em' }}>
                  {t({ id: 'offGrid.heroTitleA', message: '离网也能' })}<br />{t({ id: 'offGrid.heroTitleB', message: '保持联络' })}
                </h1>
                <p style={{ fontSize: '1.05rem', color: 'hsl(var(--muted-foreground))', lineHeight: 1.75, maxWidth: '34rem', margin: '0 0 2rem' }}>
                  {t({ id: 'offGrid.heroDesc', message: 'Meshtastic 是基于 LoRa 无线电的开源项目，让你在手机没信号、断网、灾备、野外探险时，仍能通过廉价节点与身边人自由通信。无需 SIM 卡，无需基站。' })}
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <a href="https://meshtastic.org/docs/" target="_blank" rel="noopener noreferrer" className="font-mono" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.7rem 1.2rem', borderRadius: 'var(--radius)', background: 'hsl(var(--btn-primary))', color: 'hsl(var(--btn-primary-foreground))', textDecoration: 'none', fontWeight: 600, fontSize: '0.95rem' }}>
                    {t({ id: 'offGrid.readDocs', message: '阅读文档' })} <IconArrowRight size={18} />
                  </a>
                  <a href="#download" className="font-mono" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.7rem 1.2rem', borderRadius: 'var(--radius)', border: '1px solid hsl(var(--border))', color: 'hsl(var(--foreground))', textDecoration: 'none', fontWeight: 600, fontSize: '0.95rem', background: 'hsl(var(--card))' }}>
                    下载应用 <IconDownload size={18} />
                  </a>
                  <button onClick={() => setDeviceDialogOpen(true)} className="font-mono" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.7rem 1.2rem', borderRadius: 'var(--radius)', border: '1px solid hsl(var(--border))', color: 'hsl(var(--foreground))', background: 'transparent', cursor: 'pointer', fontWeight: 600, fontSize: '0.95rem' }}>
                    {t({ id: 'offGrid.flasher', message: '设备刷写器' })} <IconSmartphone size={18} />
                  </button>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <NodeChat />
              </div>
            </div>
          </section>

          {/* ---------- 统计 ---------- */}
          <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginTop: '2.5rem', borderRadius: 'var(--radius)', border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))', padding: '1.5rem 0' }}>
            <Stat value={30000} suffix="+" label={t({ id: 'offGrid.stat.nodes', message: '公网节点' })} />
            <Stat value={220} suffix="+" label={t({ id: 'offGrid.stat.countries', message: '覆盖国家' })} />
            <Stat value={100} suffix="%" label={t({ id: 'offGrid.stat.open', message: '开源免费' })} />
            <Stat value={0} suffix="" label={t({ id: 'offGrid.stat.noSim', message: '无需 SIM 卡' })} />
          </section>

          {/* ---------- 特性 ---------- */}
          <section style={{ marginTop: '3.5rem' }}>
            <h2 className="font-mono" style={{ fontSize: '1.8rem', textAlign: 'center', margin: '0 0 0.5rem', fontWeight: 700 }}>{t({ id: 'offGrid.featuresTitle', message: '为什么选择离网通信' })}</h2>
            <p style={{ textAlign: 'center', color: 'hsl(var(--muted-foreground))', margin: '0 0 2rem' }}>{t({ id: 'offGrid.featuresSub', message: '一套运行在 LoRa 之上的去中心化通信协议' })}</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem' }}>
              {[
                { icon: IconRadio, title: t({ id: 'offGrid.feat.decentralized', message: '去中心化网络' }), desc: t({ id: 'offGrid.feat.decentralizedDesc', message: '无中心服务器，节点间自动中继转发，网络自愈。' }) },
                { icon: IconGlobe, title: t({ id: 'offGrid.feat.range', message: '超远传输距离' }), desc: t({ id: 'offGrid.feat.rangeDesc', message: 'LoRa 远距离特性，空旷环境可达数公里至十余公里。' }) },
                { icon: IconUser, title: t({ id: 'offGrid.feat.encrypt', message: '端到端加密' }), desc: t({ id: 'offGrid.feat.encryptDesc', message: '消息可选加密，保护你的通信隐私不被窃听。' }) },
                { icon: IconUsers, title: t({ id: 'offGrid.feat.group', message: '群组与位置共享' }), desc: t({ id: 'offGrid.feat.groupDesc', message: '支持群聊、GPS 位置广播与离线消息留存。' }) },
                { icon: IconSmartphone, title: t({ id: 'offGrid.feat.phone', message: '手机直连' }), desc: t({ id: 'offGrid.feat.phoneDesc', message: '通过蓝牙 / WiFi 与手机 App 配对，无需流量。' }) },
                { icon: IconDownload, title: t({ id: 'offGrid.feat.open', message: '开源免费' }), desc: t({ id: 'offGrid.feat.openDesc', message: '固件与 App 全部开源，硬件成本仅需几十元。' }) },
              ].map((f) => (
                <div key={f.title} style={{ borderRadius: 'var(--radius)', border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))', padding: '1.5rem' }}>
                  <div style={{ width: '2.75rem', height: '2.75rem', borderRadius: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'hsl(var(--muted))', color: 'hsl(var(--btn-primary))', marginBottom: '1rem' }}>
                    <f.icon size={22} />
                  </div>
                  <h3 style={{ fontSize: '1.1rem', margin: '0 0 0.5rem', fontWeight: 600 }}>{f.title}</h3>
                  <p style={{ fontSize: '0.92rem', color: 'hsl(var(--muted-foreground))', margin: 0, lineHeight: 1.65 }}>{f.desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* ---------- 下载区 ---------- */}
          <section id="download" style={{ marginTop: '3.5rem', borderRadius: 'var(--radius)', border: '1px solid hsl(var(--border))', background: 'hsl(var(--surface))', padding: 'clamp(1.5rem, 4vw, 3rem)', textAlign: 'center' }}>
            <h2 className="font-mono" style={{ fontSize: '1.8rem', margin: '0 0 0.5rem', fontWeight: 700 }}>{t({ id: 'offGrid.downloadTitle', message: '准备搭建你的网络？' })}</h2>
            <p style={{ color: 'hsl(var(--muted-foreground))', margin: '0 0 2rem' }}>{t({ id: 'offGrid.downloadSub', message: '下载 Meshtastic App，烧录固件到设备，几分钟内即可离线通信。' })}</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', justifyContent: 'center' }}>
              <a href="https://play.google.com/store/apps/details?id=com.meshtastic" target="_blank" rel="noopener noreferrer" className="font-mono" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.7rem 1.2rem', borderRadius: 'var(--radius)', background: 'hsl(var(--btn-primary))', color: 'hsl(var(--btn-primary-foreground))', textDecoration: 'none', fontWeight: 600, fontSize: '0.95rem' }}>
                <IconDownload size={18} /> 安卓 App
              </a>
              <a href="https://apps.apple.com/us/app/meshtastic/id1604860819" target="_blank" rel="noopener noreferrer" className="font-mono" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.7rem 1.2rem', borderRadius: 'var(--radius)', border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))', color: 'hsl(var(--foreground))', textDecoration: 'none', fontWeight: 600, fontSize: '0.95rem' }}>
                <IconDownload size={18} /> iOS App
              </a>
              <a href="https://meshtastic.org/docs/" target="_blank" rel="noopener noreferrer" className="font-mono" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.7rem 1.2rem', borderRadius: 'var(--radius)', border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))', color: 'hsl(var(--foreground))', textDecoration: 'none', fontWeight: 600, fontSize: '0.95rem' }}>
                <IconFileText size={18} /> 查看文档
              </a>
            </div>
          </section>

          {/* ---------- 赞助商 ---------- */}
          <section style={{ marginTop: '3.5rem', textAlign: 'center' }}>
            <h2 className="font-mono" style={{ fontSize: '1.4rem', margin: '0 0 0.5rem', fontWeight: 700 }}>{t({ id: 'offGrid.sponsorsTitle', message: '项目支持者' })}</h2>
            <p style={{ color: 'hsl(var(--muted-foreground))', margin: '0 0 1.5rem' }}>{t({ id: 'offGrid.sponsorsSub', message: '感谢为离网通信生态贡献的社区与个人' })}</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', justifyContent: 'center' }}>
              {[t({ id: 'offGrid.sponsor.hw', message: '开源硬件厂商' }), t({ id: 'offGrid.sponsor.radio', message: '无线电爱好者社区' }), t({ id: 'offGrid.sponsor.rescue', message: '野外救援志愿者' }), t({ id: 'offGrid.sponsor.dev', message: '独立开发者' })].map((s) => (
                <span key={s} style={{ padding: '0.5rem 1rem', borderRadius: '999px', border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))', color: 'hsl(var(--muted-foreground))', fontSize: '0.9rem' }}>
                  {s}
                </span>
              ))}
            </div>
          </section>
        </main>

        {/* 移动端社交横条 */}
        <div className="off-grid-social-mobile">
          {SOCIALS.map((s) => (
            <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" aria-label={s.label} title={s.label}>
              <s.icon size={22} />
            </a>
          ))}
        </div>

        {/* 设备弹窗 */}
        {deviceDialogOpen && <DeviceDialog onClose={() => setDeviceDialogOpen(false)} />}
      </div>
    </Layout>
  );
}