import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabase/supabaseClient';

// 可聚合的活动数据源（按用户关联，公开读）
const SOURCES = [
  { table: 'moments', col: 'user_id' },
  { table: 'user_submissions', col: 'author_id' },
  { table: 'forum_posts', col: 'author_id' },
  { table: 'forum_replies', col: 'author_id' },
  { table: 'article_likes', col: 'user_id' },
];

const colorFor = (c) => {
  if (c <= 0) return 'rgba(128,128,128,0.18)';
  if (c === 1) return '#bcdcfa';
  if (c <= 3) return '#7fb8ec';
  if (c <= 5) return '#3e8cd8';
  return '#1f6fb8';
};

const keyOf = (dt) =>
  `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;

export default function ContributionHeatmap({ userId }) {
  const [counts, setCounts] = useState(new Map());
  const [total, setTotal] = useState(0);
  const [activeDays, setActiveDays] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId || !supabase) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const dates = [];
      await Promise.all(
        SOURCES.map(async (s) => {
          try {
            const { data, error } = await supabase
              .from(s.table)
              .select('created_at')
              .eq(s.col, userId);
            if (!error && data) data.forEach((r) => dates.push(r.created_at));
          } catch (e) {
            // 表不存在或无权限时忽略，继续聚合其余数据源
          }
        })
      );
      if (cancelled) return;
      const map = new Map();
      dates.forEach((iso) => {
        const d = (iso || '').slice(0, 10);
        if (!d) return;
        map.set(d, (map.get(d) || 0) + 1);
      });
      setCounts(map);
      setTotal(dates.length);
      setActiveDays(map.size);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  // 构建近一年的周网格（对齐到周日）
  const today = new Date();
  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const start = new Date(end);
  start.setDate(start.getDate() - 363);
  start.setDate(start.getDate() - start.getDay());

  const weeks = [];
  const cur = new Date(start);
  while (cur <= end) {
    const week = [];
    for (let i = 0; i < 7; i++) {
      if (cur > end) {
        week.push(null);
      } else {
        const k = keyOf(cur);
        week.push({ key: k, count: counts.get(k) || 0, date: new Date(cur) });
      }
      cur.setDate(cur.getDate() + 1);
    }
    weeks.push(week);
  }

  return (
    <div style={{
      background: 'var(--ifm-card-background-color)',
      borderRadius: '16px',
      padding: '24px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <h3 style={{ margin: 0, fontSize: 18, color: 'var(--ifm-text-color)' }}>📊 贡献热力图</h3>
        <span style={{ fontSize: 13, color: 'var(--ifm-color-emphasis-600)' }}>
          共 {total} 次贡献 · {activeDays} 天活跃
        </span>
      </div>

      {loading ? (
        <div style={{ color: 'var(--ifm-color-emphasis-600)', padding: '20px 0' }}>
          <img src="/img/LOADING.gif" alt="加载中" width={56} style={{ opacity: 0.92 }} />
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <div style={{ display: 'inline-flex', gap: 4 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginRight: 4, fontSize: 10, color: 'var(--ifm-color-emphasis-500)' }}>
              {['', '一', '', '三', '', '五', ''].map((d, i) => (
                <div key={i} style={{ height: 11, lineHeight: '11px', display: 'flex', alignItems: 'center' }}>{d}</div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 3 }}>
              {weeks.map((week, wi) => (
                <div key={wi} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  {week.map((cell, di) => cell ? (
                    <div
                      key={di}
                      title={`${cell.key}：${cell.count} 次`}
                      style={{ width: 11, height: 11, borderRadius: 2, background: colorFor(cell.count) }}
                    />
                  ) : (
                    <div key={di} style={{ width: 11, height: 11 }} />
                  ))}
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 12, fontSize: 12, color: 'var(--ifm-color-emphasis-600)' }}>
            <span>少</span>
            {[0, 1, 3, 5, 8].map((c, i) => (
              <div key={i} style={{ width: 11, height: 11, borderRadius: 2, background: colorFor(c) }} />
            ))}
            <span>多</span>
          </div>
        </div>
      )}

      {!loading && total === 0 && (
        <div style={{ color: 'var(--ifm-color-emphasis-500)', fontSize: 13, marginTop: 8 }}>
          暂无活动记录，去发条说说或投稿吧～
        </div>
      )}
    </div>
  );
}
