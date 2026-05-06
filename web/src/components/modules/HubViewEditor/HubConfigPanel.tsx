"use client";

import React from 'react';
import { CursorText, PlusIcon, TrashIcon } from '@phosphor-icons/react';
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

const inputBase = 'w-full bg-background-primary border border-border-primary rounded-lg px-3 py-2 text-xs text-text-primary outline-none focus:border-modules-aly/50';
const selectBase = `${inputBase} cursor-pointer`;

// ── Reusable sub-components ───────────────────────────────────────────────────

function FieldCheckList({
  fields, selected, max, onChange,
}: {
  fields: SchemaField[]; selected: string[]; max?: number;
  onChange: (keys: string[]) => void;
}) {
  return (
    <div className="flex flex-col gap-0.5 max-h-36 overflow-y-auto">
      {fields.map(f => {
        const checked  = selected.includes(f.key);
        const disabled = !checked && !!max && selected.length >= max;
        return (
          <label key={f.key} className={`flex items-center gap-2 cursor-pointer py-1 ${disabled ? 'opacity-40' : ''}`}>
            <input type="checkbox" className="accent-modules-aly"
              checked={checked} disabled={disabled}
              onChange={e => {
                const next = e.target.checked
                  ? [...selected, f.key]
                  : selected.filter(k => k !== f.key);
                onChange(next);
              }} />
            <span className="text-[12px] text-text-secondary flex-1">{f.label}</span>
            <span className="text-[9px] text-text-tertiary font-mono">{f.type}</span>
          </label>
        );
      })}
      {fields.length === 0 && (
        <p className="text-[11px] text-text-tertiary/60">No schema fields yet.</p>
      )}
    </div>
  );
}

function ComputedCheckList({
  computed, selected, max, onChange,
}: {
  computed: ComputedProperty[]; selected: string[]; max?: number;
  onChange: (keys: string[]) => void;
}) {
  return (
    <div className="flex flex-col gap-0.5 max-h-36 overflow-y-auto">
      {computed.map(p => {
        const checked  = selected.includes(p.key);
        const disabled = !checked && !!max && selected.length >= max;
        return (
          <label key={p.key} className={`flex items-center gap-2 cursor-pointer py-1 ${disabled ? 'opacity-40' : ''}`}>
            <input type="checkbox" className="accent-modules-aly"
              checked={checked} disabled={disabled}
              onChange={e => {
                const next = e.target.checked
                  ? [...selected, p.key]
                  : selected.filter(k => k !== p.key);
                onChange(next);
              }} />
            <span className="text-[12px] text-text-secondary flex-1">{p.label}</span>
            <span className="text-[9px] text-text-tertiary font-mono ml-auto">{p.type}</span>
          </label>
        );
      })}
      {computed.length === 0 && (
        <p className="text-[11px] text-text-tertiary/60">No computed properties yet.</p>
      )}
    </div>
  );
}

// ── Config forms per section type ─────────────────────────────────────────────

