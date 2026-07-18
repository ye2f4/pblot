import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.33.1";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const CORS = new Headers({
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "*",
});

const MAG_THRESHOLD = 4.5; // 仅取 M>=4.5
const WINDOW_MS = 24 * 3600 * 1000; // 近 24 小时

function levelByMag(mag: number): string {
  if (mag >= 7) return "red";
  if (mag >= 6) return "orange";
  if (mag >= 5) return "yellow";
  return "blue";
}

// USGS 全球地震速报（免 key、CORS 友好）。如需国内源可替换为相应接口。
const FEED = "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson";

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });

  try {
    const res = await fetch(FEED);
    if (!res.ok) return new Response(JSON.stringify({ error: "拉取 USGS 失败: " + res.status }), { status: 502, headers: CORS });
    const json = await res.json();
    const now = Date.now();

    const rows = (json.features || [])
      .filter((f: any) => {
        const mag = f.properties?.mag;
        const t = f.properties?.time;
        return typeof mag === "number" && mag >= MAG_THRESHOLD && typeof t === "number" && now - t < WINDOW_MS;
      })
      .map((f: any) => {
        const p = f.properties;
        const [lng, lat, depth] = f.geometry?.coordinates || [0, 0, 0];
        const mag = p.mag;
        return {
          id: `quake-${f.id}`,
          type: "earthquake",
          level: levelByMag(mag),
          region: p.place || `${lat.toFixed(2)}, ${lng.toFixed(2)}`,
          title: `地震速报 M${mag}`,
          message: `${p.place || "某地"}发生 ${mag} 级地震，震源深度约 ${depth} km。`,
          source: "USGS",
          is_active: true,
          is_auto: true,
          published_at: new Date(p.time).toISOString(),
          expires_at: new Date(p.time + WINDOW_MS).toISOString(),
        };
      });

    if (rows.length > 0) {
      const { error } = await supabaseAdmin.from("site_warnings").upsert(rows, { onConflict: "id" });
      if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: CORS });
    }

    return new Response(JSON.stringify({ ok: true, count: rows.length }), { status: 200, headers: CORS });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: CORS });
  }
});
