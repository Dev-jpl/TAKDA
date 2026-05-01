"use client";

import React, { useState } from 'react';
import { SquaresFour, Sliders, Eye, EyeSlash } from '@phosphor-icons/react';
import type { WidgetDefinition, WidgetElementConfig, WidgetRow, WidgetRowAlign, WidgetRowJustify, WidgetSpan } from '@/types/ui-builder';
import type { ComputedProperty, ModuleAction } from '@/types/module-creator';
import type { SchemaField } from '@/services/modules.service';
import { useWidgetStudio } from './useWidgetStudio';
import { WidgetPalettePanel } from './WidgetPalettePanel';
import { WidgetCanvasPanel } from './WidgetCanvasPanel';
import { WidgetConfigPanel } from './WidgetConfigPanel';

interface Props {
  schema:             SchemaField[];
  computedProperties: ComputedProperty[];
  actions:            ModuleAction[];
  initialDefinition:  WidgetDefinition | null;
  brandColor?:        string;
  assistantName?:     string;
  moduleName?:        string;
  colSpan:            number;
  onChange:           (def: WidgetDefinition) => void;
}

export function WidgetStudio({
  schema, computedProperties, actions,
  initialDefinition, brandColor = 'var(--modules-aly)',
  assistantName = 'Aly', colSpan, onChange,
}: Props) {
  const [showPalette, setShowPalette] = useState(true);
  const [showConfig,  setShowConfig]  = useState(true);
  const [isPreview,   setIsPreview]   = useState(false);

  const {
    rows, selectedRowId, selectedElId,
    addElement, removeElement, addRow, removeRow, moveRow,
    updateElement, updateElementSpan, updateRowLayout,
    selectElement, selectRow, clearSelection,
  } = useWidgetStudio(initialDefinition, onChange);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-1 px-3 py-2 border-b border-border-primary bg-background-secondary shrink-0">
        {!isPreview && (
          <>
            <button type="button" onClick={() => setShowPalette(v => !v)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-medium border transition-all ${showPalette ? 'bg-modules-aly/10 text-modules-aly border-modules-aly/20' : 'border-border-primary text-text-tertiary hover:text-text-secondary'}`}>
              <SquaresFour size={13} /> Elements
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
          <WidgetPalettePanel onAdd={(config: WidgetElementConfig) => addElement(config)} />
        )}

        <WidgetCanvasPanel
          rows={rows}
          selectedRowId={selectedRowId}
          selectedElId={selectedElId}
          brandColor={brandColor}
          colSpan={colSpan}
          onSelectEl={selectElement}
          onSelectRow={selectRow}
          onClear={clearSelection}
          onRemoveEl={removeElement}
          onSpan={(rowId: string, elId: string, span: WidgetSpan) => updateElementSpan(rowId, elId, span)}
          onUpdateRow={(rowId: string, patch: { justify?: WidgetRowJustify; align?: WidgetRowAlign }) => updateRowLayout(rowId, patch)}
          onMoveRow={moveRow}
          onRemoveRow={removeRow}
          onAddRow={addRow}
        />

        {showConfig && !isPreview && (
          <WidgetConfigPanel
            rows={rows}
            selectedRowId={selectedRowId}
            selectedElId={selectedElId}
            computed={computedProperties}
            schema={schema}
            actions={actions}
            brandColor={brandColor}
            assistantName={assistantName}
            onUpdateEl={(rowId: string, elId: string, patch: Partial<WidgetElementConfig>) => updateElement(rowId, elId, patch)}
            onUpdateRow={(rowId: string, patch: { justify?: WidgetRowJustify; align?: WidgetRowAlign }) => updateRowLayout(rowId, patch)}
          />
        )}
      </div>
    </div>
  );
}
