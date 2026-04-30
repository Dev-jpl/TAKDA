"use client";

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  CaretLeft,
  Eye,
  PaperPlaneTilt,
  Database,
  Monitor,
  DeviceMobile,
  GitBranch,
  Sparkle,
  ArrowClockwise,
} from '@phosphor-icons/react';
import * as PhosphorIcons from '@phosphor-icons/react';
import { ModuleEditorProvider, useModuleEditor } from '@/contexts/ModuleEditorContext';
import { publishModuleDefinition } from '@/services/modules.service';

// ── Color swatches ────────────────────────────────────────────────────────────

const BRAND_COLORS = [
  '#7F77DD', '#1D9E75', '#D85A30', '#D4537E',
  '#378ADD', '#BA7517', '#22c55e', '#f59e0b',
  '#818cf8', '#ec4899', '#06b6d4', '#f97316',
];

// ── Relative time ─────────────────────────────────────────────────────────────

function relativeTime(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 10) return 'just now';
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay === 1) return 'yesterday';
  return `${diffDay}d ago`;
}

// ── Phosphor icon resolver ────────────────────────────────────────────────────

function resolveIcon(iconName?: string | null): React.ElementType {
  if (iconName) {
    const candidate = (PhosphorIcons as Record<string, unknown>)[iconName];
    if (typeof candidate === 'function') return candidate as React.ElementType;
  }
  return Sparkle;
}

// ── Completion dot helper ─────────────────────────────────────────────────────

function completionDot(
  section: string,
  definition: ReturnType<typeof useModuleEditor>['definition'],
): 'green' | 'orange' | null {
  if (!definition) return null;
  switch (section) {
    case 'schema':
      return Object.keys(definition.schemas ?? {}).length > 0 || definition.schema?.length > 0
        ? 'green'
        : null;
    case 'web': {
      const hasUi = definition.ui_definition != null &&
        (typeof definition.ui_definition === 'object'
          ? Object.keys(definition.ui_definition as object).length > 0
          : true);
      if (hasUi) return 'green';
      if (definition.schema?.length > 0) return 'orange';
      return null;
    }
    case 'mobile':
      if (definition.mobile_config?._configured === true) return 'green';
      if (definition.schema?.length > 0) return 'orange';
      return null;
    case 'web-logic':
      return (definition.behaviors?.web_actions?.length ?? 0) > 0 ? 'green' : null;
    case 'mobile-logic':
      return (definition.behaviors?.mobile_actions?.length ?? 0) > 0 ? 'green' : null;
    case 'intelligence': {
      if (definition.aly_config?.context_hint) return 'green';
      if ((definition.aly_config?.intent_keywords?.length ?? 0) > 0) return 'orange';
      return null;
    }
    case 'publish':
      if (definition.status === 'published') return 'green';
      const schemaFilled =
        Object.keys(definition.schemas ?? {}).length > 0 || definition.schema?.length > 0;
      if (definition.status === 'draft' && schemaFilled) return 'orange';
      return null;
    default:
      return null;
  }
}

// ── Nav items ─────────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { label: 'Schema',           section: 'schema',         path: 'schema',         Icon: Database },
  { label: 'Web Interface',    section: 'web',             path: 'web',            Icon: Monitor },
  { label: 'Mobile Interface', section: 'mobile',          path: 'mobile',         Icon: DeviceMobile },
  { label: 'Web Logic',        section: 'web-logic',       path: 'web-logic',      Icon: GitBranch },
  { label: 'Mobile Logic',     section: 'mobile-logic',    path: 'mobile-logic',   Icon: DeviceMobile },
  { label: 'Intelligence',     section: 'intelligence',    path: 'intelligence',   Icon: Sparkle },
  { label: 'Preview',          section: 'preview',         path: 'preview',        Icon: Eye },
  { label: 'Publish',          section: 'publish',         path: 'publish',        Icon: PaperPlaneTilt },
];

// ── Color popover ─────────────────────────────────────────────────────────────

