"use client";

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { AnimatePresence } from 'framer-motion';
import {
  CaretLeftIcon, StarIcon, CheckIcon, UserCircleIcon,
  PuzzlePieceIcon, ArrowRightIcon, SparkleIcon, XIcon,
} from '@phosphor-icons/react';
import { supabase } from '@/services/supabase';
import { hubsService } from '@/services/hubs.service';
import { spacesService } from '@/services/spaces.service';
import { installAddon } from '@/services/addons.service';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// ── Types ─────────────────────────────────────────────────────────────────────

interface ModuleDetail {
  id: string; slug: string; name: string; description?: string;
  brand_color?: string; category?: string; avg_rating?: number;
  rating_count?: number; version?: number; updated_at?: string;
  schema?: any[]; schemas?: any; computed_properties?: any[];
  user_id?: string;
  user?: { display_name?: string; avatar_url?: string } | null;
}

interface Review {
  id: string; rating: number; review?: string; created_at: string;
  user?: { display_name?: string; avatar_url?: string } | null;
}

// ── Stars ─────────────────────────────────────────────────────────────────────

function Stars({ value, max = 5, size = 14, interactive = false, onChange }: {
  value: number; max?: number; size?: number; interactive?: boolean;
  onChange?: (n: number) => void;
}) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: max }, (_, i) => {
        const n = i + 1;
        const filled = interactive ? (hover || value) >= n : value >= n;
        return (
          <button
            key={n}
            type="button"
            disabled={!interactive}
            onClick={() => onChange?.(n)}
            onMouseEnter={() => interactive && setHover(n)}
            onMouseLeave={() => interactive && setHover(0)}
            className={interactive ? 'cursor-pointer' : 'cursor-default'}
          >
            <StarIcon
              size={size}
              weight={filled ? 'fill' : 'regular'}
              className={filled ? 'text-yellow-400' : 'text-text-tertiary/30'}
            />
          </button>
        );
      })}
    </div>
  );
}

// ── Hub picker modal (reused from marketplace) ────────────────────────────────

