"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Plus,
  Package,
  CheckCircle,
  PencilLine,
  Trash,
  ArrowClockwise,
} from '@phosphor-icons/react';
import { supabase } from '@/services/supabase';
import { deleteModuleDefinition } from '@/services/modules.service';

// ── Types ─────────────────────────────────────────────────────────────────────

interface ModuleRow {
  id: string;
  slug: string;
  name: string;
  description?: string;
  status?: 'draft' | 'published' | 'archived';
  version?: number;
  schema?: unknown[];
  schemas?: Record<string, unknown>;
  ui_definition?: unknown;
  mobile_config?: { _configured?: boolean };
  behaviors?: {
    web_actions?: unknown[];
    mobile_actions?: unknown[];
  };
  aly_config?: {
    context_hint?: string;
    intent_keywords?: string[];
  };
  brand_color?: string;
  icon_name?: string;
  updated_at?: string;
  created_at: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function relativeTime(dateStr: string): string {
  const date = new Date(dateStr);
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
  if (diffDay < 30) return `${diffDay}d ago`;
  const diffMo = Math.floor(diffDay / 30);
  return `${diffMo}mo ago`;
}

function completionCount(m: ModuleRow): number {
  let count = 0;

  // Schema
  const hasSchema =
    Object.keys(m.schemas ?? {}).length > 0 || (m.schema?.length ?? 0) > 0;
  if (hasSchema) count++;

  // Web Interface
  const hasUi =
    m.ui_definition != null &&
    (typeof m.ui_definition === 'object'
      ? Object.keys(m.ui_definition as object).length > 0
      : true);
  if (hasUi) count++;

  // Mobile Interface
  if (m.mobile_config?._configured === true) count++;

  // Web Logic
  if ((m.behaviors?.web_actions?.length ?? 0) > 0) count++;

  // Mobile Logic
  if ((m.behaviors?.mobile_actions?.length ?? 0) > 0) count++;

  // Intelligence
  if (m.aly_config?.context_hint) count++;

  return count;
}

function StatusBadge({ status }: { status?: string }) {
  const s = status ?? 'draft';
  return (
    <span
      className={[
        'text-[10px] font-medium uppercase tracking-widest px-2 py-0.5 rounded-lg border',
        s === 'published'
          ? 'text-green-400 bg-green-400/10 border-green-400/20'
          : s === 'archived'
          ? 'text-text-tertiary bg-background-tertiary border-border-primary opacity-40'
          : 'text-text-tertiary bg-background-tertiary border-border-primary',
      ].join(' ')}
    >
      {s}
    </span>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function CreatorPage() {
  const router = useRouter();
  const [modules, setModules] = useState<ModuleRow[]>([]);
  const [loading, setLoading] = useState(true);

  const loadModules = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/auth'); return; }

    const { data } = await supabase
      .from('module_definitions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    setModules((data ?? []) as ModuleRow[]);
    setLoading(false);
  }, [router]);

  useEffect(() => { loadModules(); }, [loadModules]);

  async function handleDelete(e: React.MouseEvent, id: string, name: string) {
    e.stopPropagation();
    const ok = window.confirm(`Delete "${name}"? This cannot be undone.`);
    if (!ok) return;
    try {
      await deleteModuleDefinition(id);
      setModules(prev => prev.filter(m => m.id !== id));
    } catch {
      // ignore
    }
  }

  const total = modules.length;
  const published = modules.filter(m => m.status === 'published').length;
  const drafts = modules.filter(m => !m.status || m.status === 'draft').length;

  return (
    <div className="p-6 lg:p-10 max-w-5xl mx-auto flex flex-col gap-8">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-medium text-text-primary">Creator</h1>
          <p className="text-sm text-text-secondary">
            Build and manage your custom module definitions.
          </p>
        </div>
        <Link
          href="/creator/new"
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-modules-aly/10 text-modules-aly border border-modules-aly/20 hover:bg-modules-aly hover:text-white transition-all shrink-0"
        >
          <Plus size={15} />
          New Module
        </Link>
      </div>

      {/* ── Stats ──────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-background-secondary border border-border-primary rounded-xl p-4 flex items-center gap-3">
          <Package size={18} className="text-modules-aly shrink-0" />
          <div>
            <div className="text-xl font-medium text-text-primary">{total}</div>
            <div className="text-[11px] text-text-tertiary">Total modules</div>
          </div>
        </div>
        <div className="bg-background-secondary border border-border-primary rounded-xl p-4 flex items-center gap-3">
          <CheckCircle size={18} className="text-green-500 shrink-0" />
          <div>
            <div className="text-xl font-medium text-text-primary">{published}</div>
            <div className="text-[11px] text-text-tertiary">Published</div>
          </div>
        </div>
        <div className="bg-background-secondary border border-border-primary rounded-xl p-4 flex items-center gap-3">
          <PencilLine size={18} className="text-text-tertiary shrink-0" />
          <div>
            <div className="text-xl font-medium text-text-primary">{drafts}</div>
            <div className="text-[11px] text-text-tertiary">Drafts</div>
          </div>
        </div>
      </div>

      {/* ── Table ──────────────────────────────────────────────────────────── */}
      <div className="bg-background-secondary border border-border-primary rounded-xl overflow-hidden">
        {/* Table header */}
        <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_80px] gap-4 px-5 py-3 border-b border-border-primary">
          {['Name', 'Status', 'Version', 'Last edited', 'Completion', ''].map(col => (
            <div key={col} className="text-[10px] font-medium uppercase tracking-widest text-text-tertiary">
              {col}
            </div>
          ))}
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-16">
            <ArrowClockwise size={22} className="animate-spin text-text-tertiary" />
          </div>
        )}

