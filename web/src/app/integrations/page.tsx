"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowsClockwise,
  Plus,
  Trash,
  Calendar,
  Lightning,
  Timer,
  ArrowUp,
  Heart,
  Trophy,
  PersonSimpleRun,
  Bicycle,
  Waves,
  PersonSimpleWalk,
  Barbell,
  Mountains,
  Plug,
  CheckCircle,
} from "@phosphor-icons/react";
import { integrationsService, UserIntegration } from "@/services/integrations.service";
import { supabase } from "@/services/supabase";
import { API_URL } from "@/services/apiConfig";

// ─── Types ───────────────────────────────────────────────────────────────────

interface StravaActivity {
  id: string;
  strava_id: string;
  name: string;
  sport_type: string;
  start_date: string;
  distance_meters: number;
  moving_time_seconds: number;
  total_elevation_gain: number;
  average_speed: number;
  average_heartrate: number | null;
  max_heartrate: number | null;
  kudos_count: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDistance(meters: number): string {
  if (!meters) return "—";
  return (meters / 1000).toFixed(2) + " km";
}

function formatDuration(seconds: number): string {
  if (!seconds) return "—";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m ${s}s`;
}

function formatPace(meters: number, seconds: number): string {
  if (!meters || !seconds) return "—";
  const paceSecPerKm = seconds / (meters / 1000);
  const m = Math.floor(paceSecPerKm / 60);
  const s = Math.round(paceSecPerKm % 60);
  return `${m}:${s.toString().padStart(2, "0")} /km`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

function SportIcon({ type, size = 18 }: { type: string; size?: number }) {
  const t = type?.toLowerCase() ?? "";
  const cls = "flex-shrink-0";
  if (t.includes("run"))     return <PersonSimpleRun size={size} weight="bold" className={cls} />;
  if (t.includes("ride") || t.includes("cycling")) return <Bicycle size={size} weight="bold" className={cls} />;
  if (t.includes("swim"))    return <Waves size={size} weight="bold" className={cls} />;
  if (t.includes("walk"))    return <PersonSimpleWalk size={size} weight="bold" className={cls} />;
  if (t.includes("hike"))    return <Mountains size={size} weight="bold" className={cls} />;
  if (t.includes("weight") || t.includes("crossfit") || t.includes("workout"))
    return <Barbell size={size} weight="bold" className={cls} />;
  return <Lightning size={size} weight="bold" className={cls} />;
}

function sportColor(type: string): string {
  const t = type?.toLowerCase() ?? "";
  if (t.includes("run"))   return "#FC4C02";
  if (t.includes("ride"))  return "#3B82F6";
  if (t.includes("swim"))  return "#06B6D4";
  if (t.includes("walk"))  return "#10B981";
  if (t.includes("hike"))  return "#8B5CF6";
  if (t.includes("weight") || t.includes("workout")) return "#F59E0B";
  return "#6B7280";
}

// ─── Activity Card ────────────────────────────────────────────────────────────

function ActivityCard({ activity }: { activity: StravaActivity }) {
  const color = sportColor(activity.sport_type);
  const isRun = activity.sport_type?.toLowerCase().includes("run");

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-border-secondary bg-background-secondary p-4 hover:border-border-primary transition-colors"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: color + "20", color }}
          >
            <SportIcon type={activity.sport_type} size={16} />
          </div>
          <div>
            <p className="text-sm font-semibold text-text-primary leading-tight">{activity.name}</p>
            <p className="text-[11px] text-text-tertiary mt-0.5">{formatDate(activity.start_date)}</p>
          </div>
        </div>
        <span
          className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
          style={{ backgroundColor: color + "20", color }}
        >
          {activity.sport_type}
        </span>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-2">
        <Stat icon={<Lightning size={12} />} label="Distance" value={formatDistance(activity.distance_meters)} />
        <Stat icon={<Timer size={12} />} label="Time" value={formatDuration(activity.moving_time_seconds)} />
        {isRun && (
          <Stat icon={<PersonSimpleRun size={12} />} label="Pace" value={formatPace(activity.distance_meters, activity.moving_time_seconds)} />
        )}
        <Stat icon={<ArrowUp size={12} />} label="Elevation" value={activity.total_elevation_gain ? `${Math.round(activity.total_elevation_gain)} m` : "—"} />
        {activity.average_heartrate && (
          <Stat icon={<Heart size={12} />} label="Avg HR" value={`${Math.round(activity.average_heartrate)} bpm`} />
        )}
        {activity.kudos_count > 0 && (
          <Stat icon={<Trophy size={12} />} label="Kudos" value={String(activity.kudos_count)} />
        )}
      </div>
    </motion.div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-1.5 bg-background-tertiary/50 rounded-lg px-2.5 py-1.5">
      <span className="text-text-tertiary">{icon}</span>
      <div>
        <p className="text-[9px] text-text-tertiary uppercase tracking-wide">{label}</p>
        <p className="text-xs font-semibold text-text-primary">{value}</p>
      </div>
    </div>
  );
}

// ─── Integration Card ─────────────────────────────────────────────────────────

function IntegrationCard({
  name, description, connected, accentColor, icon,
  onConnect, onDisconnect, onSync, syncing, meta,
}: {
  name: string;
  description: string;
  connected: boolean;
  accentColor: string;
  icon: React.ReactNode;
  onConnect: () => void;
  onDisconnect: () => void;
  onSync?: () => void;
  syncing?: boolean;
  meta?: string;
}) {
  return (
    <div className="flex items-center justify-between p-4 rounded-xl border border-border-secondary bg-background-secondary">
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: accentColor + "20", color: accentColor }}
        >
          {icon}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-text-primary">{name}</p>
            {connected && (
              <CheckCircle size={13} weight="fill" style={{ color: accentColor }} />
            )}
          </div>
          <p className="text-[11px] text-text-tertiary mt-0.5">{meta || description}</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {connected && onSync && (
          <button
            onClick={onSync}
            disabled={syncing}
            className="flex items-center gap-1.5 text-xs text-text-secondary hover:text-text-primary border border-border-secondary rounded-lg px-3 py-1.5 transition-colors disabled:opacity-50"
          >
            <ArrowsClockwise size={13} className={syncing ? "animate-spin" : ""} />
            {syncing ? "Syncing" : "Sync"}
          </button>
        )}
        {connected ? (
          <button
            onClick={onDisconnect}
            className="text-xs text-status-high hover:opacity-70 transition-opacity border border-status-high/30 rounded-lg px-3 py-1.5"
          >
            Disconnect
          </button>
        ) : (
          <button
            onClick={onConnect}
            className="flex items-center gap-1.5 text-xs font-semibold rounded-lg px-3 py-1.5 transition-all hover:opacity-80"
            style={{ backgroundColor: accentColor + "20", color: accentColor, border: `1px solid ${accentColor}40` }}
          >
            <Plus size={13} />
            Connect
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function IntegrationsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [userId, setUserId] = useState<string | null>(null);
  const [integrations, setIntegrations] = useState<UserIntegration[]>([]);
  const [activities, setActivities] = useState<StravaActivity[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(false);
  const [syncingStrava, setSyncingStrava] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [sportFilter, setSportFilter] = useState<string>("all");

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const fetchIntegrations = useCallback(async () => {
    const data = await integrationsService.getIntegrations();
    setIntegrations(data);
  }, []);

  const fetchActivities = useCallback(async (uid: string) => {
    setLoadingActivities(true);
    try {
      const res = await fetch(`${API_URL}/integrations/strava/activities?user_id=${uid}&limit=50`);
      const data = await res.json();
      if (data.activities) setActivities(data.activities);
    } catch (e) {
      console.warn("fetchActivities error:", e);
    } finally {
      setLoadingActivities(false);
    }
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const uid = data.user?.id;
      if (uid) {
        setUserId(uid);
        fetchIntegrations();
        fetchActivities(uid);
      }
    });
  }, [fetchIntegrations, fetchActivities]);

  // Handle OAuth callback redirect
  useEffect(() => {
    const integration = searchParams.get("integration");
    const status = searchParams.get("status");
    if (integration && status === "success") {
      showToast(`${integration.charAt(0).toUpperCase() + integration.slice(1)} connected!`);
      fetchIntegrations();
      router.replace("/integrations");
    }
  }, [searchParams, fetchIntegrations, router]);

  const handleSyncStrava = async () => {
    if (!userId || syncingStrava) return;
    setSyncingStrava(true);
    try {
      const res = await integrationsService.syncStrava(userId);
      showToast(`Synced ${res.synced_count ?? 0} activities`);
      fetchActivities(userId);
    } catch {
      showToast("Sync failed. Try again.");
    } finally {
      setSyncingStrava(false);
    }
  };

  const stravaIntegration = integrations.find(i => i.provider === "strava");
  const googleIntegration = integrations.find(i => i.provider === "google");

  // Compute totals from activities
  const totalDistance = activities.reduce((sum, a) => sum + (a.distance_meters || 0), 0);
  const totalTime = activities.reduce((sum, a) => sum + (a.moving_time_seconds || 0), 0);
  const totalElevation = activities.reduce((sum, a) => sum + (a.total_elevation_gain || 0), 0);
  const totalKudos = activities.reduce((sum, a) => sum + (a.kudos_count || 0), 0);

  const sportTypes = ["all", ...Array.from(new Set(activities.map(a => a.sport_type).filter(Boolean)))];
  const filtered = sportFilter === "all" ? activities : activities.filter(a => a.sport_type === sportFilter);

  return (
    <div className="min-h-screen bg-background-primary">
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-background-secondary border border-border-primary rounded-xl px-5 py-3 text-sm text-text-primary shadow-xl"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="border-b border-border-primary sticky top-0 z-40 bg-background-primary/80 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="text-text-tertiary hover:text-text-primary transition-colors"
            >
              <ArrowLeft size={18} weight="light" />
            </button>
            <div>
              <h1 className="text-sm font-bold text-text-primary">Integrations</h1>
              <p className="text-[11px] text-text-tertiary">Connected services and your data</p>
            </div>
          </div>
          <Plug size={18} className="text-text-tertiary" weight="light" />
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-12">

        {/* ── Connected Services ── */}
        <section className="space-y-4">
          <h2 className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest">Connected Services</h2>
          <div className="space-y-3">
            <IntegrationCard
              name="Google Calendar"
              description="Sync events and schedule"
              connected={!!googleIntegration}
              accentColor="#4285F4"
              icon={<Calendar size={20} weight="bold" />}
              onConnect={() => userId && integrationsService.initiateGoogleAuth(userId)}
              onDisconnect={() => googleIntegration && integrationsService.removeIntegration(googleIntegration.id).then(fetchIntegrations)}
              meta={googleIntegration?.metadata?.email as string | undefined}
            />
            <IntegrationCard
              name="Strava"
              description="Activities, runs, rides, and workouts"
              connected={!!stravaIntegration}
              accentColor="#FC4C02"
              icon={<PersonSimpleRun size={20} weight="bold" />}
              onConnect={() => userId && integrationsService.initiateStravaAuth(userId)}
              onDisconnect={() => stravaIntegration && integrationsService.removeIntegration(stravaIntegration.id).then(fetchIntegrations)}
              onSync={handleSyncStrava}
              syncing={syncingStrava}
              meta={stravaIntegration
                ? [stravaIntegration.metadata?.firstname, stravaIntegration.metadata?.lastname].filter(Boolean).join(" ") || "Connected"
                : undefined}
            />
          </div>
        </section>

        {/* ── Strava Journey ── */}
        {stravaIntegration && (
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest mb-1">My Strava Journey</h2>
                <p className="text-xl font-bold text-text-primary">
                  {[stravaIntegration.metadata?.firstname, stravaIntegration.metadata?.lastname].filter(Boolean).join(" ")}
                </p>
                {stravaIntegration.metadata?.username && (
                  <p className="text-xs text-text-tertiary">@{stravaIntegration.metadata.username as string}</p>
                )}
              </div>
              <button
                onClick={handleSyncStrava}
                disabled={syncingStrava}
                className="flex items-center gap-2 text-xs font-medium text-[#FC4C02] border border-[#FC4C02]/30 bg-[#FC4C02]/5 hover:bg-[#FC4C02]/10 rounded-xl px-4 py-2 transition-colors disabled:opacity-50"
              >
                <ArrowsClockwise size={14} className={syncingStrava ? "animate-spin" : ""} />
                {syncingStrava ? "Syncing..." : "Sync Activities"}
              </button>
            </div>

            {/* Stats summary */}
            {activities.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: "Activities", value: String(activities.length), icon: <Lightning size={16} weight="bold" />, color: "#FC4C02" },
                  { label: "Total Distance", value: formatDistance(totalDistance), icon: <PersonSimpleRun size={16} weight="bold" />, color: "#3B82F6" },
                  { label: "Total Time", value: formatDuration(totalTime), icon: <Timer size={16} weight="bold" />, color: "#8B5CF6" },
                  { label: "Elevation", value: `${Math.round(totalElevation)} m`, icon: <ArrowUp size={16} weight="bold" />, color: "#10B981" },
                  { label: "Total Kudos", value: String(totalKudos), icon: <Trophy size={16} weight="bold" />, color: "#F59E0B" },
                ].map(s => (
                  <div key={s.label} className="rounded-xl border border-border-secondary bg-background-secondary p-4">
                    <div className="flex items-center gap-2 mb-2" style={{ color: s.color }}>
                      {s.icon}
                      <span className="text-[10px] font-bold uppercase tracking-wide text-text-tertiary">{s.label}</span>
                    </div>
                    <p className="text-xl font-bold text-text-primary">{s.value}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Sport filter */}
            {sportTypes.length > 2 && (
              <div className="flex flex-wrap gap-2">
                {sportTypes.map(t => (
                  <button
                    key={t}
                    onClick={() => setSportFilter(t)}
                    className="text-xs font-medium px-3 py-1.5 rounded-full border transition-colors capitalize"
                    style={sportFilter === t ? {
                      backgroundColor: (t === "all" ? "#FC4C02" : sportColor(t)) + "20",
                      color: t === "all" ? "#FC4C02" : sportColor(t),
                      borderColor: (t === "all" ? "#FC4C02" : sportColor(t)) + "40",
                    } : {
                      borderColor: "var(--border-secondary)",
                      color: "var(--text-tertiary)",
                    }}
                  >
                    {t === "all" ? "All" : t}
                  </button>
                ))}
              </div>
            )}

            {/* Activities grid */}
            {loadingActivities ? (
              <div className="flex items-center justify-center py-20 text-text-tertiary text-sm">
                Loading activities...
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
                <PersonSimpleRun size={32} className="text-text-tertiary" weight="light" />
                <p className="text-sm text-text-tertiary">No activities yet. Click Sync to fetch from Strava.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtered.map(activity => (
                  <ActivityCard key={activity.id} activity={activity} />
                ))}
              </div>
            )}
          </section>
        )}

        {/* ── Not connected prompt ── */}
        {!stravaIntegration && (
          <div className="flex flex-col items-center justify-center py-16 gap-4 text-center border border-dashed border-[#FC4C02]/20 rounded-2xl bg-[#FC4C02]/5">
            <div className="w-14 h-14 rounded-2xl bg-[#FC4C02]/10 flex items-center justify-center">
              <PersonSimpleRun size={28} weight="bold" className="text-[#FC4C02]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-text-primary">Connect Strava to see your journey</p>
              <p className="text-xs text-text-tertiary mt-1">Runs, rides, swims and all your activities in one place</p>
            </div>
            <button
              onClick={() => userId && integrationsService.initiateStravaAuth(userId)}
              className="flex items-center gap-2 text-sm font-semibold text-[#FC4C02] bg-[#FC4C02]/10 border border-[#FC4C02]/30 hover:bg-[#FC4C02]/20 transition-colors px-5 py-2.5 rounded-xl"
            >
              <Plus size={15} />
              Connect Strava
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
