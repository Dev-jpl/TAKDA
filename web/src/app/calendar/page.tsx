"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CalendarBlank,
  CaretLeft,
  CaretRight,
  Plus,
  Clock,
  ArrowsClockwise,
  X,
  MapPin,
  CalendarCheck,
} from '@phosphor-icons/react';
import { supabase } from '@/services/supabase';
import { eventsService, CalendarEvent } from '@/services/events.service';
import { integrationsService } from '@/services/integrations.service';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

type ViewType = 'month' | 'week' | 'day';

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatTime(date: Date) {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function isSameDay(d1: Date, d2: Date) {
  return d1.getFullYear() === d2.getFullYear() &&
         d1.getMonth() === d2.getMonth() &&
         d1.getDate() === d2.getDate();
}

function getStartOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getEndOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

const inputCls = "w-full bg-background-tertiary border border-border-primary rounded-xl px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-blue-600 placeholder:text-text-tertiary transition-colors";

// ── Shared Spanning View ──────────────────────────────────────────────────────

interface WeekEventsProps {
  week: Date[];
  events: CalendarEvent[];
  onMoreClick?: (date: Date) => void;
}

function WeekEvents({ week, events, onMoreClick }: WeekEventsProps) {
  const weekStart = getStartOfDay(week[0]);
  const weekEnd = getEndOfDay(week[week.length - 1]);

  const { slots, moreCounts } = useMemo(() => {
    const items = events.filter(e => {
      const s = new Date(e.start_at);
      const d = e.end_at ? new Date(e.end_at) : s;
      return s <= weekEnd && d >= weekStart;
    }).map(ev => {
      const s = new Date(ev.start_at);
      const d = ev.end_at ? new Date(ev.end_at) : s;
      const startIdx = Math.max(0, Math.floor((s.getTime() - weekStart.getTime()) / 86400000));
      const dInclusive = new Date(d.getTime() - 1);
      const endIdx = Math.max(startIdx, Math.min(week.length - 1, Math.floor((dInclusive.getTime() - weekStart.getTime()) / 86400000)));
      return { ...ev, startIdx, endIdx };
    });

    items.sort((a, b) => {
      const spanA = a.endIdx - a.startIdx;
      const spanB = b.endIdx - b.startIdx;
      if (spanA !== spanB) return spanB - spanA;
      return new Date(a.start_at).getTime() - new Date(b.start_at).getTime();
    });

    const allSlots: (typeof items)[] = [];
    items.forEach(item => {
      let slotIdx = 0;
      while (allSlots[slotIdx]?.some(s => item.startIdx <= s.endIdx && item.endIdx >= s.startIdx)) {
        slotIdx++;
      }
      if (!allSlots[slotIdx]) allSlots[slotIdx] = [];
      allSlots[slotIdx].push(item);
    });

    const MAX_VISIBLE = 3;
    const visibleSlots = allSlots.slice(0, MAX_VISIBLE);
    const more = new Array(7).fill(0);
    
    allSlots.slice(MAX_VISIBLE).forEach(slot => {
      slot.forEach(item => {
        for (let i = item.startIdx; i <= item.endIdx; i++) more[i]++;
      });
    });

    return { slots: visibleSlots, moreCounts: more };
  }, [weekStart, weekEnd, events, week.length]);

  return (
    <>
      <div className="flex flex-col gap-1">
        {slots.map((slot, sIdx) => (
          <div key={sIdx} className="h-[28px] relative">
            {slot.map(ev => {
              const span = ev.endIdx - ev.startIdx + 1;
              const isStart = new Date(ev.start_at) >= weekStart;
              const isEnd = (ev.end_at ? new Date(ev.end_at) : new Date(ev.start_at)) <= weekEnd;
              return (
                <div
                  key={ev.id}
                  style={{ 
                    position: 'absolute', 
                    left: `${(ev.startIdx / week.length) * 100}%`, 
                    width: `${(span / week.length) * 100}%`,
                    pointerEvents: 'auto'
                  }}
                  className={`h-full px-2.5 text-xs font-bold bg-[#3b82f6] text-white truncate flex items-center shadow-lg hover:brightness-110 cursor-pointer transition-all z-10 ${isStart ? 'rounded-l-lg' : 'border-l border-white/20'} ${isEnd ? 'rounded-r-lg' : 'border-r border-white/20'}`}
                >
                  <span className="truncate">{isStart || ev.startIdx === 0 ? ev.title : ''}</span>
                </div>
              );
            })}
          </div>
        ))}
      </div>
      
      <div className="h-6 relative mt-1.5 flex items-center">
        {moreCounts.map((count, i) => count > 0 && (
          <div
            key={i}
            style={{ 
              position: 'absolute', 
              left: `${(i / week.length) * 100}%`, 
              width: `${(1 / week.length) * 100}%`,
              pointerEvents: 'auto'
            }}
            className="flex justify-center"
          >
            <button
              onClick={() => onMoreClick?.(week[i])}
              className="px-2 py-1 rounded-md bg-background-tertiary border border-border-primary hover:bg-background-secondary hover:border-blue-600/40 text-[10px] font-black text-text-secondary uppercase tracking-tighter cursor-pointer transition-all"
            >
              +{count} more
            </button>
          </div>
        ))}
      </div>
    </>
  );
}

// ── Day Popover ───────────────────────────────────────────────────────────────

function DayPopover({ date, events, onClose }: { date: Date; events: CalendarEvent[]; onClose: () => void }) {
  const dayStart = getStartOfDay(date);
  const dayEnd = getEndOfDay(date);

  const dayEvents = useMemo(() => {
    return events.filter(e => {
      const s = new Date(e.start_at);
      const d = e.end_at ? new Date(e.end_at) : s;
      return s <= dayEnd && d >= dayStart;
    }).sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime());
  }, [events, dayStart, dayEnd]);

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="bg-background-secondary border border-border-primary rounded-[32px] w-full max-w-[320px] shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
      >
        <div className="absolute top-0 left-0 right-0 h-1 bg-[#3b82f6]" />
        
        <div className="p-6 pb-2 text-center relative">
          <button onClick={onClose} className="absolute right-4 top-4 p-2 hover:bg-background-tertiary rounded-full text-text-tertiary hover:text-text-primary transition-colors">
            <X size={16} weight="bold" />
          </button>
          <p className="text-[10px] font-black text-text-tertiary uppercase tracking-[0.3em] mb-1">{DAYS[date.getDay()]}</p>
          <h3 className="text-3xl font-black text-text-primary tabular-nums tracking-tighter">{date.getDate()}</h3>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-hide">
          {dayEvents.map(ev => {
            const startStr = formatTime(new Date(ev.start_at));
            const isSpanning = (new Date(ev.end_at).getTime() - new Date(ev.start_at).getTime()) > 86400000;
            
            return (
              <div key={ev.id} className="bg-[#3b82f6] text-white rounded-xl p-3 shadow-lg hover:brightness-110 transition-all group overflow-hidden relative">
                <div className="flex flex-col gap-1">
                   <p className="text-[9px] font-black opacity-80 uppercase tracking-tight">
                     {!isSpanning && startStr} {isSpanning ? 'All Day' : ''}
                   </p>
                   <p className="text-sm font-bold leading-tight line-clamp-2">{ev.title}</p>
                </div>
              </div>
            );
          })}
        </div>
        
        <div className="p-4 pt-0" />
      </motion.div>
      <div className="absolute inset-0 -z-10" onClick={onClose} />
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<ViewType>('month');
  const [showAgenda, setShowAgenda] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    title: '', startDate: '', startTime: '09:00',
    endDate: '', endTime: '10:00',
    people: '', location: '', description: '',
  });

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) { setUserId(user.id); await load(user.id); }
      setLoading(false);
    })();
  }, []);

  async function load(uid: string) {
    try { setEvents(await eventsService.getEvents(uid)); }
    catch (e) { console.error(e); }
  }

  async function handleSync() {
    if (!userId) return;
    setSyncing(true);
    try { await integrationsService.syncGoogleCalendar(userId); await load(userId); }
    catch (e) { console.error(e); }
    finally { setSyncing(false); }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return;
    setLoading(true);
    try {
      await eventsService.createEvent({
        ...form,
        start_at: new Date(`${form.startDate}T${form.startTime}:00`).toISOString(),
        end_at: new Date(`${form.endDate}T${form.endTime}:00`).toISOString(),
        user_id: userId,
      });
      setShowModal(false);
      await load(userId);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  const navigateDate = (direction: number) => {
    const next = new Date(currentDate);
    if (activeView === 'month') next.setMonth(next.getMonth() + direction);
    else if (activeView === 'week') next.setDate(next.getDate() + (direction * 7));
    else next.setDate(next.getDate() + direction);
    setCurrentDate(next);
  };

  return (
    <main className="p-6 lg:p-12 min-h-screen flex flex-col bg-background-primary text-text-primary">
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.97, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97 }}
              className="bg-background-secondary border border-border-primary rounded-xl p-6 w-full max-w-md shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 right-0 h-1 bg-[#3b82f6]" />
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold">New Event</h2>
                <button onClick={() => setShowModal(false)} className="text-text-tertiary hover:text-text-primary"><X size={18} /></button>
              </div>
              <form onSubmit={handleCreate} className="space-y-4">
                <input required placeholder="Event title" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} className={inputCls} />
                <div className="grid grid-cols-2 gap-3">
                   <input type="date" value={form.startDate} onChange={e => setForm(p => ({ ...p, startDate: e.target.value }))} className={inputCls} />
                   <input type="time" value={form.startTime} onChange={e => setForm(p => ({ ...p, startTime: e.target.value }))} className={inputCls} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                   <input type="date" value={form.endDate} onChange={e => setForm(p => ({ ...p, endDate: e.target.value }))} className={inputCls} />
                   <input type="time" value={form.endTime} onChange={e => setForm(p => ({ ...p, endTime: e.target.value }))} className={inputCls} />
                </div>
                <button type="submit" disabled={loading} className="w-full py-3 bg-[#3b82f6] text-white rounded-xl font-bold shadow-lg shadow-blue-600/20 hover:opacity-90 transition-all">{loading ? 'Saving...' : 'Save Event'}</button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 shrink-0">
        <div>
          <h1 className="text-4xl font-black tracking-tighter">Calendar</h1>
          <p className="text-text-tertiary font-medium mt-1">Plan and track your schedule with precision.</p>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={handleSync} disabled={syncing} className="p-2.5 rounded-xl border border-border-primary text-text-tertiary hover:bg-background-secondary transition-all">
            <ArrowsClockwise size={18} className={syncing ? 'animate-spin' : ''} />
          </button>
          <button onClick={() => { setActiveView(activeView); setShowModal(true); }} className="flex items-center gap-2 bg-[#3b82f6] text-white px-6 py-2.5 rounded-xl font-bold text-xs shadow-lg shadow-blue-600/20 hover:scale-[1.02] active:scale-[0.98] transition-all">
            <Plus size={16} weight="bold" />
            New Event
          </button>
        </div>
      </header>

      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 shrink-0 gap-4">
        <h2 className="text-3xl font-bold tracking-tight">
          {MONTHS[currentDate.getMonth()]} <span className="text-text-tertiary font-medium">{currentDate.getFullYear()}</span>
        </h2>
        
        <div className="flex items-center gap-3">
          {/* Unified Navigation & Switcher Hub */}
          <div className="flex items-center gap-1 bg-background-secondary border border-border-primary rounded-xl p-1 shadow-sm">
            <button onClick={() => navigateDate(-1)} className="p-2 hover:bg-background-tertiary rounded-lg text-text-tertiary transition-colors"><CaretLeft size={16} /></button>
            <button onClick={() => setCurrentDate(new Date())} className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-text-tertiary hover:text-text-primary transition-colors border-x border-border-primary/50">Today</button>
            <button onClick={() => navigateDate(1)} className="p-2 hover:bg-background-tertiary rounded-lg text-text-tertiary transition-colors"><CaretRight size={16} /></button>
          </div>

          <div className="flex p-1 bg-background-secondary border border-border-primary rounded-xl shadow-sm">
            {(['month', 'week', 'day'] as ViewType[]).map((v) => (
              <button
                key={v}
                onClick={() => setActiveView(v)}
                className={`px-5 py-2 rounded-lg text-xs font-bold transition-all ${
                  activeView === v ? 'bg-background-tertiary text-text-primary shadow-sm' : 'text-text-tertiary hover:text-text-secondary'
                }`}
              >
                {v.charAt(0).toUpperCase() + v.slice(1)}
              </button>
            ))}
          </div>

          <button
            onClick={() => setShowAgenda(!showAgenda)}
            className={`hidden md:block px-5 py-2 rounded-xl text-xs font-bold border transition-all ${
              showAgenda ? 'bg-[#3b82f6]/10 border-[#3b82f6]/50 text-[#3b82f6]' : 'border-border-primary text-text-tertiary border-dashed'
            }`}
          >
            {showAgenda ? 'Close Agenda' : 'Show Agenda'}
          </button>
        </div>
      </div>

      <div className="flex-1 flex gap-6 overflow-hidden min-h-[1200px]">
        <div className="flex-1 bg-background-secondary border border-border-primary rounded-3xl overflow-hidden flex flex-col shadow-2xl">
          {activeView === 'month' && <MonthView currentDate={currentDate} events={events} />}
          {activeView === 'week' && <TimeGridView currentDate={currentDate} events={events} days={7} />}
          {activeView === 'day' && <TimeGridView currentDate={currentDate} events={events} days={1} />}
        </div>
        
        <AnimatePresence>
          {showAgenda && (
            <motion.aside
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 340, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="bg-background-secondary border border-border-primary rounded-3xl overflow-hidden flex flex-col shadow-xl"
            >
              <header className="p-6 border-b border-border-primary bg-background-tertiary/20">
                <h3 className="text-sm font-bold text-text-primary uppercase tracking-widest flex items-center gap-2">
                  <CalendarCheck size={18} weight="fill" className="text-[#3b82f6]" />
                  Agenda
                </h3>
              </header>
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <AgendaContent events={events} />
              </div>
            </motion.aside>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}

// ── View Components ───────────────────────────────────────────────────────────

function MonthView({ currentDate, events }: { currentDate: Date; events: CalendarEvent[] }) {
  const [expandedDay, setExpandedDay] = useState<Date | null>(null);

  const weeks = useMemo(() => {
    const y = currentDate.getFullYear(), m = currentDate.getMonth();
    const firstDay = new Date(y, m, 1).getDay();
    const totalDays = new Date(y, m + 1, 0).getDate();
    const prevTotal = new Date(y, m, 0).getDate();
    
    const arr: Date[] = [];
    for (let i = firstDay - 1; i >= 0; i--) arr.push(new Date(y, m - 1, prevTotal - i));
    for (let i = 1; i <= totalDays; i++) arr.push(new Date(y, m, i));
    while (arr.length % 7 !== 0) arr.push(new Date(y, m + 1, arr.length - totalDays - firstDay + 1));
    
    const weeksArr: Date[][] = [];
    for (let i = 0; i < arr.length; i += 7) weeksArr.push(arr.slice(i, i + 7));
    return weeksArr;
  }, [currentDate]);

  return (
    <div className="flex flex-col h-full bg-background-primary relative">
      <div className="grid grid-cols-7 border-b border-border-primary bg-background-tertiary/30">
        {DAYS.map(d => (
          <div key={d} className="py-4 text-center text-[11px] font-black text-text-tertiary uppercase tracking-[0.2em]">{d}</div>
        ))}
      </div>
      <div className="flex-1 grid grid-rows-6">
        {weeks.map((week, wIdx) => (
          <div key={wIdx} className="grid grid-cols-7 border-b border-border-primary last:border-b-0 relative min-h-[200px]">
            {week.map((date, dIdx) => {
              const isToday = isSameDay(date, new Date());
              const isCurrentMonth = date.getMonth() === currentDate.getMonth();
              return (
                <div key={dIdx} className={`border-r border-border-primary last:border-r-0 p-3 pr-1.5 ${isCurrentMonth ? 'bg-background-secondary/5' : 'bg-background-primary/40 opacity-30 pointer-events-none'}`}>
                  <div className="flex justify-end mb-2">
                    <span className={`text-[13px] font-black w-8 h-8 flex items-center justify-center rounded-xl transition-colors ${isToday ? 'bg-blue-600 text-white shadow-lg' : 'text-text-tertiary'}`}>
                      {date.getDate()}
                    </span>
                  </div>
                </div>
              );
            })}
            <div className="absolute inset-x-0 bottom-0 top-[48px] pointer-events-none px-1.5 overflow-hidden z-20">
              <WeekEvents week={week} events={events} onMoreClick={setExpandedDay} />
            </div>
          </div>
        ))}
      </div>

      <AnimatePresence>
        {expandedDay && (
          <DayPopover 
            date={expandedDay} 
            events={events} 
            onClose={() => setExpandedDay(null)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function TimeGridView({ currentDate, events, days }: { currentDate: Date; events: CalendarEvent[]; days: number }) {
  const weekDays = useMemo(() => {
    if (days === 1) return [currentDate];
    const start = new Date(currentDate);
    if (days === 7) start.setDate(start.getDate() - start.getDay());
    return Array.from({ length: days }, (_, i) => {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [currentDate, days]);

  const { allDayEvents, timedEvents } = useMemo(() => {
    const allDay: CalendarEvent[] = [];
    const timed: CalendarEvent[] = [];
    events.forEach(e => {
      const start = new Date(e.start_at);
      const end = e.end_at ? new Date(e.end_at) : start;
      const hoursDiff = (end.getTime() - start.getTime()) / 3600000;
      const isMultiDay = hoursDiff >= 24 || start.getDate() !== end.getDate();
      if (isMultiDay) allDay.push(e);
      else timed.push(e);
    });
    return { allDayEvents: allDay, timedEvents: timed };
  }, [events]);

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const now = new Date();

  return (
    <div className="flex flex-col h-full bg-background-primary">
      <div className="flex border-b-2 border-border-primary bg-background-tertiary/20 shrink-0 shadow-sm z-30">
        <div className="w-20 border-r-2 border-border-primary" />
        <div className="flex-1 flex flex-col">
          <div className="flex border-b border-border-primary/50">
            {weekDays.map((d, i) => (
              <div key={i} className="flex-1 py-5 text-center border-r border-border-primary last:border-r-0">
                <p className="text-[11px] font-black text-text-tertiary uppercase tracking-widest">{DAYS[d.getDay()]}</p>
                <p className={`text-2xl font-black mt-1 ${isSameDay(d, now) ? 'text-blue-600' : 'text-text-primary'}`}>{d.getDate()}</p>
              </div>
            ))}
          </div>
          {allDayEvents.length > 0 && (
            <div className="relative py-2 border-b border-border-primary/50 min-h-[48px] bg-background-secondary/10">
              <WeekEvents week={weekDays} events={allDayEvents} />
            </div>
          )}
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto relative bg-background-primary scrollbar-hide">
        <div className="flex min-h-[1440px]">
          <div className="w-20 border-r border-border-primary bg-background-tertiary/5">
            {hours.map(h => (
              <div key={h} className="h-[60px] pr-3 text-right">
                <span className="text-[11px] font-black text-text-tertiary uppercase tracking-tighter leading-[24px]">{h % 12 || 12} {h >= 12 ? 'PM' : 'AM'}</span>
              </div>
            ))}
          </div>
          <div className="flex-1 flex relative">
            <div className="absolute inset-0 grid grid-rows-[repeat(24,60px)] pointer-events-none">
              {hours.map(h => <div key={h} className="border-b border-border-primary/30 last:border-b-0" />)}
            </div>
            {weekDays.map((d, i) => (
              <DayColumn key={i} date={d} events={timedEvents} isToday={isSameDay(d, now)} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function DayColumn({ date, events, isToday }: { date: Date; events: CalendarEvent[]; isToday: boolean }) {
  const now = new Date();
  
  const dayEvs = useMemo(() => {
    const dayStart = getStartOfDay(date);
    const dayEnd = getEndOfDay(date);
    const overlapping = events.filter(e => {
      const start = new Date(e.start_at);
      return start >= dayStart && start <= dayEnd;
    });

    overlapping.sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime());

    const columns: CalendarEvent[][] = [];
    overlapping.forEach(ev => {
      let placed = false;
      for (const col of columns) {
        const last = col[col.length - 1];
        if (new Date(ev.start_at) >= new Date(last.end_at)) {
          col.push(ev);
          placed = true;
          break;
        }
      }
      if (!placed) columns.push([ev]);
    });

    return columns.flatMap((col, colIdx) => {
      return col.map(ev => ({
        ...ev,
        colIdx,
        colTotal: columns.length
      }));
    });
  }, [date, events]);

  return (
    <div className="flex-1 border-r border-border-primary last:border-r-0 relative group">
      {dayEvs.map(ev => {
        const start = new Date(ev.start_at);
        const end = new Date(ev.end_at);
        const startMins = start.getHours() * 60 + start.getMinutes();
        const duration = (end.getTime() - start.getTime()) / 60000;
        const width = 95 / ev.colTotal;
        const left = ev.colIdx * (100 / ev.colTotal);

        return (
          <motion.div
            key={ev.id}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{
              position: 'absolute',
              top: startMins,
              left: `${left}%`,
              width: `${width}%`,
              height: Math.max(duration, 32),
              zIndex: 10,
            }}
            className="bg-[#3b82f6] text-white rounded-xl p-2.5 overflow-hidden shadow-2xl border border-white/20 hover:scale-[1.02] hover:z-50 cursor-pointer transition-all flex flex-col"
          >
            <p className="text-[10px] font-black opacity-90 uppercase leading-none mb-1.5 tracking-tight">{formatTime(start)}</p>
            <p className="text-sm font-bold leading-none truncate">{ev.title}</p>
          </motion.div>
        );
      })}

      {isToday && (
        <div style={{ top: now.getHours() * 60 + now.getMinutes() }} className="absolute left-0 right-0 z-[60] flex items-center pointer-events-none">
          <div className="w-3 h-3 rounded-full bg-red-500 shadow-lg shadow-red-500/50" />
          <div className="flex-1 h-0.5 bg-red-500 shadow-sm" />
        </div>
      )}
    </div>
  );
}

// ── Agenda Content ─────────────────────────────────────────────────────────────

function AgendaContent({ events }: { events: CalendarEvent[] }) {
  const groups = useMemo(() => {
    const today = getStartOfDay(new Date());
    const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);

    const upcoming = events
      .filter(e => new Date(e.start_at) >= today)
      .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime());

    const groupsArr: { label: string; events: CalendarEvent[] }[] = [];
    upcoming.forEach(ev => {
      const d = getStartOfDay(new Date(ev.start_at));
      const label = isSameDay(d, today) ? 'Today' : isSameDay(d, tomorrow) ? 'Tomorrow' : d.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });
      let existing = groupsArr.find(g => g.label === label);
      if (!existing) { existing = { label, events: [] }; groupsArr.push(existing); }
      existing.events.push(ev);
    });
    return groupsArr;
  }, [events]);

  if (groups.length === 0) return (
    <div className="flex flex-col items-center justify-center py-20 opacity-30 text-center">
      <CalendarBlank size={56} weight="thin" />
      <p className="text-xs font-black mt-5 uppercase tracking-[0.3em]">Quiet days ahead</p>
    </div>
  );

  return groups.map(group => (
    <div key={group.label} className="space-y-4">
      <h4 className="text-[11px] font-black text-text-tertiary uppercase tracking-[0.2em] px-1">{group.label}</h4>
      <div className="space-y-3">
        {group.events.map(ev => (
          <div key={ev.id} className="p-5 bg-background-tertiary border border-border-primary rounded-[24px] hover:border-[#3b82f6]/50 hover:shadow-xl transition-all cursor-pointer group relative overflow-hidden">
            <div className="absolute left-0 top-0 h-full w-1.5 bg-[#3b82f6]/60 group-hover:bg-[#3b82f6]" />
            <p className="text-base font-bold text-text-primary mb-2">{ev.title}</p>
            <div className="flex items-center gap-3 text-xs text-text-tertiary font-bold">
              <Clock size={14} weight="bold" className="text-[#3b82f6]" />
              <span>{formatTime(new Date(ev.start_at))} – {formatTime(new Date(ev.end_at))}</span>
            </div>
            {ev.location && (
              <div className="flex items-center gap-3 text-xs text-text-tertiary mt-2">
                <MapPin size={14} weight="bold" className="text-[#3b82f6]" />
                <span className="truncate font-semibold">{ev.location}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  ));
}
