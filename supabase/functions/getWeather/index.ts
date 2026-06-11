import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const OM_BASE_URL = "https://api.open-meteo.com/v1/forecast";

serve(async (req: Request) => {
  const allowDomains: string[] = ["https://monoblog.cc.cd", "http://localhost:3000"];
  const origin = req.headers.get("origin") || "";
  const headers = new Headers();

  headers.set("Content-Type", "application/json");
  if (allowDomains.includes(origin)) {
    headers.set("Access-Control-Allow-Origin", origin);
  }
  headers.set("Access-Control-Allow-Methods", "GET,OPTIONS,POST");
  headers.set("Access-Control-Allow-Headers", "*");

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }

  try {
    let lat = 39.9042;
    let lon = 116.4074;

    if (req.method === "POST") {
      const body = await req.json();
      if (body.lat && body.lon) {
        lat = Number(String(body.lat).trim());
        lon = Number(String(body.lon).trim());
      }
    }

    const params = new URLSearchParams({
      latitude: lat.toString(),
      longitude: lon.toString(),
      current: "temperature_2m",
      timezone: "auto"
    });

    const targetUrl = `${OM_BASE_URL}?${params.toString()}`;
    const omRes = await fetch(targetUrl, { signal: AbortSignal.timeout(8000) });

    if (!omRes.ok) {
      throw new Error(`Open-Meteo status code: ${omRes.status}`);
    }
    const weatherData = await omRes.json();

    return new Response(JSON.stringify(weatherData), {
      status: 200,
      headers
    });

  } catch (err) {
    const errMsg = err instanceof Error ? err.message : "未知请求错误";
    return new Response(
      JSON.stringify({ error: errMsg }),
      { status: 500, headers }
    );
  }
});