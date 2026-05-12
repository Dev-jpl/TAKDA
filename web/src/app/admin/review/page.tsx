"use client";

import React, { useEffect, useState } from 'react';
import {
  CheckCircleIcon, XCircleIcon, ShieldIcon, PuzzlePieceIcon,
} from '@phosphor-icons/react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface QueueModule {
  id: string; slug: string; name: string; description?: string;
  status: string; version?: number; created_at: string;
  user?: { display_name?: string } | null;
}

export default function AdminReviewPage() {
  const [key,      setKey]      = useState('');
  const [modules,  setModules]  = useState<QueueModule[]>([]);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const [reason,   setReason]   = useState<Record<string, string>>({});
  const [acting,   setActing]   = useState<string | null>(null);

  const load = async (adminKey: string) => {
    setLoading(true); setError('');
    const res = await fetch(`${API}/marketplace/admin/review-queue`, {
      headers: { 'x-admin-key': adminKey },
    });
    if (!res.ok) { setError('Invalid admin key or server error.'); setLoading(false); return; }
    setModules(await res.json());
    setLoading(false);
  };

  const act = async (moduleId: string, action: 'approve' | 'reject') => {
    setActing(moduleId);
    const params = new URLSearchParams({ action });
    if (reason[moduleId]) params.set('reason', reason[moduleId]);
    await fetch(`${API}/marketplace/admin/review/${moduleId}?${params}`, {
      method: 'POST',
      headers: { 'x-admin-key': key },
    });
    setModules(prev => prev.filter(m => m.id !== moduleId));
    setActing(null);
  };

  return (
    <main className="max-w-3xl mx-auto px-5 py-10 flex flex-col gap-8">
      <div className="flex items-center gap-3">
        <ShieldIcon size={24} className="text-modules-aly" weight="duotone" />
        <h1 className="text-xl font-bold text-text-primary">Admin Review Queue</h1>
      </div>

      {/* Auth */}
      <div className="flex gap-3">
        <input
          type="password"
          value={key}
          onChange={e => setKey(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && load(key)}
          placeholder="Admin secret key"
          className="flex-1 bg-background-secondary border border-border-primary rounded-xl px-4 py-2.5 text-sm text-text-primary outline-none focus:border-modules-aly/50 placeholder:text-text-tertiary"
        />
        <button
          onClick={() => load(key)}
          disabled={loading || !key}
          className="px-5 py-2.5 rounded-xl text-sm font-bold bg-modules-aly/10 text-modules-aly border border-modules-aly/20 hover:bg-modules-aly/20 transition-all disabled:opacity-50"
        >
          {loading ? 'Loading…' : 'Load Queue'}
        </button>
      </div>

      {error && <p className="text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-xl px-4 py-2.5">{error}</p>}

      {/* Queue */}
      {modules.length === 0 && !loading && !error && key && (
        <div className="py-16 flex flex-col items-center gap-3 text-center">
          <CheckCircleIcon size={36} className="text-green-400" weight="fill" />
          <p className="text-sm text-text-tertiary">No modules pending review.</p>
        </div>
      )}

      {modules.map(m => (
        <div key={m.id} className="bg-background-secondary border border-border-primary rounded-xl overflow-hidden">
          <div className="flex items-start gap-4 p-5">
            <div className="w-10 h-10 rounded-xl bg-background-tertiary flex items-center justify-center shrink-0">
              <PuzzlePieceIcon size={18} className="text-text-tertiary" weight="duotone" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-bold text-text-primary">{m.name}</p>
                <span className="text-[9px] font-bold text-text-tertiary bg-background-tertiary border border-border-primary px-1.5 py-0.5 rounded uppercase">{m.slug}</span>
                {m.version && <span className="text-[9px] text-text-tertiary">v{m.version}</span>}
              </div>
              <p className="text-xs text-text-tertiary mt-1 leading-relaxed">{m.description || 'No description.'}</p>
              <p className="text-[10px] text-text-tertiary/60 mt-2">
                By {m.user?.display_name || 'Unknown'} · {new Date(m.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>

          <div className="border-t border-border-primary px-5 py-4 flex flex-col gap-3">
            <input
              value={reason[m.id] ?? ''}
              onChange={e => setReason(prev => ({ ...prev, [m.id]: e.target.value }))}
              placeholder="Rejection reason (optional)"
              className="w-full bg-background-primary border border-border-primary rounded-lg px-3 py-2 text-xs text-text-primary outline-none placeholder:text-text-tertiary focus:border-modules-aly/50"
            />
            <div className="flex gap-2">
              <button
                onClick={() => act(m.id, 'approve')}
                disabled={acting === m.id}
                className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold text-green-400 bg-green-400/10 border border-green-400/20 hover:bg-green-400/20 transition-all disabled:opacity-50"
              >
                <CheckCircleIcon size={14} weight="bold" />
                {acting === m.id ? 'Working…' : 'Approve'}
              </button>
              <button
                onClick={() => act(m.id, 'reject')}
                disabled={acting === m.id}
                className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold text-red-400 bg-red-400/10 border border-red-400/20 hover:bg-red-400/20 transition-all disabled:opacity-50"
              >
                <XCircleIcon size={14} weight="bold" />
                Reject
              </button>
            </div>
          </div>
        </div>
      ))}
    </main>
  );
}
