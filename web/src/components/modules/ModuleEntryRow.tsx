"use client";

import React from 'react';
import { PencilSimpleIcon, TrashIcon } from '@phosphor-icons/react';
import { ModuleEntry, SchemaField } from '@/services/modules.service';

interface Props {
  entry: ModuleEntry;
  schema: SchemaField[];
  onEdit: (entry: ModuleEntry) => void;
  onDelete: (entryId: string) => void;
}

// ── Format a single field value for display ───────────────────────────────────

function formatValue(field: SchemaField, value: unknown): string {
  if (value === undefined || value === null || value === '') return '—';
  switch (field.type) {
    case 'boolean':
      return value ? 'Yes' : 'No';
    case 'date':
      try {
        return new Date(String(value)).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      } catch { return String(value); }
    case 'datetime':
      try {
        return new Date(String(value)).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
      } catch { return String(value); }
    case 'number':
    case 'counter': {
      const num = Number(value);
      const unit = field.config?.unit ?? '';
      return `${isNaN(num) ? value : num}${unit ? ' ' + unit : ''}`;
    }
    default:
      return String(value).slice(0, 60);
  }
}

// ── Format the entry timestamp ────────────────────────────────────────────────

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1)   return 'just now';
    if (diffMin < 60)  return `${diffMin}m ago`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24)    return `${diffH}h ago`;
    const diffD = Math.floor(diffH / 24);
    if (diffD < 7)     return `${diffD}d ago`;
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch { return ''; }
}

// ── Main component ────────────────────────────────────────────────────────────

export function ModuleEntryRow({ entry, schema, onEdit, onDelete }: Props) {
  // Show the first 3 non-empty fields as summary
  const summaryFields = schema
    .filter(f => {
      const v = entry.data[f.key];
      return v !== undefined && v !== null && v !== '';
    })
    .slice(0, 3);

  const handleDelete = () => {
    if (!confirm('Delete this entry?')) return;
    onDelete(entry.id);
  };

  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-border-primary/50 last:border-0 group hover:bg-background-tertiary/30 transition-colors">
      {/* Values */}
      <div className="flex-1 min-w-0 flex flex-wrap gap-x-4 gap-y-0.5">
        {summaryFields.map(f => (
          <span key={f.key} className="text-xs">
            <span className="text-text-tertiary">{f.label}: </span>
            <span className="text-text-primary font-medium">{formatValue(f, entry.data[f.key])}</span>
          </span>
        ))}
        {summaryFields.length === 0 && (
          <span className="text-xs text-text-tertiary italic">Empty entry</span>
        )}
      </div>

      {/* Timestamp */}
      <span className="text-[10px] text-text-tertiary shrink-0">
        {formatTime(entry.created_at)}
      </span>

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <button
          onClick={() => onEdit(entry)}
          className="p-1.5 rounded-lg text-text-tertiary hover:text-modules-aly hover:bg-modules-aly/10 transition-all"
          title="Edit"
        >
          <PencilSimpleIcon size={13} />
        </button>
        <button
          onClick={handleDelete}
          className="p-1.5 rounded-lg text-text-tertiary hover:text-red-400 hover:bg-red-500/10 transition-all"
          title="Delete"
        >
          <TrashIcon size={13} />
        </button>
      </div>
    </div>
  );
}
