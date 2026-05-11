"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CaretLeft, ArrowRight, Check, ArrowClockwise, X } from '@phosphor-icons/react';
import { supabase } from '@/services/supabase';
import { createModuleDefinition, autosaveModuleDefinition } from '@/services/modules.service';
import { MODULE_TEMPLATES, type ModuleTemplate } from '@/lib/moduleTemplates';

// ── Constants ─────────────────────────────────────────────────────────────────

const BRAND_COLORS = [
  '#7F77DD', '#1D9E75', '#D85A30', '#D4537E',
  '#378ADD', '#BA7517', '#22c55e', '#f59e0b',
  '#818cf8', '#ec4899', '#06b6d4', '#f97316',
];

function deriveSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

// ── Template card ─────────────────────────────────────────────────────────────

function TemplateCard({
  template,
  selected,
  onSelect,
}: {
  template: ModuleTemplate;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`relative w-full text-left px-4 py-3.5 rounded-xl border transition-all ${
        selected
          ? 'border-transparent ring-1'
          : 'border-border-primary hover:border-border-primary/60 hover:bg-background-tertiary/30'
      }`}
      style={selected ? {
        borderColor:     template.brand_color,
        backgroundColor: `${template.brand_color}10`,
        boxShadow:       `0 0 0 1px ${template.brand_color}`,
      } : undefined}
    >
      <div className="flex items-start gap-3">
        <span className="text-xl leading-none mt-0.5 shrink-0">{template.icon}</span>
        <div className="min-w-0">
          <p className="text-[12px] font-medium text-text-primary">{template.label}</p>
          <p className="text-[10px] text-text-tertiary mt-0.5 leading-relaxed">{template.description}</p>
        </div>
        {selected && (
          <div className="shrink-0 ml-auto mt-0.5 w-4 h-4 rounded-full flex items-center justify-center"
            style={{ backgroundColor: template.brand_color }}>
            <Check size={9} className="text-white" weight="bold" />
          </div>
        )}
      </div>
    </button>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function NewModulePage() {
  const router = useRouter();

  const [selectedTemplate, setSelectedTemplate] = useState<ModuleTemplate | null>(null);
  const [name,          setName]          = useState('');
  const [description,   setDescription]   = useState('');
  const [selectedColor, setSelectedColor] = useState('#BA7517');
  const [customHex,     setCustomHex]     = useState('');
  const [loading,       setLoading]       = useState(false);
  const [error,         setError]         = useState<string | null>(null);

  const slug = deriveSlug(name);

  // When a template is picked, pre-fill name and color
  const pickTemplate = (t: ModuleTemplate | null) => {
    setSelectedTemplate(t);
    if (t) {
      if (!name) setName(t.label);
      setSelectedColor(t.brand_color);
      setCustomHex('');
    }
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const result = await createModuleDefinition({
        user_id:     user.id,
        slug,
        name:        name.trim(),
        description: description.trim() || undefined,
        brand_color: selectedColor,
        layout:      { type: 'custom' },
        is_private:  true,
        is_global:   false,
        status:      'draft',
        schema_fields: [],
      } as Parameters<typeof createModuleDefinition>[0]);

      // If a template was selected, apply its schemas / computed_properties / aly_config
      if (selectedTemplate) {
        await autosaveModuleDefinition(result.id, {
          schemas:              selectedTemplate.definition.schemas,
          computed_properties:  selectedTemplate.definition.computed_properties,
          aly_config:           selectedTemplate.definition.aly_config as any,
        } as any);
      }

      router.push(`/creator/${result.id}/schema`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create module');
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background-primary flex items-start justify-center py-12 px-5">
      <div className="w-full max-w-xl flex flex-col gap-5">

        {/* Back link */}
        <Link href="/creator"
          className="flex items-center gap-1.5 text-[11px] text-text-tertiary hover:text-text-primary transition-colors w-fit">
          <CaretLeft size={13} /> Creator
        </Link>

        <h1 className="text-lg font-medium text-text-primary">New Module</h1>

        {/* ── Template picker ─────────────────────────────────────────────── */}
        <div className="bg-background-secondary border border-border-primary rounded-xl p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-medium text-text-secondary uppercase tracking-widest">
              Start from a template
            </p>
            {selectedTemplate && (
              <button type="button" onClick={() => pickTemplate(null)}
                className="flex items-center gap-1 text-[10px] text-text-tertiary hover:text-text-primary transition-colors">
                <X size={11} /> Clear
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {MODULE_TEMPLATES.map(t => (
              <TemplateCard
                key={t.id}
                template={t}
                selected={selectedTemplate?.id === t.id}
                onSelect={() => pickTemplate(selectedTemplate?.id === t.id ? null : t)}
              />
            ))}
          </div>

          {!selectedTemplate && (
            <p className="text-[10px] text-text-tertiary/60 text-center">
              Or fill in the form below to start blank ↓
            </p>
          )}
        </div>

        {/* ── Module details form ─────────────────────────────────────────── */}
        <div className="bg-background-secondary border border-border-primary rounded-xl p-5">
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">

            {/* Name */}
            <div className="flex flex-col gap-2">
              <label className="text-[11px] font-medium text-text-secondary uppercase tracking-widest">Name</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder={selectedTemplate ? selectedTemplate.label : 'e.g. Daily Habits'}
                autoFocus
                className="text-sm bg-background-tertiary border border-border-primary rounded-xl px-4 py-2.5 text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-modules-aly/50 transition-colors"
              />
              {name && (
                <span className="text-[10px] text-text-tertiary font-mono">slug: {slug || '—'}</span>
              )}
            </div>

            {/* Description */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-medium text-text-secondary uppercase tracking-widest">
                  Description <span className="text-text-tertiary normal-case tracking-normal font-normal">(optional)</span>
                </label>
                <span className="text-[10px] text-text-tertiary">{description.length} / 160</span>
              </div>
              <textarea
                rows={2}
                value={description}
                onChange={e => setDescription(e.target.value.slice(0, 160))}
                placeholder={selectedTemplate?.description ?? 'What does this module track or manage?'}
                className="text-sm bg-background-tertiary border border-border-primary rounded-xl px-4 py-2.5 text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-modules-aly/50 transition-colors resize-none"
              />
            </div>

            {/* Brand color */}
            <div className="flex flex-col gap-3">
              <label className="text-[11px] font-medium text-text-secondary uppercase tracking-widest">Brand color</label>
              <div className="grid grid-cols-6 gap-2">
                {BRAND_COLORS.map(color => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => { setSelectedColor(color); setCustomHex(''); }}
                    className="w-9 h-9 rounded-lg flex items-center justify-center transition-all hover:scale-105"
                    style={{
                      backgroundColor: color,
                      outline:        selectedColor === color ? '2px solid white' : '2px solid transparent',
                      outlineOffset:  '2px',
                    }}
                  >
                    {selectedColor === color && <Check size={12} className="text-white" weight="bold" />}
                  </button>
                ))}
              </div>
              <input
                type="text"
                value={customHex}
                onChange={e => setCustomHex(e.target.value)}
                onBlur={() => { if (/^#[0-9a-fA-F]{6}$/.test(customHex)) setSelectedColor(customHex); }}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); if (/^#[0-9a-fA-F]{6}$/.test(customHex)) setSelectedColor(customHex); } }}
                placeholder="#BA7517"
                className="text-[11px] font-mono bg-background-tertiary border border-border-primary rounded-lg px-2 py-1.5 text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-modules-aly/50 w-28 transition-colors"
              />
            </div>

            {error && (
              <p className="text-[11px] text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">{error}</p>
            )}

            <button
              type="submit"
              disabled={!name.trim() || loading}
              className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl text-sm font-medium bg-modules-aly/10 text-modules-aly border border-modules-aly/20 hover:bg-modules-aly hover:text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-modules-aly/10 disabled:hover:text-modules-aly"
            >
              {loading ? (
                <><ArrowClockwise size={15} className="animate-spin" /> Creating…</>
              ) : (
                <>{selectedTemplate ? `Create from ${selectedTemplate.label}` : 'Create Module'} <ArrowRight size={15} /></>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
