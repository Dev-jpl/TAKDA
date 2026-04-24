"use client";

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { ModuleDefinition, ModuleEntry, getModuleEntries } from '@/services/modules.service';

function WidgetSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="px-4 py-4 flex flex-col gap-3 animate-pulse">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-3 bg-border-primary/50 rounded" style={{ width: `${Math.max(40, 100 - i * 15)}%` }} />
      ))}
    </div>
  );
}

function GoalProgressView({ layout, entries }: { layout: any; entries: ModuleEntry[] }) {
  const goal = layout.goal || 2000;
  const aggregateField = layout.aggregate;
  const macros = layout.macros || [];
  
  // Filter for today
  const today = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD
  const todaysEntries = entries.filter(e => {
    const d = e.data[layout.dateField];
    return d && d.startsWith(today);
  });

  const total = todaysEntries.reduce((s, e) => s + (Number(e.data[aggregateField]) || 0), 0);
  const pct = Math.min((total / goal) * 100, 100);
  const remaining = goal - total;
  const over = remaining < 0;

  return (
    <div className="px-4 py-4 flex flex-col gap-3">
      <div className="grid grid-cols-5 gap-1 text-center">
        <div>
          <p className="text-base font-bold text-text-primary">{goal}</p>
          <p className="text-[9px] text-text-tertiary">Goal</p>
        </div>
        <div className="flex items-center justify-center text-text-tertiary text-sm">−</div>
        <div>
          <p className="text-base font-bold text-text-primary">{Math.round(total)}</p>
          <p className="text-[9px] text-text-tertiary">Logged</p>
        </div>
        <div className="flex items-center justify-center text-text-tertiary text-sm">=</div>
        <div>
          <p className={`text-base font-bold ${over ? 'text-red-400' : 'text-green-400'}`}>
            {Math.abs(Math.round(remaining))}
          </p>
          <p className="text-[9px] text-text-tertiary">{over ? 'Over' : 'Left'}</p>
        </div>
      </div>
      <div className="h-2 bg-background-tertiary rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: over ? '#f87171' : '#22c55e' }}
        />
      </div>
      {/* Macros/Sub-goals */}
      {macros.length > 0 && (
        <div className="flex flex-col gap-1.5 pt-1 border-t border-border-primary/40">
          {macros.map((m: any) => {
            const val = todaysEntries.reduce((s, e) => s + (Number(e.data[m.key]) || 0), 0);
            return (
              <div key={m.label} className="flex items-center gap-2">
                <p className="text-[9px] text-text-tertiary w-10 shrink-0">{m.label}</p>
                <div className="flex-1 h-1.5 bg-background-tertiary rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${Math.min((val / m.goal) * 100, 100)}%`, backgroundColor: m.color }} />
                </div>
                <p className="text-[9px] text-text-secondary w-10 text-right shrink-0">{Math.round(val)}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

type TrendPer = 'week' | 'month' | 'year';

function TrendBar({ bars, labels, hex, currency }: { bars: number[]; labels: string[]; hex: string; currency: string }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const [locked, setLocked] = useState<number | null>(null);
  const H = 64; const count = bars.length; const maxVal = Math.max(...bars, 1);
  const barW = Math.max(8, Math.floor(280 / count)); const W = barW * count;
  const fmtFull = (v: number) => v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtK = (v: number) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(Math.round(v));
  
  const activeIdx = locked ?? hovered;
  const hovPct = activeIdx !== null ? ((activeIdx * barW + barW * 0.5) / W) * 100 : 0;

  return (
    <div className="w-full relative" style={{ overflowX: 'visible' }}>
      {activeIdx !== null && bars[activeIdx] > 0 && (
        <div className="absolute z-20 pointer-events-none" style={{ bottom: '100%', left: `${hovPct}%`, transform: 'translateX(-50%)', marginBottom: 6 }}>
          <div className="bg-background-primary border border-border-primary rounded-md px-2 py-1 shadow-lg whitespace-nowrap">
            <p className="text-[9px] text-text-tertiary">{labels[activeIdx]}</p>
            <p className="text-[11px] font-bold text-text-primary">{currency} {fmtFull(bars[activeIdx])}</p>
          </div>
          <div className="w-1.5 h-1.5 bg-background-primary border-r border-b border-border-primary rotate-45 mx-auto -mt-1" />
        </div>
      )}
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${H + 18}`} style={{ minWidth: Math.min(W, 220), width: '100%' }}>
          {bars.map((val, i) => {
            const bh = val > 0 ? Math.max(2, (val / maxVal) * H) : 0;
            const x = i * barW + barW * 0.12; const bw = barW * 0.76; const isActive = activeIdx === i;
            return (
              <g key={i} 
                onMouseEnter={() => setHovered(i)} 
                onMouseLeave={() => setHovered(null)} 
                onClick={() => setLocked(locked === i ? null : i)}
                style={{ cursor: val > 0 ? 'pointer' : 'default' }}>
                <rect x={x} y={0} width={bw} height={H} rx={2} fill={hex} opacity={isActive ? 0.15 : 0.08} />
                {bh > 0 && <rect x={x} y={H - bh} width={bw} height={bh} rx={2} fill={hex} opacity={isActive ? 1 : 0.85} />}
                <text x={x + bw / 2} y={H + 12} textAnchor="middle" fontSize={Math.max(6, Math.min(9, barW * 0.55))} fill={isActive ? hex : '#6b7280'}>{labels[i]}</text>
              </g>
            );
          })}
        </svg>
        <div className="flex justify-between mt-0.5">
          <span className="text-[9px] text-text-tertiary">{currency} 0</span>
          <span className="text-[9px] text-text-tertiary">{currency} {fmtK(maxVal)}</span>
        </div>
      </div>
    </div>
  );
}

function TrendChartView({ layout, entries }: { layout: any; entries: ModuleEntry[] }) {
  const [trendPer, setTrendPer] = useState<TrendPer>('month');
  const currency = layout.defaultCurrency || '';
  const hex = layout.hex || '#D85A30';
  const aggField = layout.aggregate;
  const dateField = layout.dateField;
  const catField = layout.categoryField;

  const now = new Date();
  const curMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const monthEntries = useMemo(() => entries.filter(e => {
    const d = e.data[dateField]; return d && String(d).startsWith(curMonth);
  }), [entries, dateField, curMonth]);

  const total = monthEntries.reduce((s, e) => s + (Number(e.data[aggField]) || 0), 0);
  const avgDaily = monthEntries.length > 0 ? total / new Date().getDate() : 0;

  const today = new Date().toLocaleDateString('en-CA');
  const todayEntries = entries.filter(e => {
    const d = e.data[dateField]; return d && String(d).startsWith(today);
  });
  const todayTotal = todayEntries.reduce((s, e) => s + (Number(e.data[aggField]) || 0), 0);

  const highest = monthEntries.length > 0 ? monthEntries.reduce((max, e) => (Number(e.data[aggField]) || 0) > (Number(max.data[aggField]) || 0) ? e : max, monthEntries[0]) : null;
  const lowest = monthEntries.length > 0 ? monthEntries.reduce((min, e) => (Number(e.data[aggField]) || 0) < (Number(min.data[aggField]) || 0) ? e : min, monthEntries[0]) : null;

  const fmt = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtDate = (iso: string) => {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  const trendData = useMemo(() => {
    if (trendPer === 'week') {
      const day = now.getDay();
      const weekStart = new Date(now); weekStart.setDate(now.getDate() - (day === 0 ? 6 : day - 1)); weekStart.setHours(0,0,0,0);
      const days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
      const bars = days.map((_, i) => { const d = new Date(weekStart); d.setDate(d.getDate() + i); const ds = d.toISOString().split('T')[0]; return entries.filter(e => e.data[dateField] === ds).reduce((s, e) => s + (Number(e.data[aggField]) || 0), 0); });
      return { bars, labels: days };
    }
    if (trendPer === 'month') {
      const dim = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      const bars = Array.from({ length: dim }, (_, i) => { const ds = `${curMonth}-${String(i+1).padStart(2,'0')}`; return monthEntries.filter(e => e.data[dateField] === ds).reduce((s, e) => s + (Number(e.data[aggField]) || 0), 0); });
      const labels = Array.from({ length: dim }, (_, i) => (i+1) % 5 === 1 ? String(i+1) : '');
      return { bars, labels };
    }
    const bars = Array.from({ length: 12 }, (_, i) => { const m = `${now.getFullYear()}-${String(i+1).padStart(2,'0')}`; return entries.filter(e => String(e.data[dateField] || '').startsWith(m)).reduce((s, e) => s + (Number(e.data[aggField]) || 0), 0); });
    return { bars, labels: ['J','F','M','A','M','J','J','A','S','O','N','D'] };
  }, [trendPer, entries, monthEntries, aggField, dateField]);

  // Category donut
  const catMap: Record<string, number> = {};
  monthEntries.forEach(e => { const c = e.data[catField] || 'Other'; catMap[c] = (catMap[c] ?? 0) + (Number(e.data[aggField]) || 0); });
  const cats = Object.entries(catMap).sort((a, b) => b[1] - a[1]);
  const CAT_HEX: Record<string, string> = { 
    general:'#94a3b8', food:'#fb923c', transport:'#60a5fa', health:'#f87171', 
    entertainment:'#c084fc', shopping:'#f472b6', utilities:'#facc15', other:'#6b7280',
    meal:'#fb923c', snack:'#facc15', drink:'#60a5fa'
  };
  const R = 24; const CIRC = 2 * Math.PI * R; let cumPct = 0;
  const segs = cats.map(([cat, amt]) => { const pct = total > 0 ? (amt/total)*100 : 0; const dash = (pct/100)*CIRC; const gap = CIRC - dash; const offset = CIRC - (cumPct/100)*CIRC; cumPct += pct; return { cat, amt, dash, gap, offset, color: CAT_HEX[cat.toLowerCase()] ?? hex }; });

  const periods: { key: TrendPer; label: string }[] = [{ key: 'week', label: '7D' }, { key: 'month', label: '1M' }, { key: 'year', label: '1Y' }];

  return (
    <div className="px-4 py-4 flex flex-col gap-3 h-full">
      <div className="flex gap-4">
        <div className="flex-[1.2] bg-background-tertiary p-3 rounded-xl border border-border-primary/50">
          <p className="text-[9px] font-bold text-text-tertiary uppercase tracking-widest">This Month</p>
          <p className="text-xl font-bold text-text-primary mt-0.5">{currency && `${currency} `}{fmt(total)}</p>
        </div>
        
        <div className="flex-1 bg-background-tertiary p-3 rounded-xl border border-border-primary/50">
          <p className="text-[9px] font-bold text-text-tertiary uppercase tracking-widest">Today</p>
          <p className="text-lg font-bold text-text-primary mt-0.5">{currency && `${currency} `}{fmt(todayTotal)}</p>
        </div>
      </div>
      {cats.length > 0 && (
        <div className="flex flex-col gap-3">
          <p className="text-[9px] font-bold text-text-tertiary uppercase tracking-widest px-1 mt-2">Breakdown</p>
          <div className="flex gap-3 items-center">
            <svg width={60} height={60} viewBox="0 0 60 60" style={{ flexShrink: 0 }}>
              <circle cx={30} cy={30} r={R} fill="none" stroke="var(--background-tertiary,#1f2937)" strokeWidth={9} />
              {segs.map((seg, i) => <circle key={i} cx={30} cy={30} r={R} fill="none" stroke={seg.color} strokeWidth={9} strokeDasharray={`${seg.dash} ${seg.gap}`} strokeDashoffset={seg.offset} transform="rotate(-90 30 30)" />)}
            </svg>
            <div className="flex-1 flex flex-col gap-1 min-w-0">
              {segs.slice(0, 4).map(seg => (
                <div key={seg.cat} className="flex items-center gap-1.5 min-w-0">
                  <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: seg.color }} />
                  <span className="text-[9px] text-text-secondary truncate flex-1">{seg.cat}</span>
                  <span className="text-[9px] text-text-tertiary shrink-0">{fmt(seg.amt)}</span>
                </div>
              ))}
            </div>
          </div>
          
          <div className="bg-background-tertiary/60 rounded-xl p-3 border border-border-primary/50 flex justify-between mt-1">
            <div className="flex-1">
              <p className="text-[9px] font-bold text-status-high uppercase tracking-widest">Average</p>
              <p className="text-[13px] font-bold text-text-primary mt-0.5">{currency && `${currency} `}{fmt(avgDaily)}</p>
              <p className="text-[8px] text-text-tertiary">Per Day</p>
            </div>
            {highest && (
              <div className="flex-1 text-center">
                <p className="text-[9px] font-bold text-status-urgent uppercase tracking-widest">Highest</p>
                <p className="text-[13px] font-bold text-text-primary mt-0.5">{currency && `${currency} `}{fmt(Number(highest.data[aggField]))}</p>
                <p className="text-[8px] text-text-tertiary">{fmtDate(highest.data[dateField])}</p>
              </div>
            )}
            {lowest && (
              <div className="flex-1 text-right">
                <p className="text-[9px] font-bold text-status-low uppercase tracking-widest">Lowest</p>
                <p className="text-[13px] font-bold text-text-primary mt-0.5">{currency && `${currency} `}{fmt(Number(lowest.data[aggField]))}</p>
                <p className="text-[8px] text-text-tertiary">{fmtDate(lowest.data[dateField])}</p>
              </div>
            )}
          </div>
        </div>
      )}
      <div className="border-t border-border-primary/40 pt-3 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <p className="text-[9px] font-bold text-text-tertiary uppercase tracking-widest">Trend</p>
          <div className="flex gap-1">
            {periods.map(p => (
              <button key={p.key} onClick={() => setTrendPer(p.key)}
                className={`text-[9px] font-semibold px-1.5 py-0.5 rounded transition-colors ${trendPer === p.key ? 'text-white' : 'text-text-tertiary hover:text-text-secondary'}`}
                style={trendPer === p.key ? { backgroundColor: hex + '33', color: hex } : {}}>
                {p.label}
              </button>
            ))}
          </div>
        </div>
        <TrendBar bars={trendData.bars} labels={trendData.labels} hex={hex} currency={currency} />
      </div>
    </div>
  );
}

export function DynamicModuleView({ definition, hubId, userId, _mockEntries }: { definition: ModuleDefinition; hubId: string; userId?: string; _mockEntries?: ModuleEntry[] }) {
  const [entries, setEntries] = useState<ModuleEntry[]>(_mockEntries ?? []);
  const [loading, setLoading] = useState(!_mockEntries);

  const load = useCallback(() => {
    if (_mockEntries) return;
    setLoading(true);
    getModuleEntries(definition.id, hubId, userId)
      .then(data => {
        // Sort by the defined date field descending
        const dateField = definition.layout?.dateField || 'created_at';
        const sorted = [...data].sort((a, b) => {
          const valA = (a.data?.[dateField] || a[dateField] || '');
          const valB = (b.data?.[dateField] || b[dateField] || '');
          return String(valB).localeCompare(String(valA));
        });
        setEntries(sorted);
      })
      .catch(() => setEntries([]))
      .finally(() => setLoading(false));
  }, [definition.id, hubId, userId, _mockEntries, definition.layout?.dateField]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (_mockEntries) return;
    const handler = () => load();
    window.addEventListener('takda:data_updated', handler);
    return () => window.removeEventListener('takda:data_updated', handler);
  }, [load, _mockEntries]);

  if (loading) return <WidgetSkeleton rows={3} />;

  if (definition.layout?.type === 'goal_progress') {
    return <GoalProgressView layout={definition.layout} entries={entries} />;
  }
  
  if (definition.layout?.type === 'trend_chart') {
    return <TrendChartView layout={definition.layout} entries={entries} />;
  }

  return (
    <div className="px-4 py-4 text-center">
      <p className="text-sm text-text-tertiary">Unsupported layout type</p>
    </div>
  );
}
