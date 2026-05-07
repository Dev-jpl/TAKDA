import { useCallback, useEffect, useRef, useState } from 'react';
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
  const [sections,   setSections]   = useState<HubSection[]>(() => initialDef?.sections ?? []);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const onChangeRef  = useRef(onChange);
  onChangeRef.current = onChange;

  // Skip calling onChange on the initial mount — sections are already
  // derived from initialDef so we don't need to write them back.
  const skipRef = useRef(true);
  useEffect(() => {
    if (skipRef.current) { skipRef.current = false; return; }
    onChangeRef.current(buildDef(sections));
  }, [sections]);

  const addSection = useCallback((config: HubSectionConfig) => {
    setSections(prev => [...prev, { id: uid(), config }]);
  }, []);

  const removeSection = useCallback((id: string) => {
    setSections(prev => prev.filter(s => s.id !== id));
    setSelectedId(v => (v === id ? null : v));
  }, []);

  const moveSection = useCallback((from: number, to: number) => {
    setSections(prev => {
      if (from === to) return prev;
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  }, []);

  const updateSection = useCallback((id: string, config: HubSectionConfig) => {
    setSections(prev => prev.map(s => (s.id === id ? { ...s, config } : s)));
  }, []);

  const selectSection  = useCallback((id: string) => setSelectedId(id), []);
  const clearSelection = useCallback(() => setSelectedId(null), []);

  return { sections, selectedId, addSection, removeSection, moveSection, updateSection, selectSection, clearSelection };
}
