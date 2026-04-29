"use client";

import React, { useEffect, useRef, useState } from 'react';
import { CursorTextIcon, SparkleIcon, PaperPlaneRightIcon } from '@phosphor-icons/react';
import { UIBlock, UIRow, BlockSpan, ComponentType } from '@/types/ui-builder';
import { SchemaField } from '@/services/modules.service';
import { ConfigTab, ChatMessage } from './useUIBuilder';

// ── Span options ──────────────────────────────────────────────────────────────

const ALL_SPANS: BlockSpan[] = [3, 4, 6, 8, 9, 12];

const COMPONENT_LABELS: Record<ComponentType, string> = {
  text_input:       'Text',
  longtext_input:   'Long text',
  number_input:     'Number',
  currency_input:   'Currency (₱)',
  counter_stepper:  'Counter stepper',
  boolean_toggle:   'Toggle',
  date_picker:      'Date picker',
  datetime_picker:  'Date & time',
  select_chips:     'Chips (horizontal)',
  select_dropdown:  'Dropdown',
};

// ── Debounced input ───────────────────────────────────────────────────────────

function DebouncedInput({
  value, onChange, placeholder, multiline = false, delay = 150,
}: {
  value:       string;
  onChange:    (v: string) => void;
  placeholder?: string;
  multiline?:  boolean;
  delay?:      number;
}) {
  const [local, setLocal] = useState(value);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync when external value changes (e.g. switching selected block)
  useEffect(() => { setLocal(value); }, [value]);

  const handleChange = (v: string) => {
    setLocal(v);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => onChange(v), delay);
  };

  const cls =
    'w-full bg-background-primary border border-border-primary rounded-lg px-3 py-2 text-sm text-text-primary outline-none focus:border-modules-aly/50 transition-all placeholder:text-text-tertiary resize-none';

  return multiline ? (
    <textarea
      className={cls}
      rows={2}
      value={local}
      placeholder={placeholder}
      onChange={e => handleChange(e.target.value)}
    />
  ) : (
    <input
      type="text"
      className={cls}
      value={local}
      placeholder={placeholder}
      onChange={e => handleChange(e.target.value)}
    />
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest mb-1">{children}</p>;
}

