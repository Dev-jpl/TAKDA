"use client";

import React, { useEffect, useRef, useState } from 'react';
import { SparkleIcon, PaperPlaneRightIcon } from '@phosphor-icons/react';
import { UIDefinition } from '@/types/ui-builder';
import { ChatMessage } from './useUIBuilder';

export function ChatTab({
  messages, isChatLoading, pendingProposal,
  onSend, onApply, onDismiss,
  brandColor, assistantName,
}: {
  messages:        ChatMessage[];
  isChatLoading:   boolean;
  pendingProposal: UIDefinition | null;
  onSend:          (msg: string) => void;
  onApply:         () => void;
  onDismiss:       () => void;
  brandColor:      string;
  assistantName:   string;
}) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    const t = input.trim();
    if (!t || isChatLoading) return;
    setInput('');
    onSend(t);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto flex flex-col gap-3 p-3">
        {messages.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <SparkleIcon size={20} className="text-modules-aly/40" weight="duotone" />
            <p className="text-xs text-text-tertiary">
              Tell {assistantName} what you want to change.<br/>
              e.g. &ldquo;Add a section header above the date field&rdquo;
            </p>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={m.id} className={`flex flex-col gap-1.5 ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
            <div className={`max-w-[90%] px-3 py-2 rounded-xl text-xs leading-relaxed ${
              m.role === 'user'
                ? 'bg-background-tertiary text-text-primary rounded-tr-sm'
                : 'bg-modules-aly/8 text-text-secondary rounded-tl-sm border border-modules-aly/20'
            }`}>
              {m.content}
            </div>
            {m.role === 'assistant' && m.hasProposal && i === messages.length - 1 && pendingProposal && (
              <div className="flex gap-2 mt-1">
                <button type="button" onClick={onApply}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all hover:opacity-90"
                  style={{ backgroundColor: brandColor }}>
                  ✓ Apply
                </button>
                <button type="button" onClick={onDismiss}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold border border-border-primary text-text-secondary hover:bg-background-tertiary transition-all">
                  ✕ Dismiss
                </button>
              </div>
            )}
          </div>
        ))}

        {isChatLoading && (
          <div className="flex items-center gap-2 text-text-tertiary">
            <SparkleIcon size={13} className="text-modules-aly animate-pulse" weight="fill" />
            <span className="text-xs">{assistantName} is thinking…</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="border-t border-border-primary p-3 flex gap-2">
        <textarea
          rows={2}
          className="flex-1 bg-background-primary border border-border-primary rounded-xl px-3 py-2 text-xs text-text-primary outline-none focus:border-modules-aly/50 resize-none placeholder:text-text-tertiary"
          placeholder={`Tell ${assistantName} what to change…`}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
          disabled={isChatLoading}
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={!input.trim() || isChatLoading}
          className="self-end w-8 h-8 rounded-xl flex items-center justify-center text-white transition-all disabled:opacity-40"
          style={{ backgroundColor: brandColor }}
        >
          <PaperPlaneRightIcon size={14} weight="fill" />
        </button>
      </div>
    </div>
  );
}
