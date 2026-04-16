"use client";

import React, { useEffect, useState, useMemo } from "react";
import {
  ListChecks, CheckCircle, Tray, CalendarBlank, PersonSimpleRun,
  ArrowRight, FunnelSimple, Clock, CalendarDots, X,
} from "@phosphor-icons/react";
import Link from "next/link";
import { supabase } from "@/services/supabase";

// ── Types ─────────────────────────────────────────────────────────────────────
interface HistoryEntry {
  type: string;
  id: string;
  title: string;
  status?: string;
  priority?: string;
  subtitle?: string;
  ts: string;
}

interface TypeConfig {
  label: string;
  color: string;
  Icon: React.ElementType;
  nav: string;
}

const TYPE_CONFIG: Record<string, TypeConfig> = {
  task:   { label: "Task",      color: "#F59E0B", Icon: ListChecks,      nav: "" },
  done:   { label: "Completed", color: "#22C55E", Icon: CheckCircle,     nav: "" },
  vault:  { label: "Captured",  color: "#3B82F6", Icon: Tray,            nav: "/vault" },
  event:  { label: "Event",     color: "#8B5CF6", Icon: CalendarBlank,   nav: "/calendar" },
  strava: { label: "Activity",  color: "#FC4C02", Icon: PersonSimpleRun, nav: "/integrations" },
};