function Section({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col gap-2">{children}</div>;
}

// ── Block config fields ───────────────────────────────────────────────────────

function BlockConfig({
  block, rowId, colId, row, schema, brandColor,
  onUpdate, onUpdateSpan,
}: {
  block:        UIBlock;
  rowId:        string;
  colId:        string;
  row:          UIRow;
  schema:       SchemaField[];
  brandColor:   string;
  onUpdate:     (rowId: string, colId: string, patch: Partial<UIBlock>) => void;
  onUpdateSpan: (rowId: string, colId: string, span: BlockSpan) => void;
}) {
  const col         = row.columns.find(c => c.id === colId);
  const currentSpan = col?.span ?? 12;
  const siblingSpan = row.columns.find(c => c.id !== colId)?.span;

  // Which spans are valid given siblings
  const validSpans = ALL_SPANS.filter(s => {
    if (row.columns.length === 1) return true;           // solo column: any span
    if (row.columns.length === 2) return s + (siblingSpan ?? 0) === 12; // must sum to 12
    return true;
  });

  const patch = (p: Partial<UIBlock>) => onUpdate(rowId, colId, p);

  return (
    <div className="flex flex-col gap-4">
      {/* Block-type specific config */}
      {block.type === 'field_input' && (() => {
        const sf = schema.find(f => f.key === block.field_key);
        return (
          <div className="flex flex-col gap-3">
            <Section>
              <Label>Label</Label>
              <DebouncedInput value={block.label} onChange={v => patch({ label: v } as Partial<UIBlock>)} placeholder="Field label" />
            </Section>
            <Section>
              <Label>Show label</Label>
              <button
                type="button"
                onClick={() => patch({ show_label: !block.show_label } as Partial<UIBlock>)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  block.show_label ? '' : 'bg-background-tertiary border border-border-primary'
                }`}
                style={block.show_label ? { backgroundColor: brandColor } : undefined}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${block.show_label ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </Section>
            <Section>
              <Label>Placeholder</Label>
              <DebouncedInput value={block.placeholder ?? ''} onChange={v => patch({ placeholder: v } as Partial<UIBlock>)} placeholder="e.g. Enter value…" />
            </Section>
            <Section>
              <Label>Component</Label>
              <select
                className="w-full bg-background-primary border border-border-primary rounded-lg px-3 py-2 text-sm text-text-primary outline-none focus:border-modules-aly/50"
                value={block.component}
                onChange={e => patch({ component: e.target.value as ComponentType } as Partial<UIBlock>)}
              >
                {Object.entries(COMPONENT_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </Section>
            {sf && (
              <div className="bg-background-tertiary rounded-lg px-3 py-2 text-[10px] text-text-tertiary">
                <p><span className="font-semibold">Key:</span> {sf.key}</p>
                <p><span className="font-semibold">Type:</span> {sf.type}</p>
                <p><span className="font-semibold">Required:</span> {sf.required ? 'Yes ✱' : 'No'}</p>
              </div>
            )}
          </div>
        );
      })()}

      {block.type === 'section_header' && (
        <div className="flex flex-col gap-3">
          <Section>
            <Label>Title</Label>
            <DebouncedInput value={block.title} onChange={v => patch({ title: v } as Partial<UIBlock>)} placeholder="Section title" />
          </Section>
          <Section>
            <Label>Subtitle</Label>
            <DebouncedInput value={block.subtitle ?? ''} onChange={v => patch({ subtitle: v } as Partial<UIBlock>)} placeholder="Optional subtitle" />
          </Section>
        </div>
      )}

      {block.type === 'divider' && (
        <p className="text-xs text-text-tertiary">No configuration needed.</p>
      )}

      {block.type === 'spacer' && (
        <Section>
          <Label>Size</Label>
          <div className="flex gap-2">
            {(['sm', 'md', 'lg'] as const).map(s => (
              <button
                key={s}
                type="button"
                onClick={() => patch({ size: s } as Partial<UIBlock>)}
                className={`flex-1 py-2 rounded-lg border text-xs font-semibold transition-all ${
                  block.size === s ? 'text-white' : 'border-border-primary text-text-secondary hover:border-border-primary/60'
                }`}
                style={block.size === s ? { backgroundColor: brandColor, borderColor: brandColor } : undefined}
              >
                {s === 'sm' ? '8px' : s === 'md' ? '16px' : '32px'}
              </button>
            ))}
          </div>
        </Section>
      )}

      {block.type === 'assistant_nudge' && (
        <Section>
          <Label>Context hint</Label>
          <DebouncedInput value={block.hint ?? ''} onChange={v => patch({ hint: v } as Partial<UIBlock>)} placeholder="What should I say here?" multiline />
        </Section>
      )}

      {(block.type === 'save_button' || block.type === 'cancel_button') && (
        <Section>
          <Label>Button label</Label>
          <DebouncedInput value={block.label} onChange={v => patch({ label: v } as Partial<UIBlock>)} placeholder="Label" />
        </Section>
      )}

      {/* Column span */}
      <Section>
        <Label>Column span (of 12)</Label>
        <div className="flex gap-1.5 flex-wrap">
          {ALL_SPANS.map(s => {
            const isValid = validSpans.includes(s);
            return (
              <button
                key={s}
                type="button"
                disabled={!isValid}
                onClick={() => onUpdateSpan(rowId, colId, s)}
                className={`w-9 h-8 rounded-lg border text-xs font-bold transition-all ${
                  currentSpan === s ? 'text-white' : 'border-border-primary text-text-secondary'
                } disabled:opacity-30 disabled:cursor-not-allowed`}
                style={currentSpan === s ? { backgroundColor: brandColor, borderColor: brandColor } : undefined}
              >
                {s}
              </button>
            );
          })}
        </div>
      </Section>
    </div>
  );
}

// ── Chat tab ──────────────────────────────────────────────────────────────────

function ChatTab({
  messages, isChatLoading, pendingProposal,
  onSend, onApply, onDismiss,
  brandColor, assistantName,
}: {
  messages:        ChatMessage[];
  isChatLoading:   boolean;
  pendingProposal: import('@/types/ui-builder').UIDefinition | null;
  onSend:          (msg: string) => void;
  onApply:         () => void;
  onDismiss:       () => void;
  brandColor:      string;
  assistantName:   string;
}) {
  const [input,       setInput]       = useState('');
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
      {/* Messages */}
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

            {/* Apply/dismiss for the most recent agent message with a proposal */}
            {m.role === 'assistant' && m.hasProposal && i === messages.length - 1 && pendingProposal && (
              <div className="flex gap-2 mt-1">
                <button
                  type="button"
                  onClick={onApply}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all hover:opacity-90"
                  style={{ backgroundColor: brandColor }}
                >
                  ✓ Apply
                </button>
                <button
                  type="button"
                  onClick={onDismiss}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold border border-border-primary text-text-secondary hover:bg-background-tertiary transition-all"
                >
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

      {/* Input */}
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

// ── ConfigPanel ───────────────────────────────────────────────────────────────

interface ConfigPanelProps {
  rows:             UIRow[];
  selectedBlockId:  string | null;
  chatMessages:     ChatMessage[];
  pendingProposal:  import('@/types/ui-builder').UIDefinition | null;
  isChatLoading:    boolean;
  configTab:        ConfigTab;
  schema:           SchemaField[];
  brandColor:       string;
  assistantName:    string;
  onSetConfigTab:   (tab: ConfigTab) => void;
  onUpdateBlock:    (rowId: string, colId: string, patch: Partial<UIBlock>) => void;
  onUpdateSpan:     (rowId: string, colId: string, span: BlockSpan) => void;
  onSendChat:       (msg: string) => void;
  onApplyProposal:  () => void;
  onDismissProposal:() => void;
}

export function ConfigPanel({
  rows, selectedBlockId, chatMessages, pendingProposal, isChatLoading,
  configTab, schema, brandColor, assistantName,
  onSetConfigTab, onUpdateBlock, onUpdateSpan,
  onSendChat, onApplyProposal, onDismissProposal,
}: ConfigPanelProps) {
  // Resolve selected block from the rows
  const selected = (() => {
    if (!selectedBlockId) return null;
    const [rowId, colId] = selectedBlockId.split(':');
    const row = rows.find(r => r.id === rowId);
    const col = row?.columns.find(c => c.id === colId);
    if (!row || !col) return null;
    return { row, rowId, colId, col };
  })();

  return (
    <div className="flex flex-col h-full">
      {/* Tab strip */}
      <div className="flex border-b border-border-primary shrink-0">
        {(['configure', 'chat'] as const).map(tab => (
          <button
            key={tab}
            type="button"
            onClick={() => onSetConfigTab(tab)}
            className={`flex-1 py-2.5 text-xs font-semibold capitalize transition-all ${
              configTab === tab
                ? 'text-text-primary border-b-2'
                : 'text-text-tertiary hover:text-text-secondary border-b-2 border-transparent'
            }`}
            style={configTab === tab ? { borderBottomColor: brandColor } : undefined}
          >
            {tab === 'chat' ? `Ask ${assistantName}` : 'Configure'}
          </button>
        ))}
      </div>

      {/* Configure tab */}
      {configTab === 'configure' && (
        <div className="flex-1 overflow-y-auto p-4">
          {!selected ? (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <CursorTextIcon size={24} className="text-text-tertiary/30" weight="duotone" />
              <p className="text-xs text-text-tertiary">Select a component on the canvas to configure it.</p>
            </div>
          ) : (
            <BlockConfig
              block={selected.col.block}
              rowId={selected.rowId}
              colId={selected.colId}
              row={selected.row}
              schema={schema}
              brandColor={brandColor}
              onUpdate={onUpdateBlock}
              onUpdateSpan={onUpdateSpan}
            />
          )}
        </div>
      )}

      {/* Chat tab */}
      {configTab === 'chat' && (
        <div className="flex-1 overflow-hidden flex flex-col">
          <ChatTab
            messages={chatMessages}
            isChatLoading={isChatLoading}
            pendingProposal={pendingProposal}
            onSend={onSendChat}
            onApply={onApplyProposal}
            onDismiss={onDismissProposal}
            brandColor={brandColor}
            assistantName={assistantName}
          />
        </div>
      )}
    </div>
  );
}
