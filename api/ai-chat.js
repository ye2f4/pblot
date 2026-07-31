// /api/ai-chat.js
// Vercel Edge 函数：节点群 AI 回复代理。
// 复用 XinghuisamaBlogs 线上接口（https://www.xinghuisama.top/api/chat），
// 由服务端转发，规避浏览器跨域（对方接口未带 CORS 头）。
//
// 人格说明：对方接口的 systemPrompt 固定为"煤球猫娘"，无法在请求里覆盖。
// 若想改用"离网通信助手"人格，请在 my-forum 的 Vercel 环境变量加入 GEMINI_API_KEY，
// 并把下方 USE_DIRECT_GEMINI 置为 true（届时走直连 Gemini + OFFGRID_SYSTEM_PROMPT）。
export const config = { runtime: 'edge' };

const UPSTREAM = 'https://www.xinghuisama.top/api/chat';

// 离网通信助手人格（直连 Gemini 时使用）
const OFFGRID_SYSTEM_PROMPT =
  '你是离网通信网络里的一个 LoRa 节点助手，代号随场景变化。' +
  '你用简短、冷静、带一点野外求生感的口吻回复，像在对讲机里说话。' +
  '内容围绕离网通信：信号、中继、GPS 位置、加密、电量、天气、离线消息投递、应急联络等。' +
  '每次回复不超过 60 字，不承认自己是 AI，就像真实节点在回话。';

const MODEL_ID = 'gemini-2.5-flash-lite';

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  const message = (body.message || '').toString().slice(0, 1000);
  if (!message.trim()) {
    return new Response(JSON.stringify({ error: 'Empty message' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // 直连 Gemini（需 my-forum Vercel 配置 GEMINI_API_KEY + 取消下方注释）
  // if (process.env.GEMINI_API_KEY) { return await callGemini(message); }

  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 12000);
    const res = await fetch(UPSTREAM, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return new Response(
        JSON.stringify({ error: data.error || 'Upstream error', details: data.details }),
        { status: 502, headers: { 'Content-Type': 'application/json' } }
      );
    }
    return new Response(JSON.stringify({ reply: data.reply || '' }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ error: 'Upstream unreachable: ' + String(e.message || e) }),
      { status: 502, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// 离连 Gemini（可选路径，当前未启用）
async function callGemini(message) {
  const apiKey = process.env.GEMINI_API_KEY.trim();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_ID}:generateContent?key=${apiKey}`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: OFFGRID_SYSTEM_PROMPT }] },
        contents: [{ parts: [{ text: message }] }],
        generationConfig: { maxOutputTokens: 120, temperature: 0.7 },
      }),
    });
    const data = await res.json();
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return new Response(JSON.stringify({ reply }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ error: 'Gemini error: ' + String(e.message || e) }),
      { status: 502, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
