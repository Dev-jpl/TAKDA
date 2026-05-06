"use client";

import React, { useMemo } from 'react';
import Link from 'next/link';
import { Plus, ArrowRight } from '@phosphor-icons/react';
import { useModuleEditor } from '@/contexts/ModuleEditorContext';
import { CustomModuleView } from '@/components/modules/CustomModuleView';
import type { ModuleDefinitionV2 } from '@/types/module-creator';

// ── Field type display ────────────────────────────────────────────────────────

function fieldTypeBadge(type: string): string {
  const map: Record<string, string> = {
    text: 'Text', string: 'Text', number: 'Number', boolean: 'Toggle',
    date: 'Date', datetime: 'DateTime', select: 'Select',
    multi_select: 'Multi', counter: 'Counter', list: 'List',
    relation: 'Relation', rich_text: 'Rich', media: 'Media',
  };
  return map[type] ?? type;
}

// ── Phone frame ───────────────────────────────────────────────────────────────

function PhoneFrame({
  fields,
  brandColor,
  width = 280,
}: {
  fields: { key: string; label: string; type: string }[];
  brandColor: string;
  width?: number;
}) {
  const height = Math.round(width * (19.5 / 9));
  const r      = 44 * (width / 390);

  return (
    <div className="relative mx-auto" style={{ width, height }}>
      {/* Frame */}
      <div
        className="absolute inset-0 overflow-hidden"
        style={{
          borderRadius:    r,
          backgroundColor: '#1A1A1A',
          border:          '1.5px solid rgba(255,255,255,0.12)',
        }}
      >
        {/* Status bar */}
        <div className="flex items-center justify-between px-5 pt-3 pb-1" style={{ paddingTop: r * 0.5 }}>
          <span className="text-[9px] text-white/60 font-medium">9:41</span>
          <div className="flex items-center gap-1">
            <div className="w-3 h-1.5 rounded-sm bg-white/40" />
            <div className="w-1 h-1.5 rounded-sm bg-white/40" />
          </div>
        </div>

        {/* Module header */}
        <div className="px-4 py-2 flex items-center gap-2 border-b border-white/5">
          <div className="w-5 h-5 rounded-lg shrink-0" style={{ backgroundColor: `${brandColor}30` }} />
          <span className="text-[11px] font-medium text-white/80 flex-1 truncate">Module Preview</span>
        </div>

        {/* Field rows */}
        <div className="flex-1 overflow-hidden px-3 py-2 flex flex-col gap-1">
          {fields.slice(0, 6).map(f => (
            <div key={f.key} className="flex items-center justify-between py-1.5 border-b border-white/5 last:border-0">
              <span className="text-[10px] text-white/60 flex-1 truncate">{f.label}</span>
              <span
                className="text-[9px] font-medium px-1.5 py-0.5 rounded-md ml-2 shrink-0"
                style={{ backgroundColor: `${brandColor}20`, color: brandColor }}
              >
                {fieldTypeBadge(f.type)}
              </span>
            </div>
          ))}
          {fields.length === 0 && (
            <p className="text-[10px] text-white/30 text-center py-4">No fields yet</p>
          )}
        </div>

        {/* FAB */}
        <div
          className="absolute bottom-5 right-4 w-10 h-10 rounded-full flex items-center justify-center shadow-lg"
          style={{ backgroundColor: brandColor }}
        >
          <Plus size={16} weight="bold" className="text-white" />
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function PreviewPage() {
  const { definition } = useModuleEditor();

  const primaryCollection = useMemo(() => {
    if (!definition) return null;
    const schemas     = definition.schemas ?? {};
    const collections = Object.values(schemas);
    if (collections.length === 0) return null;
    return collections.find(c => c.role === 'primary') ?? collections[0];
  }, [definition?.schemas]);

  const primaryFields = useMemo(() => {
    if (primaryCollection) return primaryCollection.fields;
    return definition?.schema ?? [];
  }, [primaryCollection, definition?.schema]);

  if (!definition) return (
    <div className="flex items-center justify-center h-full">
      <span className="w-5 h-5 border-2 border-border-primary border-t-modules-aly rounded-full animate-spin" />
    </div>
  );

  const brandColor = definition.brand_color || 'var(--modules-aly)';

  return (
    <div className="overflow-y-auto h-full">
      <div className="max-w-5xl mx-auto px-5 py-8 flex flex-col gap-8">

        {/* Header */}
        <div>
          <h2 className="text-sm font-medium text-text-primary">Preview</h2>
          <p className="text-[11px] text-text-tertiary mt-0.5">
            See how your module will look when installed on a hub.
          </p>
        </div>

        {/* Two-column preview */}
        <div className="flex flex-col lg:flex-row gap-8 items-start">

          {/* Web preview */}
          <div className="flex-1 flex flex-col gap-3 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-[10px] font-medium text-text-tertiary uppercase tracking-widest">Web (Hub)</p>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-background-tertiary text-text-tertiary">Sample data</span>
            </div>
            <div className="border border-border-primary rounded-xl overflow-hidden max-w-170">
              {/* Module header bar */}
              <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border-primary bg-background-secondary">
                <div className="w-5 h-5 rounded-lg shrink-0" style={{ backgroundColor: `${brandColor}20`, border: `1px solid ${brandColor}30` }} />
                <span className="text-[12px] font-medium text-text-primary">{definition.name || 'Module'}</span>
                <span
                  className="ml-auto text-[9px] font-medium px-1.5 py-0.5 rounded"
                  style={{ backgroundColor: `${brandColor}15`, color: brandColor }}
                >
                  Preview
                </span>
              </div>
              <CustomModuleView
                definition={definition as ModuleDefinitionV2}
                hubId="preview"
                userId="preview"
                assistantName="Aly"
              />
            </div>
          </div>

          {/* Mobile preview */}
          <div className="flex flex-col gap-3 shrink-0">
            <p className="text-[10px] font-medium text-text-tertiary uppercase tracking-widest">Mobile</p>
            <PhoneFrame
              fields={primaryFields as any[]}
              brandColor={brandColor}
              width={280}
            />
          </div>
        </div>

        {/* Install banner */}
        <div className="flex items-center justify-between bg-background-secondary border border-border-primary rounded-xl px-5 py-4">
          <p className="text-[12px] text-text-secondary">
            Install this module on a hub to see it with real data.
          </p>
          <Link
            href="/spaces"
            className="flex items-center gap-1.5 text-[11px] text-modules-aly hover:opacity-80 transition-opacity shrink-0 ml-4"
          >
            Go to Spaces <ArrowRight size={12} />
          </Link>
        </div>
      </div>
    </div>
  );
}
