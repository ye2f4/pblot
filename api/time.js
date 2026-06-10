// /api/time.js
export const config = {
  runtime: 'edge',
};

const TIME_API = 'https://worldtimeapi.org/api/timezone/Asia/Shanghai';

export default async function handler(req) {
  // 只允许 GET
  if (req.method !== 'GET') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  try {
    const res = await fetch(TIME_API, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
      },
    });

    const data = await res.json();

    return new Response(JSON.stringify({
      success: true,
      timestamp: Date.parse(data.datetime),
      datetime: data.datetime,
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 's-maxage=30, stale-while-revalidate',
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({
      success: false,
      error: 'failed',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

