"use client";

import React, { useMemo, useState } from 'react';
import { useModuleEditor } from '@/contexts/ModuleEditorContext';
import { UIBuilder } from '@/components/modules/UIBuilder';
import { WidgetStudio } from '@/components/modules/WidgetStudio';
import { HubViewEditor } from '@/components/modules/HubViewEditor';
import type { UIDefinition, WidgetDefinition, HubViewDefinition } from '@/types/ui-builder';
import type { SchemaField } from '@/services/modules.service';

type Surface = 'hub_view' | 'entry_form' | 'detail_view' | 'widget';

const SURFACES: { id: Surface; label: string }[] = [
  { id: 'entry_form',  label: 'Entry Form' },
  { id: 'hub_view',    label: 'Hub View' },
  { id: 'detail_view', label: 'Detail View' },
  { id: 'widget',      label: 'Widget' },
];

const WIDGET_WIDTH: Record<number, string> = { 1: 'max-w-[200px]', 2: 'max-w-[420px]', 3: 'max-w-[640px]' };

export default function WebInterfacePage() {
  const { definition, updateDefinition, updateWebConfig } = useModuleEditor();
  const [activeSurface, setActiveSurface] = useState<Surface>('entry_form');

  // Normalise ui_definition into the per-surface map
  const uiDefs = useMemo<Record<Surface, UIDefinition | WidgetDefinition | HubViewDefinition | null>>(() => {
    const raw = definition?.ui_definition as any;
    if (!raw) return { hub_view: null, entry_form: null, detail_view: null, widget: null };
    if (Array.isArray(raw?.rows)) return { hub_view: null, entry_form: raw as UIDefinition, detail_view: null, widget: null };
    return {
      hub_view:    raw.hub_view    ?? null,
      entry_form:  raw.entry_form  ?? null,
      detail_view: raw.detail_view ?? null,
      widget:      raw.widget      ?? null,
    };
  }, [definition?.ui_definition]);

  // Flatten V2 schema for UIBuilder (expects flat SchemaField[])
  const schema = useMemo<SchemaField[]>(() => {
    if (!definition) return [];
    if (Object.keys(definition.schemas ?? {}).length > 0) {
      return Object.values(definition.schemas)
        .flatMap(c => c.fields)
        .map(f => ({ key: f.key, label: f.label, type: f.type as any, required: f.required, config: f.config as any }));
    }
    return (definition.schema ?? []) as SchemaField[];
  }, [definition]);

  if (!definition) return null;

  const handleChange = (def: UIDefinition | WidgetDefinition | HubViewDefinition) => {
    const allDefs = { ...uiDefs, [activeSurface]: def };
    updateDefinition({ ui_definition: allDefs });
  };

  const widgetSpan = definition.web_config?.widget_col_span ?? 2;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Surface switcher */}
      <div className="flex items-center border-b border-border-primary bg-background-secondary shrink-0 px-1">
        {SURFACES.map(s => (
          <button
            key={s.id}
            type="button"
            onClick={() => setActiveSurface(s.id)}
            className={`px-4 py-2.5 text-[11px] font-medium transition-all border-b-2 ${
              activeSurface === s.id
                ? 'text-text-primary border-modules-aly'
                : 'text-text-tertiary border-transparent hover:text-text-secondary'
            }`}
          >
            {s.label}
          </button>
        ))}

        {/* Widget col-span selector */}
        {activeSurface === 'widget' && (
          <div className="flex items-center gap-1 ml-auto px-4">
            <span className="text-[10px] text-text-tertiary mr-2">Width</span>
            {([1, 2, 3] as const).map(n => (
              <button
                key={n}
                type="button"
                onClick={() => updateWebConfig({ widget_col_span: n })}
                className={`w-7 h-7 rounded-lg text-[11px] border transition-all ${
                  widgetSpan === n
                    ? 'bg-modules-aly/10 text-modules-aly border-modules-aly/20'
                    : 'border-border-primary text-text-tertiary hover:text-text-secondary'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Surface editors */}
      {activeSurface === 'entry_form' && (
        <UIBuilder
          schema={schema}
          initialDefinition={uiDefs.entry_form as UIDefinition | null}
          brandColor={definition.brand_color ?? undefined}
          assistantName="Aly"
          moduleName={definition.name || 'Module'}
          onChange={handleChange}
        />
      )}

      {activeSurface === 'detail_view' && (
        <UIBuilder
          schema={schema}
          initialDefinition={uiDefs.detail_view as UIDefinition | null}
          brandColor={definition.brand_color ?? undefined}
          assistantName="Aly"
          moduleName={definition.name || 'Module'}
          onChange={handleChange}
        />
      )}

      {activeSurface === 'widget' && (
        <WidgetStudio
          schema={schema}
          computedProperties={definition.computed_properties ?? []}
          actions={definition.behaviors?.web_actions ?? []}
          initialDefinition={uiDefs.widget as WidgetDefinition | null}
          brandColor={definition.brand_color ?? undefined}
          assistantName="Aly"
          moduleName={definition.name || 'Module'}
          colSpan={widgetSpan}
          onChange={handleChange}
        />
      )}

      {activeSurface === 'hub_view' && (
        <HubViewEditor
          schema={schema}
          computedProperties={definition.computed_properties ?? []}
          initialDefinition={uiDefs.hub_view as HubViewDefinition | null}
          brandColor={definition.brand_color ?? undefined}
          moduleName={definition.name || 'Module'}
          onChange={handleChange}
        />
      )}
    </div>
  );
}
