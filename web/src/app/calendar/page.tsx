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
  Users,
  MapPin,
  NotePencil,
  CalendarCheck,
} from '@phosphor-icons/react';
import { supabase } from '@/services/supabase';
import { eventsService, CalendarEvent } from '@/services/events.service';
import { integrationsService } from '@/services/integrations.service';

const DAYS   = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const COL_W = 100 / 7; // % width of one day column

// ── Helpers ───────────────────────────────────────────────────────────────────

function todayStr() { return new Date().toISOString().slice(0, 10); }

function dateOnly(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDateRange(ev: CalendarEvent) {
  const s = new Date(ev.start_at);
  const e = ev.end_at ? new Date(ev.end_at) : null;
  const opts: Intl.DateTimeFormatOptions = { weekday: 'short', month: 'short', day: 'numeric' };
  if (!e) return s.toLocaleDateString([], opts) + ' · ' + formatTime(ev.start_at);
  const sameDay = dateOnly(s).getTime() === dateOnly(e).getTime();
  if (sameDay) {
    return s.toLocaleDateString([], opts) + ' · ' + formatTime(ev.start_at) + ' – ' + formatTime(ev.end_at!);
  }
  return s.toLocaleDateString([], opts) + ' – ' + e.toLocaleDateString([], opts);
}

// ── Multi-day layout ──────────────────────────────────────────────────────────

interface Slot {
  event: CalendarEvent;
  colStart: number; // 0-6
  colEnd: number;   // 0-6
  row: number;
  isStart: boolean;
  isEnd: boolean;
}

function isMultiDay(ev: CalendarEvent) {
  if (!ev.end_at) return false;
  return dateOnly(new Date(ev.end_at)).getTime() > dateOnly(new Date(ev.start_at)).getTime();
}

function layoutMultiDay(events: CalendarEvent[], week: (Date | null)[]): Slot[] {
  const weekDates = week.filter(Boolean) as Date[];
  if (weekDates.length === 0) return [];

  const weekStart = dateOnly(weekDates[0]);
  const weekEnd   = dateOnly(weekDates[weekDates.length - 1]);

  const overlapping = events.filter(ev => {
    if (!isMultiDay(ev)) return false;
    const evStart = dateOnly(new Date(ev.start_at));
    const evEnd   = dateOnly(new Date(ev.end_at!));
    return evStart <= weekEnd && evEnd >= weekStart;
  });

  overlapping.sort((a, b) => {
    const aStart = dateOnly(new Date(a.start_at)).getTime();
    const bStart = dateOnly(new Date(b.start_at)).getTime();
    if (aStart !== bStart) return aStart - bStart;
    return new Date(b.end_at!).getTime() - new Date(a.end_at!).getTime();
  });

  function colOf(d: Date): number {
    for (let i = 0; i < week.length; i++) {
      if (week[i] && dateOnly(week[i]!).getTime() === dateOnly(d).getTime()) return i;
    }
    return -1;
  }

  const rowOccupied: boolean[][] = [];

  function findRow(colStart: number, colEnd: number): number {
    for (let r = 0; r < 10; r++) {
      if (!rowOccupied[r]) rowOccupied[r] = Array(7).fill(false);
      let free = true;
      for (let c = colStart; c <= colEnd; c++) {
        if (rowOccupied[r][c]) { free = false; break; }
      }
      if (free) {
        for (let c = colStart; c <= colEnd; c++) rowOccupied[r][c] = true;
        return r;
      }
    }
    return 9;
  }

  const slots: Slot[] = [];

  for (const ev of overlapping) {
    const evStart = dateOnly(new Date(ev.start_at));
    const evEnd   = dateOnly(new Date(ev.end_at!));

    const clampStart = evStart < weekStart ? weekStart : evStart;
    const clampEnd   = evEnd   > weekEnd   ? weekEnd   : evEnd;

    let colStart = colOf(clampStart);
    let colEnd   = colOf(clampEnd);

    if (colStart === -1) {
      for (let i = 0; i < week.length; i++) {
        if (week[i] && dateOnly(week[i]!).getTime() >= clampStart.getTime()) {
          colStart = i; break;
        }
      }
    }
    if (colEnd === -1) {
      for (let i = week.length - 1; i >= 0; i--) {
        if (week[i] && dateOnly(week[i]!).getTime() <= clampEnd.getTime()) {
          colEnd = i; break;
        }
      }
    }

    if (colStart === -1 || colEnd === -1 || colStart > colEnd) continue;

    const row     = findRow(colStart, colEnd);
    const isStart = evStart.getTime() === clampStart.getTime();
    const isEnd   = evEnd.getTime()   === clampEnd.getTime();

    slots.push({ event: ev, colStart, colEnd, row, isStart, isEnd });
  }

  return slots;
}

// ── Agenda grouping ───────────────────────────────────────────────────────────

function groupEventsByDate(events: CalendarEvent[]) {
  const today    = new Date(); today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);

  const upcoming = events
    .filter(e => new Date(e.start_at) >= today)
    .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime());

  const groups: { label: string; events: CalendarEvent[] }[] = [];
  const idx = new Map<string, number>();

  for (const ev of upcoming) {
    const d = new Date(ev.start_at); d.setHours(0, 0, 0, 0);
    let label: string;
    if (d.getTime() === today.getTime())         label = 'Today';
    else if (d.getTime() === tomorrow.getTime()) label = 'Tomorrow';
    else label = new Date(ev.start_at).toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });

    if (!idx.has(label)) { idx.set(label, groups.length); groups.push({ label, events: [] }); }
    groups[idx.get(label)!].events.push(ev);
  }
  return groups;
}

