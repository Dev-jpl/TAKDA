"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  CarIcon, ForkKnifeIcon, HeartIcon, GameControllerIcon, ShoppingBagIcon,
  LightningIcon, DotsThreeOutlineIcon, ArrowLeftIcon, ArrowRightIcon,
  ReceiptIcon, CalendarBlankIcon, PlusIcon, TrashIcon, XIcon,
  ChartDonutIcon, ListIcon, CurrencyCircleDollarIcon, ChartBarIcon,
} from '@phosphor-icons/react';
import { getExpenses, logExpense, deleteExpense, Expense } from '@/services/addons.service';
import { useUserProfile } from '@/contexts/UserProfileContext';

// ── Category config ───────────────────────────────────────────────────────────

const CATEGORIES = ['General', 'Food', 'Transport', 'Health', 'Entertainment', 'Shopping', 'Utilities', 'Other'];

const CAT: Record<string, { icon: React.ElementType; color: string; hex: string; bg: string }> = {
  General:       { icon: CurrencyCircleDollarIcon, color: 'text-slate-400',   hex: '#94a3b8', bg: 'bg-slate-500/10' },
  Food:          { icon: ForkKnifeIcon,            color: 'text-orange-400',  hex: '#fb923c', bg: 'bg-orange-500/10' },
  Transport:     { icon: CarIcon,                  color: 'text-blue-400',    hex: '#60a5fa', bg: 'bg-blue-500/10' },
  Health:        { icon: HeartIcon,                color: 'text-red-400',     hex: '#f87171', bg: 'bg-red-500/10' },
  Entertainment: { icon: GameControllerIcon,       color: 'text-purple-400',  hex: '#c084fc', bg: 'bg-purple-500/10' },
  Shopping:      { icon: ShoppingBagIcon,          color: 'text-pink-400',    hex: '#f472b6', bg: 'bg-pink-500/10' },
  Utilities:     { icon: LightningIcon,            color: 'text-yellow-400',  hex: '#facc15', bg: 'bg-yellow-500/10' },
  Other:         { icon: DotsThreeOutlineIcon,     color: 'text-text-tertiary', hex: '#6b7280', bg: 'bg-background-tertiary' },
};

// ── Donut chart ───────────────────────────────────────────────────────────────

const RADIUS = 38;
const CIRC   = 2 * Math.PI * RADIUS;

function DonutChart({ segments }: { segments: { pct: number; hex: string }[] }) {
  let offset = 0;
  return (
    <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
      {/* Track */}
      <circle cx={50} cy={50} r={RADIUS} fill="none" stroke="currentColor" strokeWidth={12}
        className="text-background-tertiary" />
      {segments.map((seg, i) => {
        const dash   = (seg.pct / 100) * CIRC;
        const gap    = CIRC - dash;
        const off    = CIRC - (offset / 100) * CIRC;
        offset      += seg.pct;
        return (
          <circle
            key={i} cx={50} cy={50} r={RADIUS}
            fill="none" stroke={seg.hex} strokeWidth={12}
            strokeDasharray={`${dash} ${gap}`}
            strokeDashoffset={off}
            strokeLinecap="butt"
          />
        );
      })}
    </svg>
  );
}

// ── Bar chart ────────────────────────────────────────────────────────────────

