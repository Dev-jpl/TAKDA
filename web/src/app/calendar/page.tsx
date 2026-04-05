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
  Layout,
  Users,
  MapPin
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
  
  const [showAgenda, setShowAgenda] = useState(false);
  const [popoverState, setPopoverState] = useState<{ 
    isOpen: boolean; 
    date: Date | null; 
    position: { x: number; y: number } | null;
    flipX: boolean;
    flipY: boolean;
  }>({
    isOpen: false,
    date: null,
    position: null,
    flipX: false,
    flipY: false
  });
  
  const [showNewModal, setShowNewModal] = useState(false);
  const [newEvent, setNewEvent] = useState({
    title: '',
    startDate: new Date().toISOString().slice(0, 10),
    startTime: '09:00',
    endDate: new Date().toISOString().slice(0, 10),
    endTime: '10:00',
    people: '',
    location: '',
    description: '',
    calendar_id: undefined,
    hub_id: undefined
  });

  useEffect(() => {
    const initCalendar = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await loadEvents(user.id);
      }
      setLoading(false);
    };

    initCalendar();
  }, []);

  const loadEvents = async (userId: string) => {
    try {
      const data = await eventsService.getEvents(userId);
      setEvents(data);
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
        await loadEvents(user.id);
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
      const startTimeISO = new Date(`${newEvent.startDate}T${newEvent.startTime}:00`).toISOString();
      const endTimeISO = new Date(`${newEvent.endDate}T${newEvent.endTime}:00`).toISOString();

      await eventsService.createEvent({
        ...newEvent,
        start_at: startTimeISO,
        end_at: endTimeISO,
        user_id: user.id,
        hub_id: newEvent.hub_id || undefined
      });
      
      setShowNewModal(false);
      setPopoverState({ ...popoverState, isOpen: false });
      
      // Reset state
      setNewEvent({
        title: '',
        startDate: new Date().toISOString().slice(0, 10),
        startTime: '09:00',
        endDate: new Date().toISOString().slice(0, 10),
        endTime: '10:00',
        people: '',
        location: '',
        description: '',
        calendar_id: undefined,
        hub_id: undefined
      });
      
      await loadEvents(user.id);
    } catch (error) {
      console.error('Failed to create event:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDateClick = (e: React.MouseEvent, day: Date | null) => {
    if (!day) return;
    
    const clientX = e.clientX;
    const clientY = e.clientY;
    
    const flipX = clientX + 360 > window.innerWidth;
    const flipY = clientY + 500 > window.innerHeight;
    
    setPopoverState({
      isOpen: true,
      date: day,
      position: { x: clientX, y: clientY },
      flipX,
      flipY
    });

    const dateStr = day.toISOString().slice(0, 10);
    
    setNewEvent({
      ...newEvent,
      startDate: dateStr,
      startTime: '09:00',
      endDate: dateStr,
      endTime: '10:00',
      people: '',
      location: '',
      description: '',
      hub_id: undefined
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

  const getEventsForDay = (date: Date | null) => {
    if (!date) return [];
    
    // Normalize current date to midnight for comparison
    const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const dayEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);

    return events.filter(event => {
      const eventStart = new Date(event.start_at);
      const eventEnd = event.end_at ? new Date(event.end_at) : eventStart;
      
      // Event spans across this day if it starts before day ends AND ends after day starts
      return eventStart <= dayEnd && eventEnd >= dayStart;
    }).sort((a, b) => {
      // Primary sort: start date (earlier first)
      const startCompare = new Date(a.start_at).getTime() - new Date(b.start_at).getTime();
      if (startCompare !== 0) return startCompare;
      
      // Secondary sort: duration (longer first to occupy top slots)
      const aDuration = a.end_at ? new Date(a.end_at).getTime() - new Date(a.start_at).getTime() : 0;
      const bDuration = b.end_at ? new Date(b.end_at).getTime() - new Date(b.start_at).getTime() : 0;
      const durationCompare = bDuration - aDuration;
      if (durationCompare !== 0) return durationCompare;

      // Final tie-breaker: stable id sort
      return a.id.localeCompare(b.id);
    });
  };

  return (
    <main className="min-h-screen py-12 px-4 md:px-8 lg:px-12 w-full">
      <AnimatePresence>
        {popoverState.isOpen && (
          <>
            <div 
              className="fixed inset-0 z-[80]" 
              onClick={() => setPopoverState({ ...popoverState, isOpen: false })}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ 
                opacity: 1, 
                scale: 1,
                x: popoverState.flipX ? '-102%' : '8px',
                y: popoverState.flipY ? '-100%' : '0px'
              }}
              exit={{ opacity: 0, scale: 0.9 }}
              style={{ 
                position: 'fixed', 
                left: popoverState.position?.x, 
                top: popoverState.position?.y,
                zIndex: 90
              }}
              className="w-[340px] bg-background-secondary/90 backdrop-blur-xl border border-border-primary rounded-2xl p-6 shadow-2xl"
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
                <div className="space-y-3">
                  <div className="relative">
                    <input 
                      type="text" 
                      autoFocus
                      required
                      placeholder="Mission Objective..."
                      value={newEvent.title}
                      onChange={e => setNewEvent({...newEvent, title: e.target.value})}
                      className="w-full bg-background-tertiary/20 border border-border-primary/20 rounded-xl pl-4 pr-10 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-modules-track placeholder:text-text-tertiary/40"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-modules-track/40">
                      <Sparkle size={14} weight="fill" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    <div className="grid grid-cols-2 gap-3 pb-3 border-b border-border-primary/10">
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-text-tertiary uppercase tracking-widest flex items-center gap-1.5 ml-1">
                          <CalendarIcon className="w-3 h-3" />
                          Start Date
                        </label>
                        <input
                          type="date"
                          value={newEvent.startDate}
                          onChange={(e) => setNewEvent({ ...newEvent, startDate: e.target.value })}
                          className="w-full bg-background-tertiary/20 border border-border-primary/20 rounded-xl px-3 py-2 text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-modules-track"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-text-tertiary uppercase tracking-widest flex items-center gap-1.5 ml-1">
                          <Clock className="w-3 h-3" />
                          Start Time
                        </label>
                        <input
                          type="time"
                          value={newEvent.startTime}
                          onChange={(e) => setNewEvent({ ...newEvent, startTime: e.target.value })}
                          className="w-full bg-background-tertiary/20 border border-border-primary/20 rounded-xl px-3 py-2 text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-modules-track"
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 pb-2">
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-text-tertiary uppercase tracking-widest flex items-center gap-1.5 ml-1">
                          <CalendarIcon className="w-3 h-3" />
                          End Date
                        </label>
                        <input
                          type="date"
                          value={newEvent.endDate}
                          onChange={(e) => setNewEvent({ ...newEvent, endDate: e.target.value })}
                          className="w-full bg-background-tertiary/20 border border-border-primary/20 rounded-xl px-3 py-2 text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-modules-track"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-text-tertiary uppercase tracking-widest flex items-center gap-1.5 ml-1">
                          <Clock className="w-3 h-3" />
                          End Time
                        </label>
                        <input
                          type="time"
                          value={newEvent.endTime}
                          onChange={(e) => setNewEvent({ ...newEvent, endTime: e.target.value })}
                          className="w-full bg-background-tertiary/20 border border-border-primary/20 rounded-xl px-3 py-2 text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-modules-track"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-text-tertiary uppercase tracking-widest flex items-center gap-1.5 ml-1">
                      <MapPin className="w-3 h-3" />
                      Deployment Zone
                    </label>
                    <input
                      type="text"
                      placeholder="Mission Grounds..."
                      value={newEvent.location}
                      onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
                      className="w-full bg-background-tertiary/20 border border-border-primary/20 rounded-xl px-4 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-modules-track placeholder:text-text-tertiary/40"
                    />
                  </div>
                </div>
                
                <div className="flex items-center justify-between text-[10px] font-bold text-text-tertiary bg-background-tertiary/50 p-2 rounded-lg border border-border-primary/50">
                  <div className="flex items-center gap-2">
                    <Clock size={12} />
                    <span>{popoverState.date?.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  </div>
                  <span className="text-modules-track uppercase tracking-[0.1em] opacity-70">Standby</span>
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
                    className="w-full bg-background-tertiary/20 border border-border-primary/20 rounded-xl px-4 py-3 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-modules-track placeholder:text-text-tertiary/40"
                    placeholder="Mission command..."
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4 pb-4 border-b border-border-primary/10">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-text-tertiary uppercase tracking-widest flex items-center gap-2 ml-1">
                      <CalendarIcon className="w-4 h-4" />
                      Start Date
                    </label>
                    <input
                      type="date"
                      required
                      value={newEvent.startDate}
                      onChange={e => setNewEvent({...newEvent, startDate: e.target.value})}
                      className="w-full bg-background-tertiary/20 border border-border-primary/20 rounded-xl px-4 py-3 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-modules-track"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-text-tertiary uppercase tracking-widest flex items-center gap-2 ml-1">
                      <Clock className="w-4 h-4" />
                      Start Time
                    </label>
                    <input
                      type="time"
                      required
                      value={newEvent.startTime}
                      onChange={e => setNewEvent({...newEvent, startTime: e.target.value})}
                      className="w-full bg-background-tertiary/20 border border-border-primary/20 rounded-xl px-4 py-3 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-modules-track"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-text-tertiary uppercase tracking-widest flex items-center gap-2 ml-1">
                      <CalendarIcon className="w-4 h-4" />
                      End Date
                    </label>
                    <input
                      type="date"
                      required
                      value={newEvent.endDate}
                      onChange={e => setNewEvent({...newEvent, endDate: e.target.value})}
                      className="w-full bg-background-tertiary/20 border border-border-primary/20 rounded-xl px-4 py-3 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-modules-track"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-text-tertiary uppercase tracking-widest flex items-center gap-2 ml-1">
                      <Clock className="w-4 h-4" />
                      End Time
                    </label>
                    <input
                      type="time"
                      required
                      value={newEvent.endTime}
                      onChange={e => setNewEvent({...newEvent, endTime: e.target.value})}
                      className="w-full bg-background-tertiary/20 border border-border-primary/20 rounded-xl px-4 py-3 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-modules-track"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-text-tertiary uppercase tracking-widest block mb-2">Assigned Agents</label>
                    <div className="relative">
                      <input 
                        type="text" 
                        value={newEvent.people}
                        onChange={e => setNewEvent({...newEvent, people: e.target.value})}
                        className="w-full bg-background-tertiary/20 border border-border-primary/20 rounded-xl pl-10 pr-4 py-3 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-modules-track placeholder:text-text-tertiary/40"
                        placeholder="Add team members..."
                      />
                      <Users size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-tertiary" />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-text-tertiary uppercase tracking-widest block mb-2">Deployment Zone</label>
                    <div className="relative">
                      <input 
                        type="text" 
                        value={newEvent.location}
                        onChange={e => setNewEvent({...newEvent, location: e.target.value})}
                        className="w-full bg-background-tertiary/20 border border-border-primary/20 rounded-xl pl-10 pr-4 py-3 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-modules-track placeholder:text-text-tertiary/40"
                        placeholder="Set location..."
                      />
                      <MapPin size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-tertiary" />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black text-text-tertiary uppercase tracking-widest block mb-2">Intelligence</label>
                  <textarea 
                    value={newEvent.description}
                    onChange={e => setNewEvent({...newEvent, description: e.target.value})}
                    className="w-full bg-background-tertiary/20 border border-border-primary/20 rounded-xl px-4 py-3 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-modules-track h-24 resize-none placeholder:text-text-tertiary/40"
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
        <div className={`${showAgenda ? 'xl:col-span-2' : ''} relative`}>
          <div className="bg-transparent rounded-3xl p-0">
            <div className="flex items-center justify-between mb-10">
              <h2 className="text-2xl font-black text-text-primary flex items-baseline gap-3">
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-text-primary to-text-tertiary uppercase tracking-tighter">
                  {MONTHS[currentDate.getMonth()]}
                </span>
                <span className="text-modules-track font-mono text-sm opacity-50 tracking-[0.3em]">
                  {currentDate.getFullYear()}
                </span>
              </h2>
              <div className="flex items-center bg-background-tertiary/40 border border-border-primary/30 rounded-full p-1.5 shadow-inner">
                {['Day', 'Week', 'Month', 'Year'].map(view => (
                  <button 
                    key={view}
                    className={`px-5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${view === 'Month' ? 'bg-background-secondary text-text-primary shadow-sm ring-1 ring-border-primary/50' : 'text-text-tertiary hover:text-text-primary'}`}
                  >
                    {view}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => changeMonth(-1)}
                  className="p-2 rounded-lg bg-background-tertiary border border-border-primary text-text-tertiary hover:text-text-primary transition-all shadow-sm"
                >
                  <CaretLeft size={18} />
                </button>
                <button 
                  onClick={() => setCurrentDate(new Date())}
                  className="px-5 py-2 text-[10px] font-black uppercase tracking-[0.2em] bg-background-tertiary border border-border-primary text-text-tertiary hover:text-text-primary transition-all shadow-sm"
                >
                  Today
                </button>
                <button 
                  onClick={() => changeMonth(1)}
                  className="p-2 rounded-lg bg-background-tertiary border border-border-primary text-text-tertiary hover:text-text-primary transition-all shadow-sm"
                >
                  <CaretRight size={18} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7">
              {DAYS.map(day => (
                <div key={day} className="text-center text-[10px] font-black text-text-tertiary uppercase tracking-[0.25em] pb-6 border-b border-border-primary/5 mb-2 opacity-50">
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
                      min-h-[140px] relative border-b border-r border-border-primary p-1 group cursor-pointer transition-all duration-300
                      ${!day ? 'bg-background-secondary' : 'backdrop-blur-[0.5px] bg-background-secondary hover:bg-background-tertiary transition-all'}
                      ${isToday ? 'bg-modules-track/[0.01]' : ''}
                    `}
                  >
                    {day && (
                      <div className="flex flex-col h-full relative pt-7">
                        <div className="absolute top-2 right-2">
                          <span className={`
                            w-8 h-8 rounded-md flex items-center justify-center text-[13px] font-black transition-all duration-500
                            ${isToday 
                              ? 'bg-modules-track text-white shadow-lg shadow-modules-track/20' 
                              : 'text-text-primary/10 group-hover:text-text-primary group-hover:bg-background-tertiary/20'}
                          `}>
                            {day.getDate()}
                          </span>
                        </div>
                        
                        <div className="space-y-1.5 overflow-hidden h-full">
                          {dayEvents.slice(0, 4).map(event => {
                            const isFirstDay = new Date(event.start_at).toDateString() === day.toDateString();
                            const isLastDay = event.end_at && new Date(event.end_at).toDateString() === day.toDateString();
                            const isActualStart = isFirstDay;
                            const isActualEnd = isLastDay;
                            
                            // Check if it's the start or end of the week for CSS connectivity
                            const isSun = day.getDay() === 0;
                            const isSat = day.getDay() === 6;
                            
                            const isMultiDay = event.end_at && (new Date(event.end_at).getTime() - new Date(event.start_at).getTime() > 86400000);

                            // Rounding logic for "Life OS" Matrix
                            const shouldRoundLeft = isActualStart || isSun;
                            const shouldRoundRight = isActualEnd || isSat;

                            return (
                              <motion.div 
                                key={event.id}
                                initial={{ opacity: 0, x: -5 }}
                                animate={{ opacity: 1, x: 0 }}
                                className={`
                                  px-2 py-1.5 text-[10px] font-black truncate transition-all border shadow-lg
                                  ${shouldRoundLeft ? 'rounded-l-md' : 'rounded-l-none'}
                                  ${shouldRoundRight ? 'rounded-r-md' : 'rounded-r-none'}
                                  ${isActualStart ? 'ml-0 border-l' : '-ml-1.5 border-l-0'}
                                  ${isActualEnd ? 'mr-0 border-r' : '-mr-1.5 border-r-0'}
                                  ${isMultiDay ? 'border-dashed border-white/20' : 'border-solid border-white/10'}
                                  ${isFirstDay 
                                    ? 'bg-modules-track text-white border-modules-track/40 shadow-modules-track/10' 
                                    : 'bg-background-tertiary text-text-primary border-border-primary/50'}
                                `}
                                style={{
                                  zIndex: isFirstDay ? 10 : 5
                                }}
                                title={`${event.title} (${new Date(event.start_at).toLocaleDateString()} - ${new Date(event.end_at).toLocaleDateString()})`}
                              >
                                <div className="flex items-center gap-1.5">
                                  {isActualStart && (
                                    <div className={`w-2 h-2 rounded-full ${isFirstDay ? 'bg-modules-track/40' : 'bg-text-tertiary/40'} shadow-sm flex-shrink-0 animate-pulse`} />
                                  )}
                                  <span className="truncate tracking-wide">{event.title}</span>
                                </div>
                              </motion.div>
                            );
                          })}
                          {dayEvents.length > 4 && (
                            <div className="text-[9px] font-black text-text-tertiary uppercase tracking-widest pl-1 mt-1 opacity-60">
                              + {dayEvents.length - 4} more
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
                            {new Date(event.start_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
