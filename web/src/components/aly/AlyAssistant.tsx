"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Sparkle, X, PaperPlaneRight, ClockCounterClockwise, Plus,
  CheckCircle, XCircle, Calendar, ListChecks, ChartBar,
  MagicWand, Brain, Database, ArrowRight,
} from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'framer-motion';
import { MarkdownRenderer } from '@/components/aly/MarkdownRenderer';
import { coordinatorService, ChatMessage, ChatSession } from '@/services/coordinator.service';
import { supabase } from '@/services/supabase';
import { ASSISTANT_NAME } from '@/constants/brand';

interface AlyAssistantProps {
  isOpen: boolean;
  onClose: () => void;
}

// ── Confirmation text matching mobile ────────────────────────────────────────

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

// ── Typing indicator ─────────────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] font-bold text-modules-aly uppercase tracking-widest">{ASSISTANT_NAME}</span>
      <div className="flex items-center gap-1 py-1">
        {[0, 0.2, 0.4].map((delay, i) => (
          <motion.div
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-modules-aly"
            animate={{ opacity: [0, 1, 0] }}
            transition={{ duration: 1.2, repeat: Infinity, delay }}
          />
        ))}
      </div>
    </div>
  );
}

// ── Action card ──────────────────────────────────────────────────────────────

interface ActionCardProps {
  action: Record<string, unknown>;
  userId: string;
  onConfirmed: (actionType: string, label: string) => void;
}

function ActionCard({ action, userId, onConfirmed }: ActionCardProps) {
  const [status, setStatus] = useState<'proposed' | 'confirmed' | 'aborted'>('proposed');
  const [busy, setBusy] = useState(false);

  const label = (action.label as string) || '';
  const impact = (action.impact as string) || '';
  const actionType = (action.action_type as string) || '';
  const data = (action.data as Record<string, unknown>) || {};

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

  const handleAbort = () => setStatus('aborted');

  return (
    <div className={`mt-3 p-3 rounded-xl border bg-background-primary ${
      status === 'aborted' ? 'opacity-50 border-border-primary' : 'border-modules-aly/30'
    }`}>
      <div className="flex items-center gap-2 mb-1">
        <MagicWand size={12} className="text-modules-aly" weight="fill" />
        <span className="text-[10px] font-bold text-modules-aly uppercase tracking-widest">Proposed</span>
      </div>
      <p className="text-xs font-medium text-text-primary mb-0.5">{label}</p>
      {impact && <p className="text-[11px] text-text-tertiary mb-3">{impact}</p>}

      {status === 'proposed' && (
        <div className="flex gap-2">
          <button
            onClick={handleConfirm}
            disabled={busy}
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-modules-aly text-white text-[11px] font-semibold rounded-lg disabled:opacity-50"
          >
            {busy ? (
              <motion.div className="w-3 h-3 border border-white border-t-transparent rounded-full" animate={{ rotate: 360 }} transition={{ duration: 0.6, repeat: Infinity }} />
            ) : (
              <><CheckCircle size={12} weight="fill" /> Yes, do it</>
            )}
          </button>
          <button
            onClick={handleAbort}
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 border border-border-primary text-text-tertiary text-[11px] font-semibold rounded-lg"
          >
            <XCircle size={12} /> Cancel
          </button>
        </div>
      )}
      {status === 'confirmed' && (
        <p className="text-[11px] text-status-success font-semibold flex items-center gap-1">
          <CheckCircle size={12} weight="fill" /> Done
        </p>
      )}
      {status === 'aborted' && (
        <p className="text-[11px] text-text-tertiary">Cancelled.</p>
      )}
    </div>
  );
}

// ── Message bubble ───────────────────────────────────────────────────────────

interface MessageBubbleProps {
  msg: ChatMessage & { streaming?: boolean; actions?: Record<string, unknown>[] };
  isTyping: boolean;
  userId: string;
  onActionConfirmed: (text: string) => void;
}

