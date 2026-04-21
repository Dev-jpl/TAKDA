"use client";

import React, { useEffect, useMemo, useState } from 'react';
import {
  TrashIcon, CheckCircleIcon, PencilSimpleIcon, FileTextIcon,
  PaperPlaneRightIcon, PuzzlePieceIcon, CircleIcon, ForkKnifeIcon,
  CurrencyDollarIcon, CalendarCheckIcon, MoonIcon, LightningIcon,
  ChartPieSliceIcon, ClockIcon, TrendUpIcon, BicycleIcon,
} from '@phosphor-icons/react';
import { ScreenWidget, WidgetType } from '@/services/screens.service';
import { Space } from '@/services/spaces.service';
import { Hub } from '@/services/hubs.service';
import { trackService, Task } from '@/services/track.service';
import { annotateService, Annotation } from '@/services/annotate.service';
import { knowledgeService, KnowledgeDocument } from '@/services/knowledge.service';
import { deliverService, Delivery } from '@/services/deliver.service';
import { getFoodLogs, getExpenses } from '@/services/addons.service';
import { eventsService, CalendarEvent } from '@/services/events.service';
import { integrationsService, StravaActivity } from '@/services/integrations.service';

// ── Icon + label per type ─────────────────────────────────────────────────────

const TYPE_META: Record<WidgetType, { label: string; icon: React.ReactNode; accent: string }> = {
  hub_overview:     { label: 'Hub Overview',    icon: <PuzzlePieceIcon    size={13} weight="bold" />, accent: 'text-modules-track'     },
  tasks:            { label: 'Tasks',            icon: <CheckCircleIcon    size={13} weight="bold" />, accent: 'text-modules-track'     },
  notes:            { label: 'Notes',            icon: <PencilSimpleIcon   size={13} weight="bold" />, accent: 'text-modules-aly'       },
  docs:             { label: 'Resources',        icon: <FileTextIcon       size={13} weight="bold" />, accent: 'text-modules-knowledge' },
  outcomes:         { label: 'Outcomes',         icon: <PaperPlaneRightIcon size={13} weight="bold" />, accent: 'text-modules-deliver'  },
  calorie_counter:  { label: 'Calorie Counter',  icon: <ForkKnifeIcon      size={13} weight="bold" />, accent: 'text-green-400'         },
  expense_tracker:  { label: 'Expense Tracker',  icon: <CurrencyDollarIcon size={13} weight="bold" />, accent: 'text-modules-deliver'  },
  upcoming_events:  { label: 'Upcoming Events',  icon: <CalendarCheckIcon  size={13} weight="bold" />, accent: 'text-modules-automate'  },
  sleep_tracker:    { label: 'Sleep Tracker',    icon: <MoonIcon           size={13} weight="bold" />, accent: 'text-indigo-400'        },
  workout_log:      { label: 'Workout Log',      icon: <LightningIcon      size={13} weight="bold" />, accent: 'text-amber-400'         },
  space_pulse:      { label: 'Space Pulse',      icon: <ChartPieSliceIcon  size={13} weight="bold" />, accent: 'text-modules-aly'       },
  quick_clock:      { label: 'Quick Clock',      icon: <ClockIcon          size={13} weight="bold" />, accent: 'text-modules-knowledge' },
  weekly_progress:  { label: 'Weekly Progress',  icon: <TrendUpIcon        size={13} weight="bold" />, accent: 'text-modules-track'     },
  upcoming_global:  { label: 'Upcoming (All)',   icon: <CalendarCheckIcon  size={13} weight="bold" />, accent: 'text-modules-automate'  },
  strava_stats:     { label: 'Strava Stats',     icon: <BicycleIcon       size={13} weight="bold" />, accent: 'text-[#fc4c02]'         },
};

// ── Sub-renderers ─────────────────────────────────────────────────────────────

function TasksWidget({ hubId }: { hubId: string }) {
  const [tasks, setTasks]     = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    trackService.getTasks(hubId).then(setTasks).finally(() => setLoading(false));
  }, [hubId]);

  if (loading) return <WidgetSkeleton rows={4} />;
  const open = tasks.filter(t => t.status !== 'done');

  return (
    <ul className="flex flex-col divide-y divide-border-primary/50">
      {open.slice(0, 8).map(t => (
        <li key={t.id} className="flex items-start gap-2.5 py-2.5 px-4">
          <CircleIcon size={14} className="mt-0.5 shrink-0 text-text-tertiary/40" />
          <span className="text-sm text-text-primary leading-snug flex-1">{t.title}</span>
          <span className={`ml-auto shrink-0 text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded ${
            t.priority === 'crucial' ? 'bg-red-500/10 text-red-400' :
            t.priority === 'high'    ? 'bg-orange-500/10 text-orange-400' :
            t.priority === 'medium'  ? 'bg-yellow-500/10 text-yellow-400' :
                                       'bg-background-tertiary text-text-tertiary'
          }`}>{t.priority}</span>
        </li>
      ))}
      {open.length === 0 && <WidgetEmpty label="All tasks done" />}
      {open.length > 8   && <p className="px-4 py-2 text-[11px] text-text-tertiary">+{open.length - 8} more</p>}
    </ul>
  );
}

