"use client";

import { useEffect, useState, useMemo } from "react";
import {
  SparkleIcon, ArrowRightIcon, ArrowSquareOutIcon, AppWindowIcon, ArrowClockwiseIcon,
} from "@phosphor-icons/react";
import Link from "next/link";
import { supabase } from "@/services/supabase";
import { API_URL } from "@/services/apiConfig";
import { screensService, Screen, ScreenWidget } from "@/services/screens.service";
import { spacesService, Space } from "@/services/spaces.service";
import { hubsService, Hub } from "@/services/hubs.service";
import { WidgetCard } from "@/components/screens/WidgetCard";
import { ManageScreensOrderModal } from "@/components/screens/ManageScreensOrderModal";
import { ArrowsDownUp } from "@phosphor-icons/react";
import { useUserProfile } from "@/contexts/UserProfileContext";

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

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { assistantName, profile } = useUserProfile();
  const [userId,           setUserId]           = useState<string | null>(null);
  const [user,             setUser]             = useState<Record<string, unknown> | null>(null);
  const [loading,          setLoading]          = useState(true);
  const [dailyInsight,     setDailyInsight]     = useState("");
  const [insightLoading,   setInsightLoading]   = useState(true);
  const [insightRefreshing, setInsightRefreshing] = useState(false);

  // Screens
  const [screens,          setScreens]          = useState<Screen[]>([]);
  const [selectedScreenId, setSelectedScreenId] = useState<string | null>(null);
  const [screenWidgets,    setScreenWidgets]    = useState<ScreenWidget[]>([]);
  const [widgetsLoading,   setWidgetsLoading]   = useState(false);
  const [orderModalOpen,   setOrderModalOpen]   = useState(false);

  // Hub / space maps for WidgetCard context
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [hubs,   setHubs]   = useState<Hub[]>([]);

  const hubMap   = useMemo(() => Object.fromEntries(hubs.map(h  => [h.id,  h])),  [hubs]);
  const spaceMap = useMemo(() => Object.fromEntries(spaces.map(s => [s.id, s])),  [spaces]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUser(data.user as unknown as Record<string, unknown>);
        setUserId(data.user.id);
        loadData(data.user.id);
      } else {
        setLoading(false);
        setInsightLoading(false);
      }
    });
  }, []);

  // Load widgets whenever selected screen changes
  useEffect(() => {
    if (!selectedScreenId) { setScreenWidgets([]); return; }
    setWidgetsLoading(true);
    screensService.getWidgets(selectedScreenId)
      .then(setScreenWidgets)
      .catch(() => setScreenWidgets([]))
      .finally(() => setWidgetsLoading(false));
  }, [selectedScreenId]);

  const fetchInsight = async (uid: string, force = false): Promise<string> => {
    const today    = new Date().toISOString().split("T")[0];
    const cacheKey = `aly_insight_${uid}_${today}`;
    if (!force) {
      const cached = localStorage.getItem(cacheKey);
      if (cached) return cached;
    }
    const res     = await fetch(`${API_URL}/aly/daily-insight?user_id=${uid}`).then(r => r.json()).catch(() => ({}));
    const insight = (res as Record<string, string>)?.insight ?? "";
    if (insight) localStorage.setItem(cacheKey, insight);
    return insight;
  };

  const refreshInsight = async () => {
    if (!userId || insightRefreshing) return;
    setInsightRefreshing(true);
    const insight = await fetchInsight(userId, true);
    if (insight) setDailyInsight(insight);
    setInsightRefreshing(false);
  };

  const loadData = async (uid: string) => {
    try {
      // Fetch insight + screens + spaces in parallel
      const [insight, screensData, spacesData] = await Promise.all([
        fetchInsight(uid),
        screensService.getUserScreens(uid).catch(() => [] as Screen[]),
        spacesService.getSpaces(uid).catch(() => [] as Space[]),
      ]);

      if (insight) {
        setDailyInsight(insight);
      }

      const loadedScreens = screensData.slice(0, 10);
      setScreens(loadedScreens);
      if (loadedScreens.length > 0) {
        const homeId = profile?.home_screen_id;
        const pinned = homeId && loadedScreens.find(s => s.id === homeId);
        setSelectedScreenId(pinned ? homeId : loadedScreens[0].id);
      }

      setSpaces(spacesData);

      // Load all hubs across all spaces for widget context
      if (spacesData.length > 0) {
        const hubLists = await Promise.all(spacesData.map((s: Space) => hubsService.getHubsBySpace(s.id)));
        setHubs(hubLists.flat());
      }
    } catch (e) {
      console.warn("Dashboard loadData error:", e);
    } finally {
      setLoading(false);
      setInsightLoading(false);
    }
  };

  const meta        = user?.user_metadata as Record<string, string> | undefined;
  const email       = user?.email as string | undefined;
  const displayName = meta?.full_name?.split(" ")[0] || email?.split("@")[0] || "there";

  const tile = "bg-background-secondary border border-border-primary rounded-2xl p-5";

  return (
    <>
      <main className="min-h-screen p-6 lg:p-10 max-w-5xl mx-auto flex flex-col gap-5">

        {/* ── Greeting header ───────────────────────────────────────────────── */}
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-text-tertiary">{formatDate()}</p>
          <h1 className="text-2xl font-bold text-text-primary mt-1">
            {getGreeting()}{!loading && `, ${displayName}`}
          </h1>
        </div>
        <Link
          href="/chat"
          className="shrink-0 flex items-center gap-2 bg-modules-aly/10 border border-modules-aly/20 text-modules-aly px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-modules-aly/20 transition-all"
        >
          <SparkleIcon size={15} weight="fill" />
          Ask {assistantName}
        </Link>
      </header>

      {/* ── Aly's Insights ────────────────────────────────────────────────── */}
      <section className={`${tile} relative overflow-hidden`}>
        <div className="absolute inset-0 bg-linear-to-br from-modules-aly/8 to-transparent rounded-2xl pointer-events-none" />
        <div className="relative flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <SparkleIcon size={14} color="var(--modules-aly)" weight="fill" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-modules-aly">{assistantName}&apos;s Insights</span>
            </div>
            <button
              onClick={refreshInsight}
              disabled={insightRefreshing || insightLoading}
              className="p-1 rounded-md text-text-tertiary hover:text-modules-aly hover:bg-modules-aly/10 transition-all disabled:opacity-40"
              title="Refresh insight"
            >
              <ArrowClockwiseIcon size={13} className={insightRefreshing ? "animate-spin" : ""} />
            </button>
          </div>
          {insightLoading ? (
            <div className="space-y-2">
              <div className="h-4 w-3/4 bg-background-tertiary rounded animate-pulse" />
              <div className="h-4 w-1/2 bg-background-tertiary rounded animate-pulse" />
            </div>
          ) : dailyInsight ? (
            <p className="text-sm text-text-secondary leading-relaxed">{dailyInsight}</p>
          ) : (
            <p className="text-sm text-text-tertiary italic">
              No insights yet — chat with {assistantName} to get started.
            </p>
          )}
          <Link
            href="/chat"
            className="self-start flex items-center gap-1.5 text-xs font-semibold text-modules-aly hover:opacity-80 transition-opacity mt-1"
          >
            Chat with {assistantName} <ArrowRightIcon size={11} />
          </Link>
        </div>
      </section>

      {/* ── My Screens ────────────────────────────────────────────────────── */}
      {!loading && screens.length > 0 && (
        <section className={`${tile} flex flex-col gap-4`}>

          {/* Header */}
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-text-tertiary">
              <AppWindowIcon size={11} weight="bold" /> My Screens
            </span>
            <div className="flex items-center gap-3">
              {screens.length > 1 && (
                <button
                  onClick={() => setOrderModalOpen(true)}
                  className="flex items-center gap-1 text-[10px] font-semibold text-text-tertiary hover:text-modules-aly hover:underline"
                >
                  Rearrange <ArrowsDownUp size={10} />
                </button>
              )}
              {selectedScreenId && (
                <Link
                  href={`/screens/${selectedScreenId}`}
                  className="flex items-center gap-1 text-[10px] font-semibold text-modules-aly hover:underline"
                >
                   Edit screen <ArrowSquareOutIcon size={10} />
                </Link>
              )}
              <Link href="/screens" className="text-[10px] font-semibold text-text-tertiary hover:text-text-secondary hover:underline">
                Manage all
              </Link>
            </div>
          </div>

          {/* Screen tabs */}
          <div className="flex gap-2 flex-wrap">
            {screens.map(s => (
              <button
                key={s.id}
                onClick={() => setSelectedScreenId(s.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                  selectedScreenId === s.id
                    ? "bg-modules-aly/10 border-modules-aly/30 text-modules-aly"
                    : "bg-background-tertiary border-border-primary text-text-secondary hover:border-modules-aly/20 hover:text-text-primary"
                }`}
              >
                {s.name}
              </button>
            ))}
          </div>

          {/* Selected screen widget grid */}
          {selectedScreenId && (
            <div className="border-t border-border-primary pt-4">
              {widgetsLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-40 bg-background-tertiary rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : screenWidgets.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-10 text-center">
                  <AppWindowIcon size={32} className="text-text-tertiary/20" weight="duotone" />
                  <p className="text-sm text-text-tertiary">This screen has no widgets yet.</p>
                  <Link
                    href={`/screens/${selectedScreenId}`}
                    className="text-xs font-bold text-modules-aly hover:underline flex items-center gap-1"
                  >
                    Design it in the editor <ArrowRightIcon size={11} />
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-4">
                  {[...screenWidgets]
                    .sort((a, b) => a.position - b.position)
                    .map(w => {
                      const colSpan = Math.min(3, Math.max(1, Number(w.config?.colSpan ?? 1))) as 1 | 2 | 3;
                      const colClass = { 1: 'col-span-1', 2: 'col-span-2', 3: 'col-span-3' }[colSpan];
                      const hub   = w.hub_id ? hubMap[w.hub_id]    : undefined;
                      const space = hub?.space_id ? spaceMap[hub.space_id] : undefined;
                      return (
                        <div key={w.id} className={colClass}>
                          <WidgetCard
                            widget={w}
                            hubName={hub?.name}
                            spaceName={space?.name}
                            userId={userId ?? undefined}
                          />
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          )}

        </section>
      )}

      {/* ── Empty state: no screens yet ──────────────────────────────────── */}
      {!loading && screens.length === 0 && (
        <section className={`${tile} flex flex-col items-center gap-4 py-10 text-center`}>
          <AppWindowIcon size={36} className="text-text-tertiary/20" weight="duotone" />
          <div>
            <p className="text-sm font-semibold text-text-primary">No screens yet</p>
            <p className="text-xs text-text-tertiary mt-1">
              Create a screen and add widgets from your hubs to build your personalized dashboard.
            </p>
          </div>
          <Link
            href="/screens"
            className="flex items-center gap-2 bg-modules-aly/10 border border-modules-aly/20 text-modules-aly px-5 py-2.5 rounded-xl text-xs font-bold hover:bg-modules-aly/20 transition-all"
          >
            Create a screen
          </Link>
        </section>
      )}

    </main>
      <ManageScreensOrderModal
        isOpen={orderModalOpen}
        onClose={() => setOrderModalOpen(false)}
        screens={screens}
        onOrderSaved={(updatedList) => {
          setScreens(updatedList);
          // If selected screen was in the list, could optionally force it to top, but retaining currently selected is fine.
        }}
      />
    </>
  );
}
