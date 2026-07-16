import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// 通用 FDSN Web Service 代理：
// - service=station&level=channel：返回台站通道清单（文本），前端解析出可选通道。
// - service=dataselect：以二进制(octet-stream)透传 miniSEED 波形，前端用 miniseed.js 解码。
// 浏览器直连 FDSN 服务器常受 CORS 限制，故统一经本函数代理；部署时加 --no-verify-jwt。
const BASE: Record<string, string> = {
  raspberryshake: "https://data.raspberryshake.org/fdsnws",
  earthscope: "https://service.earthscope.org/fdsnws",
};

const CORS = new Headers({
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "*",
});

function json(obj: unknown, status = 200): Response {
  return new Response(JSON.stringify(obj), { status, headers: CORS });
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });

  try {
    const url = new URL(req.url);
    const q = url.searchParams;
    const source = q.get("source") || "";
    const service = q.get("service") || "dataselect";
    const base = BASE[source];
    if (!base) return json({ error: "未知的 source，仅支持 raspberryshake / earthscope" }, 400);

    let target = "";
    if (service === "station") {
      const level = q.get("level") || "channel";
      target =
        `${base}/station/1/query?format=text&level=${level}` +
        `&network=${q.get("network") || ""}` +
        `&station=${q.get("station") || ""}` +
        (q.get("starttime") ? `&starttime=${q.get("starttime")}` : "") +
        (q.get("endtime") ? `&endtime=${q.get("endtime")}` : "");
    } else {
      target =
        `${base}/dataselect/1/query` +
        `?network=${q.get("network") || ""}` +
        `&station=${q.get("station") || ""}` +
        `&location=${q.get("location") || "*"}` +
        `&channel=${q.get("channel") || "*"}` +
        `&starttime=${q.get("starttime") || ""}` +
        `&endtime=${q.get("endtime") || ""}`;
    }

    const upstream = await fetch(target, {
      headers: { "User-Agent": "my-forum-shakenet/1.0" },
      redirect: "follow",
    });

    if (service === "dataselect") {
      const status = upstream.status;
      // 204/205/304 等状态码不允许带响应体，Deno 会抛 “null body status cannot have body”
      const noBody = status === 204 || status === 205 || status === 304 || status === 202;
      const buf = noBody ? new Uint8Array(0) : await upstream.arrayBuffer();
      const headers = new Headers({
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/octet-stream",
        "X-Upstream-Status": String(status),
        "X-Upstream-Type": upstream.headers.get("Content-Type") || "",
      });
      return new Response(noBody ? null : buf, { status, headers });
    }

    const text = await upstream.text();
    return new Response(text, {
      status: upstream.status,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "text/plain; charset=utf-8",
        "X-Upstream-Status": String(upstream.status),
      },
    });
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
});
