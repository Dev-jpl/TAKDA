"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/services/supabase";
import { spacesService } from "@/services/spaces.service";
import { hubsService } from "@/services/hubs.service";
import { useRouter } from "next/navigation";
import {
  SignOut,
  ArrowLeft,
  FolderOpen,
  AppWindow,
  EnvelopeSimple,
  CalendarBlank,
  User,
} from "@phosphor-icons/react";

interface Stats { spaces: number; hubs: number }
interface UserData {
  id: string;
  email: string;
  created_at?: string;
  user_metadata?: { full_name?: string };
}

export default function ProfilePage() {
  const [user, setUser]       = useState<UserData | null>(null);
  const [stats, setStats]     = useState<Stats>({ spaces: 0, hubs: 0 });
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const router = useRouter();

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user as UserData);
      if (user) {
        const spacesData = await spacesService.getSpaces(user.id).catch(() => []);
        let hubCount = 0;
        for (const space of spacesData) {
          const hubs = await hubsService.getHubsBySpace(space.id).catch(() => []);
          hubCount += hubs.length;
        }
        setStats({ spaces: spacesData.length, hubs: hubCount });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    if (!confirm("Sign out of your account?")) return;
    setLoggingOut(true);
    await supabase.auth.signOut().catch(() => {});
    router.push("/auth");
  };

  const fullName  = user?.user_metadata?.full_name || "";
  const initials  = fullName
    ? fullName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
    : (user?.email?.[0] ?? "U").toUpperCase();
  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString(undefined, { month: "long", year: "numeric" })
    : null;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-primary">
        <div className="w-6 h-6 border-2 border-border-primary border-t-text-tertiary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background-primary">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background-primary/80 backdrop-blur-md border-b border-border-primary">
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-background-secondary transition-all"
          >
            <ArrowLeft size={18} />
          </button>
          <h1 className="text-sm font-semibold text-text-primary">Profile</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-10 space-y-6">

        {/* Identity card */}
        <div className="bg-background-secondary border border-border-primary rounded-2xl p-6 flex items-center gap-5">
          <div className="w-16 h-16 rounded-full bg-modules-aly/15 border border-modules-aly/25 flex items-center justify-center shrink-0">
            <span className="text-xl font-bold text-modules-aly">{initials}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-base font-semibold text-text-primary truncate">
              {fullName || "No name set"}
            </p>
            <p className="text-sm text-text-tertiary truncate mt-0.5">{user?.email}</p>
            {memberSince && (
              <div className="flex items-center gap-1.5 mt-2">
                <CalendarBlank size={11} className="text-text-tertiary" />
                <span className="text-[11px] text-text-tertiary">Member since {memberSince}</span>
              </div>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-background-secondary border border-border-primary rounded-xl p-4 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-modules-track/10 flex items-center justify-center">
              <FolderOpen size={16} className="text-modules-track" />
            </div>
            <div>
              <p className="text-xl font-bold text-text-primary leading-none">{stats.spaces}</p>
              <p className="text-[11px] text-text-tertiary mt-0.5">Spaces</p>
            </div>
          </div>
          <div className="bg-background-secondary border border-border-primary rounded-xl p-4 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-modules-automate/10 flex items-center justify-center">
              <AppWindow size={16} className="text-modules-automate" />
            </div>
            <div>
              <p className="text-xl font-bold text-text-primary leading-none">{stats.hubs}</p>
              <p className="text-[11px] text-text-tertiary mt-0.5">Hubs</p>
            </div>
          </div>
        </div>

        {/* Account info */}
        <div className="bg-background-secondary border border-border-primary rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border-primary">
            <p className="text-[11px] font-bold text-text-tertiary uppercase tracking-widest">Account</p>
          </div>
          <InfoRow icon={User} label="Name" value={fullName || "—"} />
          <InfoRow icon={EnvelopeSimple} label="Email" value={user?.email || "—"} last />
        </div>

        {/* Sign out */}
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="w-full flex items-center gap-3 px-5 py-4 rounded-xl border border-red-500/20 bg-background-secondary hover:bg-red-500/5 transition-all disabled:opacity-50 group"
        >
          <SignOut size={18} className="text-red-400" />
          <span className="text-sm font-medium text-red-400">
            {loggingOut ? "Signing out…" : "Sign Out"}
          </span>
        </button>

      </div>
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
  last,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <div className={`flex items-center gap-3 px-4 py-3.5 ${!last ? "border-b border-border-primary/60" : ""}`}>
      <Icon size={15} className="text-text-tertiary shrink-0" />
      <span className="text-sm text-text-tertiary w-16 shrink-0">{label}</span>
      <span className="text-sm text-text-primary truncate flex-1">{value}</span>
    </div>
  );
}
