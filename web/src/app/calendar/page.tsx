"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  Calendar as CalendarIcon, 
  CaretLeft, 
  CaretRight, 
  Plus, 
  Clock, 
  FileText,
  Sparkle,
  ArrowsClockwise
} from '@phosphor-icons/react';
import { supabase } from '@/services/supabase';
import { eventsService, CalendarEvent } from '@/services/events.service';
import { integrationsService } from '@/services/integrations.service';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const data = await eventsService.getEvents(user.id);
        setEvents(data);
      }
    } catch (error) {
      console.error('Calendar sync failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await integrationsService.syncGoogleCalendar(user.id);
        await loadEvents();
      }
    } catch (error) {
      console.error('Manual sync failed:', error);
    } finally {
      setSyncing(false);
    }
  };

  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const days = [];
    // Padding for previous month
    for (let i = 0; i < firstDay; i++) days.push(null);
    // Current month days
    for (let i = 1; i <= daysInMonth; i++) days.push(new Date(year, month, i));
    
    return days;
  }, [currentDate]);

  const changeMonth = (offset: number) => {
    const nextDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1);
    setCurrentDate(nextDate);
  };

  const getEventsForDay = (day: Date | null) => {
    if (!day) return [];
    return events.filter(event => {
      const eventDate = new Date(event.start_time);
      return eventDate.toDateString() === day.toDateString();
    });
  };

  return (
    <main className="p-6 lg:p-12 max-w-7xl mx-auto">
      <header className="flex items-center justify-between mb-12">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-modules-track/20 border border-modules-track/30 flex items-center justify-center shadow-lg shadow-modules-track/10">
            <CalendarIcon size={24} color="var(--modules-track)" weight="duotone" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-text-primary">Registry Scheduling</h1>
            <p className="text-text-tertiary text-xs font-medium uppercase tracking-widest mt-1">
              Mission Coordination Matrix
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={handleSync}
            disabled={syncing}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs transition-all border border-border-primary hover:bg-background-tertiary ${syncing ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <ArrowsClockwise size={16} weight="bold" className={syncing ? 'animate-spin' : ''} />
            <span>{syncing ? 'Syncing...' : 'Sync Now'}</span>
          </button>
          <button className="flex items-center gap-2 bg-modules-track text-white px-5 py-2.5 rounded-xl font-bold text-xs shadow-xl shadow-modules-track/20 hover:scale-[1.02] transition-all">
            <Plus size={16} weight="bold" />
            <span>New Mission</span>
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Calendar Grid */}
        <div className="xl:col-span-2 space-y-6">
          <div className="bg-background-secondary border border-border-primary rounded-3xl p-8 shadow-sm">
            <div className="flex items-center justify-between mb-10">
              <h2 className="text-xl font-bold text-text-primary">
                {MONTHS[currentDate.getMonth()]} <span className="text-text-tertiary font-medium">{currentDate.getFullYear()}</span>
              </h2>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => changeMonth(-1)}
                  className="p-2 rounded-lg bg-background-tertiary border border-border-primary text-text-tertiary hover:text-text-primary transition-all"
                >
                  <CaretLeft size={20} />
                </button>
                <button 
                  onClick={() => setCurrentDate(new Date())}
                  className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest bg-background-tertiary border border-border-primary text-text-tertiary hover:text-text-primary transition-all"
                >
                  Today
                </button>
                <button 
                  onClick={() => changeMonth(1)}
                  className="p-2 rounded-lg bg-background-tertiary border border-border-primary text-text-tertiary hover:text-text-primary transition-all"
                >
                  <CaretRight size={20} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-y-8">
              {DAYS.map(day => (
                <div key={day} className="text-center text-[10px] font-black text-text-tertiary uppercase tracking-widest pb-4">
                  {day}
                </div>
              ))}
              
              {calendarDays.map((day, idx) => {
                const dayEvents = getEventsForDay(day);
                const isToday = day?.toDateString() === new Date().toDateString();
                
                return (
                  <div key={idx} className="aspect-square relative flex flex-col items-center justify-center group cursor-pointer">
                    {day && (
                      <div className={`
                        w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all relative z-10
                        ${isToday ? 'bg-modules-track text-white font-bold shadow-lg shadow-modules-track/30' : 'text-text-primary hover:bg-background-tertiary'}
                      `}>
                        {day.getDate()}
                      </div>
                    )}
                    
                    {dayEvents.length > 0 && (
                      <div className="absolute bottom-1 flex gap-0.5">
                        {dayEvents.slice(0, 3).map((_, i) => (
                          <div key={i} className="w-1 h-1 rounded-full bg-modules-track" />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Agenda Column */}
        <div className="space-y-6">
          <section className="bg-background-secondary border border-border-primary rounded-3xl p-6 shadow-sm flex-1 h-fit">
            <h2 className="text-xs font-black text-text-tertiary uppercase tracking-widest mb-6 flex items-center gap-2">
              <Clock size={16} />
              Mission Agenda
            </h2>

            <div className="space-y-4">
              {loading ? (
                [1, 2, 3].map(i => (
                  <div key={i} className="h-16 rounded-2xl bg-background-tertiary animate-pulse border border-border-primary" />
                ))
              ) : events.length > 0 ? (
                events.slice(0, 5).map(event => (
                  <motion.div 
                    key={event.id}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="p-4 rounded-2xl bg-background-tertiary border border-border-primary hover:border-modules-track/40 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold text-modules-track uppercase tracking-[0.15em]">
                        {new Date(event.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <FileText size={14} className="text-text-tertiary group-hover:text-modules-track transition-colors" />
                    </div>
                    <h3 className="text-sm font-bold text-text-primary line-clamp-1">{event.title}</h3>
                  </motion.div>
                ))
              ) : (
                <div className="py-20 text-center">
                  <Sparkle size={32} className="mx-auto text-text-tertiary/20 mb-4" />
                  <p className="text-text-tertiary text-[10px] font-bold uppercase tracking-widest">Registry Clear</p>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