const FILTERS = ["all", "task", "vault", "event", "strava"] as const;
type Filter = (typeof FILTERS)[number];

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatGroupLabel(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return d.toLocaleDateString("en-PH", { weekday: "long" });
  return d.toLocaleDateString("en-PH", { month: "long", day: "numeric" });
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function groupByDate(entries: HistoryEntry[]): [string, HistoryEntry[]][] {
  const map = new Map<string, HistoryEntry[]>();
  for (const e of entries) {
    const key = new Date(e.ts).toDateString();
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(e);
  }
  return Array.from(map.entries());
}

function toLocalDateStr(d: Date): string {
  return d.toISOString().split("T")[0];
}

// ── Row ───────────────────────────────────────────────────────────────────────
function HistoryRow({ item, onComplete }: { item: HistoryEntry; onComplete?: (id: string) => void }) {
  const key = item.type === "task" && item.status === "done" ? "done" : item.type;
  const { label, color, Icon, nav } = TYPE_CONFIG[key] || TYPE_CONFIG.task;
  const isDone = key === "done";
  const isActiveTask = item.type === "task" && !isDone;
  const [completing, setCompleting] = useState(false);

  const handleComplete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setCompleting(true);
    await onComplete?.(item.id);
  };

  const inner = (
    <div className="flex items-start gap-4 p-4 rounded-xl bg-background-secondary border border-border-primary hover:border-border-secondary transition-all group cursor-pointer">
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
        style={{ backgroundColor: color + "20" }}
      >
        <Icon size={16} color={color} weight={isDone ? "fill" : "regular"} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color }}>
            {label}
          </span>
          <span className="text-[10px] text-text-tertiary">{timeAgo(item.ts)}</span>
        </div>
        <p className="text-sm font-medium text-text-primary truncate">{item.title}</p>
        {item.subtitle && (
          <p className="text-xs text-text-tertiary truncate mt-0.5">{item.subtitle}</p>
        )}
        {item.priority && isActiveTask && (
          <span
            className="inline-block mt-1 text-[9px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-md"
            style={{
              backgroundColor:
                item.priority === "urgent" ? "#EF444425" : item.priority === "high" ? "#F9731625" : "#ffffff10",
              color:
                item.priority === "urgent" ? "#EF4444" : item.priority === "high" ? "#F97316" : "#606060",
            }}
          >
            {item.priority}
          </span>
        )}
      </div>
      {isActiveTask ? (
        <button
          onClick={handleComplete}
          className="shrink-0 opacity-30 group-hover:opacity-100 transition-opacity"
          title="Mark done"
        >
          <CheckCircle
            size={20}
            color={completing ? "#22C55E" : "#606060"}
            weight={completing ? "fill" : "regular"}
          />
        </button>
      ) : nav ? (
        <ArrowRight
          size={14}
          color="#606060"
          className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity mt-1"
        />
      ) : null}
    </div>
  );

  return nav ? <Link href={nav}>{inner}</Link> : <div>{inner}</div>;
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function HistoryPage() {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<Filter>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) loadData(data.user.id);
      else setLoading(false);
    });
  }, []);

  const loadData = async (userId: string) => {
    try {
      const [
        { data: tasks },
        { data: vault },
        { data: events },
        { data: strava },
      ] = await Promise.all([
        supabase
          .from("tasks")
          .select("id,title,status,priority,created_at,updated_at")
          .eq("user_id", userId)
          .order("updated_at", { ascending: false })
          .limit(100),
        supabase
          .from("vault_items")
          .select("id,content,created_at")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(50),
        supabase
          .from("events")
          .select("id,title,start_at,location")
          .eq("user_id", userId)
          .order("start_at", { ascending: false })
          .limit(50),
        supabase
          .from("strava_activities")
          .select("id,name,sport_type,distance_meters,moving_time_seconds,start_date")
          .eq("user_id", userId)
          .order("start_date", { ascending: false })
          .limit(30),
      ]);

      const merged: HistoryEntry[] = [
        ...((tasks || []) as Record<string, string>[]).map((t) => ({
          type: "task",
          id: t.id,
          title: t.title,
          status: t.status,
          priority: t.priority,
          ts: t.updated_at || t.created_at,
        })),
        ...((vault || []) as Record<string, string>[]).map((v) => ({
          type: "vault",
          id: v.id,
          title: (v.content || "").slice(0, 100) || "Vault item",
          ts: v.created_at,
        })),
        ...((events || []) as Record<string, string>[]).map((e) => ({
          type: "event",
          id: e.id,
          title: e.title,
          subtitle: e.location || "",
          ts: e.start_at,
        })),
        ...((strava || []) as Record<string, string | number>[]).map((s) => {
          const km = s.distance_meters ? (Number(s.distance_meters) / 1000).toFixed(1) : null;
          const mins = s.moving_time_seconds ? Math.round(Number(s.moving_time_seconds) / 60) : null;
          return {
            type: "strava",
            id: s.id as string,
            title: (s.name || s.sport_type || "Activity") as string,
            subtitle: [km && `${km} km`, mins && `${mins} min`].filter(Boolean).join(" · "),
            ts: s.start_date as string,
          };
        }),
      ].sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime());

      setEntries(merged);

      // Set default date range from the data
      if (merged.length > 0) {
        const oldest = merged[merged.length - 1].ts;
        setDateFrom(toLocalDateStr(new Date(oldest)));
        setDateTo(toLocalDateStr(new Date()));
      }
    } catch (e) {
      console.warn("History loadData error:", e);
    } finally {
      setLoading(false);
    }
  };

  const completeTask = async (taskId: string) => {
    setEntries((prev) =>
      prev.map((e) => (e.id === taskId ? { ...e, status: "done" } : e))
    );
    await supabase
      .from("tasks")
      .update({ status: "done", updated_at: new Date().toISOString() })
      .eq("id", taskId);
  };

  const clearDateRange = () => {
    if (entries.length > 0) {
      const oldest = entries[entries.length - 1].ts;
      setDateFrom(toLocalDateStr(new Date(oldest)));
      setDateTo(toLocalDateStr(new Date()));
    }
  };

  // Filter and date range
  const filtered = useMemo(() => {
    let result = entries;

    // Type filter
    if (activeFilter !== "all") {
      result = result.filter((e) => e.type === activeFilter);
    }

    // Date range filter
    if (dateFrom) {
      const from = new Date(dateFrom);
      from.setHours(0, 0, 0, 0);
      result = result.filter((e) => new Date(e.ts) >= from);
    }
    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      result = result.filter((e) => new Date(e.ts) <= to);
    }

    return result;
  }, [entries, activeFilter, dateFrom, dateTo]);

  const grouped = groupByDate(filtered);

  const hasCustomDateRange = (() => {
    if (entries.length === 0) return false;
    const oldestDefault = toLocalDateStr(new Date(entries[entries.length - 1].ts));
    const todayDefault = toLocalDateStr(new Date());
    return dateFrom !== oldestDefault || dateTo !== todayDefault;
  })();

  return (
    <main className="min-h-screen p-6 lg:p-10 max-w-4xl mx-auto">
      {/* Header */}
      <header className="flex items-start justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Activity History</h1>
          <p className="text-text-tertiary text-sm mt-1 flex items-center gap-1.5">
            <Clock size={12} /> Your full activity across all modules
          </p>
        </div>
        <div className="text-xs text-text-tertiary font-medium tabular-nums">
          {filtered.length} of {entries.length} entries
        </div>
      </header>

      {/* Filters Row */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-8">
        {/* Type Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <FunnelSimple size={14} color="#606060" />
          {FILTERS.map((f) => {
            const cfg = f === "all" ? null : TYPE_CONFIG[f];
            return (
              <button
                key={f}
                onClick={() => setActiveFilter(f)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                  activeFilter === f
                    ? "border-transparent text-white"
                    : "bg-background-secondary border-border-primary text-text-tertiary hover:text-text-primary"
                }`}
                style={activeFilter === f ? { backgroundColor: cfg?.color || "var(--modules-aly)" } : {}}
              >
                {cfg && <cfg.Icon size={12} weight="bold" color={activeFilter === f ? "#fff" : cfg.color} />}
                {f === "all" ? "All" : cfg?.label}
              </button>
            );
          })}
        </div>

        {/* Date Range */}
        <div className="flex items-center gap-2 ml-auto">
          <CalendarDots size={14} color="#606060" />
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="bg-background-secondary border border-border-primary rounded-lg px-2.5 py-1.5 text-xs text-text-primary focus:outline-none focus:border-modules-aly/50 transition-colors [color-scheme:dark]"
          />
          <span className="text-xs text-text-tertiary">to</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="bg-background-secondary border border-border-primary rounded-lg px-2.5 py-1.5 text-xs text-text-primary focus:outline-none focus:border-modules-aly/50 transition-colors [color-scheme:dark]"
          />
          {hasCustomDateRange && (
            <button
              onClick={clearDateRange}
              className="p-1 rounded-lg hover:bg-background-tertiary transition-colors"
              title="Reset date range"
            >
              <X size={12} color="#606060" />
            </button>
          )}
        </div>
      </div>

      {/* Timeline */}
      {loading ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="h-16 bg-background-secondary rounded-xl animate-pulse border border-border-primary"
            />
          ))}
        </div>
      ) : grouped.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
          <Clock size={32} color="#606060" className="opacity-30" />
          <p className="text-text-tertiary text-sm">No activity found for this filter.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {grouped.map(([dateKey, items]) => (
            <section key={dateKey}>
              <h2 className="text-[10px] font-bold uppercase tracking-widest text-text-tertiary mb-3 flex items-center gap-2">
                <span>{formatGroupLabel(items[0].ts)}</span>
                <span className="text-text-tertiary/40">·</span>
                <span className="text-text-tertiary/60">
                  {items.length} item{items.length !== 1 ? "s" : ""}
                </span>
              </h2>
              <div className="flex flex-col gap-2">
                {items.map((item) => (
                  <HistoryRow
                    key={`${item.type}-${item.id}`}
                    item={item}
                    onComplete={item.type === "task" ? completeTask : undefined}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </main>
  );
}