function HubPickerModal({ module, onClose }: { module: ModuleDetail; onClose: () => void }) {
  const [hubs,      setHubs]      = useState<any[]>([]);
  const [done,      setDone]      = useState<string[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [installing,setInstalling]= useState<string | null>(null);
  const [userId,    setUserId]    = useState<string | null>(null);
  const color = module.brand_color || 'var(--modules-aly)';

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      const spaces = await spacesService.getSpaces(user.id);
      const allHubs = await Promise.all(spaces.map(s => hubsService.getHubsBySpace(s.id).then(hs => hs.map(h => ({ ...h, spaceName: s.name })))));
      setHubs(allHubs.flat());
      setLoading(false);
    })();
  }, []);

  const install = async (hubId: string) => {
    if (!userId) return;
    setInstalling(hubId);
    try {
      await installAddon(hubId, userId, module.slug);
      setDone(prev => [...prev, hubId]);
    } finally { setInstalling(null); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative bg-background-secondary border border-border-primary rounded-2xl w-full max-w-sm z-10 overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-primary">
          <p className="text-sm font-bold text-text-primary">Install to a Hub</p>
          <button onClick={onClose} className="text-text-tertiary hover:text-text-primary"><XIcon size={16} /></button>
        </div>
        <div className="max-h-80 overflow-y-auto p-3 flex flex-col gap-1.5">
          {loading && <p className="text-xs text-text-tertiary text-center py-8">Loading hubs…</p>}
          {!loading && hubs.length === 0 && <p className="text-xs text-text-tertiary text-center py-8">No hubs found.</p>}
          {hubs.map(hub => {
            const isInstalled = done.includes(hub.id);
            const isInstalling = installing === hub.id;
            return (
              <button key={hub.id} disabled={isInstalled || isInstalling} onClick={() => install(hub.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl border text-left transition-all ${isInstalled ? 'border-green-400/20 bg-green-400/5 cursor-default opacity-80' : 'border-border-primary hover:bg-background-tertiary'}`}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
                  style={{ backgroundColor: `${hub.color}15`, border: `1px solid ${hub.color}30`, color: hub.color }}>
                  {hub.name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-text-primary truncate">{hub.name}</p>
                  <p className="text-[10px] text-text-tertiary">{hub.spaceName}</p>
                </div>
                {isInstalled ? <CheckIcon size={14} className="text-green-400 shrink-0" weight="bold" />
                  : isInstalling ? <div className="w-3.5 h-3.5 border-2 border-modules-aly/40 border-t-modules-aly rounded-full animate-spin shrink-0" />
                  : <ArrowRightIcon size={14} className="text-text-tertiary shrink-0" />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ModuleDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const router   = useRouter();

  const [module,    setModule]    = useState<ModuleDetail | null>(null);
  const [reviews,   setReviews]   = useState<Review[]>([]);
  const [myRating,  setMyRating]  = useState(0);
  const [myReview,  setMyReview]  = useState('');
  const [submitting,setSubmitting]= useState(false);
  const [userId,    setUserId]    = useState<string | null>(null);
  const [showPicker,setShowPicker]= useState(false);
  const [loading,   setLoading]   = useState(true);

  const load = useCallback(async () => {
    const [moduleRes, ratingsRes] = await Promise.all([
      fetch(`${API}/marketplace/modules/${slug}`).then(r => r.ok ? r.json() : null),
      fetch(`${API}/marketplace/modules/${slug}/ratings?limit=20`).then(r => r.ok ? r.json() : { reviews: [] }),
    ]);
    if (!moduleRes) { router.replace('/marketplace'); return; }
    setModule(moduleRes);
    setReviews(ratingsRes.reviews ?? []);

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setUserId(user.id);
      const mine = (ratingsRes.reviews as Review[]).find(r => (r as any).user_id === user.id);
      if (mine) { setMyRating(mine.rating); setMyReview(mine.review ?? ''); }
    }
    setLoading(false);
  }, [slug]);

  useEffect(() => { load(); }, [load]);

  const submitRating = async () => {
    if (!myRating || !userId || !slug) return;
    setSubmitting(true);
    try {
      await fetch(`${API}/marketplace/modules/${slug}/rate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, rating: myRating, review: myReview || null }),
      });
      await load();
    } finally { setSubmitting(false); }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-[80vh]">
      <div className="w-6 h-6 border-2 border-border-primary border-t-modules-aly rounded-full animate-spin" />
    </div>
  );

  if (!module) return null;

  const color = module.brand_color || 'var(--modules-aly)';

  // Resolve primary fields
  const fields: any[] = (() => {
    const schemas = module.schemas ?? {};
    const cols = Object.values(schemas) as any[];
    if (cols.length) return (cols.find(c => c.role === 'primary') ?? cols[0])?.fields ?? [];
    return module.schema ?? [];
  })();

  return (
    <main className="max-w-4xl mx-auto px-5 py-10 flex flex-col gap-8">

      {/* Back */}
      <Link href="/marketplace" className="flex items-center gap-1.5 text-[11px] text-text-tertiary hover:text-text-primary transition-colors w-fit">
        <CaretLeftIcon size={13} /> Marketplace
      </Link>

      {/* Header */}
      <div className="flex items-start gap-5">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center shrink-0"
          style={{ backgroundColor: `${color}18`, border: `1px solid ${color}30` }}>
          <PuzzlePieceIcon size={28} style={{ color }} weight="duotone" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-text-primary">{module.name}</h1>
            {module.version && (
              <span className="text-[10px] font-bold text-text-tertiary bg-background-tertiary border border-border-primary px-2 py-0.5 rounded-lg uppercase tracking-widest">
                v{module.version}
              </span>
            )}
          </div>
          <p className="text-sm text-text-tertiary mt-1 leading-relaxed">{module.description || 'No description.'}</p>

          <div className="flex items-center gap-4 mt-3 flex-wrap">
            {module.avg_rating ? (
              <div className="flex items-center gap-1.5">
                <Stars value={Math.round(module.avg_rating)} />
                <span className="text-[11px] font-semibold text-text-secondary">{module.avg_rating.toFixed(1)}</span>
                <span className="text-[10px] text-text-tertiary">({module.rating_count} review{module.rating_count !== 1 ? 's' : ''})</span>
              </div>
            ) : (
              <span className="text-[11px] text-text-tertiary">No ratings yet</span>
            )}

            {module.user && (
              <Link href={`/creator-profile/${module.user_id}`}
                className="flex items-center gap-1.5 text-[11px] text-text-tertiary hover:text-text-primary transition-colors">
                <UserCircleIcon size={14} />
                {module.user.display_name || 'Unknown creator'}
              </Link>
            )}
          </div>
        </div>

        <button
          onClick={() => setShowPicker(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white shrink-0 transition-all hover:opacity-90"
          style={{ backgroundColor: color }}
        >
          Install <ArrowRightIcon size={14} weight="bold" />
        </button>
      </div>

      {/* Fields */}
      {fields.length > 0 && (
        <section className="bg-background-secondary border border-border-primary rounded-xl p-5">
          <p className="text-[10px] font-medium text-text-tertiary uppercase tracking-widest mb-4">Schema Fields</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {fields.map((f: any) => (
              <div key={f.key} className="flex items-center gap-2 px-3 py-2 bg-background-primary border border-border-primary rounded-xl">
                <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                <span className="text-[12px] text-text-primary truncate">{f.label}</span>
                <span className="text-[9px] text-text-tertiary ml-auto font-mono shrink-0">{f.type}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Computed properties */}
      {(module.computed_properties?.length ?? 0) > 0 && (
        <section className="bg-background-secondary border border-border-primary rounded-xl p-5">
          <p className="text-[10px] font-medium text-text-tertiary uppercase tracking-widest mb-4">Computed Stats</p>
          <div className="flex flex-wrap gap-2">
            {module.computed_properties!.map((p: any) => (
              <div key={p.key} className="flex items-center gap-2 px-3 py-1.5 bg-background-primary border border-border-primary rounded-xl">
                <SparkleIcon size={11} style={{ color }} />
                <span className="text-[12px] text-text-primary">{p.label}</span>
                <span className="text-[9px] text-text-tertiary font-mono">{p.type}{p.window ? ` · ${p.window}` : ''}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Rate this module */}
      {userId && (
        <section className="bg-background-secondary border border-border-primary rounded-xl p-5 flex flex-col gap-4">
          <p className="text-[10px] font-medium text-text-tertiary uppercase tracking-widest">Rate this module</p>
          <div className="flex items-center gap-3">
            <Stars value={myRating} interactive onChange={setMyRating} size={22} />
            {myRating > 0 && <span className="text-[11px] text-text-tertiary">{['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent'][myRating]}</span>}
          </div>
          {myRating > 0 && (
            <>
              <textarea
                rows={3}
                value={myReview}
                onChange={e => setMyReview(e.target.value)}
                placeholder="Share your experience (optional)"
                className="w-full bg-background-primary border border-border-primary rounded-xl px-4 py-2.5 text-sm text-text-primary outline-none focus:border-modules-aly/50 resize-none placeholder:text-text-tertiary"
              />
              <button
                onClick={submitRating}
                disabled={submitting}
                className="self-start flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white transition-all hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: color }}
              >
                {submitting ? 'Saving…' : 'Submit Review'}
              </button>
            </>
          )}
        </section>
      )}

      {/* Reviews */}
      {reviews.length > 0 && (
        <section className="flex flex-col gap-3">
          <p className="text-[10px] font-medium text-text-tertiary uppercase tracking-widest">Reviews</p>
          {reviews.map(r => (
            <div key={r.id} className="bg-background-secondary border border-border-primary rounded-xl px-5 py-4 flex flex-col gap-2">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-background-tertiary flex items-center justify-center text-[11px] font-bold text-text-tertiary shrink-0">
                  {r.user?.display_name?.[0]?.toUpperCase() ?? '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-semibold text-text-primary">{r.user?.display_name ?? 'Anonymous'}</p>
                  <p className="text-[10px] text-text-tertiary">{new Date(r.created_at).toLocaleDateString()}</p>
                </div>
                <Stars value={r.rating} size={12} />
              </div>
              {r.review && <p className="text-sm text-text-secondary leading-relaxed">{r.review}</p>}
            </div>
          ))}
        </section>
      )}

      {reviews.length === 0 && (
        <p className="text-xs text-text-tertiary text-center py-4">No reviews yet. Be the first!</p>
      )}

      {/* Hub picker modal */}
      <AnimatePresence>
        {showPicker && <HubPickerModal module={module} onClose={() => setShowPicker(false)} />}
      </AnimatePresence>
    </main>
  );
}