function NotesWidget({ hubId }: { hubId: string }) {
  const [notes, setNotes]     = useState<Annotation[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    annotateService.getAnnotations(hubId).then(setNotes).finally(() => setLoading(false));
  }, [hubId]);

  if (loading) return <WidgetSkeleton rows={3} />;

  return (
    <ul className="flex flex-col divide-y divide-border-primary/50">
      {notes.slice(0, 6).map(n => (
        <li key={n.id} className="flex items-start gap-3 py-2.5 px-4">
          <div className="w-0.5 self-stretch rounded-full bg-modules-aly/40 shrink-0" />
          <p className="text-sm text-text-primary leading-snug line-clamp-2">{n.content}</p>
        </li>
      ))}
      {notes.length === 0 && <WidgetEmpty label="No notes yet" />}
    </ul>
  );
}

function DocsWidget({ hubId, userId }: { hubId: string; userId?: string }) {
  const [docs, setDocs]       = useState<KnowledgeDocument[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!userId) return;
    knowledgeService.getDocuments(userId, hubId).then(setDocs).finally(() => setLoading(false));
  }, [hubId, userId]);

  if (loading) return <WidgetSkeleton rows={3} />;

  return (
    <ul className="flex flex-col divide-y divide-border-primary/50">
      {docs.slice(0, 6).map(d => (
        <li key={d.id} className="flex items-center gap-2.5 py-2.5 px-4">
          <FileTextIcon size={14} className="text-modules-knowledge shrink-0" />
          <span className="text-sm text-text-primary truncate flex-1">{d.name}</span>
          <span className="text-[10px] text-text-tertiary uppercase shrink-0">{d.type}</span>
        </li>
      ))}
      {docs.length === 0 && <WidgetEmpty label="No resources yet" />}
    </ul>
  );
}

function OutcomesWidget({ hubId }: { hubId: string }) {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading]       = useState(true);
  useEffect(() => {
    deliverService.getDeliveries(hubId).then(setDeliveries).finally(() => setLoading(false));
  }, [hubId]);

  if (loading) return <WidgetSkeleton rows={3} />;

  return (
    <ul className="flex flex-col divide-y divide-border-primary/50">
      {deliveries.slice(0, 6).map(d => (
        <li key={d.id} className="flex items-start gap-2.5 py-2.5 px-4">
          <span className="text-[9px] font-bold uppercase tracking-widest mt-0.5 px-1.5 py-0.5 rounded bg-modules-deliver/10 text-modules-deliver shrink-0">{d.type}</span>
          <p className="text-sm text-text-primary leading-snug line-clamp-2">{d.content}</p>
        </li>
      ))}
      {deliveries.length === 0 && <WidgetEmpty label="No outcomes yet" />}
    </ul>
  );
}

