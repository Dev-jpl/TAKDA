import { useCallback, useEffect, useRef, useState } from 'react';
import type { PlatformStyle } from '@/types/ui-builder';
import {
  WidgetDefinition, WidgetElement, WidgetElementConfig,
  WidgetRow, WidgetRowAlign, WidgetRowJustify, WidgetSpan,
} from '@/types/ui-builder';

function uid() { return crypto.randomUUID().replace(/-/g, '').slice(0, 8); }

function buildDef(rows: WidgetRow[]): WidgetDefinition {
  return { version: '1.0', rows };
}

// Patch type that covers both config fields AND the element-level appearance field.
// The two must be split before applying — config goes into e.config, appearance onto e.
export type ElementPatch = Partial<WidgetElementConfig> & { appearance?: PlatformStyle };
export type RowLayoutPatch = { justify?: WidgetRowJustify; align?: WidgetRowAlign; appearance?: PlatformStyle };

export interface UseWidgetStudioReturn {
  rows:              WidgetRow[];
  selectedId:        string | null;
  selectedRowId:     string | null;
  selectedElId:      string | null;
  addElement:        (config: WidgetElementConfig) => void;
  removeElement:     (rowId: string, elId: string) => void;
  moveRow:           (from: number, to: number) => void;
  addRow:            () => void;
  removeRow:         (rowId: string) => void;
  updateElement:     (rowId: string, elId: string, patch: ElementPatch) => void;
  updateElementSpan: (rowId: string, elId: string, span: WidgetSpan) => void;
  updateRowLayout:   (rowId: string, patch: RowLayoutPatch) => void;
  selectElement:     (rowId: string, elId: string) => void;
  selectRow:         (rowId: string) => void;
  clearSelection:    () => void;
}

export function useWidgetStudio(
  initialDef: WidgetDefinition | null,
  onChange: (def: WidgetDefinition) => void,
): UseWidgetStudioReturn {
  const [rows,       setRows]       = useState<WidgetRow[]>(() => initialDef?.rows ?? []);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // Notify parent after each render where rows changed.
  // skipRef prevents the initial-mount fire (rows are already derived from initialDef).
  const skipRef = useRef(true);
  useEffect(() => {
    if (skipRef.current) { skipRef.current = false; return; }
    onChangeRef.current(buildDef(rows));
  }, [rows]);

  // ── Mutations — no onChange calls inside updaters ────────────────────────

  const addElement = useCallback((config: WidgetElementConfig) => {
    setRows(prev => {
      const el: WidgetElement = { id: uid(), span: 1, config };
      if (prev.length === 0) {
        return [{ id: uid(), justify: 'start', align: 'middle', elements: [el] }];
      }
      const last = prev[prev.length - 1];
      return [...prev.slice(0, -1), { ...last, elements: [...last.elements, el] }];
    });
  }, []);

  const removeElement = useCallback((rowId: string, elId: string) => {
    setRows(prev =>
      prev
        .map(r => r.id !== rowId ? r : { ...r, elements: r.elements.filter(e => e.id !== elId) })
        .filter(r => r.elements.length > 0),
    );
    setSelectedId(null);
  }, []);

  const addRow = useCallback(() => {
    setRows(prev => [
      ...prev,
      { id: uid(), justify: 'start' as WidgetRowJustify, align: 'middle' as WidgetRowAlign, elements: [] },
    ]);
  }, []);

  const removeRow = useCallback((rowId: string) => {
    setRows(prev => prev.filter(r => r.id !== rowId));
    setSelectedId(null);
  }, []);

  const moveRow = useCallback((from: number, to: number) => {
    setRows(prev => {
      if (from === to) return prev;
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  }, []);

  const updateElement = useCallback((rowId: string, elId: string, patch: ElementPatch) => {
    // Split the patch: appearance lives on the element, everything else goes into config.
    const { appearance, ...configPatch } = patch;
    setRows(prev => prev.map(r => r.id !== rowId ? r : {
      ...r,
      elements: r.elements.map(e => {
        if (e.id !== elId) return e;
        return {
          ...e,
          ...(appearance !== undefined ? { appearance } : {}),
          ...(Object.keys(configPatch).length > 0
            ? { config: { ...e.config, ...configPatch } as WidgetElementConfig }
            : {}),
        };
      }),
    }));
  }, []);

  const updateElementSpan = useCallback((rowId: string, elId: string, span: WidgetSpan) => {
    setRows(prev => prev.map(r => r.id !== rowId ? r : {
      ...r,
      elements: r.elements.map(e => e.id !== elId ? e : { ...e, span }),
    }));
  }, []);

  const updateRowLayout = useCallback((rowId: string, patch: RowLayoutPatch) => {
    const { appearance, ...layoutPatch } = patch;
    setRows(prev => prev.map(r => r.id !== rowId ? r : {
      ...r,
      ...layoutPatch,
      ...(appearance !== undefined ? { appearance } : {}),
    }));
  }, []);

  const selectElement = useCallback((rowId: string, elId: string) => setSelectedId(`${rowId}:${elId}`), []);
  const selectRow     = useCallback((rowId: string) => setSelectedId(`${rowId}:`), []);
  const clearSelection = useCallback(() => setSelectedId(null), []);

  const [selectedRowId, selectedElId] = selectedId
    ? [selectedId.split(':')[0], selectedId.split(':')[1] || null]
    : [null, null];

  return {
    rows, selectedId, selectedRowId, selectedElId,
    addElement, removeElement, addRow, removeRow, moveRow,
    updateElement, updateElementSpan, updateRowLayout,
    selectElement, selectRow, clearSelection,
  };
}
