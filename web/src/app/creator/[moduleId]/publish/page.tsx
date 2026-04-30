"use client";

import React, { useState } from 'react';
import { CheckCircle, Circle, Warning } from '@phosphor-icons/react';
import { useModuleEditor } from '@/contexts/ModuleEditorContext';
import { publishModuleDefinition } from '@/services/modules.service';

type Visibility = 'private' | 'unlisted' | 'public';

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    draft:     'text-text-tertiary bg-background-tertiary',
    published: 'text-green-400 bg-green-400/10',
    archived:  'text-text-tertiary bg-background-tertiary opacity-50',
  };
  return (
    <span className={`text-xs font-medium uppercase tracking-widest px-3 py-1 rounded-xl ${styles[status] ?? styles.draft}`}>
      {status}
    </span>
  );
}

export default function PublishPage() {
  const { definition, updateDefinition, isSaving } = useModuleEditor();
  const [visibility,    setVisibility]    = useState<Visibility>('private');
  const [versionNotes,  setVersionNotes]  = useState('');
  const [publishing,    setPublishing]    = useState(false);
  const [error,         setError]         = useState('');

  if (!definition) return (
    <div className="flex items-center justify-center h-full">
      <span className="w-5 h-5 border-2 border-border-primary border-t-modules-aly rounded-full animate-spin" />
    </div>
  );

  const status = definition.status;

  // ── Completion checks ────────────────────────────────────────────────────────

  const checks = [
    {
      label: 'Schema',
      done:  Object.keys(definition.schemas ?? {}).length > 0 || (definition.schema?.length ?? 0) > 0,
      hint:  'Add at least one collection with at least one field.',
    },
    {
      label: 'Web Interface',
      done:  !!(definition.ui_definition && Object.keys(definition.ui_definition as object).length > 0),
      hint:  'Design your entry form or hub view in the Web Interface tab.',
    },
    {
      label: 'Mobile Interface',
      done:  (definition.mobile_config as any)?._configured === true,
      hint:  'Configure at least one mobile behavior setting.',
    },
    {
      label: 'Web Logic',
      done:  (definition.behaviors?.web_actions?.length ?? 0) > 0,
      hint:  'Define at least one web action in the Web Logic tab.',
    },
    {
      label: 'Mobile Logic',
      done:  (definition.behaviors?.mobile_actions?.length ?? 0) > 0,
      hint:  'Define at least one mobile action in the Mobile Logic tab.',
    },
    {
      label: 'Intelligence',
      done:  !!definition.aly_config?.context_hint,
      hint:  'Add a context hint in the Intelligence tab.',
    },
  ];

  const completedCount = checks.filter(c => c.done).length;

  const handlePublish = async () => {
    if (!window.confirm('Publish this module? This will increment the version number.')) return;
    setPublishing(true);
    setError('');
    try {
      const result = await publishModuleDefinition(definition.id, visibility, versionNotes);
      updateDefinition({ status: result.status, version: result.version });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Publish failed');
    } finally {
      setPublishing(false);
    }
  };

  const handleStatusChange = (newStatus: 'draft' | 'archived') => {
    if (!window.confirm(`Set status to ${newStatus}?`)) return;
    updateDefinition({ status: newStatus });
  };

  return (
    <div className="max-w-xl mx-auto px-5 py-8 overflow-y-auto h-full flex flex-col gap-8">

      {/* Section 1: Status & Version */}
      <section className="bg-background-secondary border border-border-primary rounded-xl p-5 flex flex-col gap-4">
        <p className="text-[10px] font-medium text-text-tertiary uppercase tracking-widest">Status &amp; Version</p>

        <div className="flex items-center gap-3">
          <StatusBadge status={status} />
          <span className="text-[11px] text-text-tertiary">v{definition.version}</span>
        </div>

        <div className="flex gap-2 flex-wrap">
          {status === 'draft' && (
            <button type="button" onClick={handlePublish} disabled={publishing || isSaving}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-[12px] font-medium bg-modules-aly/10 text-modules-aly border border-modules-aly/20 hover:bg-modules-aly hover:text-white transition-all disabled:opacity-50">
              {publishing ? <span className="w-3.5 h-3.5 border-2 border-current/30 border-t-current rounded-full animate-spin" /> : null}
              Publish Module
            </button>
          )}
          {status === 'published' && (
            <>
              <button type="button" onClick={() => handleStatusChange('draft')}
                className="px-4 py-2 rounded-xl text-[12px] font-medium border border-border-primary text-text-tertiary hover:text-text-primary hover:bg-background-tertiary transition-all">
                Unpublish
              </button>
              <button type="button" onClick={() => handleStatusChange('archived')}
                className="px-4 py-2 rounded-xl text-[12px] font-medium border border-border-primary text-text-tertiary hover:text-red-400 hover:border-red-400/30 transition-all">
                Archive
              </button>
            </>
          )}
          {status === 'archived' && (
            <button type="button" onClick={() => handleStatusChange('draft')}
              className="px-4 py-2 rounded-xl text-[12px] font-medium border border-border-primary text-text-tertiary hover:text-text-primary hover:bg-background-tertiary transition-all">
              Restore to Draft
            </button>
          )}
        </div>

        {error && (
          <p className="text-[11px] text-red-400 bg-red-400/10 border border-red-400/20 rounded-xl px-4 py-2.5">{error}</p>
        )}
      </section>

      {/* Section 2: Visibility */}
      <section className="bg-background-secondary border border-border-primary rounded-xl p-5 flex flex-col gap-3">
        <p className="text-[10px] font-medium text-text-tertiary uppercase tracking-widest">Visibility</p>

        {[
          { value: 'private'  as Visibility, label: 'Private',     desc: 'Only you can see and install this module', disabled: false },
          { value: 'unlisted' as Visibility, label: 'Unlisted',    desc: 'Anyone with the direct link can install', disabled: true,  badge: 'Phase 5' },
          { value: 'public'   as Visibility, label: 'Marketplace', desc: 'Listed publicly in the marketplace',       disabled: true,  badge: 'Phase 5' },
        ].map(opt => (
          <label key={opt.value} className={`flex items-start gap-3 cursor-pointer rounded-xl p-3 border transition-all ${!opt.disabled && visibility === opt.value ? 'border-modules-aly/30 bg-modules-aly/5' : 'border-border-primary'} ${opt.disabled ? 'opacity-40 cursor-not-allowed' : ''}`}>
            <input type="radio" name="visibility" value={opt.value} checked={visibility === opt.value}
              onChange={() => !opt.disabled && setVisibility(opt.value)}
              disabled={opt.disabled} className="accent-modules-aly mt-0.5" />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-[12px] font-medium text-text-primary">{opt.label}</span>
                {opt.badge && <span className="text-[9px] px-1.5 py-0.5 rounded bg-background-tertiary text-text-tertiary uppercase tracking-widest">{opt.badge}</span>}
              </div>
              <p className="text-[10px] text-text-tertiary mt-0.5">{opt.desc}</p>
            </div>
          </label>
        ))}
      </section>

      {/* Section 3: Version notes */}
      <section className="bg-background-secondary border border-border-primary rounded-xl p-5 flex flex-col gap-3">
        <p className="text-[10px] font-medium text-text-tertiary uppercase tracking-widest">Version Notes</p>
        <textarea
          rows={4}
          value={versionNotes}
          onChange={e => setVersionNotes(e.target.value)}
          placeholder="What changed in this version?"
          className="w-full bg-background-primary border border-border-primary rounded-xl px-4 py-2.5 text-sm text-text-primary outline-none focus:border-modules-aly/50 transition-all placeholder:text-text-tertiary resize-none"
        />
      </section>

      {/* Section 4: Completion checklist */}
      <section className="bg-background-secondary border border-border-primary rounded-xl p-5 flex flex-col gap-1">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[10px] font-medium text-text-tertiary uppercase tracking-widest">Completion Checklist</p>
          <span className="text-[11px] text-text-tertiary">{completedCount} of {checks.length}</span>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-background-tertiary rounded-full overflow-hidden mb-4">
          <div className="h-full bg-modules-aly rounded-full transition-all" style={{ width: `${(completedCount / checks.length) * 100}%` }} />
        </div>

        {checks.map(check => (
          <div key={check.label} className="flex items-start gap-3 py-2.5 border-b border-border-primary/30 last:border-0">
            {check.done
              ? <CheckCircle size={16} className="text-green-500 shrink-0 mt-0.5" weight="fill" />
              : <Circle      size={16} className="text-text-tertiary/40 shrink-0 mt-0.5" />
            }
            <div className="flex-1">
              <p className="text-[12px] font-medium text-text-primary">{check.label}</p>
              {!check.done && (
                <p className="text-[10px] text-text-tertiary mt-0.5">{check.hint}</p>
              )}
            </div>
          </div>
        ))}

        {completedCount < checks.length && (
          <div className="flex items-center gap-2 mt-3 px-3 py-2.5 bg-orange-400/5 border border-orange-400/20 rounded-xl">
            <Warning size={13} className="text-orange-400 shrink-0" />
            <p className="text-[11px] text-orange-400">Complete all tabs before publishing for the best experience.</p>
          </div>
        )}
      </section>
    </div>
  );
}
