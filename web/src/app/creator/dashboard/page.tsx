"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/services/supabase';
import {
  TrendUp, Users, CurrencyDollar, Package,
  ArrowUpRight, DotsThreeVertical, Plus, Sparkle,
} from '@phosphor-icons/react';

export default function CreatorDashboardPage() {
  const router = useRouter();
  const [modules, setModules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }
      const { data } = await supabase
        .from('module_definitions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      setModules(data ?? []);
      setLoading(false);
    }
    loadData();
  }, [router]);

  const StatCard = ({ label, value, sub, icon: Icon, color }: any) => (
    <div className="bg-background-secondary border border-border-primary rounded-2xl p-6 flex flex-col gap-4">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center border" style={{ backgroundColor: `${color}15`, borderColor: `${color}30` }}>
        <Icon size={20} style={{ color }} weight="duotone" />
      </div>
      <div>
        <p className="text-xs text-text-tertiary mb-1">{label}</p>
        <p className="text-2xl font-black tracking-tight">{value}</p>
        {sub && <p className="text-[10px] text-text-tertiary mt-0.5">{sub}</p>}
      </div>
    </div>
  );

  return (
    <main className="p-6 lg:p-12 flex flex-col gap-10 max-w-6xl mx-auto">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Creator Dashboard</h1>
          <p className="text-sm text-text-tertiary">Manage your published modules.</p>
        </div>
        <button
          onClick={() => router.push('/module-creator')}
          className="bg-accent-primary text-white font-bold px-6 py-2.5 rounded-xl flex items-center gap-2 hover:shadow-lg hover:shadow-accent-primary/20 transition-all"
        >
          <Plus size={18} weight="bold" /> New Module
        </button>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard label="Published Modules" value={modules.length} sub="Across all hubs" icon={Package} color="#fb923c" />
        <StatCard label="Total Installs" value="—" sub="Available in Phase 5" icon={Users} color="#7F77DD" />
        <StatCard label="Earnings" value="—" sub="Available in Phase 6" icon={CurrencyDollar} color="#22c55e" />
      </div>

      {/* Modules table */}
      <div className="bg-background-secondary border border-border-primary rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-border-primary flex items-center justify-between bg-background-tertiary/30">
          <h3 className="font-bold">Your Modules</h3>
        </div>
        {loading ? (
          <div className="p-12 text-center text-sm text-text-tertiary">Loading...</div>
        ) : modules.length === 0 ? (
          <div className="p-12 flex flex-col items-center gap-4">
            <Sparkle size={40} className="text-text-tertiary/30" weight="fill" />
            <p className="text-sm text-text-tertiary">No modules yet.</p>
            <button
              onClick={() => router.push('/module-creator')}
              className="text-xs text-accent-primary font-bold hover:underline flex items-center gap-1"
            >
              <Plus size={12} /> Create your first module
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] text-text-tertiary uppercase tracking-widest border-b border-border-primary">
                  <th className="px-6 py-4 font-bold">Module</th>
                  <th className="px-6 py-4 font-bold">Layout</th>
                  <th className="px-6 py-4 font-bold">Visibility</th>
                  <th className="px-6 py-4 font-bold">Created</th>
                  <th className="px-6 py-4" />
                </tr>
              </thead>
              <tbody>
                {modules.map(m => (
                  <tr key={m.id} className="border-b border-border-primary last:border-0 hover:bg-background-tertiary/20 transition-colors">
                    <td className="px-6 py-4">
                      <p className="text-sm font-bold">{m.name}</p>
                      <p className="text-[10px] text-text-tertiary">{m.slug}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-[9px] font-bold text-text-secondary bg-background-tertiary px-2 py-0.5 rounded uppercase tracking-wide">
                        {m.layout?.type?.replace('_', ' ') ?? '—'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase ${m.is_global ? 'text-green-400 bg-green-400/10' : 'text-text-tertiary bg-background-tertiary'}`}>
                        {m.is_global ? 'Global' : 'Private'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-text-tertiary">
                      {new Date(m.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="p-2 hover:bg-background-tertiary rounded-lg text-text-tertiary transition-colors">
                        <DotsThreeVertical size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Phase callout */}
      <div className="bg-accent-primary/5 border border-accent-primary/20 rounded-2xl p-6 flex items-start gap-4">
        <TrendUp size={24} className="text-accent-primary shrink-0 mt-0.5" weight="duotone" />
        <div>
          <p className="text-sm font-bold text-text-primary">Installs & earnings coming in Phase 5–6</p>
          <p className="text-xs text-text-tertiary mt-1">When the marketplace goes live, you'll see install counts, ratings, and creator payouts here.</p>
        </div>
      </div>
    </main>
  );
}
