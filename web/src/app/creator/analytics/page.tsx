"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  CaretLeftIcon, PuzzlePieceIcon, StarIcon, DownloadSimpleIcon,
  CurrencyDollarIcon, UsersThreeIcon, ChartBarIcon,
} from '@phosphor-icons/react';
import { supabase } from '@/services/supabase';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface ModuleAnalytics {
  id: string; slug: string; name: string; brand_color?: string;
  status?: string; avg_rating?: number; rating_count?: number;
  install_count: number; revenue: number; version?: number;
}

interface AnalyticsData {
  modules: ModuleAnalytics[];
  totals: { installs: number; revenue: number; modules: number };
}

function StatCard({ icon: Icon, label, value, sub }: {
  icon: React.ElementType; label: string; value: string; sub?: string;
}) {
  return (
    <div className="bg-background-secondary border border-border-primary rounded-xl px-5 py-4 flex items-center gap-4">
      <div className="w-10 h-10 rounded-xl bg-background-tertiary flex items-center justify-center shrink-0">
        <Icon size={18} className="text-text-tertiary" weight="duotone" />
      </div>
      <div>
        <p className="text-[10px] text-text-tertiary uppercase tracking-widest">{label}</p>
        <p className="text-xl font-bold text-text-primary">{value}</p>
        {sub && <p className="text-[10px] text-text-tertiary/60">{sub}</p>}
      </div>
    </div>
  );
}

export default function CreatorAnalyticsPage() {
  const [data,    setData]    = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const res = await fetch(`${API}/marketplace/analytics/creator/${user.id}`);
      if (res.ok) setData(await res.json());
      setLoading(false);
    })();
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-[80vh]">
      <div className="w-5 h-5 border-2 border-border-primary border-t-modules-aly rounded-full animate-spin" />
    </div>
  );

  const totals = data?.totals ?? { installs: 0, revenue: 0, modules: 0 };

  return (
    <main className="max-w-4xl mx-auto px-5 py-10 flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <Link href="/creator" className="flex items-center gap-1.5 text-[11px] text-text-tertiary hover:text-text-primary transition-colors">
          <CaretLeftIcon size={13} /> Creator
        </Link>
        <Link href="/creator/settings" className="text-[11px] text-text-tertiary hover:text-text-primary transition-colors">
          Payout settings →
        </Link>
      </div>

      <div>
        <h1 className="text-xl font-bold text-text-primary">Analytics</h1>
        <p className="text-xs text-text-tertiary mt-1">Install counts, ratings, and revenue across your modules.</p>
      </div>

      {/* Totals */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard icon={PuzzlePieceIcon} label="Published Modules"
          value={String(totals.modules)} />
        <StatCard icon={DownloadSimpleIcon} label="Total Installs"
          value={totals.installs.toLocaleString()} />
        <StatCard icon={CurrencyDollarIcon} label="Total Revenue"
          value={`₱${totals.revenue.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`}
          sub="70% creator share after fees" />
      </div>

      {/* Per-module table */}
      {(data?.modules?.length ?? 0) === 0 ? (
        <div className="py-16 flex flex-col items-center gap-3 text-center">
          <ChartBarIcon size={32} className="text-text-tertiary/20" />
          <p className="text-sm text-text-tertiary">No modules yet.</p>
          <Link href="/creator/new" className="text-xs text-modules-aly font-semibold hover:opacity-80">
            Create your first module →
          </Link>
        </div>
      ) : (
        <section>
          <p className="text-[10px] font-medium text-text-tertiary uppercase tracking-widest mb-3">Per module</p>
          <div className="flex flex-col divide-y divide-border-primary/40 border border-border-primary rounded-xl overflow-hidden">
            {data!.modules.map(m => {
              const color = m.brand_color || 'var(--modules-aly)';
              return (
                <div key={m.id} className="flex items-center gap-4 px-5 py-4 bg-background-secondary hover:bg-background-primary transition-colors">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${color}18`, border: `1px solid ${color}30` }}>
                    <PuzzlePieceIcon size={16} style={{ color }} weight="duotone" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Link href={`/creator/${m.id}/schema`}
                        className="text-sm font-semibold text-text-primary hover:text-modules-aly transition-colors truncate">
                        {m.name}
                      </Link>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide ${
                        m.status === 'published' ? 'text-green-400 bg-green-400/10' : 'text-text-tertiary bg-background-tertiary'
                      }`}>{m.status}</span>
                    </div>
                    {m.avg_rating && (
                      <div className="flex items-center gap-1 mt-0.5">
                        <StarIcon size={10} className="text-yellow-400" weight="fill" />
                        <span className="text-[10px] text-text-secondary">{m.avg_rating.toFixed(1)}</span>
                        <span className="text-[10px] text-text-tertiary">({m.rating_count})</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-6 shrink-0">
                    <div className="text-center">
                      <p className="text-sm font-bold text-text-primary">{m.install_count}</p>
                      <p className="text-[9px] text-text-tertiary uppercase tracking-widest">Installs</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-bold text-text-primary">
                        ₱{m.revenue.toLocaleString('en-PH', { minimumFractionDigits: 0 })}
                      </p>
                      <p className="text-[9px] text-text-tertiary uppercase tracking-widest">Revenue</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </main>
  );
}
