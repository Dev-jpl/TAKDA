"use client";

import React, {
  createContext, useCallback, useContext, useEffect,
  useRef, useState,
} from 'react';
import {
  ModuleDefinitionV2, SchemaCollection, ComputedProperty,
  ModuleBehaviors, MobileConfig, WebConfig, emptyDefinition,
} from '@/types/module-creator';
import { autosaveModuleDefinition, getModuleDefinitionById } from '@/services/modules.service';

// ── Context shape ─────────────────────────────────────────────────────────────

interface ModuleEditorContextValue {
  definition:        ModuleDefinitionV2 | null;
  isLoading:         boolean;
  isSaving:          boolean;
  lastSaved:         Date | null;
  hasUnsavedChanges: boolean;

  updateDefinition:        (patch: Partial<ModuleDefinitionV2>) => void;
  updateSchemas:           (schemas: Record<string, SchemaCollection>) => void;
  updateComputedProperties:(props: ComputedProperty[]) => void;
  updateBehaviors:         (behaviors: ModuleBehaviors) => void;
  updateMobileConfig:      (config: Partial<MobileConfig>) => void;
  updateWebConfig:         (config: Partial<WebConfig>) => void;
  updateAlyConfig:         (config: ModuleDefinitionV2['aly_config']) => void;
  saveNow:                 () => Promise<void>;
}

const ModuleEditorContext = createContext<ModuleEditorContextValue | null>(null);

// ── Provider ──────────────────────────────────────────────────────────────────

const AUTOSAVE_DELAY_MS = 800;

export function ModuleEditorProvider({
  moduleId,
  children,
}: {
  moduleId: string;
  children: React.ReactNode;
}) {
  const [definition, setDefinition] = useState<ModuleDefinitionV2 | null>(null);
  const [isLoading,  setIsLoading]  = useState(true);
  const [isSaving,   setIsSaving]   = useState(false);
  const [lastSaved,  setLastSaved]  = useState<Date | null>(null);

  const dirtyRef  = useRef(false);
  const timerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const defRef    = useRef<ModuleDefinitionV2 | null>(null);

  useEffect(() => {
    getModuleDefinitionById(moduleId)
      .then(def => {
        const merged = emptyDefinition(def as Partial<ModuleDefinitionV2>);
        setDefinition(merged);
        defRef.current = merged;
        setLastSaved(new Date());
      })
      .catch(() => setDefinition(null))
      .finally(() => setIsLoading(false));
  }, [moduleId]);

  const scheduleSave = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      if (!defRef.current || !dirtyRef.current) return;
      setIsSaving(true);
      try {
        await autosaveModuleDefinition(moduleId, defRef.current);
        dirtyRef.current = false;
        setLastSaved(new Date());
      } finally {
        setIsSaving(false);
      }
    }, AUTOSAVE_DELAY_MS);
  }, [moduleId]);

  const applyPatch = useCallback((patch: Partial<ModuleDefinitionV2>) => {
    setDefinition(prev => {
      if (!prev) return prev;
      const next = { ...prev, ...patch };
      defRef.current = next;
      dirtyRef.current = true;
      return next;
    });
    scheduleSave();
  }, [scheduleSave]);

  const updateDefinition = useCallback(
    (patch: Partial<ModuleDefinitionV2>) => applyPatch(patch),
    [applyPatch],
  );

  const updateSchemas = useCallback(
    (schemas: Record<string, SchemaCollection>) => applyPatch({ schemas }),
    [applyPatch],
  );

  const updateComputedProperties = useCallback(
    (computed_properties: ComputedProperty[]) => applyPatch({ computed_properties }),
    [applyPatch],
  );

  const updateBehaviors = useCallback(
    (behaviors: ModuleBehaviors) => applyPatch({ behaviors }),
    [applyPatch],
  );

  const updateMobileConfig = useCallback(
    (config: Partial<MobileConfig>) => {
      setDefinition(prev => {
        if (!prev) return prev;
        const next = {
          ...prev,
          mobile_config: { ...prev.mobile_config, ...config, _configured: true } as MobileConfig,
        };
        defRef.current = next;
        dirtyRef.current = true;
        return next;
      });
      scheduleSave();
    },
    [scheduleSave],
  );

  const updateWebConfig = useCallback(
    (config: Partial<WebConfig>) => {
      setDefinition(prev => {
        if (!prev) return prev;
        const next = { ...prev, web_config: { ...prev.web_config, ...config } };
        defRef.current = next;
        dirtyRef.current = true;
        return next;
      });
      scheduleSave();
    },
    [scheduleSave],
  );

  const updateAlyConfig = useCallback(
    (aly_config: ModuleDefinitionV2['aly_config']) => applyPatch({ aly_config }),
    [applyPatch],
  );

  const saveNow = useCallback(async () => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    if (!defRef.current) return;
    setIsSaving(true);
    try {
      await autosaveModuleDefinition(moduleId, defRef.current);
      dirtyRef.current = false;
      setLastSaved(new Date());
    } finally {
      setIsSaving(false);
    }
  }, [moduleId]);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  return (
    <ModuleEditorContext.Provider value={{
      definition,
      isLoading,
      isSaving,
      lastSaved,
      hasUnsavedChanges: dirtyRef.current,
      updateDefinition,
      updateSchemas,
      updateComputedProperties,
      updateBehaviors,
      updateMobileConfig,
      updateWebConfig,
      updateAlyConfig,
      saveNow,
    }}>
      {children}
    </ModuleEditorContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useModuleEditor(): ModuleEditorContextValue {
  const ctx = useContext(ModuleEditorContext);
  if (!ctx) throw new Error('useModuleEditor must be used inside ModuleEditorProvider');
  return ctx;
}
