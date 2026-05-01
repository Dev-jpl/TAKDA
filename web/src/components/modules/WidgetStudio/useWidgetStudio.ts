import { useCallback, useRef, useState } from 'react';
import { WidgetDefinition, WidgetElement, WidgetElementConfig, WidgetRow, WidgetRowAlign, WidgetRowJustify, WidgetSpan } from '@/types/ui-builder';

function uid() { return crypto.randomUUID().replace(/-/g, '').slice(0, 8); }

function buildDef(rows: WidgetRow[]): WidgetDefinition {
  return { version: '1.0', rows };
}

function parseInitial(def: WidgetDefinition | null): WidgetRow[] {
  return def?.rows ?? [];
}

export interface UseWidgetStudioReturn {
  rows:            WidgetRow[];
  selectedId:      string | null;
  selectedRowId:   string | null;
  selectedElId:    string | null;
  addElement:      (config: WidgetElementConfig) => void;
  removeElement:   (rowId: string, elId: string) => void;
  moveRow:         (from: number, to: number) => void;
  addRow:          () => void;
  removeRow:       (rowId: string) => void;
  updateElement:   (rowId: string, elId: string, patch: Partial<WidgetElementConfig>) => void;
  updateElementSpan: (rowId: string, elId: string, span: WidgetSpan) => void;
  updateRowLayout: (rowId: string, patch: { justify?: WidgetRowJustify; align?: WidgetRowAlign }) => void;
  selectElement:   (rowId: string, elId: string) => void;
  selectRow:       (rowId: string) => void;
  clearSelection:  () => void;
}

export function useWidgetStudio(
  initialDef: WidgetDefinition | null,
  onChange: (def: WidgetDefinition) => void,
): UseWidgetStudioReturn {
  const [rows,       setRows]       = useState<WidgetRow[]>(() => parseInitial(initialDef));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const commit = useCallback((next: WidgetRow[]) => {
    setRows(next);
    onChangeRef.current(buildDef(next));
  }, []);

  const addElement = useCallback((config: WidgetElementConfig) => {
    setRows(prev => {
      const el: WidgetElement = { id: uid(), span: 1, config };
      let next: WidgetRow[];
      if (prev.length === 0) {
        next = [{ id: uid(), justify: 'start', align: 'middle', elements: [el] }];
      } else {
        const last = prev[prev.length - 1];
        next = [...prev.slice(0, -1), { ...last, elements: [...last.elements, el] }];
      }
      onChangeRef.current(buildDef(next));
      return next;
    });
  }, []);

  const removeElement = useCallback((rowId: string, elId: string) => {
    setRows(prev => {
      const next = prev.map(r => r.id !== rowId ? r : { ...r, elements: r.elements.filter(e => e.id !== elId) })
        .filter(r => r.elements.length > 0);
      onChangeRef.current(buildDef(next));
      return next;
    });
    setSelectedId(null);
  }, []);

  const addRow = useCallback(() => {
    setRows(prev => {
      const next = [...prev, { id: uid(), justify: 'start' as WidgetRowJustify, align: 'middle' as WidgetRowAlign, elements: [] }];
      onChangeRef.current(buildDef(next));
      return next;
    });
  }, []);

  const removeRow = useCallback((rowId: string) => {
    setRows(prev => {
      const next = prev.filter(r => r.id !== rowId);
      onChangeRef.current(buildDef(next));
      return next;
    });
    setSelectedId(null);
  }, []);

  const moveRow = useCallback((from: number, to: number) => {
    setRows(prev => {
      if (from === to) return prev;
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      onChangeRef.current(buildDef(next));
      return next;
    });
  }, []);

  const updateElement = useCallback((rowId: string, elId: string, patch: Partial<WidgetElementConfig>) => {
    setRows(prev => {
      const next = prev.map(r => r.id !== rowId ? r : {
        ...r,
        elements: r.elements.map(e => e.id !== elId ? e : {
          ...e,
          config: { ...e.config, ...patch } as WidgetElementConfig,
        }),
      });
      onChangeRef.current(buildDef(next));
      return next;
    });
  }, []);

  const updateElementSpan = useCallback((rowId: string, elId: string, span: WidgetSpan) => {
    setRows(prev => {
      const next = prev.map(r => r.id !== rowId ? r : {
        ...r,
        elements: r.elements.map(e => e.id !== elId ? e : { ...e, span }),
      });
      onChangeRef.current(buildDef(next));
      return next;
    });
  }, []);

  const updateRowLayout = useCallback((rowId: string, patch: { justify?: WidgetRowJustify; align?: WidgetRowAlign }) => {
    setRows(prev => {
      const next = prev.map(r => r.id !== rowId ? r : { ...r, ...patch });
      onChangeRef.current(buildDef(next));
      return next;
    });
  }, []);

  const selectElement = useCallback((rowId: string, elId: string) => {
    setSelectedId(`${rowId}:${elId}`);
  }, []);

  const selectRow = useCallback((rowId: string) => {
    setSelectedId(`${rowId}:`);
  }, []);

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
