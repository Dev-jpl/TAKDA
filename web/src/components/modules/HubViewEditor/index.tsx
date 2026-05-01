"use client";

import React, { useState } from 'react';
import { SquaresFour, Sliders, Eye, EyeSlash } from '@phosphor-icons/react';
import type { HubSection, HubSectionConfig, HubViewDefinition } from '@/types/ui-builder';
import type { ComputedProperty } from '@/types/module-creator';
import type { SchemaField } from '@/services/modules.service';
import { useHubViewEditor } from './useHubViewEditor';
import { HubPalettePanel } from './HubPalettePanel';
import { HubCanvasPanel } from './HubCanvasPanel';
import { HubConfigPanel } from './HubConfigPanel';

interface Props {
  schema:             SchemaField[];
  computedProperties: ComputedProperty[];
  initialDefinition:  HubViewDefinition | null;
  brandColor?:        string;
  moduleName?:        string;
  onChange:           (def: HubViewDefinition) => void;
}

export function HubViewEditor({
  schema, computedProperties, initialDefinition,
  brandColor = 'var(--modules-aly)', onChange,
}: Props) {
  const [showPalette, setShowPalette] = useState(true);
  const [showConfig,  setShowConfig]  = useState(true);
  const [isPreview,   setIsPreview]   = useState(false);

  const {
    sections, selectedId,
    addSection, removeSection, moveSection, updateSection,
    selectSection, clearSelection,
  } = useHubViewEditor(initialDefinition, onChange);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-1 px-3 py-2 border-b border-border-primary bg-background-secondary shrink-0">
        {!isPreview && (
          <>
            <button type="button" onClick={() => setShowPalette(v => !v)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-medium border transition-all ${showPalette ? 'bg-modules-aly/10 text-modules-aly border-modules-aly/20' : 'border-border-primary text-text-tertiary hover:text-text-secondary'}`}>
              <SquaresFour size={13} /> Sections
            </button>
            <button type="button" onClick={() => setShowConfig(v => !v)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-medium border transition-all ${showConfig ? 'bg-modules-aly/10 text-modules-aly border-modules-aly/20' : 'border-border-primary text-text-tertiary hover:text-text-secondary'}`}>
              <Sliders size={13} /> Properties
            </button>
          </>
        )}
        <div className="flex-1" />
        <button type="button" onClick={() => setIsPreview(v => !v)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-medium border transition-all ${isPreview ? 'bg-modules-aly/10 text-modules-aly border-modules-aly/20' : 'border-border-primary text-text-tertiary hover:text-text-secondary'}`}>
          {isPreview ? <EyeSlash size={13} /> : <Eye size={13} />}
          {isPreview ? 'Edit' : 'Preview'}
        </button>
      </div>

      {/* Three-panel layout */}
      <div className="flex flex-1 overflow-hidden">
        {showPalette && !isPreview && (
          <HubPalettePanel onAdd={(config: HubSectionConfig) => addSection(config)} />
        )}

        <HubCanvasPanel
          sections={sections}
          selectedId={selectedId}
          brandColor={brandColor}
          onSelect={selectSection}
          onClear={clearSelection}
          onRemove={removeSection}
          onMove={moveSection}
        />

        {showConfig && !isPreview && (
          <HubConfigPanel
            sections={sections}
            selectedId={selectedId}
            computed={computedProperties}
            schema={schema}
            onUpdate={(id: string, config: HubSectionConfig) => updateSection(id, config)}
          />
        )}
      </div>
    </div>
  );
}
