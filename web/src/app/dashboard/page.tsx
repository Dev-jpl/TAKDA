"use client";

import React, { useEffect, useState } from "react";
import {
  Sparkle, ListChecks, CalendarBlank, Tray,
  CheckCircle, Lightning, Fire, ArrowRight,
  ArrowSquareOut, PersonSimpleRun, Clock,
} from "@phosphor-icons/react";
import Link from "next/link";
import { supabase } from "@/services/supabase";
import { API_URL } from "@/services/apiConfig";

// ── Helpers ───────────────────────────────────────────────────────────────────
function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function formatDate() {
  return new Date().toLocaleDateString("en-PH", {
    weekday: "long", month: "long", day: "numeric",
  });
}

function timeAgo(dateStr: string) {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function timeUntil(dateStr: string) {
  if (!dateStr) return "";
  const diff = new Date(dateStr).getTime() - Date.now();
  if (diff <= 0) return "now";
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `in ${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `in ${hrs}h`;
  return `in ${Math.floor(hrs / 24)}d`;
}

function isToday(dateStr: string) {
  if (!dateStr) return false;
  return new Date(dateStr).toDateString() === new Date().toDateString();
}

function getContextualPrompt(overdueTasks: number, vaultCount: number, nextUp: Record<string,string> | null) {
  if (overdueTasks > 0) return `${overdueTasks} task${overdueTasks > 1 ? "s" : ""} overdue — help prioritize?`;
  if (nextUp?.type === "event") return `Prep for "${nextUp.title}"?`;
  if (vaultCount > 0) return `Sort your ${vaultCount} capture${vaultCount > 1 ? "s" : ""}?`;
  return "Ask Aly anything";
}

// ── Type config ───────────────────────────────────────────────────────────────
interface TypeConfig { label: string; color: string; Icon: React.ElementType }
const TYPE_CONFIG: Record<string, TypeConfig> = {
  task:   { label: "Task",      color: "#F59E0B", Icon: ListChecks },
  done:   { label: "Completed", color: "#22C55E", Icon: CheckCircle },
  vault:  { label: "Captured",  color: "#3B82F6", Icon: Tray },
  event:  { label: "Event",     color: "#8B5CF6", Icon: CalendarBlank },
  strava: { label: "Activity",  color: "#FC4C02", Icon: PersonSimpleRun },
};

interface TimelineEntry {
  type: string; id: string; title: string; status?: string;
  priority?: string; subtitle?: string; ts: string;
}

// ── TimelineItem ──────────────────────────────────────────────────────────────
function TimelineItem({ item, onComplete, onNavigate }: {
  item: TimelineEntry;
  onComplete?: (id: string) => void;
  onNavigate?: () => void;
}) {
  const key = item.type === "task" && item.status === "done" ? "done" : item.type;
  const { label, color, Icon } = TYPE_CONFIG[key] || TYPE_CONFIG.task;
  const isDone = key === "done";
  const isActiveTask = item.type === "task" && !isDone;
  const [completing, setCompleting] = useState(false);

  const handleComplete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setCompleting(true);
    await onComplete?.(item.id);
  };

  return (
    <div className="flex gap-3 group cursor-pointer" onClick={onNavigate}>
      <div className="flex flex-col items-center w-7 shrink-0">
        <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: color + "25" }}>
          <Icon size={13} color={color} weight={isDone ? "fill" : "regular"} />
        </div>
        <div className="flex-1 w-px bg-border-primary mt-1" />
      </div>
      <div className="flex-1 pb-4 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color }}>{label}</span>
          <span className="text-[10px] text-text-tertiary shrink-0">{timeAgo(item.ts)}</span>
        </div>
        <p className="text-sm font-medium text-text-primary mt-0.5 truncate">{item.title}</p>
        {item.subtitle && <p className="text-xs text-text-tertiary truncate">{item.subtitle}</p>}
        {item.priority && isActiveTask && (
          <span className="inline-block text-[9px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-md mt-1"
            style={{
              backgroundColor: item.priority === "urgent" ? "#EF444425" : item.priority === "high" ? "#F9731625" : "#ffffff10",
              color: item.priority === "urgent" ? "#EF4444" : item.priority === "high" ? "#F97316" : "#606060",
            }}>
            {item.priority}
          </span>
        )}
      </div>
      {isActiveTask && (
        <button onClick={handleComplete} className="shrink-0 self-start mt-1 opacity-30 group-hover:opacity-100 transition-opacity" title="Mark done">
          <CheckCircle size={20} color={completing ? "#22C55E" : "#606060"} weight={completing ? "fill" : "regular"} />
        </button>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [user, setUser] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [vaultCount, setVaultCount] = useState(0);
  const [activeTaskCount, setActiveTaskCount] = useState(0);
  const [overdueCount, setOverdueCount] = useState(0);
  const [todayEventCount, setTodayEventCount] = useState(0);
  const [weekDoneCount, setWeekDoneCount] = useState(0);
  const [dailyInsight, setDailyInsight] = useState("");
  const [nextUp, setNextUp] = useState<Record<string, string> | null>(null);
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUser(data.user as unknown as Record<string, unknown>);
        loadData(data.user.id);
      } else {
        setLoading(false);
      }
    });
  }, []);

  const loadData = async (userId: string) => {
    const now = new Date();
    const nowIso = now.toISOString();
    const lookback12h = new Date(now.getTime() - 12 * 60 * 60 * 1000).toISOString();
    const todayEnd = new Date(now); todayEnd.setHours(23, 59, 59, 999);
    const weekStart = new Date(now); weekStart.setDate(now.getDate() - 7);

    try {
      const [
        insightRes,
        { data: vaultItems },
        { data: eventsToday },
        { data: allTasks },
        { data: weekDone },
        { data: nextEvents },
        { data: recentVault },
        { data: recentEvents },
        { data: stravaRes },
      ] = await Promise.all([
        fetch(`${API_URL}/aly/daily-insight?user_id=${userId}`).then(r => r.json()).catch(() => ({})),
        supabase.from("vault_items").select("id").eq("user_id", userId).eq("status", "unprocessed"),
        supabase.from("events").select("id").eq("user_id", userId).gte("start_at", lookback12h).lte("start_at", todayEnd.toISOString()),
        supabase.from("tasks").select("id,title,status,priority,due_date,created_at,updated_at").eq("user_id", userId).order("updated_at", { ascending: false }).limit(20),
        supabase.from("tasks").select("id").eq("user_id", userId).eq("status", "done").gte("updated_at", weekStart.toISOString()),
        supabase.from("events").select("id,title,start_at,location").eq("user_id", userId).gte("start_at", nowIso).order("start_at", { ascending: true }).limit(1),
        supabase.from("vault_items").select("id,content,created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(3),
        supabase.from("events").select("id,title,start_at,location").eq("user_id", userId).gte("start_at", lookback12h).lte("start_at", todayEnd.toISOString()).order("start_at", { ascending: false }).limit(3),
        supabase.from("strava_activities").select("id,name,sport_type,distance_meters,moving_time_seconds,start_date").eq("user_id", userId).order("start_date", { ascending: false }).limit(2),
      ]);

      if ((insightRes as Record<string, string>)?.insight) setDailyInsight((insightRes as Record<string, string>).insight);
      setVaultCount((vaultItems || []).length);
      setTodayEventCount((eventsToday || []).length);
      setWeekDoneCount((weekDone || []).length);

      const tasks = (allTasks || []) as Record<string, string>[];
      const active = tasks.filter(t => t.status !== "done");
      const overdue = active.filter(t => t.due_date && new Date(t.due_date) < now);
      setActiveTaskCount(active.length);
      setOverdueCount(overdue.length);

      const nextEvent = (nextEvents || [])[0] as Record<string, string> | undefined;
      const nextTask = active.filter(t => t.due_date).sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())[0];
      let nextUpItem: Record<string, string> | null = null;
      if (nextEvent && nextTask) {
        nextUpItem = new Date(nextEvent.start_at) < new Date(nextTask.due_date)
          ? { type: "event", id: nextEvent.id, title: nextEvent.title, subtitle: nextEvent.location || "", ts: nextEvent.start_at }
          : { type: "task",  id: nextTask.id,  title: nextTask.title,  subtitle: `Due ${nextTask.due_date}`, ts: nextTask.due_date };
      } else if (nextEvent) {
        nextUpItem = { type: "event", id: nextEvent.id, title: nextEvent.title, subtitle: nextEvent.location || "", ts: nextEvent.start_at };
      } else if (nextTask) {
        nextUpItem = { type: "task", id: nextTask.id, title: nextTask.title, subtitle: `Due ${nextTask.due_date}`, ts: nextTask.due_date };
      }
      setNextUp(nextUpItem);

      const todayTasks: TimelineEntry[] = tasks
        .filter(t => isToday(t.updated_at || t.created_at))
        .map(t => ({ type: "task", id: t.id, title: t.title, status: t.status, priority: t.priority, ts: t.updated_at || t.created_at }));
      const todayVault: TimelineEntry[] = ((recentVault || []) as Record<string, string>[])
        .filter(v => isToday(v.created_at))
        .map(v => ({ type: "vault", id: v.id, title: (v.content || "").slice(0, 80) || "Vault item", ts: v.created_at }));
      const todayEvents: TimelineEntry[] = ((recentEvents || []) as Record<string, string>[])
        .map(e => ({ type: "event", id: e.id, title: e.title, subtitle: e.location || "", ts: e.start_at }));
      const todayStrava: TimelineEntry[] = ((stravaRes || []) as Record<string, string | number>[])
        .filter(s => isToday(s.start_date as string))
        .map(s => {
          const km = s.distance_meters ? (Number(s.distance_meters) / 1000).toFixed(1) : null;
          const mins = s.moving_time_seconds ? Math.round(Number(s.moving_time_seconds) / 60) : null;
          return { type: "strava", id: s.id as string, title: (s.name || s.sport_type || "Activity") as string, subtitle: [km && `${km} km`, mins && `${mins} min`].filter(Boolean).join(" · "), ts: s.start_date as string };
        });

      const merged = [...todayTasks, ...todayVault, ...todayEvents, ...todayStrava]
        .sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime())
        .slice(0, 5);
      setTimeline(merged);
    } catch (e) {
      console.warn("Dashboard loadData error:", e);
    } finally {
      setLoading(false);
    }
  };

  const completeTask = async (taskId: string) => {
    setTimeline(prev => prev.map(t => t.id === taskId ? { ...t, status: "done" } : t));
    setActiveTaskCount(c => Math.max(0, c - 1));
    setWeekDoneCount(c => c + 1);
    await supabase.from("tasks").update({ status: "done", updated_at: new Date().toISOString() }).eq("id", taskId);
  };

  const meta = user?.user_metadata as Record<string, string> | undefined;
  const email = user?.email as string | undefined;
  const displayName = meta?.full_name?.split(" ")[0] || email?.split("@")[0] || "there";
  const contextualPrompt = getContextualPrompt(overdueCount, vaultCount, nextUp);

  return (
    <main className="min-h-screen p-6 lg:p-10 max-w-6xl mx-auto">

      {/* ── HEADER ────────────────────────────────────────────────── */}
      <header className="flex items-start justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">{getGreeting()}, {displayName}</h1>
          <p className="text-text-tertiary text-sm mt-1">{formatDate()}</p>
        </div>
        <Link href="/chat" className="shrink-0 flex items-center gap-2 bg-modules-aly/10 border border-modules-aly/20 text-modules-aly px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-modules-aly/20 transition-all">
          <Sparkle size={16} weight="fill" />
          Ask Aly
        </Link>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* ── LEFT COLUMN ───────────────────────────────────────── */}
        <div className="xl:col-span-2 flex flex-col gap-5">

          {/* Status Card */}
          <section className="bg-background-secondary border border-border-primary rounded-2xl p-6 flex flex-col gap-5">
            <div className="flex flex-wrap gap-3">
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl border" style={{ backgroundColor: "#F59E0B20", borderColor: "#F59E0B50" }}>
                <ListChecks size={14} color="#F59E0B" weight="bold" />
                <span className="text-base font-extrabold" style={{ color: "#F59E0B" }}>{loading ? "—" : activeTaskCount}</span>
                <span className="text-xs font-medium" style={{ color: "#F59E0BAA" }}>active</span>
              </div>
              {todayEventCount > 0 && (
                <Link href="/calendar" className="flex items-center gap-2 px-3 py-2 rounded-xl border hover:opacity-80 transition-opacity" style={{ backgroundColor: "#8B5CF620", borderColor: "#8B5CF650" }}>
                  <CalendarBlank size={14} color="#8B5CF6" weight="bold" />
                  <span className="text-base font-extrabold" style={{ color: "#8B5CF6" }}>{todayEventCount}</span>
                  <span className="text-xs font-medium" style={{ color: "#8B5CF6AA" }}>today</span>
                </Link>
              )}
              {vaultCount > 0 && (
                <Link href="/vault" className="flex items-center gap-2 px-3 py-2 rounded-xl border hover:opacity-80 transition-opacity" style={{ backgroundColor: "#3B82F620", borderColor: "#3B82F650" }}>
                  <Tray size={14} color="#3B82F6" weight="bold" />
                  <span className="text-base font-extrabold" style={{ color: "#3B82F6" }}>{vaultCount}</span>
                  <span className="text-xs font-medium" style={{ color: "#3B82F6AA" }}>to sort</span>
                </Link>
              )}
            </div>

            {dailyInsight && (
              <div className="border-t border-border-primary pt-4">
                <div className="flex items-center gap-1.5 mb-2">
                  <Lightning size={11} color="var(--modules-aly)" weight="fill" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-modules-aly">Aly&apos;s take</span>
                </div>
                <p className="text-sm text-text-secondary leading-relaxed">{dailyInsight}</p>
              </div>
            )}
          </section>

          {/* Next Up */}
          {nextUp && (
            <Link
              href={nextUp.type === "event" ? "/calendar" : "#"}
              className="flex items-center gap-4 bg-background-secondary border rounded-xl p-4 hover:opacity-80 transition-opacity"
              style={{ borderColor: (nextUp.type === "event" ? "#8B5CF6" : "#F59E0B") + "40" }}
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ backgroundColor: (nextUp.type === "event" ? "#8B5CF6" : "#F59E0B") + "20" }}>
                {nextUp.type === "event"
                  ? <CalendarBlank size={18} color="#8B5CF6" weight="duotone" />
                  : <ListChecks size={18} color="#F59E0B" weight="duotone" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[9px] font-extrabold uppercase tracking-widest text-text-tertiary">Next Up</p>
                <p className="text-sm font-semibold text-text-primary truncate mt-0.5">{nextUp.title}</p>
                {nextUp.subtitle && <p className="text-xs text-text-tertiary truncate">{nextUp.subtitle}</p>}
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-sm font-bold" style={{ color: nextUp.type === "event" ? "#8B5CF6" : "#F59E0B" }}>
                  {timeUntil(nextUp.ts)}
                </span>
                <ArrowSquareOut size={13} color="#606060" />
              </div>
            </Link>
          )}

          {/* Contextual Aly CTA */}
          <Link href="/chat" className="flex items-center gap-3 bg-modules-aly/10 border border-modules-aly/20 rounded-xl px-5 py-4 hover:bg-modules-aly/20 transition-all group">
            <Sparkle size={18} color="var(--modules-aly)" weight="fill" />
            <span className="flex-1 text-sm font-semibold text-modules-aly">{contextualPrompt}</span>
            <ArrowRight size={15} color="var(--modules-aly)" className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {/* ── RIGHT COLUMN: Timeline ────────────────────────────── */}
        <aside className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-widest text-text-tertiary flex items-center gap-1.5">
              <Clock size={11} /> Today&apos;s Activity
            </span>
            {weekDoneCount > 0 && (
              <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full" style={{ backgroundColor: "#F59E0B15", color: "#F59E0B" }}>
                <Fire size={11} weight="fill" />
                {weekDoneCount} done this week
              </span>
            )}
          </div>

          <div className="bg-background-secondary border border-border-primary rounded-2xl p-5">
            {loading ? (
              <div className="flex flex-col gap-3">
                {[1, 2, 3].map(i => <div key={i} className="h-12 bg-background-tertiary rounded-lg animate-pulse" />)}
              </div>
            ) : timeline.length > 0 ? (
              <>
                {timeline.map(item => (
                  <TimelineItem
                    key={`${item.type}-${item.id}`}
                    item={item}
                    onComplete={item.type === "task" ? completeTask : undefined}
                    onNavigate={() => {
                      if (item.type === "vault") window.location.href = "/vault";
                      else if (item.type === "event") window.location.href = "/calendar";
                      else if (item.type === "strava") window.location.href = "/integrations";
                    }}
                  />
                ))}
                <Link href="/history" className="flex items-center justify-center gap-1 pt-3 border-t border-border-primary text-xs text-text-tertiary hover:text-text-secondary transition-colors">
                  View full history <ArrowRight size={11} />
                </Link>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 gap-3 text-center">
                <Sparkle size={24} color="var(--modules-aly)" weight="fill" className="opacity-40" />
                <p className="text-sm text-text-tertiary">No activity yet today.<br />Start by asking Aly something.</p>
              </div>
            )}
          </div>
        </aside>
      </div>
    </main>
  );
}