function BarChart({ bars, labels, hex, currency }: {
  bars: number[]; labels: string[]; hex: string; currency: string;
}) {
  const H = 90;
  const count = bars.length;
  const maxVal = Math.max(...bars, 1);
  const barW = Math.max(8, Math.floor(300 / count));
  const W = barW * count;

  return (
    <div className="w-full overflow-x-auto pb-1">
      <svg viewBox={`0 0 ${W} ${H + 22}`} style={{ minWidth: Math.min(W, 280), width: '100%' }}>
        {bars.map((val, i) => {
          const barH = Math.max(val > 0 ? (val / maxVal) * H : 0, val > 0 ? 2 : 0);
          const x = i * barW + barW * 0.12;
          const bw = barW * 0.76;
          const hasVal = val > 0;
          return (
            <g key={i}>
              {/* Empty track */}
              <rect x={x} y={0} width={bw} height={H} rx={3}
                fill={hex} opacity={0.07} />
              {/* Value bar */}
              {hasVal && (
                <rect x={x} y={H - barH} width={bw} height={barH} rx={3}
                  fill={hex} opacity={0.85} />
              )}
              {/* Label */}
              <text
                x={x + bw / 2} y={H + 14}
                textAnchor="middle"
                fontSize={Math.max(5, Math.min(8, barW * 0.45))}
                fill="#6b7280"
              >
                {labels[i]}
              </text>
            </g>
          );
        })}
      </svg>
      {/* Max label */}
      <div className="flex justify-between mt-1 px-0.5">
        <span className="text-[9px] text-text-tertiary">{currency} 0</span>
        <span className="text-[9px] text-text-tertiary">{currency} {fmt(maxVal)}</span>
      </div>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function monthKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
function formatMonthLabel(mk: string) {
  const [y, m] = mk.split('-');
  return new Date(+y, +m - 1, 1).toLocaleString('default', { month: 'long', year: 'numeric' });
}
function stepMonth(mk: string, delta: number) {
  const [y, m] = mk.split('-').map(Number);
  return monthKey(new Date(y, m - 1 + delta, 1));
}
function dayLabel(dateStr: string) {
  const d   = new Date(dateStr + 'T00:00:00');
  const now = new Date(); now.setHours(0, 0, 0, 0);
  const yd  = new Date(now); yd.setDate(now.getDate() - 1);
  if (d.toDateString() === now.toDateString()) return 'Today';
  if (d.toDateString() === yd.toDateString())  return 'Yesterday';
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}
function fmt(n: number) {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function Skeleton() {
  return (
    <div className="flex flex-col gap-2.5 p-2">
      {[70, 55, 80, 45, 65].map((w, i) => (
        <div key={i} className="h-4 rounded-lg bg-background-tertiary animate-pulse" style={{ width: `${w}%` }} />
      ))}
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────

interface Props { hubId: string; userId: string; config: Record<string, unknown> }

type Tab = 'overview' | 'trend' | 'transactions';
type TrendPeriod = 'week' | 'month' | 'year';

export function ExpenseTrackerAddon({ hubId, userId, config }: Props) {
  const { assistantName } = useUserProfile();
  const currency = (config.currency as string) ?? '₱';

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [month,    setMonth]    = useState(monthKey());
  const [tab,      setTab]      = useState<Tab>('overview');
  const [showForm, setShowForm] = useState(false);

  const [amount,      setAmount]      = useState('');
  const [item,        setItem]        = useState('');
  const [merchant,    setMerchant]    = useState('');
  const [category,    setCategory]    = useState('General');
  const [date,        setDate]        = useState(() => new Date().toISOString().split('T')[0]);
  const [saving,      setSaving]      = useState(false);
  const [formErr,     setFormErr]     = useState('');

  // Trend state
  const [trendPeriod,  setTrendPeriod]  = useState<TrendPeriod>('month');
  const [allExpenses,  setAllExpenses]  = useState<Expense[]>([]);
  const [trendLoaded,  setTrendLoaded]  = useState(false);
  const [trendLoading, setTrendLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { setExpenses(await getExpenses(hubId, month, userId)); }
    catch { setExpenses([]); }
    finally { setLoading(false); }
  }, [hubId, month, userId]);

  useEffect(() => { load(); }, [load]);

  // Load all expenses the first time the Trend tab is opened
  useEffect(() => {
    if (tab !== 'trend' || trendLoaded) return;
    setTrendLoading(true);
    getExpenses(hubId, undefined, userId)
      .then(all => { setAllExpenses(all); setTrendLoaded(true); })
      .catch(() => setTrendLoaded(true))
      .finally(() => setTrendLoading(false));
  }, [tab, trendLoaded, hubId]);

  // ── Stats ────────────────────────────────────────────────────────────────

  const total = useMemo(() => expenses.reduce((s, e) => s + e.amount, 0), [expenses]);

  const byCat = useMemo(() =>
    expenses.reduce<Record<string, number>>((acc, e) => {
      acc[e.category] = (acc[e.category] ?? 0) + e.amount;
      return acc;
    }, {}),
  [expenses]);

  const topCats = useMemo(() =>
    Object.entries(byCat).sort(([, a], [, b]) => b - a),
  [byCat]);

  const donutSegments = useMemo(() =>
    topCats.map(([cat, amt]) => ({
      pct: total > 0 ? (amt / total) * 100 : 0,
      hex: CAT[cat]?.hex ?? '#6b7280',
    })),
  [topCats, total]);

  const dailyAvg = useMemo(() => {
    const days = new Set(expenses.map(e => e.date)).size;
    return days ? total / days : 0;
  }, [expenses, total]);

  const biggest = useMemo(() =>
    expenses.length ? expenses.reduce((m, e) => e.amount > m.amount ? e : m, expenses[0]) : null,
  [expenses]);

  const grouped = useMemo(() => {
    const map = new Map<string, Expense[]>();
    [...expenses].sort((a, b) => b.date.localeCompare(a.date)).forEach(e => {
      if (!map.has(e.date)) map.set(e.date, []);
      map.get(e.date)!.push(e);
    });
    return map;
  }, [expenses]);

  // ── Trend data ────────────────────────────────────────────────────────────

  const trendData = useMemo(() => {
    if (trendPeriod === 'week') {
      const days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(); d.setDate(d.getDate() - (6 - i));
        const dateStr = d.toISOString().split('T')[0];
        const label = d.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 2);
        return { dateStr, label };
      });
      const bars = days.map(({ dateStr }) =>
        allExpenses.filter(e => e.date === dateStr).reduce((s, e) => s + e.amount, 0)
      );
      return { bars, labels: days.map(d => d.label) };
    }

    if (trendPeriod === 'month') {
      const [y, m] = month.split('-').map(Number);
      const daysInMonth = new Date(y, m, 0).getDate();
      const bars = Array.from({ length: daysInMonth }, (_, i) => {
        const day = String(i + 1).padStart(2, '0');
        return expenses.filter(e => e.date === `${month}-${day}`).reduce((s, e) => s + e.amount, 0);
      });
      return { bars, labels: Array.from({ length: daysInMonth }, (_, i) => String(i + 1)) };
    }

    // year
    const yr = new Date().getFullYear();
    const monthLabels = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const bars = Array.from({ length: 12 }, (_, i) => {
      const mk = `${yr}-${String(i + 1).padStart(2, '0')}`;
      return allExpenses.filter(e => e.date?.startsWith(mk)).reduce((s, e) => s + e.amount, 0);
    });
    return { bars, labels: monthLabels };
  }, [trendPeriod, allExpenses, expenses, month]);

  const trendTotal = useMemo(() => trendData.bars.reduce((s, v) => s + v, 0), [trendData]);
  const trendActiveCount = useMemo(() => trendData.bars.filter(v => v > 0).length, [trendData]);

  // ── Handlers ─────────────────────────────────────────────────────────────

  async function handleLog(ev: React.FormEvent) {
    ev.preventDefault();
    const amt = parseFloat(amount);
    if (!amt || isNaN(amt) || amt <= 0) { setFormErr('Enter a valid amount'); return; }
    setFormErr(''); setSaving(true);
    try {
      const entry = await logExpense(hubId, {
        user_id: userId, amount: amt,
        item: item.trim() || undefined,
        merchant: merchant.trim() || undefined,
        category, currency, date,
      });
      setExpenses(prev => [entry, ...prev]);
      setAmount(''); setItem(''); setMerchant(''); setCategory('General');
      setDate(new Date().toISOString().split('T')[0]);
      setShowForm(false);
      window.dispatchEvent(new CustomEvent('takda:data_updated'));
    } catch { setFormErr('Failed to save. Try again.'); }
    finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    setExpenses(prev => prev.filter(e => e.id !== id));
    try { 
      await deleteExpense(id); 
      window.dispatchEvent(new CustomEvent('takda:data_updated'));
    } catch { load(); }
  }

  const isCurrentMonth = month === monthKey();

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-4">

      {/* ── Hero card ───────────────────────────────────────────────────────── */}
      <div className="relative rounded-2xl overflow-hidden bg-linear-to-br from-modules-deliver/20 via-modules-deliver/5 to-transparent border border-modules-deliver/15 p-5">
        <div className="absolute inset-0 bg-linear-to-b from-transparent to-background-primary/30 pointer-events-none" />

        {/* Month nav */}
        <div className="relative flex items-center justify-between mb-4">
          <button
            onClick={() => setMonth(m => stepMonth(m, -1))}
            className="w-7 h-7 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-text-tertiary hover:text-text-primary transition-all"
          >
            <ArrowLeftIcon size={12} weight="bold" />
          </button>
          <p className="text-xs font-bold text-text-secondary">{formatMonthLabel(month)}</p>
          <button
            onClick={() => setMonth(m => stepMonth(m, 1))}
            disabled={isCurrentMonth}
            className="w-7 h-7 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-text-tertiary hover:text-text-primary transition-all disabled:opacity-20 disabled:pointer-events-none"
          >
            <ArrowRightIcon size={12} weight="bold" />
          </button>
        </div>

        {/* Total */}
        <div className="relative text-center mb-4">
          <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest mb-1">Total Spent</p>
          <p className="text-4xl font-bold text-text-primary tracking-tight leading-none">
            {fmt(total)}
          </p>
          <p className="text-xs text-text-tertiary mt-1">Peso (₱)</p>
        </div>

        {/* Quick stats */}
        <div className="relative grid grid-cols-3 gap-2">
          <div className="bg-background-secondary/60 backdrop-blur-sm rounded-xl p-2.5 text-center">
            <p className="text-sm font-bold text-text-primary">{expenses.length}</p>
            <p className="text-[9px] text-text-tertiary uppercase tracking-widest mt-0.5">Txns</p>
          </div>
          <div className="bg-background-secondary/60 backdrop-blur-sm rounded-xl p-2.5 text-center">
            <p className="text-sm font-bold text-text-primary">{fmt(dailyAvg)}</p>
            <p className="text-[9px] text-text-tertiary uppercase tracking-widest mt-0.5">Daily Avg</p>
          </div>
          <div className="bg-background-secondary/60 backdrop-blur-sm rounded-xl p-2.5 text-center">
            <p className="text-sm font-bold text-text-primary truncate">{biggest ? fmt(biggest.amount) : '—'}</p>
            <p className="text-[9px] text-text-tertiary uppercase tracking-widest mt-0.5">Biggest</p>
          </div>
        </div>
      </div>

      {/* ── Log Expense button ───────────────────────────────────────────────── */}
      <button
        onClick={() => setShowForm(v => !v)}
        className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all border ${
          showForm
            ? 'bg-background-secondary border-border-primary text-text-tertiary'
            : 'bg-modules-deliver/10 border-modules-deliver/20 text-modules-deliver hover:bg-modules-deliver/20'
        }`}
      >
        {showForm ? <XIcon size={14} weight="bold" /> : <PlusIcon size={14} weight="bold" />}
        {showForm ? 'Cancel' : 'Log Expense'}
      </button>

      {/* ── Log form ────────────────────────────────────────────────────────── */}
      {showForm && (
        <form onSubmit={handleLog} className="bg-background-secondary border border-modules-deliver/20 rounded-2xl p-4 flex flex-col gap-3">
          <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest">New Expense</p>

          {/* Amount */}
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-text-tertiary pointer-events-none">
              {currency}
            </span>
            <input
              type="number" step="0.01" min="0" placeholder="0.00" autoFocus
              value={amount} onChange={e => setAmount(e.target.value)}
              className="w-full text-lg font-bold bg-background-primary border border-border-primary rounded-xl pl-14 pr-4 py-3 text-text-primary placeholder:text-text-tertiary/40 focus:outline-none focus:border-modules-deliver/40"
            />
          </div>

          {/* Item */}
          <input
            placeholder="Item (e.g. Fried Chicken, Gas, Groceries)"
            value={item} onChange={e => setItem(e.target.value)}
            className="text-sm bg-background-primary border border-border-primary rounded-xl px-3 py-2.5 text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-modules-deliver/40"
          />

          {/* Merchant + Date */}
          <div className="grid grid-cols-2 gap-2">
            <input
              placeholder="Merchant (optional)"
              value={merchant} onChange={e => setMerchant(e.target.value)}
              className="text-sm bg-background-primary border border-border-primary rounded-xl px-3 py-2.5 text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-modules-deliver/40"
            />
            <div className="relative">
              <CalendarBlankIcon size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary pointer-events-none" />
              <input
                type="date" value={date} onChange={e => setDate(e.target.value)}
                className="w-full text-sm bg-background-primary border border-border-primary rounded-xl pl-8 pr-3 py-2.5 text-text-primary focus:outline-none focus:border-modules-deliver/40"
              />
            </div>
          </div>

          {/* Category chips */}
          <div className="flex flex-wrap gap-1.5">
            {CATEGORIES.map(c => {
              const meta = CAT[c];
              const Icon = meta.icon;
              const sel  = category === c;
              return (
                <button key={c} type="button" onClick={() => setCategory(c)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all ${
                    sel ? `${meta.bg} ${meta.color} border-current/20` : 'bg-background-primary border-border-primary text-text-tertiary hover:text-text-primary'
                  }`}
                >
                  <Icon size={10} weight={sel ? 'fill' : 'regular'} />{c}
                </button>
              );
            })}
          </div>

          {formErr && <p className="text-xs text-red-400">{formErr}</p>}

          <button type="submit" disabled={saving || !amount}
            className="flex items-center justify-center gap-2 bg-modules-deliver text-white text-sm font-bold py-2.5 rounded-xl disabled:opacity-40 hover:opacity-90 transition-opacity"
          >
            <ReceiptIcon size={14} weight="bold" />
            {saving ? 'Saving…' : 'Save Expense'}
          </button>
        </form>
      )}

      {/* ── Tab nav ──────────────────────────────────────────────────────────── */}
      <div className="flex bg-background-secondary border border-border-primary rounded-xl p-1 gap-1">
        {([
          ['overview',     'Overview',     ChartDonutIcon],
          ['trend',        'Trend',        ChartBarIcon],
          ['transactions', 'Transactions', ListIcon],
        ] as const).map(([t, label, Icon]) => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all ${
              tab === t ? 'bg-modules-deliver/10 text-modules-deliver' : 'text-text-tertiary hover:text-text-primary'
            }`}
          >
            <Icon size={13} weight={tab === t ? 'duotone' : 'regular'} />{label}
          </button>
        ))}
      </div>

      {/* ── Overview tab ─────────────────────────────────────────────────────── */}
      {tab === 'overview' && (
        loading ? (
          <div className="bg-background-secondary border border-border-primary rounded-2xl p-5"><Skeleton /></div>
        ) : topCats.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-12 bg-background-secondary border border-border-primary rounded-2xl text-center">
            <ChartDonutIcon size={36} className="text-text-tertiary/20" weight="duotone" />
            <p className="text-sm text-text-tertiary">No data to display yet.</p>
          </div>
        ) : (
          <div className="bg-background-secondary border border-border-primary rounded-2xl p-5 flex flex-col gap-5">
            {/* Donut + legend */}
            <div className="flex items-center gap-5">
              <div className="w-32 h-32 shrink-0 relative">
                <DonutChart segments={donutSegments} />
                {/* Center label */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <p className="text-[10px] font-bold text-text-tertiary uppercase">{topCats.length}</p>
                  <p className="text-[10px] text-text-tertiary">cats</p>
                </div>
              </div>
              <div className="flex-1 flex flex-col gap-2 min-w-0">
                {topCats.slice(0, 5).map(([cat, amt]) => {
                  const meta = CAT[cat] ?? CAT.Other;
                  const Icon = meta.icon;
                  return (
                    <div key={cat} className="flex items-center gap-2 min-w-0">
                      <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 ${meta.bg}`}>
                        <Icon size={10} className={meta.color} weight="duotone" />
                      </div>
                      <p className="text-xs text-text-secondary truncate flex-1">{cat}</p>
                      <p className="text-xs font-bold text-text-primary shrink-0">{fmt(amt)}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Category bars */}
            <div className="flex flex-col gap-3 pt-4 border-t border-border-primary/50">
              <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest">Breakdown</p>
              {topCats.map(([cat, amt]) => {
                const meta = CAT[cat] ?? CAT.Other;
                const Icon = meta.icon;
                const pct  = total > 0 ? (amt / total) * 100 : 0;
                return (
                  <div key={cat} className="flex items-center gap-3">
                    <div className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${meta.bg}`}>
                      <Icon size={13} className={meta.color} weight="duotone" />
                    </div>
                    <div className="flex-1 flex flex-col gap-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-text-secondary">{cat}</span>
                        <span className="text-xs font-bold text-text-primary">{currency} {fmt(amt)}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-background-tertiary overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: meta.hex }} />
                      </div>
                    </div>
                    <span className="text-[10px] text-text-tertiary w-9 text-right shrink-0">{pct.toFixed(0)}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        )
      )}

      {/* ── Trend tab ────────────────────────────────────────────────────────── */}
      {tab === 'trend' && (
        <div className="bg-background-secondary border border-border-primary rounded-2xl p-5 flex flex-col gap-4">
          {/* Period toggles */}
          <div className="flex items-center gap-2">
            {(['week', 'month', 'year'] as TrendPeriod[]).map(p => (
              <button key={p} onClick={() => setTrendPeriod(p)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border capitalize ${
                  trendPeriod === p
                    ? 'bg-modules-deliver/10 border-modules-deliver/30 text-modules-deliver'
                    : 'bg-background-primary border-border-primary text-text-tertiary hover:text-text-primary'
                }`}
              >
                {p === 'week' ? 'Last 7 days' : p === 'month' ? 'This month' : 'This year'}
              </button>
            ))}
          </div>

          {/* Summary row */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-text-tertiary mb-0.5">
                {trendPeriod === 'week' ? 'Last 7 days' : trendPeriod === 'month' ? formatMonthLabel(month) : String(new Date().getFullYear())}
              </p>
              <p className="text-xl font-bold text-text-primary">{currency} {fmt(trendTotal)}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-text-tertiary mb-0.5">Active days</p>
              <p className="text-base font-bold text-text-primary">{trendActiveCount}</p>
            </div>
          </div>

          {/* Bar chart */}
          {trendLoading ? (
            <div className="h-24 bg-background-tertiary rounded-xl animate-pulse" />
          ) : (
            <BarChart
              bars={trendData.bars}
              labels={trendData.labels}
              hex="#3b82f6"
              currency={currency}
            />
          )}
        </div>
      )}

      {/* ── Transactions tab ─────────────────────────────────────────────────── */}
      {tab === 'transactions' && (
        loading ? (
          <div className="bg-background-secondary border border-border-primary rounded-2xl p-5"><Skeleton /></div>
        ) : expenses.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-12 bg-background-secondary border border-border-primary rounded-2xl text-center">
            <ReceiptIcon size={36} className="text-text-tertiary/20" weight="duotone" />
            <div>
              <p className="text-sm font-semibold text-text-primary">No transactions this month</p>
              <p className="text-xs text-text-tertiary mt-1">Log an expense or ask {assistantName} to track it.</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {[...grouped.entries()].map(([day, items]) => (
              <div key={day} className="flex flex-col gap-1">
                <div className="flex items-center justify-between px-1 mb-1">
                  <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest">{dayLabel(day)}</p>
                  <p className="text-[10px] text-text-tertiary">
                    {currency} {fmt(items.reduce((s, e) => s + e.amount, 0))}
                  </p>
                </div>
                <div className="bg-background-secondary border border-border-primary rounded-2xl overflow-hidden divide-y divide-border-primary/50">
                  {items.map(exp => {
                    const meta = CAT[exp.category] ?? CAT.Other;
                    const Icon = meta.icon;
                    return (
                      <div key={exp.id} className="flex items-center gap-3 px-4 py-3 group hover:bg-background-tertiary/30 transition-colors">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${meta.bg}`}>
                          <Icon size={16} className={meta.color} weight="duotone" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-text-primary truncate">
                            {exp.item || exp.merchant || exp.category}
                          </p>
                          <p className="text-[10px] text-text-tertiary mt-0.5">
                            {[exp.merchant, exp.category].filter(Boolean).join(' · ')}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <p className="text-sm font-bold text-text-primary">{exp.currency} {fmt(exp.amount)}</p>
                          <button
                            onClick={() => handleDelete(exp.id)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-text-tertiary hover:text-red-400 p-1 rounded-lg hover:bg-red-500/10"
                          >
                            <TrashIcon size={13} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}
