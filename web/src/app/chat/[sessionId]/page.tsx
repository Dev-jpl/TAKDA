"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { MarkdownRenderer } from '@/components/aly/MarkdownRenderer';
import {
  PaperPlaneRight, 
  Sparkle, 
  DotsThreeVertical,
  Plus,
  ArrowRight,
  ChartBar,
  ListChecks,
  Database,
  Brain,
  Calendar,
  MagicWand,
  CheckCircle,
  XCircle,
  ClockCounterClockwise
} from '@phosphor-icons/react';
import { 
  coordinatorService, 
  CoordinatorMessage, 
  CoordinatorSession,
} from '@/services/coordinator.service';
import { supabase } from '@/services/supabase';
import { ASSISTANT_NAME } from '@/constants/brand';

// ── Components ───────────────────────────────────────────────────────────────

function confirmationText(actionType: string, label: string): string {
  switch (actionType) {
    case 'CREATE_TASK':   return `Done! I've added "${label}" to your list.`;
    case 'UPDATE_TASK':   return `Got it, task updated.`;
    case 'CREATE_EVENT':  return `Scheduled! "${label}" is on your calendar.`;
    case 'LOG_EXPENSE':   return `Logged! Expense noted.`;
    case 'LOG_FOOD':      return `Logged! Food entry saved.`;
    case 'SAVE_TO_VAULT': return `Saved to your vault.`;
    case 'SAVE_REPORT':   return `Report saved!`;
    case 'CREATE_SPACE':  return `Space "${label}" created!`;
    case 'CREATE_HUB':    return `Hub "${label}" created!`;
    default:              return `Done!`;
  }
}

function ActionCard({ action, userId, onConfirmed }: { action: any; userId: string; onConfirmed: (type: string, label: string) => void }) {
  const [status, setStatus] = useState<'proposed' | 'confirmed' | 'aborted'>('proposed');
  const [busy, setBusy] = useState(false);

  const label = action.label || '';
  const impact = action.impact || '';
  const actionType = action.action_type || '';
  const data = action.data || {};

  const handleConfirm = async () => {
    setBusy(true);
    try {
      await coordinatorService.finalizeAction(userId, actionType, data);
      setStatus('confirmed');
      onConfirmed(actionType, label);
    } catch (e) {
      console.error('Action confirm failed:', e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`mt-3 p-4 rounded-2xl border bg-background-primary/50 shadow-sm ${
      status === 'aborted' ? 'opacity-50 border-border-primary' : 'border-modules-aly/30'
    }`}>
      <div className="flex items-center gap-2 mb-1.5">
        <MagicWand size={14} className="text-modules-aly" weight="fill" />
        <span className="text-[10px] font-bold text-modules-aly uppercase tracking-widest">Proposed</span>
      </div>
      <p className="text-sm font-semibold text-text-primary mb-1">{label}</p>
      {impact && <p className="text-xs text-text-tertiary mb-4 leading-relaxed">{impact}</p>}

      {status === 'proposed' && (
        <div className="flex gap-3">
          <button
            onClick={handleConfirm}
            disabled={busy}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-modules-aly text-white text-xs font-bold rounded-xl shadow-lg shadow-modules-aly/20 hover:scale-[1.02] transition-all disabled:opacity-50"
          >
            {busy ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <><CheckCircle size={16} weight="fill" /> Yes, do it</>
            )}
          </button>
          <button
            onClick={() => setStatus('aborted')}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 border border-border-primary text-text-tertiary text-xs font-bold rounded-xl hover:bg-background-tertiary transition-all"
          >
            <XCircle size={16} /> Cancel
          </button>
        </div>
      )}
      {status === 'confirmed' && (
        <p className="text-xs text-status-success font-bold flex items-center gap-1.5">
          <CheckCircle size={16} weight="fill" /> Done
        </p>
      )}
      {status === 'aborted' && (
        <p className="text-xs text-text-tertiary">Cancelled.</p>
      )}
    </div>
  );
}