function HubOverviewWidget({ hubId }: { hubId: string }) {
  const [tasks, setTasks]     = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    trackService.getTasks(hubId).then(t => { setTasks(t); setLoading(false); });
  }, [hubId]);

  if (loading) return <WidgetSkeleton rows={2} />;

  const done  = tasks.filter(t => t.status === 'done').length;
  const total = tasks.length;
  const pct   = total ? Math.round((done / total) * 100) : 0;

  return (
    <div className="px-4 py-3 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-sm text-text-tertiary">{done} / {total} tasks done</span>
        <span className="text-sm font-bold text-text-primary">{pct}%</span>
      </div>
      <div className="h-1.5 bg-background-tertiary rounded-full overflow-hidden">
        <div className="h-full bg-modules-track rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
      <div className="grid grid-cols-3 gap-2 mt-1">
        {(['todo', 'in_progress', 'done'] as Task['status'][]).map(s => (
          <div key={s} className="bg-background-tertiary rounded-lg p-2 text-center">
            <p className="text-lg font-bold text-text-primary">{tasks.filter(t => t.status === s).length}</p>
            <p className="text-[9px] text-text-tertiary uppercase tracking-widest">{s.replace('_', ' ')}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function CalorieCounterWidget({ hubId }: { hubId: string }) {
  const [logs,    setLogs]    = useState<Array<{ calories: number | null; protein_g: number | null; carbs_g: number | null; fat_g: number | null }>>([]);
  const [loading, setLoading] = useState(true);
  const goal = 2000;

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    getFoodLogs(hubId, today)
      .then(data => setLogs(data))
      .catch(() => setLogs([]))
      .finally(() => setLoading(false));
  }, [hubId]);

  if (loading) return <WidgetSkeleton rows={3} />;

  const total   = logs.reduce((s, l) => s + (l.calories ?? 0), 0);
  const protein = logs.reduce((s, l) => s + (l.protein_g ?? 0), 0);
  const carbs   = logs.reduce((s, l) => s + (l.carbs_g ?? 0), 0);
  const fat     = logs.reduce((s, l) => s + (l.fat_g ?? 0), 0);

  const pct      = Math.min((total / goal) * 100, 100);
  const remaining = goal - total;
  const over      = remaining < 0;

  const macros = [
    { label: 'Protein', val: protein, color: '#60a5fa', goal: 150 },
    { label: 'Carbs',   val: carbs,   color: '#fb923c', goal: 250 },
    { label: 'Fat',     val: fat,     color: '#f472b6', goal: 65  },
  ];

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
          <p className="text-[9px] text-text-tertiary">Eaten</p>
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
      {/* Macros */}
      <div className="flex flex-col gap-1.5 pt-1 border-t border-border-primary/40">
        {macros.map(m => (
          <div key={m.label} className="flex items-center gap-2">
            <p className="text-[9px] text-text-tertiary w-10 shrink-0">{m.label}</p>
            <div className="flex-1 h-1.5 bg-background-tertiary rounded-full overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${Math.min((m.val / m.goal) * 100, 100)}%`, backgroundColor: m.color }} />
            </div>
            <p className="text-[9px] text-text-secondary w-10 text-right shrink-0">{Math.round(m.val)}g</p>
          </div>
        ))}
      </div>
    </div>
  );
}

const EXP_CAT_COLORS: Record<string, string> = {
  General: '#94a3b8', Food: '#fb923c', Transport: '#60a5fa',
  Health: '#f87171', Entertainment: '#c084fc', Shopping: '#f472b6',
  Utilities: '#facc15', Other: '#6b7280',
};

type ExpRow = { amount: number; category: string; date: string };
type TrendPeriod = 'week' | 'month' | 'year';

function ExpTrendBar({ bars, labels, hex, currency }: { bars: number[]; labels: string[]; hex: string; currency: string }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const H = 72; const count = bars.length; const maxVal = Math.max(...bars, 1);
  const barW = Math.max(8, Math.floor(280 / count)); const W = barW * count;
  const fmtK = (v: number) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(Math.round(v));
  const fmtFull = (v: number) => v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="w-full overflow-x-auto relative">
      {/* Tooltip */}
      {hovered !== null && bars[hovered] > 0 && (() => {
        const x = hovered * barW + barW * 0.12; const bw = barW * 0.76;
        const cx = x + bw / 2; const pct = (cx / W) * 100;
        return (
          <div
            className="absolute -top-8 z-10 pointer-events-none"
            style={{ left: `${pct}%`, transform: 'translateX(-50%)' }}
          >
            <div className="bg-background-primary border border-border-primary rounded-md px-2 py-1 shadow-lg whitespace-nowrap">
              <p className="text-[9px] font-semibold text-text-tertiary">{labels[hovered]}</p>
              <p className="text-[11px] font-bold text-text-primary">{currency} {fmtFull(bars[hovered])}</p>
            </div>
            <div className="w-1.5 h-1.5 bg-background-primary border-r border-b border-border-primary rotate-45 mx-auto -mt-1" />
          </div>
        );
      })()}
      <svg viewBox={`0 0 ${W} ${H + 20}`} style={{ minWidth: Math.min(W, 240), width: '100%' }}>
        {bars.map((val, i) => {
          const bh = val > 0 ? Math.max(2, (val / maxVal) * H) : 0;
          const x = i * barW + barW * 0.12; const bw = barW * 0.76;
          const isHov = hovered === i;
          return (
            <g key={i}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
              style={{ cursor: val > 0 ? 'pointer' : 'default' }}
            >
              <rect x={x} y={0} width={bw} height={H} rx={2} fill={hex} opacity={isHov ? 0.15 : 0.08} />
              {bh > 0 && <rect x={x} y={H - bh} width={bw} height={bh} rx={2} fill={hex} opacity={isHov ? 1 : 0.85} />}
              <text x={x + bw / 2} y={H + 13} textAnchor="middle" fontSize={Math.max(6, Math.min(9, barW * 0.55))} fill={isHov ? hex : '#6b7280'}>{labels[i]}</text>
            </g>
          );
        })}
      </svg>
      <div className="flex justify-between mt-0.5">
        <span className="text-[9px] text-text-tertiary">{currency} 0</span>
        <span className="text-[9px] text-text-tertiary">{currency} {fmtK(maxVal)}</span>
      </div>
    </div>
  );
}

