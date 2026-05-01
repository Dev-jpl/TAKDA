"use client";

import React from 'react';
import { CursorText } from '@phosphor-icons/react';
import type { HubSection, HubSectionConfig } from '@/types/ui-builder';
import type { ComputedProperty } from '@/types/module-creator';
import type { SchemaField } from '@/services/modules.service';
import { DebouncedInput, Label, Section } from '../UIBuilder/_configHelpers';

interface Props {
  sections:   HubSection[];
  selectedId: string | null;
  computed:   ComputedProperty[];
  schema:     SchemaField[];
  onUpdate:   (id: string, config: HubSectionConfig) => void;
}

function SectionConfig({ section, computed, schema, onUpdate }: {
  section:  HubSection;
  computed: ComputedProperty[];
  schema:   SchemaField[];
  onUpdate: (config: HubSectionConfig) => void;
}) {
  const c = section.config;

  if (c.type === 'widget') return (
    <p className="text-[11px] text-text-tertiary leading-relaxed">
      This section displays your module&apos;s widget layout as configured in the Widget tab.
    </p>
  );

  if (c.type === 'entry_form_panel') return (
    <Section>
      <Label>Section title (optional)</Label>
      <DebouncedInput value={c.title ?? ''} onChange={v => onUpdate({ ...c, title: v })} placeholder="e.g. Log Entry" />
    </Section>
  );

  if (c.type === 'entry_list') return (
    <div className="flex flex-col gap-4">
      <Section>
        <Label>Title (optional)</Label>
        <DebouncedInput value={c.title ?? ''} onChange={v => onUpdate({ ...c, title: v })} placeholder="e.g. Recent Entries" />
      </Section>
      <Section>
        <Label>Max entries</Label>
        <input type="number" min={1} max={50} value={c.limit}
          onChange={e => onUpdate({ ...c, limit: Number(e.target.value) })}
          className="w-full bg-background-primary border border-border-primary rounded-lg px-3 py-2 text-sm text-text-primary outline-none" />
      </Section>
      <Section>
        <Label>Visible fields</Label>
        <div className="flex flex-col gap-1 max-h-36 overflow-y-auto">
          {schema.map(f => (
            <label key={f.key} className="flex items-center gap-2 cursor-pointer py-1">
              <input type="checkbox" className="accent-modules-aly"
                checked={c.show_fields.includes(f.key)}
                onChange={e => {
                  const next = e.target.checked
                    ? [...c.show_fields, f.key]
                    : c.show_fields.filter(k => k !== f.key);
                  onUpdate({ ...c, show_fields: next });
                }} />
              <span className="text-[12px] text-text-secondary">{f.label}</span>
            </label>
          ))}
          {schema.length === 0 && <p className="text-[11px] text-text-tertiary/60">No fields in schema yet.</p>}
        </div>
      </Section>
    </div>
  );

  if (c.type === 'stats_row') return (
    <Section>
      <Label>Computed properties to show</Label>
      <div className="flex flex-col gap-1 max-h-40 overflow-y-auto">
        {computed.map(p => (
          <label key={p.key} className="flex items-center gap-2 cursor-pointer py-1">
            <input type="checkbox" className="accent-modules-aly"
              checked={c.computed_keys.includes(p.key)}
              onChange={e => {
                const next = e.target.checked
                  ? [...c.computed_keys, p.key]
                  : c.computed_keys.filter(k => k !== p.key);
                onUpdate({ ...c, computed_keys: next });
              }} />
            <span className="text-[12px] text-text-secondary">{p.label}</span>
            <span className="text-[10px] text-text-tertiary font-mono ml-auto">{p.type}</span>
          </label>
        ))}
        {computed.length === 0 && <p className="text-[11px] text-text-tertiary/60">No computed properties yet. Add them in the Schema tab.</p>}
      </div>
    </Section>
  );

  if (c.type === 'divider') return (
    <p className="text-[11px] text-text-tertiary">No configuration needed.</p>
  );

  return null;
}

export function HubConfigPanel({ sections, selectedId, computed, schema, onUpdate }: Props) {
  const selected = selectedId ? sections.find(s => s.id === selectedId) : null;

  return (
    <div className="w-64 border-l border-border-primary bg-background-secondary flex flex-col h-full shrink-0">
      <div className="px-4 py-2.5 border-b border-border-primary">
        <p className="text-[10px] font-medium text-text-tertiary uppercase tracking-widest">Properties</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {selected ? (
          <SectionConfig
            section={selected}
            computed={computed}
            schema={schema}
            onUpdate={config => onUpdate(selected.id, config)}
          />
        ) : (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <CursorText size={24} className="text-text-tertiary/30" />
            <p className="text-xs text-text-tertiary">Select a section to configure it.</p>
          </div>
        )}
      </div>
    </div>
  );
}
