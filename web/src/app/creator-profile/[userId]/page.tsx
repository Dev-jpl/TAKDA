"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  CaretLeftIcon, PuzzlePieceIcon, StarIcon, UserCircleIcon, StorefrontIcon,
} from '@phosphor-icons/react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface CreatorProfile {
  id: string;
  display_name?: string;
  avatar_url?: string;
  context_bio?: string;
}

interface PublishedModule {
  id: string; slug: string; name: string; description?: string;
  brand_color?: string; avg_rating?: number; rating_count?: number;
  version?: number; updated_at?: string; category?: string;
}

function ModuleCard({ module }: { module: PublishedModule }) {
  const color = module.brand_color || 'var(--modules-aly)';
  return (
    <Link
      href={`/marketplace/${module.slug}`}
      className="group bg-background-secondary border border-border-primary rounded-xl p-4 flex flex-col gap-3 hover:border-border-primary/60 hover:bg-background-tertiary/20 transition-all"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ backgroundColor: `${color}15`, border: `1px solid ${color}25` }}>
          <PuzzlePieceIcon size={20} style={{ color }} weight="duotone" />
        </div>
        {module.avg_rating && (
          <div className="flex items-center gap-1">
            <StarIcon size={11} className="text-yellow-400" weight="fill" />
            <span className="text-[11px] font-semibold text-text-secondary">{module.avg_rating.toFixed(1)}</span>
          </div>
        )}
      </div>
      <div className="flex-1">
        <p className="text-sm font-semibold text-text-primary mb-1">{module.name}</p>
        <p className="text-xs text-text-tertiary line-clamp-2 leading-relaxed">{module.description || 'No description.'}</p>
      </div>
      <div className="flex items-center justify-between pt-2 border-t border-border-primary/40">
        <span className="text-[10px] text-text-tertiary">{module.category || 'Module'}</span>
        <span className="text-[10px] font-semibold text-modules-aly opacity-0 group-hover:opacity-100 transition-opacity">
          View →
        </span>
      </div>
    </Link>
  );
}

export default function CreatorProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const [profile,  setProfile]  = useState<CreatorProfile | null>(null);
  const [modules,  setModules]  = useState<PublishedModule[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetch(`${API}/marketplace/creators/${userId}`)
      .then(r => {
        if (r.status === 404) { setNotFound(true); setLoading(false); return null; }
        return r.json();
      })
      .then(data => {
        if (!data) return;
        setProfile(data.profile);
        setModules(data.modules);
        setLoading(false);
      })
      .catch(() => { setNotFound(true); setLoading(false); });
  }, [userId]);

  if (loading) return (
    <div className="flex items-center justify-center h-[80vh]">
      <div className="w-6 h-6 border-2 border-border-primary border-t-modules-aly rounded-full animate-spin" />
    </div>
  );

  if (notFound || !profile) return (
    <div className="max-w-xl mx-auto px-5 py-20 text-center flex flex-col gap-4 items-center">
      <UserCircleIcon size={48} className="text-text-tertiary/20" />
      <p className="text-text-tertiary text-sm">Creator not found.</p>
      <Link href="/marketplace" className="text-modules-aly text-xs font-semibold hover:opacity-80">
        ← Back to marketplace
      </Link>
    </div>
  );

  return (
    <main className="max-w-4xl mx-auto px-5 py-10 flex flex-col gap-8">

      {/* Back */}
      <Link href="/marketplace"
        className="flex items-center gap-1.5 text-[11px] text-text-tertiary hover:text-text-primary transition-colors w-fit">
        <CaretLeftIcon size={13} /> Marketplace
      </Link>

      {/* Profile header */}
      <div className="flex items-start gap-5">
        <div className="w-16 h-16 rounded-2xl bg-background-secondary border border-border-primary flex items-center justify-center shrink-0 overflow-hidden">
          {profile.avatar_url
            ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
            : <UserCircleIcon size={32} className="text-text-tertiary" />
          }
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-text-primary">{profile.display_name || 'Creator'}</h1>
          {profile.context_bio && (
            <p className="text-sm text-text-tertiary mt-1 leading-relaxed">{profile.context_bio}</p>
          )}
          <div className="flex items-center gap-2 mt-2">
            <StorefrontIcon size={13} className="text-text-tertiary" />
            <span className="text-[11px] text-text-tertiary">{modules.length} published module{modules.length !== 1 ? 's' : ''}</span>
          </div>
        </div>
      </div>

      {/* Modules grid */}
      {modules.length === 0 ? (
        <div className="py-16 flex flex-col items-center gap-3 text-center">
          <PuzzlePieceIcon size={32} className="text-text-tertiary/20" />
          <p className="text-sm text-text-tertiary">No published modules yet.</p>
        </div>
      ) : (
        <section>
          <p className="text-[10px] font-medium text-text-tertiary uppercase tracking-widest mb-4">Published Modules</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {modules.map(m => <ModuleCard key={m.id} module={m} />)}
          </div>
        </section>
      )}
    </main>
  );
}
