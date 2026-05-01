import { useCallback, useRef, useState } from 'react';
import { HubSection, HubSectionConfig, HubViewDefinition } from '@/types/ui-builder';

function uid() { return crypto.randomUUID().replace(/-/g, '').slice(0, 8); }

function buildDef(sections: HubSection[]): HubViewDefinition {
  return { version: '1.0', sections };
}

export interface UseHubViewEditorReturn {
  sections:       HubSection[];
  selectedId:     string | null;
  addSection:     (config: HubSectionConfig) => void;
  removeSection:  (id: string) => void;
  moveSection:    (from: number, to: number) => void;
  updateSection:  (id: string, config: HubSectionConfig) => void;
  selectSection:  (id: string) => void;
  clearSelection: () => void;
}

export function useHubViewEditor(
  initialDef: HubViewDefinition | null,
  onChange: (def: HubViewDefinition) => void,
): UseHubViewEditorReturn {
  const [sections,    setSections]    = useState<HubSection[]>(() => initialDef?.sections ?? []);
  const [selectedId,  setSelectedId]  = useState<string | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const commit = useCallback((next: HubSection[]) => {
    setSections(next);
    onChangeRef.current(buildDef(next));
  }, []);

  const addSection = useCallback((config: HubSectionConfig) => {
    setSections(prev => {
      const next = [...prev, { id: uid(), config }];
      onChangeRef.current(buildDef(next));
      return next;
    });
  }, []);

  const removeSection = useCallback((id: string) => {
    setSections(prev => {
      const next = prev.filter(s => s.id !== id);
      onChangeRef.current(buildDef(next));
      return next;
    });
    setSelectedId(v => v === id ? null : v);
  }, []);

  const moveSection = useCallback((from: number, to: number) => {
    setSections(prev => {
      if (from === to) return prev;
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      onChangeRef.current(buildDef(next));
      return next;
    });
  }, []);

  const updateSection = useCallback((id: string, config: HubSectionConfig) => {
    setSections(prev => {
      const next = prev.map(s => s.id === id ? { ...s, config } : s);
      onChangeRef.current(buildDef(next));
      return next;
    });
  }, []);

  const selectSection  = useCallback((id: string) => setSelectedId(id), []);
  const clearSelection = useCallback(() => setSelectedId(null), []);

  return { sections, selectedId, addSection, removeSection, moveSection, updateSection, selectSection, clearSelection };
}
