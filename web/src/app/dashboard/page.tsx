"use client";

import React, { useEffect, useState } from "react";
import { 
  Sparkle, 
  Binoculars, 
  ChartLineUp, 
  Database, 
  ArrowRight
} from "@phosphor-icons/react";
import Link from "next/link";
import { spacesService, Space } from "@/services/spaces.service";
import { SpaceCard } from "@/components/common/SpaceCard";
import { StatCard } from "@/components/common/StatCard";
import { supabase } from "@/services/supabase";

export default function DashboardPage() {
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const uId = data.user?.id;
      if (uId) {
        spacesService.getSpaces(uId)
          .then(data => setSpaces(data.slice(0, 3)))
          .catch(console.error)
          .finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });
  }, []);

  return (
    <main className="p-6 lg:p-12">
      {/* Top bar */}
      <header className="flex items-center justify-between mb-12">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-text-primary">Dashboard</h1>
          <p className="text-text-tertiary text-sm mt-1">Status registry for your mission-critical Life OS.</p>
        </div>
        <div className="flex items-center gap-4">
          <Link 
            href="/coordinator"
            className="flex items-center gap-2 bg-modules-aly/10 border border-modules-aly/20 text-modules-aly px-5 py-3 rounded-xl font-bold text-sm hover:bg-modules-aly/20 transition-all"
          >
            <Sparkle size={18} weight="fill" />
            <span>Identify Mission</span>
          </Link>
        </div>
      </header>

      {/* Ministats Grid */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
        <StatCard label="Life Domains" value={spaces.length > 0 ? "12" : "..."} icon={<Binoculars size={18} />} color="var(--modules-aly)" />
        <StatCard label="Context Hubs" value="38" icon={<ChartLineUp size={18} />} color="var(--modules-track)" />
        <StatCard label="Intelligence IQ" value="152" icon={<Database size={18} />} color="var(--modules-knowledge)" />
        <StatCard label="OS Velocity" value="84%" icon={<Sparkle size={18} />} color="var(--status-success)" />
      </section>

      {/* Quick Access Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-12">
        {/* Recents Section */}
        <section className="xl:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xs font-bold text-text-tertiary uppercase tracking-[0.2em]">Active Domains</h2>
            <Link href="/spaces" className="text-xs text-modules-aly font-bold hover:underline flex items-center gap-1 group">
              Full Oversight <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          <div className="space-y-4">
            {loading ? (
              [1, 2, 3].map(i => (
                <div key={i} className="h-24 w-full bg-background-secondary rounded-xl animate-pulse border border-border-primary" />
              ))
            ) : (
              spaces.map(space => (
                <SpaceCard 
                  key={space.id}
                  name={space.name}
                  category={space.category}
                  icon={space.icon}
                  color={space.color}
                  hubsCount={space.hubs_count}
                  onPress={() => window.location.href = `/spaces/${space.id}`}
                />
              ))
            )}
          </div>
        </section>

        {/* Intelligence Feed Placeholder */}
        <aside>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xs font-bold text-text-tertiary uppercase tracking-[0.2em]">Mission Intelligence</h2>
          </div>
          <div className="bg-background-secondary border border-border-primary rounded-2xl p-6 relative overflow-hidden group border-l-4 border-l-modules-aly">
            <p className="text-sm font-bold text-text-primary mb-2">Identify Next Objective</p>
            <p className="text-xs text-text-tertiary leading-relaxed mb-6">
              Aly identifies 3 high-velocity missions within your <span className="text-modules-track font-bold">Personal Growth</span> domain.
            </p>
            <button 
              onClick={() => window.location.href = '/coordinator'}
              className="w-full py-3 rounded-xl bg-background-tertiary border border-border-primary text-xs font-bold text-modules-aly hover:bg-modules-aly hover:text-white transition-all"
            >
              Launch Coordinator
            </button>
          </div>
        </aside>
      </div>
    </main>
  );
}