function ExpenseTrackerWidget({ hubId }: { hubId: string }) {
  const [monthExp,   setMonthExp]   = useState<ExpRow[]>([]);
  const [allExp,     setAllExp]     = useState<ExpRow[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [trendPer,   setTrendPer]   = useState<TrendPeriod>('month');
  const [allLoaded,  setAllLoaded]  = useState(false);
  const [allLoading, setAllLoading] = useState(false);
  const currency = 'PHP';
  const hex = '#D85A30';

  const now = new Date();
  const curMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  useEffect(() => {
    getExpenses(hubId, curMonth)
      .then(exps => setMonthExp(exps as ExpRow[]))
      .catch(() => setMonthExp([]))
      .finally(() => setLoading(false));
  }, [hubId]);

  // Lazy-load all expenses when week or year tab is first opened
  useEffect(() => {
    if ((trendPer === 'week' || trendPer === 'year') && !allLoaded && !allLoading) {
      setAllLoading(true);
      getExpenses(hubId)
        .then(exps => { setAllExp(exps as ExpRow[]); setAllLoaded(true); })
        .catch(() => setAllLoaded(true))
        .finally(() => setAllLoading(false));
    }
  }, [trendPer, hubId, allLoaded, allLoading]);

  const trendData = useMemo(() => {
    if (trendPer === 'week') {
      const day = now.getDay();
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
      weekStart.setHours(0, 0, 0, 0);
      const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      const bars = days.map((_, i) => {
        const d = new Date(weekStart); d.setDate(d.getDate() + i);
        const ds = d.toISOString().split('T')[0];
        return allExp.filter(e => e.date === ds).reduce((s, e) => s + e.amount, 0);
      });
      return { bars, labels: days };
    }
    if (trendPer === 'month') {
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      const bars = Array.from({ length: daysInMonth }, (_, i) => {
        const d = String(i + 1).padStart(2, '0');
        const ds = `${curMonth}-${d}`;
        return monthExp.filter(e => e.date === ds).reduce((s, e) => s + e.amount, 0);
      });
      const labels = Array.from({ length: daysInMonth }, (_, i) => (i + 1) % 5 === 1 ? String(i + 1) : '');
      return { bars, labels };
    }
    // year
    const bars = Array.from({ length: 12 }, (_, i) => {
      const m = `${now.getFullYear()}-${String(i + 1).padStart(2, '0')}`;
      return allExp.filter(e => e.date?.startsWith(m)).reduce((s, e) => s + e.amount, 0);
    });
    const labels = ['J','F','M','A','M','J','J','A','S','O','N','D'];
    return { bars, labels };
  }, [trendPer, monthExp, allExp]);

  // Daily totals for avg/high/low — must be before early return
  const dayTotals = useMemo(() => {
    const map: Record<string, number> = {};
    monthExp.forEach(e => { map[e.date] = (map[e.date] ?? 0) + e.amount; });
    return Object.entries(map).map(([date, amt]) => ({ date, amt }));
  }, [monthExp]);

  if (loading) return <WidgetSkeleton rows={2} />;

  const total = monthExp.reduce((s, e) => s + e.amount, 0);
  const fmt = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const avgSpend = dayTotals.length > 0 ? dayTotals.reduce((s, d) => s + d.amt, 0) / dayTotals.length : 0;
  const highDay  = dayTotals.length > 0 ? dayTotals.reduce((a, b) => a.amt >= b.amt ? a : b) : null;
  const lowDay   = dayTotals.length > 0 ? dayTotals.reduce((a, b) => a.amt <= b.amt ? a : b) : null;

  // Category breakdown for donut
  const catMap: Record<string, number> = {};
  monthExp.forEach(e => { catMap[e.category || 'General'] = (catMap[e.category || 'General'] ?? 0) + e.amount; });
  const cats = Object.entries(catMap).sort((a, b) => b[1] - a[1]);

  const R = 28; const CIRC = 2 * Math.PI * R;
  let cumPct = 0;
  const segments = cats.map(([cat, amt]) => {
    const pct = total > 0 ? (amt / total) * 100 : 0;
    const dash = (pct / 100) * CIRC; const gap = CIRC - dash;
    const offset = CIRC - (cumPct / 100) * CIRC;
    cumPct += pct;
    return { cat, amt, pct, dash, gap, offset, color: EXP_CAT_COLORS[cat] ?? '#6b7280' };
  });

  const periods: { key: TrendPeriod; label: string }[] = [
    { key: 'week', label: '7D' },
    { key: 'month', label: '1M' },
    { key: 'year', label: '1Y' },
  ];

  const fmtDay = (ds: string) => {
    const d = new Date(ds + 'T00:00:00');
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  return (
    <div className="px-4 py-4 flex flex-col gap-3">
      {/* Header */}
      <div>
        <p className="text-[9px] font-bold text-text-tertiary uppercase tracking-widest">This Month</p>
        <p className="text-2xl font-bold text-text-primary mt-0.5">{currency} {fmt(total)}</p>
      </div>

      {/* Donut + legend | Avg / Highest / Lowest */}
      {cats.length > 0 && (
        <div className="flex gap-3">
          {/* Left: donut + legend */}
          <div className="flex gap-2.5 items-center flex-1 min-w-0">
            <svg width={64} height={64} viewBox="0 0 72 72" style={{ flexShrink: 0 }}>
              <circle cx={36} cy={36} r={R} fill="none" stroke="var(--background-tertiary,#1f2937)" strokeWidth={10} />
              {segments.map((seg, i) => (
                <circle key={i} cx={36} cy={36} r={R} fill="none"
                  stroke={seg.color} strokeWidth={10}
                  strokeDasharray={`${seg.dash} ${seg.gap}`}
                  strokeDashoffset={seg.offset}
                  transform="rotate(-90 36 36)"
                />
              ))}
            </svg>
            <div className="flex flex-col gap-1 min-w-0">
              {segments.slice(0, 4).map(seg => (
                <div key={seg.cat} className="flex items-center gap-1.5 min-w-0">
                  <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: seg.color }} />
                  <span className="text-[9px] text-text-secondary truncate flex-1">{seg.cat}</span>
                  <span className="text-[9px] text-text-tertiary shrink-0">{fmt(seg.amt)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Divider */}
          <div className="w-px bg-border-primary/40 self-stretch" />

          {/* Right: stats */}
          <div className="flex flex-col justify-between gap-1.5 w-28 shrink-0">
            {[
              { label: 'Average', day: `${dayTotals.length}d avg`, amt: avgSpend },
              { label: 'Highest', day: highDay ? fmtDay(highDay.date) : '—', amt: highDay?.amt ?? 0 },
              { label: 'Lowest',  day: lowDay  ? fmtDay(lowDay.date)  : '—', amt: lowDay?.amt  ?? 0 },
            ].map(({ label, day, amt }) => (
              <div key={label}>
                <p className="text-[8px] font-semibold text-text-tertiary uppercase tracking-wide">{label} · {day}</p>
                <p className="text-[11px] font-bold text-text-primary">{fmt(amt)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {cats.length === 0 && <p className="text-[10px] text-text-tertiary">No expenses this month</p>}

      {/* Trend bar chart */}
      <div className="border-t border-border-primary/40 pt-3 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <p className="text-[9px] font-bold text-text-tertiary uppercase tracking-widest">Trend</p>
          <div className="flex gap-1">
            {periods.map(p => (
              <button key={p.key} onClick={() => setTrendPer(p.key)}
                className={`text-[9px] font-semibold px-1.5 py-0.5 rounded transition-colors ${
                  trendPer === p.key
                    ? 'text-[#D85A30] bg-[#D85A30]/10'
                    : 'text-text-tertiary hover:text-text-secondary'
                }`}>
                {p.label}
              </button>
            ))}
          </div>
        </div>
        {allLoading ? (
          <div className="h-10 flex items-center justify-center">
            <span className="text-[10px] text-text-tertiary">Loading…</span>
          </div>
        ) : (
          <ExpTrendBar bars={trendData.bars} labels={trendData.labels} hex={hex} currency={currency} />
        )}
      </div>

      {cats.length === 0 && <p className="text-[10px] text-text-tertiary">No expenses this month</p>}
    </div>
  );
}

// ── New hub widgets ─────────────────────────────────────────────────────────────

function UpcomingEventsWidget({ hubId, userId }: { hubId: string; userId?: string }) {
  const [events,  setEvents]  = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    const now = new Date().toISOString();
    eventsService.getEvents(userId, hubId)
      .then(evs => {
        const upcoming = evs
          .filter(e => e.start_at >= now)
          .sort((a, b) => a.start_at.localeCompare(b.start_at))
          .slice(0, 5);
        setEvents(upcoming);
      })
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  }, [hubId, userId]);

  if (loading) return <WidgetSkeleton rows={3} />;

  const fmt = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) +
      ' · ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <ul className="flex flex-col divide-y divide-border-primary/50">
      {events.map(ev => (
        <li key={ev.id} className="flex items-start gap-2.5 py-2.5 px-4">
          <CalendarCheckIcon size={13} className="mt-0.5 shrink-0 text-modules-automate" />
          <div className="min-w-0 flex-1">
            <p className="text-sm text-text-primary leading-snug truncate">{ev.title}</p>
            <p className="text-[10px] text-text-tertiary mt-0.5">{fmt(ev.start_at)}</p>
          </div>
        </li>
      ))}
      {events.length === 0 && <WidgetEmpty label="No upcoming events" />}
    </ul>
  );
}

function SleepTrackerWidget({ hubId }: { hubId: string }) {
  const [entry,   setEntry]   = useState<{ duration_h: number; quality: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    fetch(`${API}/addons/${hubId}/sleep_tracker/logs?limit=1`)
      .then(r => r.ok ? r.json() : [])
      .then((logs: { duration_h?: number; quality?: string }[]) => {
        if (logs.length > 0) setEntry({ duration_h: logs[0].duration_h ?? 0, quality: logs[0].quality ?? 'unknown' });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [hubId]);

  if (loading) return <WidgetSkeleton rows={2} />;
  if (!entry) return <WidgetEmpty label="No sleep logs yet" />;

  const qualityColor = entry.quality === 'good' ? 'text-green-400'
    : entry.quality === 'fair' ? 'text-yellow-400'
    : 'text-red-400';

  return (
    <div className="px-4 py-4 flex flex-col gap-2">
      <div className="flex items-end gap-2">
        <p className="text-2xl font-bold text-text-primary">{entry.duration_h.toFixed(1)}<span className="text-sm font-normal text-text-tertiary ml-1">h</span></p>
        <p className={`text-xs font-bold mb-0.5 ${qualityColor}`}>{entry.quality}</p>
      </div>
      <p className="text-[10px] text-text-tertiary">Last recorded sleep session</p>
    </div>
  );
}

function WorkoutLogWidget({ hubId }: { hubId: string }) {
  const [log,     setLog]     = useState<{ type: string; duration_min: number } | null>(null);
  const [count,   setCount]   = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    fetch(`${API}/addons/${hubId}/workout_log/logs`)
      .then(r => r.ok ? r.json() : [])
      .then((logs: { type?: string; duration_min?: number; logged_at?: string }[]) => {
        setCount(logs.length);
        if (logs.length > 0) {
          const latest = logs.sort((a, b) =>
            (b.logged_at ?? '').localeCompare(a.logged_at ?? '')
          )[0];
          setLog({ type: latest.type ?? 'Workout', duration_min: latest.duration_min ?? 0 });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [hubId]);

  if (loading) return <WidgetSkeleton rows={2} />;
  if (!log) return <WidgetEmpty label="No workouts logged yet" />;

  return (
    <div className="px-4 py-4 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-text-primary">{log.type}</p>
        <span className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400">
          {count} this week
        </span>
      </div>
      <p className="text-text-tertiary text-[10px]">{log.duration_min} min · last session</p>
    </div>
  );
}

// ── Global widgets (no hub) ─────────────────────────────────────────────────────

function SpacePulseWidget({ spaces, hubs }: { spaces: Space[]; hubs: Hub[] }) {
  const bySpace = spaces.map(s => ({
    ...s,
    hubCount: hubs.filter(h => h.space_id === s.id).length,
  }));

  if (spaces.length === 0) return <WidgetEmpty label="No spaces yet" />;

  return (
    <div className="px-4 py-3 flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-background-tertiary rounded-lg p-2.5 text-center">
          <p className="text-xl font-bold text-text-primary">{spaces.length}</p>
          <p className="text-[9px] text-text-tertiary uppercase tracking-widest">Spaces</p>
        </div>
        <div className="bg-background-tertiary rounded-lg p-2.5 text-center">
          <p className="text-xl font-bold text-text-primary">{hubs.length}</p>
          <p className="text-[9px] text-text-tertiary uppercase tracking-widest">Hubs</p>
        </div>
      </div>
      <ul className="flex flex-col gap-1">
        {bySpace.slice(0, 4).map(s => (
          <li key={s.id} className="flex items-center justify-between py-1">
            <p className="text-xs text-text-primary truncate flex-1">{s.name}</p>
            <span className="text-[10px] text-text-tertiary shrink-0 ml-2">{s.hubCount} hub{s.hubCount !== 1 ? 's' : ''}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function QuickClockWidget() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const time = now.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const date = now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <div className="px-4 py-4 flex flex-col gap-1">
      <p className="text-3xl font-bold text-text-primary tracking-tight leading-none">{time}</p>
      <p className="text-[11px] text-text-tertiary mt-1">{date}</p>
    </div>
  );
}

function WeeklyProgressWidget({ hubs, userId }: { hubs: Hub[]; userId?: string }) {
  const [stats, setStats]   = useState<{ done: number; total: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (hubs.length === 0) { setLoading(false); return; }
    Promise.all(hubs.map(h => trackService.getTasks(h.id).catch(() => [] as Task[])))
      .then(taskLists => {
        const all = taskLists.flat();
        setStats({ done: all.filter(t => t.status === 'done').length, total: all.length });
      })
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  if (loading) return <WidgetSkeleton rows={2} />;
  if (!stats || stats.total === 0) return <WidgetEmpty label="No tasks tracked yet" />;

  const pct = Math.round((stats.done / stats.total) * 100);

  return (
    <div className="px-4 py-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-sm text-text-tertiary">{stats.done} / {stats.total} done</span>
        <span className="text-sm font-bold text-text-primary">{pct}%</span>
      </div>
      <div className="h-1.5 bg-background-tertiary rounded-full overflow-hidden">
        <div className="h-full bg-modules-track rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
      <p className="text-[10px] text-text-tertiary">Across all {hubs.length} tracked hub{hubs.length !== 1 ? 's' : ''}</p>
    </div>
  );
}

function UpcomingGlobalWidget({ userId }: { userId?: string }) {
  const [events,  setEvents]  = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    const now = new Date().toISOString();
    eventsService.getEvents(userId, null)
      .then(evs => {
        const upcoming = evs
          .filter(e => e.start_at >= now)
          .sort((a, b) => a.start_at.localeCompare(b.start_at))
          .slice(0, 8);
        setEvents(upcoming);
      })
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) return <WidgetSkeleton rows={4} />;

  const fmt = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) +
      ' · ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <ul className="flex flex-col divide-y divide-border-primary/50">
      {events.map(ev => (
        <li key={ev.id} className="flex items-start gap-2.5 py-2.5 px-4">
          <CalendarCheckIcon size={13} className="mt-0.5 shrink-0 text-modules-automate" />
          <div className="min-w-0 flex-1">
            <p className="text-sm text-text-primary leading-snug truncate">{ev.title}</p>
            <p className="text-[10px] text-text-tertiary mt-0.5">{fmt(ev.start_at)}</p>
          </div>
        </li>
      ))}
      {events.length === 0 && <WidgetEmpty label="No upcoming events" />}
    </ul>
  );
}

function StravaStatsWidget({ userId }: { userId?: string }) {
  const [activities, setActivities] = useState<StravaActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [sport, setSport] = useState<string>('Run');

  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    integrationsService.getStravaActivities(userId, 200)
      .then(setActivities)
      .catch(() => setActivities([]))
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) return <WidgetSkeleton rows={4} />;

  // Strava mapped sports
  const filteredActs = activities.filter(a => a.sport_type === sport);

  // Monday-start week calculation (no mutation of now)
  const now = new Date();
  const startOfWeek = new Date(now);
  const day = now.getDay();
  startOfWeek.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
  startOfWeek.setHours(0, 0, 0, 0);

  const thisWeek = filteredActs.filter(a => new Date(a.start_date) >= startOfWeek);

  const totalMeters  = thisWeek.reduce((sum, a) => sum + (a.distance_meters    ?? 0), 0);
  const totalSeconds = thisWeek.reduce((sum, a) => sum + (a.moving_time_seconds ?? 0), 0);
  const totalElev    = thisWeek.reduce((sum, a) => sum + (a.total_elevation_gain ?? 0), 0);

  const formatDistStr = (meters: number) => {
    if (!meters || isNaN(meters)) return "0";
    return (meters / 1000).toFixed(1);
  };
  
  const formatTime = (secs: number) => {
    if (!secs || isNaN(secs) || secs === 0) return "0m";
    const mins = Math.floor(secs / 60);
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  const LOOKBACK_WEEKS = 12;
  const currentWeekStart = new Date(startOfWeek);

  const weeklyTotals = Array.from({ length: LOOKBACK_WEEKS }).map((_, i) => {
    const wStart = new Date(currentWeekStart);
    wStart.setDate(wStart.getDate() - (LOOKBACK_WEEKS - 1 - i) * 7);
    const wEnd = new Date(wStart);
    wEnd.setDate(wEnd.getDate() + 6);
    wEnd.setHours(23, 59, 59, 999);

    const acts = filteredActs.filter(a => {
      const actDate = new Date(a.start_date);
      return actDate >= wStart && actDate <= wEnd;
    });
    const dist = acts.reduce((sum, a) => sum + (a.distance_meters ?? 0), 0) / 1000;
    return {
      distance: isNaN(dist) ? 0 : dist,
      label: wStart.toLocaleDateString(undefined, { month: 'short' }).toUpperCase()
    };
  });

  const validDistances = weeklyTotals.map(w => w.distance).filter(d => !isNaN(d));
  // Keep maxVal safe, if 0 use 1 as ceiling for empty arrays
  const mVal = Math.max(...validDistances, 0);
  const maxVal = mVal > 0 ? mVal : 1; 

  const getX = (index: number) => ((index / (LOOKBACK_WEEKS - 1)) * 100).toFixed(2);
  const getY = (val: number) => (100 - (val / maxVal) * 100).toFixed(2);
  
  const points = weeklyTotals.map((w, i) => `${getX(i)},${getY(w.distance)}`).join(" ");
  const areaPoints = `${points} 100,100 0,100`;

  // Previous week stats
  const prevWeekStart = new Date(startOfWeek);
  prevWeekStart.setDate(prevWeekStart.getDate() - 7);
  const prevWeek = filteredActs.filter(a => {
    const d = new Date(a.start_date);
    return d >= prevWeekStart && d < startOfWeek;
  });
  const prevMeters  = prevWeek.reduce((sum, a) => sum + (a.distance_meters    ?? 0), 0);
  const prevSeconds = prevWeek.reduce((sum, a) => sum + (a.moving_time_seconds ?? 0), 0);
  const prevElev    = prevWeek.reduce((sum, a) => sum + (a.total_elevation_gain ?? 0), 0);

  const distDelta = totalMeters - prevMeters;

  return (
    <div className="flex flex-col px-4 py-4 gap-4">

      {/* Sport Toggles */}
      <div className="flex items-center gap-2">
        {(['Run', 'Walk', 'Ride'] as const).map(s => {
          const isSel = sport === s;
          return (
            <button
              key={s}
              onClick={() => setSport(s)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-semibold transition-all ${
                isSel
                  ? 'border-[#fc4c02] text-[#fc4c02] bg-[#fc4c02]/10'
                  : 'border-border-primary text-text-tertiary hover:text-text-primary hover:border-border-primary/80'
              }`}
            >
              {s === 'Run'  && <LightningIcon  size={12} weight={isSel ? 'fill' : 'regular'} />}
              {s === 'Walk' && <MoonIcon       size={12} weight={isSel ? 'fill' : 'regular'} />}
              {s === 'Ride' && <BicycleIcon    size={12} weight={isSel ? 'fill' : 'regular'} />}
              {s}
            </button>
          );
        })}
        {distDelta !== 0 && (
          <span className={`ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded ${
            distDelta > 0 ? 'text-green-400 bg-green-500/10' : 'text-red-400 bg-red-500/10'
          }`}>
            {distDelta > 0 ? '+' : ''}{(distDelta / 1000).toFixed(1)} km vs last wk
          </span>
        )}
      </div>

      {/* This Week / Previous Week Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-background-tertiary rounded-xl p-3 flex flex-col gap-3">
          <p className="text-[9px] font-bold text-text-tertiary uppercase tracking-widest">This week</p>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <p className="text-lg font-bold text-text-primary leading-none">{formatDistStr(totalMeters)}</p>
              <p className="text-[9px] text-text-tertiary mt-0.5">km</p>
            </div>
            <div>
              <p className="text-lg font-bold text-text-primary leading-none">{formatTime(totalSeconds)}</p>
              <p className="text-[9px] text-text-tertiary mt-0.5">time</p>
            </div>
            <div>
              <p className="text-lg font-bold text-text-primary leading-none">{totalElev.toFixed(0)}</p>
              <p className="text-[9px] text-text-tertiary mt-0.5">m elev</p>
            </div>
          </div>
        </div>
        <div className="bg-background-tertiary rounded-xl p-3 flex flex-col gap-3">
          <p className="text-[9px] font-bold text-text-tertiary uppercase tracking-widest">Last week</p>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <p className="text-lg font-bold text-text-primary leading-none">{formatDistStr(prevMeters)}</p>
              <p className="text-[9px] text-text-tertiary mt-0.5">km</p>
            </div>
            <div>
              <p className="text-lg font-bold text-text-primary leading-none">{formatTime(prevSeconds)}</p>
              <p className="text-[9px] text-text-tertiary mt-0.5">time</p>
            </div>
            <div>
              <p className="text-lg font-bold text-text-primary leading-none">{prevElev.toFixed(0)}</p>
              <p className="text-[9px] text-text-tertiary mt-0.5">m elev</p>
            </div>
          </div>
        </div>
      </div>

      {/* 12-week chart */}
      <div className="flex flex-col gap-3">
        <p className="text-[9px] font-bold text-text-tertiary uppercase tracking-widest">Past 12 weeks · km</p>

        <div className="relative flex items-stretch">
          {/* Chart Area */}
          <div className="relative flex-1 mr-4 h-[110px]">
            <div className="absolute top-0 inset-x-0 h-px bg-border-primary/60" />
            <div className="absolute top-1/2 inset-x-0 h-px bg-border-primary/40" />
            <div className="absolute bottom-0 inset-x-0 h-px bg-border-primary/60" />
            <div className="absolute top-0 bottom-0 right-0 w-0.5 bg-border-primary" />

            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-[110px] overflow-visible z-10">
              <polygon points={areaPoints} fill="#fc4c02" fillOpacity="0.18" />
              <polyline points={points} fill="none" stroke="#fc4c02" strokeWidth="2.5" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
            </svg>

            <div className="absolute inset-0 z-20 overflow-visible pointer-events-none">
              {weeklyTotals.map((w, i) => (
                <div
                  key={i}
                  className="absolute w-2 h-2 rounded-full bg-[#fc4c02] border-2 border-background-secondary -ml-1 -mt-1"
                  style={{ left: `${getX(i)}%`, top: `${getY(w.distance)}%` }}
                  title={`${w.label}: ${w.distance.toFixed(1)} km`}
                />
              ))}
            </div>
          </div>

          {/* Y-axis markers */}
          <div className="w-11 flex flex-col justify-between text-[10px] text-text-tertiary h-[110px] shrink-0 -mt-1.5">
            <span>{maxVal > 1 ? maxVal.toFixed(1) : '1.0'}</span>
            <span>{maxVal > 1 ? (maxVal / 2).toFixed(1) : '0.5'}</span>
            <span className="relative top-2.5">0</span>
          </div>
        </div>

        {/* X-axis labels */}
        <div className="flex items-center justify-around pr-15 text-[10px] text-text-tertiary tracking-wider">
          <span>{weeklyTotals[Math.max(0, LOOKBACK_WEEKS - 9)].label}</span>
          <span>{weeklyTotals[Math.max(0, LOOKBACK_WEEKS - 4)].label}</span>
        </div>
      </div>

    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function WidgetSkeleton({ rows }: { rows: number }) {
  return (
    <div className="px-4 py-3 flex flex-col gap-2.5">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-4 bg-background-tertiary rounded animate-pulse" style={{ width: `${60 + (i % 3) * 15}%` }} />
      ))}
    </div>
  );
}

function WidgetEmpty({ label }: { label: string }) {
  return <p className="px-4 py-6 text-center text-sm text-text-tertiary">{label}</p>;
}

// ── Main WidgetCard ───────────────────────────────────────────────────────────

interface WidgetCardProps {
  widget: ScreenWidget;
  hubName?: string;
  spaceName?: string;
  userId?: string;
  spaces?: Space[];
  hubs?: Hub[];
  onDelete?: () => void;
  readOnly?: boolean;
}

export function WidgetCard({ widget, hubName, spaceName, userId, spaces = [], hubs = [], onDelete, readOnly }: WidgetCardProps) {
  const meta  = TYPE_META[widget.type];
  const title = widget.title || meta.label;

  return (
    <div className="bg-background-secondary border border-border-primary rounded-xl overflow-hidden flex flex-col group h-full">
      {/* Header */}
      <div className="flex items-start justify-between px-4 py-3 border-b border-border-primary/50 gap-3">
        <div className="flex items-start gap-2.5 min-w-0 flex-1">
          <span className={`mt-0.5 shrink-0 ${meta.accent}`}>{meta.icon}</span>
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-xs font-bold text-text-primary truncate leading-tight">{title}</span>
            {hubName && (
              <span className="text-[10px] text-text-tertiary truncate mt-0.5 leading-tight">{hubName}</span>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2 shrink-0">
          {spaceName && (
            <span className="text-[9px] font-medium tracking-wide text-text-tertiary px-1.5 py-0.5 rounded bg-background-tertiary border border-border-primary truncate max-w-24">
              {spaceName}
            </span>
          )}
          {!readOnly && onDelete && (
            <button
              onClick={onDelete}
              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 -m-1 rounded-lg hover:bg-red-500/10 hover:text-red-400 text-text-tertiary shrink-0"
            >
              <TrashIcon size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Body */}
      <div className={`flex-1 overflow-y-auto ${widget.type === 'strava_stats' ? '' : 'max-h-72'}`}>
        {widget.type === 'quick_clock' ? (
          <QuickClockWidget />
        ) : widget.type === 'space_pulse' ? (
          <SpacePulseWidget spaces={spaces} hubs={hubs} />
        ) : widget.type === 'weekly_progress' ? (
          <WeeklyProgressWidget hubs={hubs} userId={userId} />
        ) : widget.type === 'upcoming_global' ? (
          <UpcomingGlobalWidget userId={userId} />
        ) : widget.type === 'strava_stats' ? (
          <StravaStatsWidget userId={userId} />
        ) : !widget.hub_id ? (
          <WidgetEmpty label="No hub selected" />
        ) : widget.type === 'tasks' ? (
          <TasksWidget hubId={widget.hub_id} />
        ) : widget.type === 'notes' ? (
          <NotesWidget hubId={widget.hub_id} />
        ) : widget.type === 'docs' ? (
          <DocsWidget hubId={widget.hub_id} userId={userId} />
        ) : widget.type === 'outcomes' ? (
          <OutcomesWidget hubId={widget.hub_id} />
        ) : widget.type === 'hub_overview' ? (
          <HubOverviewWidget hubId={widget.hub_id} />
        ) : widget.type === 'calorie_counter' ? (
          <CalorieCounterWidget hubId={widget.hub_id} />
        ) : widget.type === 'expense_tracker' ? (
          <ExpenseTrackerWidget hubId={widget.hub_id} />
        ) : widget.type === 'upcoming_events' ? (
          <UpcomingEventsWidget hubId={widget.hub_id} userId={userId} />
        ) : widget.type === 'sleep_tracker' ? (
          <SleepTrackerWidget hubId={widget.hub_id} />
        ) : widget.type === 'workout_log' ? (
          <WorkoutLogWidget hubId={widget.hub_id} />
        ) : null}
      </div>
    </div>
  );
}