function ColorPopover({
  currentColor,
  onChange,
  onClose,
}: {
  currentColor: string;
  onChange: (color: string) => void;
  onClose: () => void;
}) {
  const [hex, setHex] = useState(currentColor);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="absolute top-8 left-0 z-50 bg-background-secondary border border-border-primary rounded-xl p-3 shadow-xl flex flex-col gap-3 w-48"
    >
      <div className="grid grid-cols-6 gap-1.5">
        {BRAND_COLORS.map(c => (
          <button
            key={c}
            type="button"
            onClick={() => { onChange(c); setHex(c); onClose(); }}
            className="w-6 h-6 rounded-lg border-2 transition-all"
            style={{
              backgroundColor: c,
              borderColor: c === currentColor ? 'white' : 'transparent',
            }}
          />
        ))}
      </div>
      <input
        type="text"
        value={hex}
        onChange={e => setHex(e.target.value)}
        onBlur={() => {
          if (/^#[0-9a-fA-F]{6}$/.test(hex)) { onChange(hex); onClose(); }
        }}
        onKeyDown={e => {
          if (e.key === 'Enter' && /^#[0-9a-fA-F]{6}$/.test(hex)) { onChange(hex); onClose(); }
        }}
        className="w-full text-[11px] font-mono bg-background-tertiary border border-border-primary rounded-lg px-2 py-1.5 text-text-primary focus:outline-none focus:border-modules-aly/50"
        placeholder="#BA7517"
      />
    </div>
  );
}

// ── Inner layout (reads context) ──────────────────────────────────────────────

function CreatorLayoutInner({
  moduleId,
  children,
}: {
  moduleId: string;
  children: React.ReactNode;
}) {
  const {
    definition,
    isLoading,
    isSaving,
    lastSaved,
    hasUnsavedChanges,
    updateDefinition,
    saveNow,
  } = useModuleEditor();

  const pathname = usePathname();
  const [nameValue, setNameValue] = useState('');
  const [colorPopoverOpen, setColorPopoverOpen] = useState(false);
  const [savedAgo, setSavedAgo] = useState('');

  // Sync name input when definition loads
  useEffect(() => {
    if (definition?.name && nameValue === '') setNameValue(definition.name);
  }, [definition?.name]);

  // Update relative time every 30s
  useEffect(() => {
    if (!lastSaved) return;
    setSavedAgo(relativeTime(lastSaved));
    const id = setInterval(() => setSavedAgo(relativeTime(lastSaved)), 30_000);
    return () => clearInterval(id);
  }, [lastSaved]);

  async function handleStatusClick() {
    if (!definition) return;
    if (definition.status === 'draft') {
      const ok = window.confirm('Publish this module? It will become visible to others.');
      if (!ok) return;
      try {
        const updated = await publishModuleDefinition(definition.id, 'private', '');
        updateDefinition({ status: updated.status, version: updated.version });
      } catch {
        // ignore
      }
    } else if (definition.status === 'published') {
      updateDefinition({ status: 'archived' });
    } else {
      updateDefinition({ status: 'draft' });
    }
  }

  const IconComponent = definition ? resolveIcon(definition.icon_name) : Sparkle;
  const brandColor = definition?.brand_color ?? '#BA7517';

  return (
    <div className="min-h-screen bg-background-primary">
      {/* ── Fixed header ─────────────────────────────────────────────────────── */}
      <header className="fixed top-0 left-0 right-0 h-12 z-20 bg-background-secondary border-b border-border-primary flex items-center px-4 gap-3">
        {/* Back */}
        <Link
          href="/creator"
          className="flex items-center text-text-tertiary hover:text-text-primary transition-colors shrink-0"
        >
          <CaretLeft size={16} />
        </Link>

        {/* Module icon */}
        <div
          className="w-5 h-5 rounded-lg flex items-center justify-center shrink-0"
          style={{
            backgroundColor: `${brandColor}1A`,
            border: `1px solid ${brandColor}33`,
          }}
        >
          <IconComponent size={11} style={{ color: brandColor }} />
        </div>

        {/* Name input */}
        <input
          type="text"
          value={nameValue}
          onChange={e => setNameValue(e.target.value)}
          onBlur={() => {
            if (nameValue.trim()) updateDefinition({ name: nameValue.trim() });
          }}
          className="text-sm font-medium bg-transparent border-none outline-none text-text-primary w-40 min-w-0 focus:bg-background-tertiary focus:px-2 focus:rounded-lg transition-all"
          placeholder="Module name"
        />

        {/* Brand color dot */}
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => setColorPopoverOpen(v => !v)}
            className="w-3 h-3 rounded-full cursor-pointer hover:ring-2 hover:ring-white/20 transition-all"
            style={{ backgroundColor: brandColor }}
          />
          {colorPopoverOpen && (
            <ColorPopover
              currentColor={brandColor}
              onChange={color => updateDefinition({ brand_color: color })}
              onClose={() => setColorPopoverOpen(false)}
            />
          )}
        </div>

        {/* Status badge */}
        {definition && (
          <button
            type="button"
            onClick={handleStatusClick}
            className={[
              'text-[10px] font-medium uppercase tracking-widest px-2 py-0.5 rounded-lg border transition-all shrink-0',
              definition.status === 'published'
                ? 'text-green-400 bg-green-400/10 border-green-400/20'
                : definition.status === 'archived'
                ? 'text-text-tertiary bg-background-tertiary border-border-primary opacity-40'
                : 'text-text-tertiary bg-background-tertiary border-border-primary',
            ].join(' ')}
          >
            {definition.status}
          </button>
        )}

        {/* Version */}
        {definition && (
          <span className="text-[10px] text-text-tertiary shrink-0">
            v{definition.version}
          </span>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Save indicator */}
        <div className="flex items-center gap-2 shrink-0">
          {isSaving ? (
            <span className="flex items-center gap-1 text-[10px] text-text-tertiary">
              <ArrowClockwise size={11} className="animate-spin" />
              Saving…
            </span>
          ) : hasUnsavedChanges ? (
            <span className="flex items-center gap-2 text-[10px] text-text-tertiary">
              Unsaved
              <button
                type="button"
                onClick={saveNow}
                className="text-[10px] text-modules-aly border border-modules-aly/20 bg-modules-aly/10 px-2 py-0.5 rounded-lg hover:bg-modules-aly hover:text-white transition-all"
              >
                Save
              </button>
            </span>
          ) : lastSaved ? (
            <span className="text-[10px] text-text-tertiary">
              Saved {savedAgo}
            </span>
          ) : null}
        </div>

        {/* Preview button */}
        <Link
          href={`/creator/${moduleId}/preview`}
          className="flex items-center gap-1.5 text-[11px] border border-border-primary rounded-xl px-3 py-1.5 text-text-tertiary hover:text-text-primary transition-colors shrink-0"
        >
          <Eye size={13} />
          Preview
        </Link>

        {/* Publish button */}
        <button
          type="button"
          onClick={async () => {
            if (!definition) return;
            const ok = window.confirm('Publish this module?');
            if (!ok) return;
            try {
              const updated = await publishModuleDefinition(definition.id, 'private', '');
              updateDefinition({ status: updated.status, version: updated.version });
            } catch {
              // ignore
            }
          }}
          className="flex items-center gap-1.5 text-[11px] rounded-xl px-3 py-1.5 bg-modules-aly/10 text-modules-aly border border-modules-aly/20 hover:bg-modules-aly hover:text-white transition-all shrink-0"
        >
          <PaperPlaneTilt size={13} />
          Publish
        </button>
      </header>

      {/* ── Left sidebar ─────────────────────────────────────────────────────── */}
      <aside className="fixed left-0 top-12 bottom-0 w-[220px] lg:w-[220px] w-14 bg-background-secondary border-r border-border-primary overflow-y-auto z-10 transition-all">
        <nav className="py-3">
          {NAV_ITEMS.map(({ label, section, path, Icon }) => {
            const href = `/creator/${moduleId}/${path}`;
            const isActive = pathname === href || pathname.startsWith(href + '/');
            const dot = completionDot(section, definition);

            return (
              <Link
                key={section}
                href={href}
                className={[
                  'flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium rounded-lg mx-2 my-0.5 border transition-all',
                  isActive
                    ? 'bg-modules-aly/10 text-modules-aly border-modules-aly/20'
                    : 'text-text-secondary hover:bg-background-tertiary hover:text-text-primary border-transparent',
                ].join(' ')}
              >
                <Icon size={16} className="shrink-0" />
                <span className="hidden lg:block truncate">{label}</span>
                {dot && (
                  <span
                    className={[
                      'hidden lg:block w-1.5 h-1.5 rounded-full ml-auto shrink-0',
                      dot === 'green' ? 'bg-green-500' : 'bg-orange-400',
                    ].join(' ')}
                  />
                )}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* ── Main content ─────────────────────────────────────────────────────── */}
      <main className="lg:ml-[220px] ml-14 mt-12 h-[calc(100vh-48px)] overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <ArrowClockwise size={24} className="animate-spin text-text-tertiary" />
          </div>
        ) : (
          children
        )}
      </main>
    </div>
  );
}

// ── Layout export ─────────────────────────────────────────────────────────────

export default function CreatorModuleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ moduleId: string }>;
}) {
  const { moduleId } = React.use(params);
  return (
    <ModuleEditorProvider moduleId={moduleId}>
      <CreatorLayoutInner moduleId={moduleId}>
        {children}
      </CreatorLayoutInner>
    </ModuleEditorProvider>
  );
}