function WelcomeView({ userName, onSelect }: { userName: string; onSelect: (prompt: string) => void }) {
  const suggestions = [
    { label: 'My day',        icon: <Sparkle size={18} />,     prompt: 'What does my day look like?' },
    { label: 'Add task',      icon: <ListChecks size={18} />,  prompt: 'I need to add a task' },
    { label: 'Daily briefing',icon: <ChartBar size={18} />,    prompt: 'Give me a quick briefing on my week' },
    { label: 'Log something', icon: <Database size={18} />,    prompt: 'I want to log something' },
    { label: 'Focus help',    icon: <ArrowRight size={18} />,  prompt: 'Help me figure out what to focus on' },
    { label: 'Quiz me',       icon: <Brain size={18} />,       prompt: 'Create a quiz from my notes' },
    { label: 'Schedule event',icon: <Calendar size={18} />,    prompt: 'I need to schedule an event' },
    { label: 'Brainstorm',    icon: <MagicWand size={18} />,   prompt: "Let's brainstorm directions for my projects" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center h-full max-w-2xl mx-auto px-6 gap-12"
    >
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="w-20 h-20 rounded-[2.5rem] bg-modules-aly/10 border border-modules-aly/20 flex items-center justify-center shadow-inner">
          <Sparkle size={40} className="text-modules-aly" weight="fill" />
        </div>
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-text-primary tracking-tight">
            Hey{userName ? `, ${userName}` : ''}!
          </h1>
          <p className="text-text-tertiary">I&apos;m {ASSISTANT_NAME}. What&apos;s on your mind today?</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
        {suggestions.map(s => (
          <button
            key={s.label}
            onClick={() => onSelect(s.prompt)}
            className="flex items-center gap-3.5 px-5 py-4 rounded-2xl border border-border-primary bg-background-secondary/50 hover:border-modules-aly/40 hover:bg-background-tertiary transition-all text-left shadow-sm hover:shadow-md group"
          >
            <span className="text-modules-aly shrink-0 transition-transform group-hover:scale-110">{s.icon}</span>
            <span className="text-sm font-semibold text-text-secondary group-hover:text-text-primary">{s.label}</span>
          </button>
        ))}
      </div>
    </motion.div>
  );
}

// ── Main Page Implementation ──────────────────────────────────────────────────

export default function ChatSessionPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;
  
  const [sessions, setSessions] = useState<CoordinatorSession[]>([]);
  const [messages, setMessages] = useState<(CoordinatorMessage & { actions?: any[] })[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState('');
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const SLASH_COMMANDS = [
    { cmd: '/briefing',  label: 'Daily briefing',    text: 'Give me a quick briefing on my day.' },
    { cmd: '/focus',     label: 'Help me focus',      text: 'What are my top priorities right now?' },
    { cmd: '/schedule',  label: 'Schedule an event',  text: 'I need to schedule an event.' },
    { cmd: '/report',    label: 'Generate a report',  text: 'Generate a summary report for me.' },
    { cmd: '/quiz',      label: 'Quiz me',            text: 'Create a quiz based on my notes.' },
    { cmd: '/brainstorm',label: 'Brainstorm',         text: "Let's brainstorm new directions for my projects." },
  ];

  // Auth & Profile
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserId(user.id);
        const full = user.user_metadata?.full_name || user.email || '';
        const first = full.split(' ')[0];
        if (first) setUserName(first);
      }
    });
  }, []);

  // Load Sessions
  const loadSessions = useCallback(async () => {
    if (!userId) return;
    const data = await coordinatorService.getSessions(userId);
    setSessions(data);
  }, [userId]);

  useEffect(() => {
    if (userId) loadSessions();
  }, [userId, loadSessions]);

  // Load specific session messages
  useEffect(() => {
    if (sessionId && sessionId !== 'new') {
      coordinatorService.getMessages(sessionId).then(setMessages);
    } else {
      setMessages([]);
    }
  }, [sessionId]);

  const handleSend = async (text: string = inputValue) => {
    if (!text.trim() || !userId || isStreaming) return;

    const currentId = sessionId === 'new' ? undefined : sessionId;
    
    const userMessage: CoordinatorMessage = {
      id: Date.now().toString(),
      session_id: currentId || 'new',
      role: 'user',
      content: text,
      created_at: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsStreaming(true);

    let assistantContent = '';
    let metadata: any = null;
    const assistantId = (Date.now() + 1).toString();

    setMessages(prev => [...prev, { 
      id: assistantId, 
      session_id: currentId || 'new',
      role: 'assistant', 
      content: '',
      created_at: new Date().toISOString(),
    }]);

    try {
      const stream = coordinatorService.streamChat(userId, userMessage.content, currentId);
      
      for await (const chunk of stream) {
        if (chunk.includes('|||')) {
          const [textPart, metaPart] = chunk.split('|||');
          assistantContent += textPart;
          try { metadata = JSON.parse(metaPart); } catch {}
          
          if (!currentId && metadata?.session_id) {
            router.replace(`/chat/${metadata.session_id}`);
          }
        } else {
          assistantContent += chunk;
        }

        setMessages(prev => prev.map(m => 
          m.id === assistantId ? { ...m, content: assistantContent } : m
        ));
      }

      if (metadata?.actions) {
        setMessages(prev => prev.map(m =>
          m.id === assistantId ? { ...m, actions: metadata.actions } : m
        ));
      }
    } catch (error) {
      console.error('Streaming failure:', error);
    } finally {
      setIsStreaming(false);
      loadSessions();
    }
  };

  const handleActionConfirmed = (text: string) => {
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      session_id: sessionId,
      role: 'assistant',
      content: text,
      created_at: new Date().toISOString(),
    }]);
  };

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, isStreaming]);

  return (
    <main className="flex h-screen bg-background-primary overflow-hidden">
      {/* Session Sidebar (Conversations) */}
      <aside className="w-80 border-r border-border-primary bg-background-secondary/30 flex flex-col hidden xl:flex shadow-sm z-20">
        <div className="p-6 border-b border-border-primary flex items-center justify-between bg-background-secondary/50 backdrop-blur-sm">
          <div className="flex items-center gap-2.5">
            <div className="w-2.5 h-2.5 rounded-full bg-modules-track animate-pulse shadow-[0_0_8px_rgba(var(--modules-track-rgb),0.5)]" />
            <h2 className="text-[10px] font-bold tracking-[0.25em] text-text-tertiary uppercase">Recent Chats</h2>
          </div>
          <button 
            onClick={() => router.push('/chat')}
            className="p-2 rounded-xl border border-border-primary hover:bg-background-tertiary text-modules-track transition-all hover:scale-105 active:scale-95"
            title="New Chat"
          >
            <Plus size={18} weight="bold" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {sessions.length === 0 ? (
            <div className="py-12 px-6 text-center">
              <div className="w-12 h-12 rounded-2xl bg-background-tertiary flex items-center justify-center mx-auto mb-4 opacity-50">
                <ClockCounterClockwise size={24} className="text-text-tertiary" />
              </div>
              <p className="text-xs text-text-tertiary leading-relaxed">No conversations yet.<br/>Start a new chat to begin.</p>
            </div>
          ) : sessions.map(session => (
            <button 
              key={session.id}
              onClick={() => router.push(`/chat/${session.id}`)}
              className={`w-full p-4 rounded-2xl border text-left transition-all group ${
                sessionId === session.id 
                  ? "bg-background-tertiary/80 border-modules-track/30 shadow-sm" 
                  : "bg-background-secondary/20 border-transparent text-text-tertiary hover:bg-background-tertiary/40 hover:text-text-primary hover:border-border-primary/50"
              }`}
            >
              <p className={`text-sm font-bold truncate mb-1.5 ${sessionId === session.id ? 'text-text-primary' : 'text-text-secondary group-hover:text-text-primary'}`}>
                {session.title || 'New Conversation'}
              </p>
              <div className="flex items-center gap-2 opacity-50">
                <div className={`w-1 h-1 rounded-full ${sessionId === session.id ? 'bg-modules-track' : 'bg-text-tertiary'}`} />
                <p className="text-[10px] font-medium tracking-wide">
                  {new Date(session.updated_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </p>
              </div>
            </button>
          ))}
        </div>
      </aside>

      {/* Chat Area */}
      <section className="flex-1 flex flex-col relative bg-[radial-gradient(circle_at_top_right,var(--modules-aly-5),transparent_40%)]">
        <header className="h-20 px-8 flex items-center justify-between bg-background-primary/80 backdrop-blur-xl border-b border-border-primary z-10 sticky top-0">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-2xl bg-modules-aly/10 flex items-center justify-center border border-modules-aly/20">
              <Sparkle size={24} className="text-modules-aly" weight="fill" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold tracking-tight text-text-primary">
                  {sessionId && sessions.find(s => s.id === sessionId)?.title || 'Ask Aly'}
                </h1>
                {isStreaming && (
                  <div className="flex gap-0.5 ml-2">
                    {[0, 0.2, 0.4].map(d => (
                      <motion.div key={d} className="w-1 h-1 rounded-full bg-modules-aly" animate={{ opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 1, delay: d }} />
                    ))}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-status-success shadow-[0_0_6px_rgba(var(--status-success-rgb),0.4)]" />
                <p className="text-[10px] text-text-tertiary font-bold tracking-widest uppercase">Connected & Secure</p>
              </div>
            </div>
          </div>
          <button className="p-2.5 rounded-xl hover:bg-background-tertiary text-text-tertiary hover:text-text-primary transition-all">
            <DotsThreeVertical size={20} weight="bold" />
          </button>
        </header>

        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-8 py-10 lg:px-20 space-y-10 pb-40"
        >
          {messages.length === 0 && !isStreaming ? (
            <WelcomeView userName={userName} onSelect={(prompt) => handleSend(prompt)} />
          ) : (
            <div className="max-w-4xl mx-auto w-full space-y-8">
              {messages.map((message) => (
                <div 
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start items-start gap-4'}`}
                >
                  {message.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-lg bg-modules-aly/10 flex items-center justify-center shrink-0 border border-modules-aly/20 mt-1">
                      <Sparkle size={16} className="text-modules-aly" weight="fill" />
                    </div>
                  )}
                  <div className={`max-w-[85%] lg:max-w-[75%] ${message.role === 'user' ? 'bg-background-tertiary p-5 rounded-3xl rounded-tr-sm border border-border-primary' : 'flex-1'}`}>
                    {message.role === 'assistant' && message.content && (
                      <p className="text-[10px] font-bold text-modules-aly uppercase tracking-[.2em] mb-2">{ASSISTANT_NAME}</p>
                    )}
                    <div className={message.role === 'user' ? 'text-[15px] font-medium leading-relaxed' : ''}>
                      {message.role === 'assistant' ? (
                        message.content ? (
                          <MarkdownRenderer content={message.content} />
                        ) : (
                          <div className="flex gap-1.5 py-1">
                            {[0, 0.15, 0.3].map(d => (
                              <motion.div
                                key={d}
                                className="w-2 h-2 rounded-full bg-modules-aly/60"
                                animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1, 0.8] }}
                                transition={{ repeat: Infinity, duration: 1.2, delay: d }}
                              />
                            ))}
                          </div>
                        )
                      ) : (
                        message.content
                      )}
                    </div>
                    
                    {message.actions && message.actions.length > 0 && (
                      <div className="space-y-3 mt-4">
                        {message.actions.map((act, i) => (
                          <ActionCard 
                            key={i} 
                            action={act} 
                            userId={userId!} 
                            onConfirmed={(type, label) => handleActionConfirmed(confirmationText(type, label))} 
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Improved Input Dock mirroring Sidebar */}
        <div className="absolute bottom-0 left-0 right-0 p-8 lg:px-20 lg:pb-12 pointer-events-none">
          <div className="max-w-4xl mx-auto relative pointer-events-auto">
            {/* Slash Menu */}
            <AnimatePresence>
              {showSlashMenu && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
                  className="absolute bottom-full left-0 right-0 mb-4 bg-background-secondary border border-border-primary rounded-[1.5rem] overflow-hidden shadow-[0_-20px_50px_-20px_rgba(0,0,0,0.5)] backdrop-blur-xl"
                >
                  {SLASH_COMMANDS.map(c => (
                    <button
                      key={c.cmd}
                      onClick={() => { setInputValue(''); setShowSlashMenu(false); handleSend(c.text); }}
                      className="w-full flex items-center gap-4 px-6 py-4 hover:bg-background-tertiary transition-colors text-left border-b border-border-primary/50 last:border-0"
                    >
                      <span className="text-[13px] font-bold text-modules-aly w-28 shrink-0">{c.cmd}</span>
                      <span className="text-xs font-semibold text-text-secondary">{c.label}</span>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            <div className="bg-background-secondary/90 backdrop-blur-2xl border border-border-primary rounded-3xl shadow-2xl p-2 flex items-end gap-2 focus-within:border-modules-aly/50 transition-all">
              <textarea 
                ref={inputRef}
                value={inputValue}
                onChange={(e) => {
                  setInputValue(e.target.value);
                  setShowSlashMenu(e.target.value === '/');
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                rows={1}
                placeholder={`Ask ${ASSISTANT_NAME} anything…`}
                className="flex-1 bg-transparent px-6 py-4 text-sm font-medium focus:outline-none placeholder:text-text-tertiary resize-none max-h-40"
                style={{ height: 'auto' }}
              />
              <button 
                onClick={() => handleSend()}
                disabled={isStreaming || !inputValue.trim()}
                className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all shrink-0 mb-1 mr-1 ${
                  inputValue.trim() 
                    ? "bg-modules-aly text-white shadow-xl shadow-modules-aly/30 hover:scale-105 active:scale-95" 
                    : "bg-background-tertiary text-text-tertiary opacity-40 cursor-not-allowed"
                }`}
              >
                <PaperPlaneRight size={20} weight="fill" />
              </button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
