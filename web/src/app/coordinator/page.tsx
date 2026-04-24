"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  PaperPlaneRight, 
  Sparkle, 
  DotsThreeVertical,
  Plus
} from '@phosphor-icons/react';
import { 
  coordinatorService, 
  CoordinatorMessage, 
  CoordinatorSession 
} from '@/services/coordinator.service';
import { supabase } from '@/services/supabase';

export default function CoordinatorPage() {
  const [sessions, setSessions] = useState<CoordinatorSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<CoordinatorMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id || null));
  }, []);

  const loadSessions = useCallback(async () => {
    if (!userId) return;
    const data = await coordinatorService.getSessions(userId);
    setSessions(data);
  }, [userId]);

  const loadMessages = useCallback(async (sessionId: string) => {
    setCurrentSessionId(sessionId);
    const data = await coordinatorService.getMessages(sessionId);
    setMessages(data);
  }, []);

  useEffect(() => {
    if (userId) loadSessions();
  }, [userId, loadSessions]);

  const handleSend = async () => {
    if (!inputValue.trim() || !userId || isStreaming) return;

    const userMessage: CoordinatorMessage = {
      id: Date.now().toString(),
      session_id: currentSessionId || 'new',
      role: 'user',
      content: inputValue,
      created_at: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsStreaming(true);

    let assistantContent = '';
    const assistantId = (Date.now() + 1).toString();

    setMessages(prev => [...prev, { 
      id: assistantId, 
      session_id: currentSessionId || 'new',
      role: 'assistant', 
      content: '',
      created_at: new Date().toISOString(),
    }]);

    try {
      const stream = coordinatorService.streamChat(userId, userMessage.content, currentSessionId || undefined);
      
      for await (const chunk of stream) {
        if (chunk.includes('|||')) {
          const [text, metadataStr] = chunk.split('|||');
          assistantContent += text;
          const metadata = JSON.parse(metadataStr);
          if (!currentSessionId) setCurrentSessionId(metadata.session_id);
        } else {
          assistantContent += chunk;
        }

        setMessages(prev => prev.map(m => 
          m.id === assistantId ? { ...m, content: assistantContent } : m
        ));
      }
    } catch (error) {
      console.error('Streaming failure:', error);
    } finally {
      setIsStreaming(false);
      loadSessions();
    }
  };

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  return (
    <main className="flex h-screen bg-background-primary overflow-hidden">
      {/* Session Sidebar */}
      <aside className="w-80 border-r border-border-primary bg-background-secondary/50 flex flex-col hidden xl:flex">
        <div className="p-6 border-b border-border-primary flex items-center justify-between">
          <h2 className="text-sm font-bold tracking-[0.2em] text-text-tertiary">MISSIONS</h2>
          <button 
            onClick={() => { setCurrentSessionId(null); setMessages([]); }}
            className="p-2 rounded-lg hover:bg-background-tertiary text-modules-aly transition-colors"
          >
            <Plus size={18} weight="bold" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
          {sessions.map(session => (
            <button 
              key={session.id}
              onClick={() => loadMessages(session.id)}
              className={`p-4 rounded-xl text-left border transition-all ${
                currentSessionId === session.id 
                  ? "bg-background-tertiary border-border-primary shadow-sm" 
                  : "border-transparent text-text-tertiary hover:bg-background-tertiary/30 hover:text-text-primary"
              }`}
            >
              <p className="text-sm font-bold truncate mb-1">{session.title}</p>
              <p className="text-[10px] opacity-60">
                {new Date(session.updated_at).toLocaleDateString()}
              </p>
            </button>
          ))}
        </div>
      </aside>

      {/* Chat Area */}
      <section className="flex-1 flex flex-col relative">
        <header className="h-20 border-b border-border-primary flex items-center px-8 justify-between bg-background-primary/80 backdrop-blur-md z-10 sticky top-0">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-modules-aly/20 flex items-center justify-center border border-modules-aly/30">
              <Sparkle size={20} color="var(--modules-aly)" weight="fill" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">Mission Coordinator</h1>
              <p className="text-[10px] text-status-success uppercase tracking-widest font-bold">ALy v4 Intelligence Active</p>
            </div>
          </div>
          <button className="text-text-tertiary hover:text-text-primary transition-colors">
            <DotsThreeVertical size={24} />
          </button>
        </header>

        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-8 lg:p-12 space-y-8 pb-32"
        >
          <AnimatePresence initial={false}>
            {messages.map((message) => (
              <motion.div 
                key={message.id}
                initial={{ opacity: 0, y: 10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[85%] lg:max-w-[70%] rounded-2xl p-6 ${
                  message.role === 'user' 
                    ? "bg-modules-aly/10 border border-modules-aly/20 text-text-primary" 
                    : "bg-background-secondary border border-border-primary text-text-primary"
                }`}>
                  <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{message.content}</p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Input Dock */}
        <div className="absolute bottom-0 left-0 right-0 p-8 lg:p-12 pointer-events-none">
          <div className="max-w-4xl mx-auto bg-background-secondary border border-border-primary rounded-2xl shadow-2xl p-2 pointer-events-auto flex items-center gap-2 group focus-within:border-modules-aly/50 transition-all">
            <input 
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Deploy mission objective..."
              className="flex-1 bg-transparent px-4 py-3 text-sm focus:outline-none placeholder:text-text-tertiary"
            />
            <button 
              onClick={handleSend}
              disabled={isStreaming}
              className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${
                inputValue.trim() 
                  ? "bg-modules-aly text-white shadow-lg shadow-modules-aly/30" 
                  : "bg-background-tertiary text-text-tertiary opacity-40 cursor-not-allowed"
              }`}
            >
              <PaperPlaneRight size={20} weight="fill" />
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