function MessageBubble({ msg, isTyping, userId, onActionConfirmed }: MessageBubbleProps) {
  if (msg.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] px-4 py-2.5 rounded-2xl rounded-tr-sm bg-background-tertiary border border-border-primary text-sm text-text-primary leading-relaxed">
          {msg.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] font-bold text-modules-aly uppercase tracking-widest">{ASSISTANT_NAME}</span>
      <div className="max-w-[88%]">
        {msg.content === '' && isTyping ? (
          <TypingIndicator />
        ) : (
          <MarkdownRenderer content={msg.content} />
        )}

        {msg.actions && msg.actions.length > 0 && (
          <div className="mt-2 space-y-2">
            {msg.actions.map((action, i) => (
              <ActionCard
                key={i}
                action={action}
                userId={userId}
                onConfirmed={(type, label) =>
                  onActionConfirmed(confirmationText(type, label))
                }
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Welcome view ─────────────────────────────────────────────────────────────

const SUGGESTIONS = [
  { label: 'My day',        icon: <Sparkle size={16} />,     prompt: 'What does my day look like?' },
  { label: 'Add task',      icon: <ListChecks size={16} />,  prompt: 'I need to add a task' },
  { label: 'Daily briefing',icon: <ChartBar size={16} />,    prompt: 'Give me a quick briefing on my week' },
  { label: 'Log something', icon: <Database size={16} />,    prompt: 'I want to log something' },
  { label: 'Focus help',    icon: <ArrowRight size={16} />,  prompt: 'Help me figure out what to focus on' },
  { label: 'Quiz me',       icon: <Brain size={16} />,       prompt: 'Create a quiz from my notes' },
  { label: 'Schedule event',icon: <Calendar size={16} />,    prompt: 'I need to schedule an event' },
  { label: 'Brainstorm',    icon: <MagicWand size={16} />,   prompt: "Let's brainstorm directions for my projects" },
];

function WelcomeView({ userName, onSelect }: { userName: string; onSelect: (prompt: string) => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col items-center justify-center h-full px-6 gap-8"
    >
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="w-14 h-14 rounded-2xl bg-modules-aly/10 border border-modules-aly/20 flex items-center justify-center">
          <Sparkle size={28} className="text-modules-aly" weight="fill" />
        </div>
        <p className="text-lg font-semibold text-text-primary">
          Hey{userName ? `, ${userName}` : ''}!
        </p>
        <p className="text-sm text-text-tertiary">I'm {ASSISTANT_NAME}. What's on your mind?</p>
      </div>

      <div className="grid grid-cols-2 gap-2 w-full">
        {SUGGESTIONS.map(s => (
          <button
            key={s.label}
            onClick={() => onSelect(s.prompt)}
            className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-border-primary bg-background-secondary hover:border-modules-aly/40 hover:bg-background-tertiary transition-all text-left"
          >
            <span className="text-modules-aly shrink-0">{s.icon}</span>
            <span className="text-xs font-medium text-text-secondary">{s.label}</span>
          </button>
        ))}
      </div>
    </motion.div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

export const AlyAssistant: React.FC<AlyAssistantProps> = ({ isOpen, onClose }) => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSession, setActiveSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<(ChatMessage & { streaming?: boolean; actions?: Record<string, unknown>[] })[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState('');
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const SLASH_COMMANDS = [
    { cmd: '/briefing',  label: 'Daily briefing',    text: 'Give me a quick briefing on my day.' },
    { cmd: '/focus',     label: 'Help me focus',      text: 'What are my top priorities right now?' },
    { cmd: '/schedule',  label: 'Schedule an event',  text: 'I need to schedule an event.' },
    { cmd: '/report',    label: 'Generate a report',  text: 'Generate a summary report for me.' },
    { cmd: '/quiz',      label: 'Quiz me',            text: 'Create a quiz based on my notes.' },
    { cmd: '/brainstorm',label: 'Brainstorm',         text: "Let's brainstorm new directions for my projects." },
  ];

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, isTyping, scrollToBottom]);

  useEffect(() => {
    if (!isOpen) return;
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      setUserId(user.id);
      supabase.from('profiles').select('display_name').eq('id', user.id).single()
        .then(({ data }) => {
          if (data?.display_name) setUserName(data.display_name.split(' ')[0]);
        });
      coordinatorService.getSessions(user.id).then(data => {
        setSessions(data);
        if (data.length > 0 && !activeSession) loadSession(data[0]);
      });
    });
  }, [isOpen]);

  const loadSession = async (session: ChatSession) => {
    setActiveSession(session);
    setShowHistory(false);
    const data = await coordinatorService.getMessages(session.id);
    setMessages(data);
  };

  const handleNewChat = () => {
    setActiveSession(null);
    setMessages([]);
    setShowHistory(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || isTyping || !userId) return;
    setIsTyping(true);

    const tempUserId = Date.now().toString();
    const tempAlyId = (Date.now() + 1).toString();

    setMessages(prev => [
      ...prev,
      { id: tempUserId, session_id: activeSession?.id || '', role: 'user', content: text, created_at: new Date().toISOString() },
      { id: tempAlyId,  session_id: activeSession?.id || '', role: 'assistant', content: '', created_at: new Date().toISOString(), streaming: true },
    ]);

    type ChatMetadata = { session_id?: string; actions?: Record<string, unknown>[] };
    let fullText = '';
    let metadata: ChatMetadata | null = null;

    try {
      await coordinatorService.chat({
        userId,
        sessionId: activeSession?.id || '',
        message: text,
        spaceIds: [],
        hubIds: [],
        onChunk: (chunk) => {
          if (chunk.includes('|||')) {
            const [textPart, metaPart] = chunk.split('|||');
            fullText += textPart;
            try { metadata = JSON.parse(metaPart); } catch {}
          } else {
            fullText += chunk;
          }
          setMessages(prev => prev.map(m =>
            m.id === tempAlyId ? { ...m, content: fullText } : m
          ));
        },
      });

      setMessages(prev => prev.map(m =>
        m.id === tempAlyId
          ? { ...m, content: fullText, actions: metadata?.actions || [], streaming: false }
          : m
      ));

      const capturedMetadata = metadata as unknown as ChatMetadata | null;
      if (capturedMetadata?.session_id && !activeSession) {
        coordinatorService.getSessions(userId).then(data => {
          setSessions(data);
          const created = data.find(s => s.id === capturedMetadata.session_id);
          if (created) setActiveSession(created);
        });
      }
    } catch {
      setMessages(prev => prev.map(m =>
        m.id === tempAlyId
          ? { ...m, content: 'Something went wrong. Please try again.', streaming: false }
          : m
      ));
    } finally {
      setIsTyping(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;
    setInput('');
    setShowSlashMenu(false);
    sendMessage(text);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setInput(val);
    setShowSlashMenu(val === '/');
  };

  const handleActionConfirmed = (text: string) => {
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      session_id: activeSession?.id || '',
      role: 'assistant',
      content: text,
      created_at: new Date().toISOString(),
    }]);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-60"
          />

          <motion.div
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 h-full w-full max-w-md bg-background-primary border-l border-border-primary z-70 shadow-2xl flex flex-col"
          >
            {/* Header */}
            <header className="px-5 py-4 border-b border-border-primary flex items-center justify-between bg-background-secondary shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-modules-aly/10 border border-modules-aly/20 flex items-center justify-center">
                  <Sparkle size={18} className="text-modules-aly" weight="fill" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-text-primary">{ASSISTANT_NAME}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-status-success animate-pulse" />
                    <span className="text-[10px] text-text-tertiary">Online</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={handleNewChat}
                  className="p-2 rounded-lg hover:bg-background-tertiary transition-colors text-text-tertiary"
                  title="New chat"
                >
                  <Plus size={18} />
                </button>
                <button
                  onClick={() => setShowHistory(!showHistory)}
                  className={`p-2 rounded-lg transition-colors ${showHistory ? 'text-modules-aly bg-modules-aly/10' : 'hover:bg-background-tertiary text-text-tertiary'}`}
                  title="History"
                >
                  <ClockCounterClockwise size={18} />
                </button>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-background-tertiary transition-colors text-text-tertiary"
                >
                  <X size={18} />
                </button>
              </div>
            </header>

            {/* Body */}
            <div className="flex-1 overflow-hidden relative flex flex-col">

              {/* History overlay */}
              <AnimatePresence>
                {showHistory && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                    className="absolute inset-0 z-20 bg-background-primary flex flex-col"
                  >
                    <div className="flex items-center justify-between px-5 py-4 border-b border-border-primary">
                      <span className="text-xs font-semibold text-text-tertiary uppercase tracking-widest">History</span>
                      <button onClick={handleNewChat} className="text-xs font-semibold text-modules-aly hover:underline">
                        New chat
                      </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-2">
                      {sessions.length === 0 ? (
                        <p className="text-sm text-text-tertiary text-center py-8">No conversations yet.</p>
                      ) : sessions.map(s => (
                        <button
                          key={s.id}
                          onClick={() => loadSession(s)}
                          className={`w-full p-3.5 rounded-xl border text-left transition-all ${
                            activeSession?.id === s.id
                              ? 'bg-background-tertiary border-modules-aly/40'
                              : 'bg-background-secondary border-border-primary hover:border-border-secondary'
                          }`}
                        >
                          <p className="text-sm font-medium text-text-primary truncate">{s.title || 'Chat'}</p>
                          <p className="text-[11px] text-text-tertiary mt-0.5">
                            {new Date(s.updated_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Messages or welcome */}
              {messages.length === 0 && !isTyping ? (
                <WelcomeView userName={userName} onSelect={(prompt) => { setInput(''); sendMessage(prompt); }} />
              ) : (
                <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
                  {messages.map((m, i) => (
                    <MessageBubble
                      key={m.id || i}
                      msg={m}
                      isTyping={isTyping && i === messages.length - 1}
                      userId={userId || ''}
                      onActionConfirmed={handleActionConfirmed}
                    />
                  ))}
                  {isTyping && messages[messages.length - 1]?.role !== 'assistant' && (
                    <TypingIndicator />
                  )}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Input */}
            <footer className="px-4 pb-4 pt-3 border-t border-border-primary bg-background-secondary shrink-0">
              {/* Slash menu */}
              <AnimatePresence>
                {showSlashMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
                    className="mb-2 bg-background-tertiary border border-border-primary rounded-xl overflow-hidden"
                  >
                    {SLASH_COMMANDS.map(c => (
                      <button
                        key={c.cmd}
                        onClick={() => { setInput(''); setShowSlashMenu(false); sendMessage(c.text); }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-background-primary transition-colors text-left"
                      >
                        <span className="text-xs font-bold text-modules-aly w-24 shrink-0">{c.cmd}</span>
                        <span className="text-xs text-text-secondary">{c.label}</span>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

              <form onSubmit={handleSubmit} className="relative">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={handleInputChange}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(e); }
                  }}
                  placeholder="Ask anything… or type / for commands"
                  rows={2}
                  className="w-full bg-background-tertiary border border-border-primary rounded-xl px-4 py-3 pr-12 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-1 focus:ring-modules-aly/30 resize-none"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isTyping}
                  className="absolute right-2.5 bottom-2.5 p-2 bg-modules-aly text-white rounded-lg hover:scale-105 active:scale-95 transition-all disabled:opacity-40 disabled:scale-100"
                >
                  <PaperPlaneRight size={16} weight="fill" />
                </button>
              </form>
            </footer>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