        {/* Empty */}
        {!loading && modules.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Package size={28} className="text-text-tertiary" />
            <p className="text-sm text-text-tertiary">No modules yet.</p>
            <Link
              href="/creator/new"
              className="text-[11px] text-modules-aly border border-modules-aly/20 bg-modules-aly/10 px-3 py-1.5 rounded-xl hover:bg-modules-aly hover:text-white transition-all"
            >
              Create your first module
            </Link>
          </div>
        )}

        {/* Rows */}
        {!loading && modules.map(m => {
          const count = completionCount(m);
          const pct = Math.round((count / 6) * 100);
          const dateStr = m.updated_at ?? m.created_at;

          return (
            <div
              key={m.id}
              onClick={() => router.push(`/creator/${m.id}/schema`)}
              className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_80px] gap-4 px-5 py-3.5 border-t border-border-primary hover:bg-background-tertiary cursor-pointer transition-colors items-center"
            >
              {/* Name */}
              <div className="flex flex-col gap-0.5 min-w-0">
                <span className="text-sm font-medium text-text-primary truncate">
                  {m.name}
                </span>
                <span className="text-[10px] font-mono text-text-tertiary truncate">
                  {m.slug}
                </span>
              </div>

              {/* Status */}
              <div>
                <StatusBadge status={m.status} />
              </div>

              {/* Version */}
              <div className="text-[10px] text-text-tertiary">
                v{m.version ?? 1}
              </div>

              {/* Last edited */}
              <div className="text-[11px] text-text-secondary">
                {relativeTime(dateStr)}
              </div>

              {/* Completion bar */}
              <div className="flex flex-col gap-1">
                <div className="h-1 bg-background-tertiary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-modules-aly rounded-full transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-[10px] text-text-tertiary">
                  {count}/6
                </span>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 justify-end" onClick={e => e.stopPropagation()}>
                <button
                  type="button"
                  onClick={() => router.push(`/creator/${m.id}/schema`)}
                  className="text-text-tertiary hover:text-text-primary transition-colors p-1"
                  title="Edit"
                >
                  <PencilLine size={14} />
                </button>
                <button
                  type="button"
                  onClick={e => handleDelete(e, m.id, m.name)}
                  className="text-text-tertiary hover:text-red-400 transition-colors p-1"
                  title="Delete"
                >
                  <Trash size={14} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
