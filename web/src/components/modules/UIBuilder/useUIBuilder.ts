"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import { UIBlock, UIDefinition, UIRow, BlockSpan } from '@/types/ui-builder';
import { SchemaField } from '@/services/modules.service';
import { generateDefaultLayout } from './autoLayout';
import { callUIBuilderAgent } from './agentChat';

// ── Types ─────────────────────────────────────────────────────────────────────

export type ConfigTab = 'configure' | 'chat';

export interface ChatMessage {
  id:          string;
  role:        'user' | 'assistant';
  content:     string;
  hasProposal?: boolean;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function uid(): string {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 8);
}

function buildDefinition(rows: UIRow[]): UIDefinition {
  return { version: '1.0', rows };
}

// Valid span pairs that sum to 12 (for 2-column rows)
const PAIR_CYCLES: [BlockSpan, BlockSpan][] = [
  [6,6], [4,8], [8,4], [3,9], [9,3],
];

function nextPairSpan(currentSpan: BlockSpan): BlockSpan {
  const pair = PAIR_CYCLES.find(([a]) => a === currentSpan) ?? [6, 6];
  const idx   = PAIR_CYCLES.indexOf(pair);
  return PAIR_CYCLES[(idx + 1) % PAIR_CYCLES.length][0];
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useUIBuilder(
  schema:             SchemaField[],
  initialDefinition:  UIDefinition | null,
  moduleName:         string,
  onChange:           (def: UIDefinition) => void,
) {
  const [rows,            setRows]            = useState<UIRow[]>(() =>
    initialDefinition?.rows ?? generateDefaultLayout(schema, moduleName).rows,
  );
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [chatMessages,    setChatMessages]    = useState<ChatMessage[]>([]);
  const [pendingProposal, setPendingProposal] = useState<UIDefinition | null>(null);
  const [isChatLoading,   setIsChatLoading]   = useState(false);
  const [configTab,       setConfigTab]       = useState<ConfigTab>('configure');
  const [toastMsg,        setToastMsg]        = useState<string | null>(null);
  const [hasAutoLayout,   setHasAutoLayout]   = useState(!initialDefinition);
  const onChangeFnRef = useRef(onChange);
  onChangeFnRef.current = onChange;

  // Fire first-time "auto-generated" toast
  useEffect(() => {
    if (hasAutoLayout) {
      setToastMsg('Generated a starting layout — customize it');
      const t = setTimeout(() => setToastMsg(null), 3500);
      setHasAutoLayout(false);
      return () => clearTimeout(t);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Notify parent whenever rows change
  useEffect(() => {
    onChangeFnRef.current(buildDefinition(rows));
  }, [rows]);

  // ── Canvas mutations ─────────────────────────────────────────────────────────

  const addBlock = useCallback((block: UIBlock) => {
    const newRow: UIRow = {
      id:      `row_${uid()}`,
      columns: [{ id: `col_${uid()}`, span: 12, block }],
    };
    setRows(prev => [...prev, newRow]);
  }, []);

  const removeBlock = useCallback((rowId: string, colId: string) => {
    setRows(prev => {
      const row = prev.find(r => r.id === rowId);
      if (!row) return prev;
      if (row.columns.length === 1) {
        // Remove entire row
        return prev.filter(r => r.id !== rowId);
      }
      // Remove column, redistribute spans evenly
      const newCols = row.columns.filter(c => c.id !== colId);
      const even    = Math.floor(12 / newCols.length) as BlockSpan;
      const last    = (12 - even * (newCols.length - 1)) as BlockSpan;
      return prev.map(r =>
        r.id !== rowId ? r : {
          ...r,
          columns: newCols.map((c, i) => ({ ...c, span: i === newCols.length - 1 ? last : even })),
        },
      );
    });
    setSelectedBlockId(prev => prev === `${rowId}:${colId}` ? null : prev);
  }, []);

  const moveRow = useCallback((fromIdx: number, toIdx: number) => {
    if (fromIdx === toIdx) return;
    setRows(prev => {
      const next = [...prev];
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      return next;
    });
  }, []);

  const updateBlock = useCallback((rowId: string, colId: string, updates: Partial<UIBlock>) => {
    setRows(prev => prev.map(row =>
      row.id !== rowId ? row : {
        ...row,
        columns: row.columns.map(col =>
          col.id !== colId ? col : { ...col, block: { ...col.block, ...updates } as UIBlock },
        ),
      },
    ));
  }, []);

  const updateSpan = useCallback((rowId: string, colId: string, newSpan: BlockSpan) => {
    setRows(prev => prev.map(row => {
      if (row.id !== rowId) return row;
      if (row.columns.length !== 2) {
        return { ...row, columns: row.columns.map(c => c.id === colId ? { ...c, span: newSpan } : c) };
      }
      const siblingSpan = (12 - newSpan) as BlockSpan;
      return {
        ...row,
        columns: row.columns.map(c =>
          c.id === colId ? { ...c, span: newSpan } : { ...c, span: siblingSpan },
        ),
      };
    }));
  }, []);

  // Cycle through valid 2-column span combinations on resize handle click
  const cycleColSpan = useCallback((rowId: string, colId: string) => {
    setRows(prev => prev.map(row => {
      if (row.id !== rowId || row.columns.length !== 2) return row;
      const col      = row.columns.find(c => c.id === colId);
      if (!col) return row;
      const next     = nextPairSpan(col.span);
      const sibling  = (12 - next) as BlockSpan;
      return {
        ...row,
        columns: row.columns.map(c =>
          c.id === colId ? { ...c, span: next } : { ...c, span: sibling },
        ),
      };
    }));
  }, []);

  const selectBlock = useCallback((rowId: string, colId: string) => {
    setSelectedBlockId(`${rowId}:${colId}`);
    setConfigTab('configure');
  }, []);

  const clearSelection = useCallback(() => setSelectedBlockId(null), []);

  // ── Agent chat ───────────────────────────────────────────────────────────────

  const sendChatMessage = useCallback(async (
    message:       string,
    brandColor?:   string,
    assistantName?: string,
  ) => {
    const userMsg: ChatMessage = { id: uid(), role: 'user', content: message };
    setChatMessages(prev => [...prev, userMsg]);
    setIsChatLoading(true);
    try {
      const result = await callUIBuilderAgent({
        message,
        currentDefinition: buildDefinition(rows),
        schema,
        assistantName: assistantName ?? 'Assistant',
        brandColor,
      });
      const assistantMsg: ChatMessage = {
        id: uid(), role: 'assistant', content: result.description, hasProposal: true,
      };
      setChatMessages(prev => [...prev, assistantMsg]);
      setPendingProposal(result.newDefinition);
    } catch (e) {
      setChatMessages(prev => [...prev, {
        id: uid(), role: 'assistant',
        content: e instanceof Error ? e.message : 'Failed to process your request.',
      }]);
    } finally {
      setIsChatLoading(false);
    }
  }, [rows, schema]);

  const applyProposal = useCallback(() => {
    if (!pendingProposal) return;
    setRows(pendingProposal.rows);
    setPendingProposal(null);
    setSelectedBlockId(null);
  }, [pendingProposal]);

  const dismissProposal = useCallback(() => setPendingProposal(null), []);

  return {
    rows,
    selectedBlockId,
    chatMessages,
    pendingProposal,
    isChatLoading,
    configTab,
    toastMsg,
    setConfigTab,
    addBlock,
    removeBlock,
    moveRow,
    updateBlock,
    updateSpan,
    cycleColSpan,
    selectBlock,
    clearSelection,
    sendChatMessage,
    applyProposal,
    dismissProposal,
  };
}
