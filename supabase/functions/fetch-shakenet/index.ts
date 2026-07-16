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
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "*",
});

// 数据源：社区共享网络 + 机构台网，均走 FDSN station text 标准（字段以 | 分隔）。
const SOURCES = [
  {
    source: "raspberryshake",
    label: "Raspberry Shake 社区（个人共享地震仪）",
    url: "https://data.raspberryshake.org/fdsnws/station/1/query?format=text&level=station&network=AM",
  },
  {
    source: "earthscope",
    label: "EarthScope / IRIS 机构台网",
    url: "https://service.earthscope.org/fdsnws/station/1/query?format=text&level=station&network=IU&starttime=2024-01-01&endtime=2027-12-31",
  },
];

interface RawStation {
  source: string;
  network: string;
  station: string;
  lat: number;
  lng: number;
  elevation: number | null;
  name: string | null;
  start_time: string | null;
  end_time: string | null;
}

// 解析 FDSN station text：跳过注释行，按 | 切分并 trim（兼容 RS 与 EarthScope 的空格差异）
function parseFdsnText(text: string): RawStation[] {
  const out: RawStation[] = [];
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const p = line.split("|").map((s) => s.trim());
    if (p.length < 8) continue;
    const [network, station, latS, lngS, elevS, name, startS, endS] = p;
    const lat = parseFloat(latS);
    const lng = parseFloat(lngS);
    if (!network || !station || !Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    out.push({
      source: "",
      network,
      station,
      lat,
      lng,
      elevation: elevS ? parseFloat(elevS) : null,
      name: name || null,
      start_time: startS ? new Date(startS).toISOString() : null,
      end_time: endS ? new Date(endS).toISOString() : null,
    });
  }
  return out;
}

// 同一台站(Network_Station)可能有多条时间段记录，仅保留当前活跃(无 end)或最新一条
function dedupe(rows: RawStation[]): RawStation[] {
  const map = new Map<string, RawStation>();
  for (const r of rows) {
    const key = `${r.network}_${r.station}`;
    const prev = map.get(key);
    if (!prev) {
      map.set(key, r);
      continue;
    }
    const rEnd = r.end_time || "9999-12-31";
    const pEnd = prev.end_time || "9999-12-31";
    if (rEnd > pEnd) map.set(key, r);
    else if (rEnd === pEnd && (r.start_time || "") > (prev.start_time || "")) map.set(key, r);
  }
  return [...map.values()];
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });

  try {
    const all: RawStation[] = [];
    const perSource: Record<string, number> = {};
    for (const src of SOURCES) {
      try {
        const res = await fetch(src.url, { headers: { "User-Agent": "my-forum-shakenet/1.0" } });
        if (!res.ok) {
          perSource[src.source] = -res.status;
          console.error(`源 ${src.source} 返回 ${res.status}`);
          continue;
        }
        const text = await res.text();
        const rows = parseFdsnText(text).map((r) => ({ ...r, source: src.source }));
        perSource[src.source] = rows.length;
        all.push(...rows);
      } catch (e) {
        perSource[src.source] = -1;
        console.error(`源 ${src.source} 拉取失败:`, e);
      }
    }

    const deduped = dedupe(all);
    if (deduped.length > 0) {
      const rows = deduped.map((r) => ({
        id: `${r.network}_${r.station}`,
        network: r.network,
        station: r.station,
        source: r.source,
        name: r.name,
        lat: r.lat,
        lng: r.lng,
        elevation: r.elevation,
        start_time: r.start_time,
        end_time: r.end_time,
        is_active: !r.end_time,
        last_synced: new Date().toISOString(),
      }));
      const { error } = await supabaseAdmin
        .from("community_stations")
        .upsert(rows, { onConflict: "id" });
      if (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: CORS });
      }
    }

    return new Response(
      JSON.stringify({ ok: true, total: deduped.length, perSource }),
      { status: 200, headers: CORS },
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: CORS });
  }
});