function SectionConfig({ section, computed, schema, onUpdate }: {
  section:  HubSection;
  computed: ComputedProperty[];
  schema:   SchemaField[];
  onUpdate: (config: HubSectionConfig) => void;
}) {
  const c = section.config;

  // ── Standard types ──────────────────────────────────────────────────────────

  if (c.type === 'widget') return (
    <p className="text-[11px] text-text-tertiary leading-relaxed">
      Displays the module&apos;s widget layout as configured in the Widget tab.
    </p>
  );

  if (c.type === 'entry_form_panel') return (
    <Section>
      <Label>Section title (optional)</Label>
      <DebouncedInput value={c.title ?? ''} onChange={v => onUpdate({ ...c, title: v })}
        placeholder="e.g. Log Entry" />
    </Section>
  );

  if (c.type === 'entry_list') return (
    <div className="flex flex-col gap-4">
      <Section>
        <Label>Title (optional)</Label>
        <DebouncedInput value={c.title ?? ''} onChange={v => onUpdate({ ...c, title: v })}
          placeholder="e.g. Recent Entries" />
      </Section>
      <Section>
        <Label>Max entries</Label>
        <input type="number" min={1} max={50} value={c.limit}
          onChange={e => onUpdate({ ...c, limit: Number(e.target.value) })}
          className={inputBase} />
      </Section>
      <Section>
        <Label>Visible fields</Label>
        <FieldCheckList fields={schema} selected={c.show_fields}
          onChange={keys => onUpdate({ ...c, show_fields: keys })} />
      </Section>
    </div>
  );

  if (c.type === 'stats_row') return (
    <Section>
      <Label>Computed properties</Label>
      <ComputedCheckList computed={computed} selected={c.computed_keys}
        onChange={keys => onUpdate({ ...c, computed_keys: keys })} />
    </Section>
  );

  if (c.type === 'divider') return (
    <p className="text-[11px] text-text-tertiary">No configuration needed.</p>
  );

  // ── Smart types ─────────────────────────────────────────────────────────────

  if (c.type === 'date_nav') {
    const dateLike = schema.filter(f => f.type === 'date' || f.type === 'datetime');
    return (
      <Section>
        <Label>Date field</Label>
        <select className={selectBase} value={c.date_field}
          onChange={e => onUpdate({ ...c, date_field: e.target.value })}>
          <option value="">Select field…</option>
          {dateLike.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
        </select>
        {dateLike.length === 0 && (
          <p className="text-[10px] text-text-tertiary/60 mt-1">
            Add a date or datetime field in the Schema tab first.
          </p>
        )}
      </Section>
    );
  }

  if (c.type === 'summary_bar') return (
    <div className="flex flex-col gap-4">
      <Section>
        <Label>Consumed value</Label>
        <select className={selectBase} value={c.primary_key}
          onChange={e => onUpdate({ ...c, primary_key: e.target.value })}>
          <option value="">Select computed property…</option>
          {computed.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
        </select>
      </Section>

      <Section>
        <Label>Goal value</Label>
        <input type="number" min={0} value={c.goal_value}
          onChange={e => onUpdate({ ...c, goal_value: Number(e.target.value) })}
          className={inputBase} placeholder="e.g. 2000" />
      </Section>

      <Section>
        <Label>Column labels</Label>
        <div className="flex flex-col gap-2">
          <DebouncedInput value={c.goal_label ?? 'Goal'}
            onChange={v => onUpdate({ ...c, goal_label: v })} placeholder="Goal" />
          <DebouncedInput value={c.consumed_label ?? 'Consumed'}
            onChange={v => onUpdate({ ...c, consumed_label: v })} placeholder="Consumed" />
          <DebouncedInput value={c.remaining_label ?? 'Left'}
            onChange={v => onUpdate({ ...c, remaining_label: v })} placeholder="Left" />
        </div>
      </Section>

      <Section>
        <Label>Macro progress bars (up to 4)</Label>
        <ComputedCheckList
          computed={computed.filter(p => p.key !== c.primary_key)}
          selected={c.macro_keys ?? []}
          max={4}
          onChange={keys => onUpdate({ ...c, macro_keys: keys })}
        />
      </Section>
    </div>
  );

  if (c.type === 'grouped_entries') {
    const selectFields = schema.filter(f => f.type === 'select');
    const addGroup = () => onUpdate({
      ...c, groups: [...c.groups, { key: '', label: '' }],
    });
    const updateGroup = (i: number, patch: { key?: string; label?: string }) => {
      const next = c.groups.map((g, idx) => idx === i ? { ...g, ...patch } : g);
      onUpdate({ ...c, groups: next });
    };
    const removeGroup = (i: number) => onUpdate({
      ...c, groups: c.groups.filter((_, idx) => idx !== i),
    });

    return (
      <div className="flex flex-col gap-4">

        <Section>
          <Label>Group by field</Label>
          <select className={selectBase} value={c.group_by_field}
            onChange={e => onUpdate({ ...c, group_by_field: e.target.value })}>
            <option value="">Select field…</option>
            {selectFields.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
          </select>
          {selectFields.length === 0 && (
            <p className="text-[10px] text-text-tertiary/60 mt-1">
              Add a select field to group by.
            </p>
          )}
        </Section>

        <Section>
          <div className="flex items-center justify-between mb-1.5">
            <Label>Groups</Label>
            <button type="button" onClick={addGroup}
              className="flex items-center gap-1 text-[10px] text-modules-aly hover:opacity-80 transition-opacity">
              <PlusIcon size={10} weight="bold" /> Add
            </button>
          </div>
          <div className="flex flex-col gap-1.5">
            {c.groups.map((g, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <input
                  className={`${inputBase} flex-1`}
                  value={g.key} placeholder="key"
                  onChange={e => updateGroup(i, { key: e.target.value })} />
                <input
                  className={`${inputBase} flex-1`}
                  value={g.label} placeholder="label"
                  onChange={e => updateGroup(i, { label: e.target.value })} />
                <button type="button" onClick={() => removeGroup(i)}
                  className="text-text-tertiary hover:text-red-400 transition-colors shrink-0 p-1">
                  <TrashIcon size={11} />
                </button>
              </div>
            ))}
            {c.groups.length === 0 && (
              <p className="text-[10px] text-text-tertiary/60">No groups yet. Add one above.</p>
            )}
          </div>
        </Section>

        <Section>
          <Label>Display fields (up to 3)</Label>
          <FieldCheckList fields={schema} selected={c.show_fields} max={3}
            onChange={keys => onUpdate({ ...c, show_fields: keys })} />
        </Section>

        <Section>
          <Label>Header stat (optional)</Label>
          <select className={selectBase} value={c.stat_key ?? ''}
            onChange={e => onUpdate({ ...c, stat_key: e.target.value || undefined })}>
            <option value="">None</option>
            {computed.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
          </select>
        </Section>

        <Section>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" className="accent-modules-aly"
              checked={c.inline_form}
              onChange={e => onUpdate({ ...c, inline_form: e.target.checked })} />
            <span className="text-[12px] text-text-secondary">Per-group inline add form</span>
          </label>
        </Section>

        <Section>
          <Label>Max rows per group</Label>
          <input type="number" min={1} max={100} value={c.limit_per_group ?? 20}
            onChange={e => onUpdate({ ...c, limit_per_group: Number(e.target.value) })}
            className={inputBase} />
        </Section>

      </div>
    );
  }

  return null;
}

// ── Main export ───────────────────────────────────────────────────────────────

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