// ── Input style ───────────────────────────────────────────────────────────────

const inputCls = "w-full bg-background-tertiary border border-border-primary rounded-xl px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-modules-knowledge placeholder:text-text-tertiary transition-colors";

// ── Component ─────────────────────────────────────────────────────────────────

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events,      setEvents]      = useState<CalendarEvent[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [syncing,     setSyncing]     = useState(false);
  const [userId,      setUserId]      = useState<string | null>(null);
  const [showAgenda,  setShowAgenda]  = useState(false);

  // Quick-add popover (click on empty day)
  const [addPopover, setAddPopover] = useState<{
    open: boolean; date: Date | null;
    pos: { x: number; y: number } | null;
    flipX: boolean; flipY: boolean;
  }>({ open: false, date: null, pos: null, flipX: false, flipY: false });

  // Event detail popover (click on event pill)
  const [detailPopover, setDetailPopover] = useState<{
    open: boolean; event: CalendarEvent | null;
    pos: { x: number; y: number } | null;
    flipX: boolean; flipY: boolean;
  }>({ open: false, event: null, pos: null, flipX: false, flipY: false });

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    title: '', startDate: todayStr(), startTime: '09:00',
    endDate: todayStr(), endTime: '10:00',
    people: '', location: '', description: '',
  });

  function resetForm(date?: string) {
    const d = date ?? todayStr();
    setForm({ title: '', startDate: d, startTime: '09:00', endDate: d, endTime: '10:00', people: '', location: '', description: '' });
  }

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) { setUserId(user.id); await load(user.id); }
      setLoading(false);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
        end_at:   new Date(`${form.endDate}T${form.endTime}:00`).toISOString(),
        user_id: userId,
      });
      setAddPopover(p => ({ ...p, open: false }));
      setShowModal(false);
      resetForm();
      await load(userId);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  function handleDayClick(e: React.MouseEvent, day: Date | null) {
    if (!day) return;
    setDetailPopover(p => ({ ...p, open: false }));
    setAddPopover({
      open: true, date: day,
      pos: { x: e.clientX, y: e.clientY },
      flipX: e.clientX + 340 > window.innerWidth,
      flipY: e.clientY + 480 > window.innerHeight,
    });
    resetForm(day.toISOString().slice(0, 10));
  }

  function handleEventClick(e: React.MouseEvent, ev: CalendarEvent) {
    e.stopPropagation();
    setAddPopover(p => ({ ...p, open: false }));
    setDetailPopover({
      open: true, event: ev,
      pos: { x: e.clientX, y: e.clientY },
      flipX: e.clientX + 320 > window.innerWidth,
      flipY: e.clientY + 340 > window.innerHeight,
    });
  }

  // ── Calendar grid data ────────────────────────────────────────────────────

  const calDays = useMemo(() => {
    const y = currentDate.getFullYear(), m = currentDate.getMonth();
    const first = new Date(y, m, 1).getDay();
    const total = new Date(y, m + 1, 0).getDate();
    const days: (Date | null)[] = [];
    for (let i = 0; i < first; i++) days.push(null);
    for (let i = 1; i <= total; i++) days.push(new Date(y, m, i));
    while (days.length % 7 !== 0) days.push(null);
    return days;
  }, [currentDate]);

  const weeks = useMemo(() => {
    const w: (Date | null)[][] = [];
    for (let i = 0; i < calDays.length; i += 7) w.push(calDays.slice(i, i + 7));
    return w;
  }, [calDays]);

  function getSingleDayEvents(day: Date | null) {
    if (!day) return [];
    const s = dateOnly(day);
    const e = new Date(s); e.setHours(23, 59, 59, 999);
    return events
      .filter(ev => !isMultiDay(ev) && new Date(ev.start_at) >= s && new Date(ev.start_at) <= e)
      .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime());
  }

  const agendaGroups = useMemo(() => groupEventsByDate(events), [events]);

  // ── Shared form fields ────────────────────────────────────────────────────

  function FormFields({ full = false }: { full?: boolean }) {
    return (
      <div className="space-y-3">
        <input required autoFocus={!full} placeholder="Event title"
          value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
          className={inputCls} />

        <div>
          <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest mb-1.5">Starts</p>
          <div className="grid grid-cols-2 gap-2">
            <input type="date" value={form.startDate}
              onChange={e => setForm(p => ({ ...p, startDate: e.target.value }))} className={inputCls} />
            <input type="time" value={form.startTime}
              onChange={e => setForm(p => ({ ...p, startTime: e.target.value }))} className={inputCls} />
          </div>
        </div>

        <div>
          <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest mb-1.5">Ends</p>
          <div className="grid grid-cols-2 gap-2">
            <input type="date" value={form.endDate}
              onChange={e => setForm(p => ({ ...p, endDate: e.target.value }))} className={inputCls} />
            <input type="time" value={form.endTime}
              onChange={e => setForm(p => ({ ...p, endTime: e.target.value }))} className={inputCls} />
          </div>
        </div>

        <div className="relative">
          <MapPin size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
          <input placeholder="Location (optional)" value={form.location}
            onChange={e => setForm(p => ({ ...p, location: e.target.value }))}
            className={`${inputCls} pl-8`} />
        </div>

        {full && (
          <>
            <div className="relative">
              <Users size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
              <input placeholder="Add people (optional)" value={form.people}
                onChange={e => setForm(p => ({ ...p, people: e.target.value }))}
                className={`${inputCls} pl-8`} />
            </div>
            <div className="relative">
              <NotePencil size={13} className="absolute left-3 top-3 text-text-tertiary" />
              <textarea placeholder="Notes (optional)" value={form.description}
                onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                className={`${inputCls} pl-8 h-20 resize-none`} />
            </div>
          </>
        )}
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <main className="p-6 lg:p-12">

      {/* ── Quick-add popover ──────────────────────────────────────────────── */}
      <AnimatePresence>
        {addPopover.open && (
          <>
            <div className="fixed inset-0 z-80" onClick={() => setAddPopover(p => ({ ...p, open: false }))} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0, x: addPopover.flipX ? '-102%' : '8px' }}
              exit={{ opacity: 0, scale: 0.95 }}
              style={{
                position: 'fixed',
                left: addPopover.pos?.x,
                top: addPopover.pos?.y,
                zIndex: 90,
              }}
              className="w-80 bg-background-secondary border border-border-primary rounded-xl p-5 shadow-2xl"
            >
              <div className="absolute left-0 top-0 h-full w-0.5 rounded-l-xl bg-modules-knowledge" />

              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-[10px] font-bold text-modules-knowledge uppercase tracking-widest">New Event</p>
                  <p className="text-xs font-semibold text-text-primary mt-0.5">
                    {addPopover.date?.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
                  </p>
                </div>
                <button onClick={() => setAddPopover(p => ({ ...p, open: false }))}
                  className="text-text-tertiary hover:text-text-primary transition-colors">
                  <X size={13} weight="bold" />
                </button>
              </div>

              <form onSubmit={handleCreate} className="space-y-3">
                <FormFields />
                <div className="flex gap-2 pt-1">
                  <button type="submit" disabled={loading}
                    className="flex-1 bg-modules-knowledge text-white py-2 rounded-lg font-semibold text-xs disabled:opacity-50 hover:opacity-90 transition-opacity">
                    {loading ? 'Saving…' : 'Save'}
                  </button>
                  <button type="button"
                    onClick={() => { setAddPopover(p => ({ ...p, open: false })); setShowModal(true); }}
                    className="flex-1 border border-border-primary text-text-tertiary py-2 rounded-lg font-semibold text-xs hover:text-text-primary hover:bg-background-tertiary transition-all">
                    More Options
                  </button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Event detail popover ───────────────────────────────────────────── */}
      <AnimatePresence>
        {detailPopover.open && detailPopover.event && (
          <>
            <div className="fixed inset-0 z-80" onClick={() => setDetailPopover(p => ({ ...p, open: false }))} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0, x: detailPopover.flipX ? '-102%' : '8px' }}
              exit={{ opacity: 0, scale: 0.95 }}
              style={{
                position: 'fixed',
                left: detailPopover.pos?.x,
                top: detailPopover.pos?.y,
                zIndex: 90,
              }}
              className="w-76 bg-background-secondary border border-border-primary rounded-xl shadow-2xl overflow-hidden"
            >
              <div className="h-1 bg-modules-knowledge w-full" />

              <div className="p-5">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <h3 className="text-sm font-bold text-text-primary leading-snug">
                    {detailPopover.event.title}
                  </h3>
                  <button onClick={() => setDetailPopover(p => ({ ...p, open: false }))}
                    className="shrink-0 text-text-tertiary hover:text-text-primary transition-colors mt-0.5">
                    <X size={13} weight="bold" />
                  </button>
                </div>

                <div className="space-y-2">
                  <div className="flex items-start gap-2 text-xs text-text-secondary">
                    <CalendarBlank size={13} className="shrink-0 mt-0.5 text-modules-knowledge" />
                    <span>{formatDateRange(detailPopover.event)}</span>
                  </div>

                  {detailPopover.event.location && (
                    <div className="flex items-start gap-2 text-xs text-text-secondary">
                      <MapPin size={13} className="shrink-0 mt-0.5 text-text-tertiary" />
                      <span>{detailPopover.event.location}</span>
                    </div>
                  )}

                  {detailPopover.event.people && (
                    <div className="flex items-start gap-2 text-xs text-text-secondary">
                      <Users size={13} className="shrink-0 mt-0.5 text-text-tertiary" />
                      <span>{detailPopover.event.people}</span>
                    </div>
                  )}

                  {detailPopover.event.description && (
                    <div className="flex items-start gap-2 text-xs text-text-secondary">
                      <NotePencil size={13} className="shrink-0 mt-0.5 text-text-tertiary" />
                      <span className="leading-relaxed">{detailPopover.event.description}</span>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Full create modal ──────────────────────────────────────────────── */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.97, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97 }}
              className="bg-background-secondary border border-border-primary rounded-xl p-6 w-full max-w-md shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-modules-knowledge" />
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-base font-bold text-text-primary">New Event</h2>
                  <p className="text-[11px] text-text-tertiary mt-0.5">Add to your calendar</p>
                </div>
                <button onClick={() => setShowModal(false)}
                  className="text-text-tertiary hover:text-text-primary transition-colors">
                  <X size={16} weight="bold" />
                </button>
              </div>

              <form onSubmit={handleCreate} className="space-y-4">
                <FormFields full />
                <div className="flex gap-3 pt-1">
                  <button type="button" onClick={() => setShowModal(false)}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold border border-border-primary text-text-tertiary hover:text-text-primary hover:bg-background-tertiary transition-all">
                    Cancel
                  </button>
                  <button type="submit" disabled={loading}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-modules-knowledge text-white disabled:opacity-50 hover:opacity-90 transition-opacity">
                    {loading ? 'Saving…' : 'Save Event'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Page header ────────────────────────────────────────────────────── */}
      <header className="flex items-center justify-between mb-10">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-text-primary">Calendar</h1>
          <p className="text-text-tertiary text-sm mt-1">Plan and track your schedule.</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAgenda(v => !v)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
              showAgenda
                ? 'bg-modules-knowledge/10 border-modules-knowledge/30 text-modules-knowledge'
                : 'border-border-primary text-text-tertiary hover:bg-background-secondary hover:text-text-primary'
            }`}
          >
            <CalendarCheck size={15} weight={showAgenda ? 'fill' : 'regular'} />
            Agenda
          </button>

          <button onClick={handleSync} disabled={syncing}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border border-border-primary text-text-tertiary hover:bg-background-secondary hover:text-text-primary transition-all disabled:opacity-40">
            <ArrowsClockwise size={14} className={syncing ? 'animate-spin' : ''} />
            {syncing ? 'Syncing…' : 'Sync'}
          </button>

          <button
            onClick={() => { resetForm(); setShowModal(true); }}
            className="flex items-center gap-2 bg-modules-knowledge/10 border border-modules-knowledge/20 text-modules-knowledge px-5 py-2 rounded-xl font-bold text-xs hover:bg-modules-knowledge/20 transition-all"
          >
            <Plus size={14} weight="bold" />
            New Event
          </button>
        </div>
      </header>

      {/* ── Main layout ────────────────────────────────────────────────────── */}
      <div className={`grid gap-8 ${showAgenda ? 'grid-cols-1 xl:grid-cols-3' : 'grid-cols-1'}`}>

        {/* ── Calendar ───────────────────────────────────────────────────── */}
        <div className={showAgenda ? 'xl:col-span-2' : ''}>

          {/* Month nav */}
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-bold text-text-primary">
              {MONTHS[currentDate.getMonth()]}
              <span className="text-text-tertiary font-normal text-base ml-2">
                {currentDate.getFullYear()}
              </span>
            </h2>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentDate(new Date())}
                className="px-3 py-1.5 rounded-lg text-[11px] font-bold border border-border-primary text-text-tertiary hover:text-text-primary hover:bg-background-secondary transition-all">
                Today
              </button>
              <button
                onClick={() => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
                className="p-1.5 rounded-lg border border-border-primary text-text-tertiary hover:text-text-primary hover:bg-background-secondary transition-all">
                <CaretLeft size={14} />
              </button>
              <button
                onClick={() => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
                className="p-1.5 rounded-lg border border-border-primary text-text-tertiary hover:text-text-primary hover:bg-background-secondary transition-all">
                <CaretRight size={14} />
              </button>
            </div>
          </div>

          {/* Grid */}
          <div className="bg-background-secondary border border-border-primary rounded-xl overflow-hidden">

            {/* Day headers */}
            <div className="grid grid-cols-7 border-b border-border-primary">
              {DAYS.map(d => (
                <div key={d} className="py-3 text-center text-[10px] font-bold text-text-tertiary uppercase tracking-widest">
                  {d}
                </div>
              ))}
            </div>

            {/* Week rows */}
            {weeks.map((week, weekIdx) => {
              const multiDaySlots = layoutMultiDay(events, week);
              const maxRow = multiDaySlots.length > 0 ? Math.max(...multiDaySlots.map(s => s.row)) : -1;
              const multiDayReserved = maxRow >= 0 ? (maxRow + 1) * 22 + 6 : 0;

              return (
                <div key={weekIdx} className={weekIdx < weeks.length - 1 ? 'border-b border-border-primary' : ''}>

                  {/* Multi-day bars layer */}
                  {multiDaySlots.length > 0 && (
                    <div className="relative w-full" style={{ height: multiDayReserved }}>
                      {multiDaySlots.map((slot, si) => {
                        const left  = slot.colStart * COL_W;
                        const width = (slot.colEnd - slot.colStart + 1) * COL_W;
                        const top   = slot.row * 22 + 4;

                        return (
                          <button
                            key={`${slot.event.id}-${si}`}
                            onClick={e => handleEventClick(e, slot.event)}
                            style={{
                              position: 'absolute',
                              left:  `calc(${left}% + ${slot.isStart ? 3 : 0}px)`,
                              width: `calc(${width}% - ${(slot.isStart ? 3 : 0) + (slot.isEnd ? 3 : 0)}px)`,
                              top,
                              height: 18,
                            }}
                            className={[
                              'flex items-center overflow-hidden',
                              'bg-modules-knowledge text-white text-[10px] font-semibold',
                              'hover:opacity-90 transition-opacity cursor-pointer',
                              slot.isStart ? 'rounded-l-sm pl-2' : 'pl-1',
                              slot.isEnd   ? 'rounded-r-sm pr-1' : 'pr-0',
                            ].join(' ')}
                            title={slot.event.title}
                          >
                            {slot.isStart && (
                              <span className="truncate">{slot.event.title}</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Day cells */}
                  <div className="grid grid-cols-7">
                    {week.map((day, dayIdx) => {
                      const singleEvs = getSingleDayEvents(day);
                      const isToday   = day?.toDateString() === new Date().toDateString();
                      const isNull    = !day;
                      const lastCol   = dayIdx === 6;

                      return (
                        <div
                          key={dayIdx}
                          onClick={e => handleDayClick(e, day)}
                          className={[
                            'relative min-h-20 p-2 border-r border-border-primary transition-colors',
                            lastCol ? 'border-r-0' : '',
                            isNull  ? 'bg-background-primary/40 cursor-default' : 'bg-background-primary hover:bg-background-secondary/60 cursor-pointer group',
                            isToday ? 'bg-modules-knowledge/5' : '',
                          ].join(' ')}
                        >
                          {day && (
                            <div className="flex flex-col h-full">
                              <div className="flex justify-end mb-1">
                                <span className={[
                                  'w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold transition-colors',
                                  isToday
                                    ? 'bg-modules-knowledge text-white'
                                    : 'text-text-secondary group-hover:text-text-primary',
                                ].join(' ')}>
                                  {day.getDate()}
                                </span>
                              </div>

                              <div className="space-y-0.5 overflow-hidden flex-1">
                                {singleEvs.slice(0, 3).map(ev => (
                                  <button
                                    key={ev.id}
                                    onClick={e => handleEventClick(e, ev)}
                                    title={ev.title}
                                    className="w-full text-left px-1.5 py-0.5 rounded-md text-[10px] font-semibold truncate leading-4 bg-modules-knowledge/20 text-modules-knowledge border-l-2 border-modules-knowledge hover:bg-modules-knowledge/30 transition-colors"
                                  >
                                    <span className="text-[9px] font-normal text-modules-knowledge/70 mr-1">
                                      {formatTime(ev.start_at)}
                                    </span>
                                    {ev.title}
                                  </button>
                                ))}
                                {singleEvs.length > 3 && (
                                  <p className="text-[9px] font-semibold text-text-tertiary pl-1">
                                    +{singleEvs.length - 3} more
                                  </p>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Agenda sidebar ─────────────────────────────────────────────── */}
        <AnimatePresence>
          {showAgenda && (
            <motion.aside
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 12 }}
              className="bg-background-secondary border border-border-primary rounded-xl overflow-hidden h-fit sticky top-6"
            >
              <div className="px-5 py-4 border-b border-border-primary flex items-center gap-2.5 relative">
                <div className="absolute left-0 top-0 h-full w-0.5 bg-modules-knowledge" />
                <Clock size={13} className="text-modules-knowledge" />
                <h2 className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest">Upcoming</h2>
              </div>

              <div className="overflow-y-auto max-h-[72vh]">
                {loading ? (
                  <div className="p-4 space-y-3">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="h-14 rounded-lg bg-background-tertiary animate-pulse" />
                    ))}
                  </div>
                ) : agendaGroups.length === 0 ? (
                  <div className="py-14 text-center px-5">
                    <CalendarBlank size={28} className="mx-auto text-text-tertiary/20 mb-3" />
                    <p className="text-xs text-text-tertiary">No upcoming events</p>
                  </div>
                ) : (
                  <div className="p-4 space-y-5">
                    {agendaGroups.map(group => (
                      <div key={group.label}>
                        <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest mb-2 px-1">
                          {group.label}
                        </p>
                        <div className="space-y-1.5">
                          {group.events.map(ev => (
                            <motion.button
                              key={ev.id}
                              initial={{ opacity: 0, x: 6 }}
                              animate={{ opacity: 1, x: 0 }}
                              onClick={e => handleEventClick(e, ev)}
                              className="w-full text-left relative p-3 rounded-lg bg-background-tertiary border border-border-primary hover:border-modules-knowledge/30 transition-colors cursor-pointer group overflow-hidden"
                            >
                              <div className="absolute left-0 top-0 h-full w-0.5 bg-modules-knowledge/60 group-hover:bg-modules-knowledge transition-colors" />
                              <p className="text-sm font-semibold text-text-primary leading-tight truncate pl-1">
                                {ev.title}
                              </p>
                              <div className="flex items-center gap-2 mt-1 pl-1 flex-wrap">
                                <span className="text-[10px] font-semibold text-modules-knowledge">
                                  {formatTime(ev.start_at)}
                                  {ev.end_at ? ` – ${formatTime(ev.end_at)}` : ''}
                                </span>
                                {ev.location && (
                                  <>
                                    <span className="text-text-tertiary/50 text-[10px]">·</span>
                                    <span className="flex items-center gap-0.5 text-[10px] text-text-tertiary">
                                      <MapPin size={9} />
                                      {ev.location}
                                    </span>
                                  </>
                                )}
                              </div>
                            </motion.button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.aside>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}
