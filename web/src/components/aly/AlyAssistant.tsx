"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Sparkle, 
  X, 
  PaperPlaneRight, 
  ClockCounterClockwise, 
  User
} from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  coordinatorService, 
  ChatMessage, 
  ChatSession, 
  AIProposal 
} from '@/services/coordinator.service';
import { supabase } from '@/services/supabase';

interface AlyAssistantProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AlyAssistant: React.FC<AlyAssistantProps> = ({ isOpen, onClose }) => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSession, setActiveSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping, scrollToBottom]);

  const handleSelectSession = useCallback(async (session: ChatSession) => {
    setActiveSession(session);
    setShowHistory(false);
    try {
      const data = await coordinatorService.getMessages(session.id);
      setMessages(data);
    } catch (err) {
      console.error('Mission log retrieval failure:', err);
    }
  }, []);

  const loadSessions = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const data = await coordinatorService.getSessions(user.id);
      setSessions(data);
      if (data.length > 0 && !activeSession) {
        handleSelectSession(data[0]);
      }
    } catch (err) {
      console.error('Session registry failure:', err);
    }
  }, [activeSession, handleSelectSession]);

  useEffect(() => {
    if (isOpen) loadSessions();
  }, [isOpen, loadSessions]);

  const handleNewSession = async () => {
    setActiveSession(null);
    setMessages([]);
    setShowHistory(false);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      session_id: activeSession?.id || 'new',
      role: 'user',
      content: input,
      created_at: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const currentSessionId = activeSession?.id;
      
      // If new session, we'll need to handle the first message to create session
      // For now, assume backend handles session_id 'new' or generate a temp one
      const tempId = currentSessionId || `session_${Date.now()}`;

      let assistantResponse = "";
      
      // Append initial assistant message
      const assistantMessageId = `aly_${Date.now()}`;
      setMessages(prev => [...prev, {
        id: assistantMessageId,
        session_id: tempId,
        role: 'assistant',
        content: "",
        created_at: new Date().toISOString()
      }]);

      await coordinatorService.chat({
        userId: user.id,
        sessionId: tempId,
        message: input,
        onChunk: (chunk) => {
          assistantResponse += chunk;
          setMessages(prev => prev.map(m => 
            m.id === assistantMessageId ? { ...m, content: assistantResponse } : m
          ));
        }
      });

      if (!currentSessionId) loadSessions(); // Refresh sessions if first message
    } catch (err) {
      console.error('Intelligence sync failure:', err);
    } finally {
      setIsTyping(false);
    }
  };

  const handleExecuteProposal = async (proposal: AIProposal) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await coordinatorService.finalizeAction(user.id, proposal.type, proposal.data);
      alert('Mission proposal executed successfully.');
      // Refresh messages or session state?
    } catch (err) {
      console.error('Proposal execution failure:', err);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 h-full w-full max-w-md bg-background-primary border-l border-border-primary z-[70] shadow-2xl flex flex-col"
          >
            {/* Header */}
            <header className="p-6 border-b border-border-primary flex items-center justify-between bg-background-secondary">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-modules-aly/10 border border-modules-aly/30 flex items-center justify-center">
                  <Sparkle size={24} className="text-modules-aly" weight="fill" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-text-primary uppercase tracking-[0.15em]">Aly Assistant</h2>
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-status-active animate-pulse" />
                    <span className="text-[10px] text-text-tertiary font-bold uppercase tracking-widest">Intelligence Online</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setShowHistory(!showHistory)}
                  className="p-2 rounded-lg hover:bg-background-tertiary transition-colors text-text-tertiary"
                  title="History"
                >
                  <ClockCounterClockwise size={20} />
                </button>
                <button 
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-background-tertiary transition-colors text-text-tertiary"
                >
                  <X size={20} />
                </button>
              </div>
            </header>

            {/* Chat Content */}
            <div className="flex-1 overflow-hidden relative flex flex-col">
              {/* History Overlay */}
              <AnimatePresence>
                {showHistory && (
                  <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="absolute inset-0 z-20 bg-background-primary p-6 overflow-y-auto"
                  >
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest px-2">Intelligence Archive</h3>
                      <button 
                        onClick={handleNewSession}
                        className="text-[10px] font-bold text-modules-aly uppercase tracking-widest hover:underline"
                      >
                        New Registry
                      </button>
                    </div>
                    <div className="space-y-3">
                      {sessions.map(s => (
                        <button
                          key={s.id}
                          onClick={() => handleSelectSession(s)}
                          className={`w-full p-4 rounded-xl border text-left transition-all ${
                            activeSession?.id === s.id 
                              ? "bg-background-tertiary border-modules-aly" 
                              : "bg-background-secondary border-border-primary hover:border-text-tertiary/30"
                          }`}
                        >
                          <p className="text-xs font-bold text-text-primary truncate mb-1">{s.title || "Mission Intelligence Session"}</p>
                          <p className="text-[9px] text-text-tertiary font-bold uppercase">
                            {new Date(s.created_at).toLocaleDateString()}
                          </p>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                {messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
                    <Sparkle size={48} className="text-modules-aly mb-4 animate-pulse" />
                    <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest">
                      Aly Synthesis protocol ready.<br/>Initiate mission coordination.
                    </p>
                  </div>
                ) : (
                  messages.map((m, i) => (
                    <div key={m.id || i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[85%] flex items-start gap-3 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                        <div className={`mt-1 shrink-0 w-7 h-7 rounded-lg flex items-center justify-center border ${
                          m.role === 'user' ? 'bg-background-tertiary border-border-primary' : 'bg-modules-aly/10 border-modules-aly/30'
                        }`}>
                          {m.role === 'user' ? <User size={14} className="text-text-tertiary" /> : <Sparkle size={14} className="text-modules-aly" />}
                        </div>
                        <div className={`p-4 rounded-2xl text-sm leading-relaxed ${
                          m.role === 'user' 
                            ? 'bg-background-tertiary text-text-primary border border-border-primary rounded-tr-none' 
                            : 'bg-background-secondary text-text-secondary border border-border-primary rounded-tl-none'
                        }`}>
                          {m.content === "" && m.role === 'assistant' && isTyping ? (
                            <div className="flex gap-1 py-1">
                              <motion.div animate={{ opacity: [0, 1, 0] }} transition={{ duration: 1.5, repeat: Infinity, times: [0, 0.5, 1] }} className="w-1.5 h-1.5 rounded-full bg-text-tertiary" />
                              <motion.div animate={{ opacity: [0, 1, 0] }} transition={{ duration: 1.5, repeat: Infinity, times: [0, 0.5, 1], delay: 0.2 }} className="w-1.5 h-1.5 rounded-full bg-text-tertiary" />
                              <motion.div animate={{ opacity: [0, 1, 0] }} transition={{ duration: 1.5, repeat: Infinity, times: [0, 0.5, 1], delay: 0.4 }} className="w-1.5 h-1.5 rounded-full bg-text-tertiary" />
                            </div>
                          ) : (
                            m.content
                          )}
                          
                          {/* Proposal Card */}
                          {m.proposal && (
                            <div className="mt-4 p-4 bg-background-tertiary border border-border-primary rounded-xl overflow-hidden group">
                                <div className="flex items-center gap-2 mb-2 text-modules-aly">
                                    <Sparkle size={14} weight="fill" />
                                    <span className="text-[10px] font-bold uppercase tracking-widest">AI Mission Proposal</span>
                                </div>
                                <p className="text-[10px] text-text-primary font-bold mb-4">
                                    Execute the identified {m.proposal.type} coordinate protocol across your Registry?
                                </p>
                                <div className="flex gap-2">
                                    <button 
                                        onClick={() => handleExecuteProposal(m.proposal!)}
                                        className="flex-1 py-2 bg-modules-aly text-white text-[10px] font-bold uppercase tracking-widest rounded-lg"
                                    >
                                        Execute
                                    </button>
                                    <button className="flex-1 py-2 bg-background-primary text-text-tertiary text-[10px] font-bold uppercase tracking-widest rounded-lg border border-border-primary">
                                        Decline
                                    </button>
                                </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Input Footer */}
            <footer className="p-6 bg-background-secondary border-t border-border-primary">
              <form onSubmit={handleSendMessage} className="relative">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage(e);
                    }
                  }}
                  placeholder="Inquire or coordinate missions..."
                  className="w-full bg-background-tertiary border border-border-primary rounded-2xl p-4 pr-12 text-sm font-medium focus:outline-none focus:ring-1 focus:ring-modules-aly/30 resize-none h-24 custom-scrollbar"
                />
                <button 
                  type="submit"
                  disabled={!input.trim() || isTyping}
                  className="absolute right-3 bottom-3 p-2 bg-modules-aly text-white rounded-xl shadow-lg shadow-modules-aly/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100"
                >
                  <PaperPlaneRight size={20} weight="fill" />
                </button>
              </form>
              <div className="mt-4 flex items-center justify-between text-[8px] font-bold text-text-tertiary uppercase tracking-widest">
                <span>Context: All Domains Identified</span>
                <span className="flex items-center gap-1">
                  <Sparkle size={10} className="text-modules-aly" />
                  Sychronized Registry
                </span>
              </div>
            </footer>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
