"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calendar as CalendarIcon, 
  CaretLeft, 
  CaretRight, 
  Plus, 
  Clock, 
  FileText,
  Sparkle,
  ArrowsClockwise,
  X,
  Layout
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
  
  const [showAgenda, setShowAgenda] = useState(true);
  const [popoverState, setPopoverState] = useState<{ 
    isOpen: boolean; 
    date: Date | null; 
    position: { x: number; y: number } | null 
  }>({
    isOpen: false,
    date: null,
    position: null
  });
  
  const [showNewModal, setShowNewModal] = useState(false);
  const [newEvent, setNewEvent] = useState({
    title: '',
    start_time: new Date().toISOString().slice(0, 16),
    end_time: new Date(Date.now() + 3600000).toISOString().slice(0, 16),
    description: ''
  });

  useEffect(() => {
    const initCalendar = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Silent sync on load
        try {
          await integrationsService.syncGoogleCalendar(user.id);
        } catch (e) {
          console.error('Initial sync failed:', e);
        }
        await loadEvents();
      }
      setLoading(false);
    };

    initCalendar();
  }, []);

  const loadEvents = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const data = await eventsService.getEvents(user.id);
        setEvents(data);
      }
    } catch (error) {
      console.error('Calendar sync failed:', error);
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

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setLoading(true);
    try {
      await eventsService.createEvent({
        ...newEvent,
        user_id: user.id
      });
      setShowNewModal(false);
      setNewEvent({
        title: '',
        start_time: new Date().toISOString().slice(0, 16),
        end_time: new Date(Date.now() + 3600000).toISOString().slice(0, 16),
        description: ''
      });
      await loadEvents();
    } catch (error) {
      console.error('Failed to create event:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDateClick = (e: React.MouseEvent, day: Date | null) => {
    if (!day) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const scrollY = window.scrollY;
    
    // Position logic: prefer right of cell, but switch to left if near edge
    const isNearRightEdge = rect.left + 350 > window.innerWidth;
    
    setPopoverState({
      isOpen: true,
      date: day,
      position: {
        x: isNearRightEdge ? rect.left - 330 : rect.right + 10,
        y: rect.top + scrollY
      }
    });

    setNewEvent({
      ...newEvent,
      start_time: day.toISOString().slice(0, 10) + 'T09:00',
      end_time: day.toISOString().slice(0, 10) + 'T10:00'
    });
  };

  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const days = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(new Date(year, month, i));
    
    return days;
  }, [currentDate]);

  const changeMonth = (offset: number) => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1));
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
      {/* Quick Create Popover */}
      <AnimatePresence>
        {popoverState.isOpen && (
          <>
            <div 
              className="fixed inset-0 z-[80]" 
              onClick={() => setPopoverState({ ...popoverState, isOpen: false })}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 10 }}
              style={{ 
                position: 'absolute', 
                left: popoverState.position?.x, 
                top: popoverState.position?.y,
                zIndex: 90
              }}
              className="w-[320px] bg-background-secondary border border-modules-track/30 rounded-2xl p-6 shadow-2xl shadow-modules-track/10"
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] font-black text-modules-track uppercase tracking-[0.2em]">Quick Initiate</span>
                <button 
                  onClick={() => setPopoverState({ ...popoverState, isOpen: false })}
                  className="text-text-tertiary hover:text-text-primary transition-colors"
                >
                  <X size={14} weight="bold" />
                </button>
              </div>

              <form onSubmit={handleCreateEvent} className="space-y-4">
                <input 
                  type="text" 
                  autoFocus
                  required
                  placeholder="Mission name..."
                  value={newEvent.title}
                  onChange={e => setNewEvent({...newEvent, title: e.target.value})}
                  className="w-full bg-background-tertiary border border-border-primary rounded-xl px-4 py-2.5 text-sm text-text-primary focus:border-modules-track outline-none transition-all"
                />
                
                <div className="flex items-center gap-2 text-[10px] font-bold text-text-tertiary">
                  <Clock size={14} />
                  <span>{popoverState.date?.toLocaleDateString([], { month: 'long', day: 'numeric' })}</span>
                </div>

                <div className="flex gap-2">
                  <button 
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-modules-track text-white py-2 rounded-lg font-bold text-[10px] uppercase tracking-widest shadow-lg shadow-modules-track/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                  >
                    {loading ? 'Initiating...' : 'Deploy'}
                  </button>
                  <button 
                    type="button"
                    onClick={() => {
                      setPopoverState({ ...popoverState, isOpen: false });
                      setShowNewModal(true);
                    }}
                    className="flex-1 bg-background-tertiary text-text-tertiary py-2 rounded-lg font-bold text-[10px] uppercase tracking-widest border border-border-primary hover:text-text-primary transition-all"
                  >
                    Full Decrypt
                  </button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* New Event Modal Overlay */}
      <AnimatePresence>
        {showNewModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background-primary/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-background-secondary border border-border-primary rounded-3xl p-8 w-full max-w-md shadow-2xl relative"
            >
              <button 
                onClick={() => setShowNewModal(false)}
                className="absolute top-6 right-6 text-text-tertiary hover:text-text-primary transition-colors"
              >
                <X size={20} weight="bold" />
              </button>

              <h2 className="text-xl font-bold text-text-primary mb-6">Initiate New Mission</h2>
              
              <form onSubmit={handleCreateEvent} className="space-y-4">
                <div>
                  <label className="text-[10px] font-black text-text-tertiary uppercase tracking-widest block mb-2">Objective</label>
                  <input 
                    type="text" 
                    required
                    value={newEvent.title}
                    onChange={e => setNewEvent({...newEvent, title: e.target.value})}
                    className="w-full bg-background-tertiary border border-border-primary rounded-xl px-4 py-3 text-sm text-text-primary focus:border-modules-track outline-none transition-all placeholder:text-text-tertiary/30"
                    placeholder="Mission command..."
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-text-tertiary uppercase tracking-widest block mb-2">Commencement</label>
                    <input 
                      type="datetime-local" 
                      required
                      value={newEvent.start_time}
                      onChange={e => setNewEvent({...newEvent, start_time: e.target.value})}
                      className="w-full bg-background-tertiary border border-border-primary rounded-xl px-4 py-3 text-xs text-text-primary focus:border-modules-track outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-text-tertiary uppercase tracking-widest block mb-2">Conclusion</label>
                    <input 
                      type="datetime-local" 
                      required
                      value={newEvent.end_time}
                      onChange={e => setNewEvent({...newEvent, end_time: e.target.value})}
                      className="w-full bg-background-tertiary border border-border-primary rounded-xl px-4 py-3 text-xs text-text-primary focus:border-modules-track outline-none transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black text-text-tertiary uppercase tracking-widest block mb-2">Intelligence</label>
                  <textarea 
                    value={newEvent.description}
                    onChange={e => setNewEvent({...newEvent, description: e.target.value})}
                    className="w-full bg-background-tertiary border border-border-primary rounded-xl px-4 py-3 text-sm text-text-primary focus:border-modules-track outline-none transition-all h-24 resize-none placeholder:text-text-tertiary/30"
                    placeholder="Enter mission parameters..."
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button 
                    type="button"
                    onClick={() => setShowNewModal(false)}
                    className="flex-1 px-6 py-3 rounded-xl font-bold text-xs bg-background-tertiary text-text-tertiary border border-border-primary hover:text-text-primary transition-all"
                  >
                    Abort
                  </button>
                  <button 
                    type="submit"
                    disabled={loading}
                    className="flex-1 px-6 py-3 rounded-xl font-bold text-xs bg-modules-track text-white shadow-lg shadow-modules-track/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                  >
                    {loading ? 'Processing...' : 'Deploy Sync'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
            onClick={() => setShowAgenda(!showAgenda)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all border border-border-primary hover:bg-background-tertiary ${!showAgenda ? 'bg-modules-track text-white border-modules-track' : 'text-text-tertiary'}`}
            title={showAgenda ? "Hide Agenda" : "Show Agenda"}
          >
            <Layout size={18} weight={showAgenda ? "regular" : "fill"} />
          </button>
          
          <div className="w-px h-6 bg-border-primary mx-1" />

          <button 
            onClick={handleSync}
            disabled={syncing}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs transition-all border border-border-primary hover:bg-background-tertiary ${syncing ? 'opacity-50' : ''}`}
          >
            <ArrowsClockwise size={16} weight="bold" className={syncing ? 'animate-spin' : ''} />
            <span>{syncing ? 'Syncing...' : 'Sync Now'}</span>
          </button>
          <button 
            onClick={() => setShowNewModal(true)}
            className="flex items-center gap-2 bg-modules-track text-white px-5 py-2.5 rounded-xl font-bold text-xs shadow-xl shadow-modules-track/20 hover:scale-[1.02] transition-all"
          >
            <Plus size={16} weight="bold" />
            <span>New Mission</span>
          </button>
        </div>
      </header>

      <div className={`grid gap-8 transition-all duration-500 ease-in-out ${showAgenda ? 'grid-cols-1 xl:grid-cols-3' : 'grid-cols-1'}`}>
        <div className={`${showAgenda ? 'xl:col-span-2' : ''} space-y-6`}>
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
                  <div 
                    key={idx} 
                    onClick={(e) => handleDateClick(e, day)}
                    className={`
                      min-h-[120px] relative border-b border-r border-border-primary/30 p-2 group cursor-pointer transition-all
                      ${!day ? 'bg-background-tertiary/20' : 'hover:bg-background-tertiary/40'}
                    `}
                  >
                    {day && (
                      <div className="flex flex-col h-full">
                        <div className="flex justify-end mb-2">
                          <span className={`
                            w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-black transition-all
                            ${isToday ? 'bg-modules-track text-white shadow-lg shadow-modules-track/30' : 'text-text-tertiary group-hover:text-text-primary'}
                          `}>
                            {day.getDate()}
                          </span>
                        </div>
                        
                        <div className="space-y-1 overflow-hidden">
                          {dayEvents.slice(0, 3).map(event => (
                            <motion.div 
                              key={event.id}
                              initial={{ opacity: 0, y: 5 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="px-2 py-1 rounded-md bg-modules-track/10 border border-modules-track/20 text-modules-track text-[9px] font-bold truncate hover:bg-modules-track/20 transition-all"
                              title={event.title}
                            >
                              {event.title}
                            </motion.div>
                          ))}
                          {dayEvents.length > 3 && (
                            <div className="text-[9px] font-black text-text-tertiary uppercase tracking-widest pl-1">
                              + {dayEvents.length - 3} more
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <AnimatePresence>
          {showAgenda && (
            <motion.div 
              initial={{ opacity: 0, x: 20, width: 0 }}
              animate={{ opacity: 1, x: 0, width: 'auto' }}
              exit={{ opacity: 0, x: 20, width: 0 }}
              className="space-y-6 overflow-hidden"
            >
              <section className="bg-background-secondary border border-border-primary rounded-3xl p-6 shadow-sm flex-1 h-fit sticky top-6">
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
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}
