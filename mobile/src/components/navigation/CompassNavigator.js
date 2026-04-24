/**
 * CompassNavigator.js
 *
 * Hub navigation shell.
 *
 * CORE modules  → fixed screens (Tasks, Notes, Resources, etc.)
 * ADDON modules → rendered dynamically via DynamicModuleScreen.
 *                 Any new module added via the web Module Creator auto-adopts.
 */

import React, { useState, useEffect, useRef } from "react";
import {
  View, Text, Pressable, StyleSheet, Modal,
  ScrollView, TouchableOpacity, ActivityIndicator,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";
import { supabase } from "../../services/supabase";
import { colors } from "../../constants/colors";
import { hubsService } from "../../services/hubs";
import { addonsService } from "../../services/addons";
import { hubStore } from "../../services/hubStore";
import { getDefinitions, getDefBySlug } from "../../services/moduleData";
import Shimmer from "../common/Shimmer";
import {
  Plus, CheckCircle, PencilSimple, Files, PaperPlaneRight, GitBranch,
  Sparkle, X,
} from "phosphor-react-native";

import TrackScreen    from "../../screens/track/TrackScreen";
import AnnotateScreen from "../../screens/annotate/AnnotateScreen";
import KnowledgeScreen from "../../screens/knowledge/KnowledgeScreen";
import DeliverScreen  from "../../screens/deliver/DeliverScreen";
import AutomateScreen from "../../screens/automate/AutomateScreen";
import DynamicModuleScreen from "../modules/DynamicModuleScreen";

// ─── Fixed core module catalog ────────────────────────────────────────────────

const CORE_CATALOG = [
  { key: "track",     label: "Tasks",       shortLabel: "T",  color: colors.modules.track,     Icon: CheckCircle,    screen: TrackScreen },
  { key: "annotate",  label: "Notes",       shortLabel: "A",  color: colors.modules.annotate,  Icon: PencilSimple,   screen: AnnotateScreen },
  { key: "knowledge", label: "Resources",   shortLabel: "K",  color: colors.modules.knowledge, Icon: Files,          screen: KnowledgeScreen },
  { key: "deliver",   label: "Outcomes",    shortLabel: "D",  color: colors.modules.deliver,   Icon: PaperPlaneRight, screen: DeliverScreen },
  { key: "automate",  label: "Automations", shortLabel: "Au", color: "#a78bfa",                Icon: GitBranch,       screen: AutomateScreen },
];

// ─── Compass Dot ──────────────────────────────────────────────────────────────

function CompassDot({ label, active, onPress }) {
  return (
    <Pressable onPress={onPress} style={styles.dotWrap}>
      <View style={[styles.dot, active && styles.dotActive]}>
        <Text style={[styles.dotLabel, active && styles.dotLabelActive]}>{label}</Text>
      </View>
    </Pressable>
  );
}

// ─── Module Picker Sheet ──────────────────────────────────────────────────────

function ModulePickerSheet({ visible, onClose, hubId, userId, enabledModules, installedAddons, addonDefs, onToggleCore, onToggleAddon }) {
  const [loading, setLoading] = useState(null);

  async function handleCoreToggle(mod) {
    const isOn = enabledModules.includes(mod.key);
    setLoading(mod.key);
    try {
      if (isOn) { await hubsService.removeModule(hubId, mod.key); onToggleCore(mod.key, false); }
      else       { await hubsService.addModule(hubId, mod.key);    onToggleCore(mod.key, true);  }
    } catch (e) { console.error(e); }
    finally     { setLoading(null); }
  }

  async function handleAddonToggle(def) {
    const installed = installedAddons.find(a => a.type === def.slug);
    setLoading(def.slug);
    try {
      if (installed) {
        await addonsService.uninstallAddon(installed.id);
        onToggleAddon(def.slug, false, null);
      } else {
        const newAddon = await addonsService.installAddon(hubId, userId, def.slug);
        onToggleAddon(def.slug, true, newAddon);
      }
    } catch (e) { console.error(e); }
    finally     { setLoading(null); }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent presentationStyle="overFullScreen">
      <View style={styles.sheetOuter}>
        <Pressable style={styles.sheetBackdrop} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.sheetHeader}>
            <View>
              <Text style={styles.sheetTitle}>Modules</Text>
              <Text style={styles.sheetSubtitle}>Select tools for this hub</Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <X color={colors.text.tertiary} size={18} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.sheetScroll} showsVerticalScrollIndicator={false}>
            {/* Core modules */}
            <Text style={styles.sheetGroupLabel}>Core</Text>
            {CORE_CATALOG.map(mod => {
              const isOn = enabledModules.includes(mod.key);
              const isLoading = loading === mod.key;
              const { Icon } = mod;
              return (
                <TouchableOpacity key={mod.key} activeOpacity={0.7}
                  style={[styles.modRow, isOn && { borderColor: mod.color + "40", backgroundColor: mod.color + "0d" }]}
                  onPress={() => handleCoreToggle(mod)}>
                  <View style={[styles.modIconWrap, { backgroundColor: mod.color + "15" }]}>
                    <Icon size={15} weight={isOn ? "fill" : "regular"} color={isOn ? mod.color : colors.text.tertiary} />
                  </View>
                  <View style={styles.modInfo}>
                    <Text style={styles.modLabel}>{mod.label}</Text>
                  </View>
                  {isLoading
                    ? <ActivityIndicator size="small" color={colors.text.tertiary} />
                    : <Text style={[styles.modStatus, isOn && { color: mod.color }]}>{isOn ? "On" : "Off"}</Text>
                  }
                </TouchableOpacity>
              );
            })}

            {/* Dynamic addon modules */}
            {addonDefs.length > 0 && (
              <>
                <Text style={[styles.sheetGroupLabel, { marginTop: 20 }]}>Data Tracking</Text>
                {addonDefs.map(def => {
                  const isOn = !!installedAddons.find(a => a.type === def.slug);
                  const isLoading = loading === def.slug;
                  const hex = def.brand_color ?? def.layout?.hex ?? colors.modules.aly;
                  return (
                    <TouchableOpacity key={def.slug} activeOpacity={0.7}
                      style={[styles.modRow, isOn && { borderColor: hex + "40", backgroundColor: hex + "0d" }]}
                      onPress={() => handleAddonToggle(def)}>
                      <View style={[styles.modIconWrap, { backgroundColor: hex + "15" }]}>
                        <Sparkle size={15} weight={isOn ? "fill" : "regular"} color={isOn ? hex : colors.text.tertiary} />
                      </View>
                      <View style={styles.modInfo}>
                        <Text style={styles.modLabel}>{def.name}</Text>
                        {def.description ? <Text style={styles.modDesc} numberOfLines={1}>{def.description}</Text> : null}
                      </View>
                      {isLoading
                        ? <ActivityIndicator size="small" color={colors.text.tertiary} />
                        : <Text style={[styles.modStatus, isOn && { color: hex }]}>{isOn ? "On" : "Off"}</Text>
                      }
                    </TouchableOpacity>
                  );
                })}
              </>
            )}
            <View style={{ height: 32 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ─── Main Navigator ───────────────────────────────────────────────────────────

export default function CompassNavigator({ hub, space }) {
  const [activeModule,    setActiveModule]    = useState(null);
  const [compassOpen,     setCompassOpen]     = useState(false);
  const [hintVisible,     setHintVisible]     = useState(false);
  const [pickerOpen,      setPickerOpen]      = useState(false);
  const [loading,         setLoading]         = useState(true);
  const [userId,          setUserId]          = useState(null);

  // Core module state
  const [enabledModules,  setEnabledModules]  = useState(() =>
    (hub?.hub_modules ?? []).filter(m => m.is_enabled).map(m => m.module)
  );

  // Addon state — full addon rows + their module_definitions
  const [installedAddons, setInstalledAddons] = useState([]);
  const [addonDefs,       setAddonDefs]       = useState([]); // ModuleDefinition[]

  const hideTimerRef   = useRef(null);
  const hintTimerRef   = useRef(null);
  const compassOpacity = useSharedValue(0);

  // ── One-time user fetch ───────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id);
    });
  }, []);

  // ── First-visit compass hint ──────────────────────────────────────────────
  useEffect(() => {
    AsyncStorage.getItem("compass_hint_shown").then(val => {
      if (!val) {
        setHintVisible(true);
        hintTimerRef.current = setTimeout(() => {
          setHintVisible(false);
          AsyncStorage.setItem("compass_hint_shown", "true");
        }, 3000);
      }
    });
    return () => { if (hintTimerRef.current) clearTimeout(hintTimerRef.current); };
  }, []);

  // ── Load hub data whenever hub changes ────────────────────────────────────
  useEffect(() => {
    if (!hub?.id) return;
    setLoading(true);

    async function loadAll() {
      try {
        // Phase 1 — use hub prop data (already fetched by HubsScreen)
        let hubModules  = hub.hub_modules  ?? [];
        let hubAddons   = hub.hub_addons   ?? [];

        // Phase 2 — warm module_definitions cache in the background
        //            (fast Supabase read; result used for addon rendering)
        const allDefs = await getDefinitions();

        // Resolve module keys for core
        const mods = hubModules.filter(m => m.is_enabled).map(m => m.module);
        setEnabledModules(mods);

        // Resolve addon definitions dynamically from module_definitions table
        const resolvedAddonDefs = hubAddons
          .map(addon => allDefs.find(d => d.slug === addon.type))
          .filter(Boolean);

        setInstalledAddons(hubAddons);
        setAddonDefs(resolvedAddonDefs);

        // Persist to store for future cache hits
        hubStore.setHubData(hub.id, { modules: hubModules, addons: hubAddons });

        // Set default active module
        setActiveModule(prev => {
          if (prev) return prev;
          const firstAddon = resolvedAddonDefs[0]?.slug ?? null;
          return mods[0] ?? firstAddon;
        });

        setLoading(false);

        // Phase 3 — background re-fetch if store says stale or props were minimal
        const cached = hubStore.getHubData(hub.id);
        if (cached?.isStale || hubModules.length === 0) {
          const { data: freshHub } = await supabase
            .from("hubs")
            .select("id, hub_modules(*), hub_addons(id, type, config)")
            .eq("id", hub.id)
            .single();
          if (freshHub) {
            const freshMods    = (freshHub.hub_modules || []).filter(m => m.is_enabled).map(m => m.module);
            const freshAddons  = freshHub.hub_addons || [];
            const freshDefs    = freshAddons.map(a => allDefs.find(d => d.slug === a.type)).filter(Boolean);
            setEnabledModules(freshMods);
            setInstalledAddons(freshAddons);
            setAddonDefs(freshDefs);
            hubStore.setHubData(hub.id, { modules: freshHub.hub_modules || [], addons: freshAddons });
          }
        }
      } catch (e) {
        console.warn('CompassNavigator loadAll error:', e);
        setLoading(false);
      }
    }

    loadAll();

    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    compassOpacity.value = 0;
    setCompassOpen(false);
  }, [hub?.id]);

  // ── Nav item lists ────────────────────────────────────────────────────────
  const coreNavItems  = CORE_CATALOG.filter(m => enabledModules.includes(m.key));
  const addonNavItems = addonDefs.map(def => ({
    key:        def.slug,
    label:      def.name,
    shortLabel: def.name.slice(0, 3).toUpperCase(),
    color:      def.brand_color ?? def.layout?.hex ?? colors.modules.aly,
    def,
  }));
  const allNavItems = [...coreNavItems, ...addonNavItems];

  // ── Compass animation ─────────────────────────────────────────────────────
  const compassOverlayStyle = useAnimatedStyle(() => ({ opacity: compassOpacity.value }));
  const showCompass = () => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    setCompassOpen(true);
    compassOpacity.value = withTiming(1, { duration: 180 });
  };
  const hideCompass = () => {
    compassOpacity.value = withTiming(0, { duration: 220 });
    hideTimerRef.current = setTimeout(() => setCompassOpen(false), 220);
  };

  // ── Toggle handlers ───────────────────────────────────────────────────────
  function handleToggleCore(key, enabled) {
    setEnabledModules(prev => enabled ? [...prev, key] : prev.filter(k => k !== key));
    if (!enabled && activeModule === key) {
      setActiveModule(enabledModules.filter(k => k !== key)[0] ?? null);
    }
  }

  function handleToggleAddon(slug, enabled, addonObj) {
    if (enabled) {
      setInstalledAddons(prev => [...prev, addonObj]);
      getDefBySlug(slug).then(def => {
        if (def) {
          setAddonDefs(prev => [...prev, def]);
          setActiveModule(slug);
        }
      });
    } else {
      setInstalledAddons(prev => prev.filter(a => a.type !== slug));
      setAddonDefs(prev => prev.filter(d => d.slug !== slug));
      if (activeModule === slug) {
        setActiveModule(allNavItems.find(i => i.key !== slug)?.key ?? null);
      }
    }
  }

  // ── Loading state ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={styles.container}>
        <Shimmer.Module />
        <Shimmer.BottomNav count={Math.max((hub?.hub_modules?.filter(m => m.is_enabled).length ?? 0) + 1, 2)} />
      </View>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>

      {/* ── Screen stack ── */}
      <View style={styles.screen}>
        {allNavItems.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No modules enabled</Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={() => setPickerOpen(true)}>
              <Plus size={13} color={colors.modules.annotate} weight="bold" />
              <Text style={styles.emptyBtnText}>Add Module</Text>
            </TouchableOpacity>
          </View>
        ) : (
          allNavItems.map(item => {
            const isActive = activeModule === item.key;
            // Core screens
            if (item.screen) {
              return (
                <View key={item.key} style={[StyleSheet.absoluteFill, { display: isActive ? 'flex' : 'none' }]}>
                  <item.screen hub={hub} space={space} />
                </View>
              );
            }
            // Dynamic addon screens
            if (item.def) {
              return (
                <View key={item.key} style={[StyleSheet.absoluteFill, { display: isActive ? 'flex' : 'none' }]}>
                  <DynamicModuleScreen definition={item.def} hub={hub} userId={userId} />
                </View>
              );
            }
            return null;
          })
        )}
      </View>

      {/* ── Compass overlay (core only) ── */}
      {coreNavItems.length > 1 && (
        <Animated.View
          style={[styles.compassOverlay, compassOverlayStyle]}
          pointerEvents={compassOpen ? "box-none" : "none"}>
          <View style={styles.compassHUD}>
            {coreNavItems.map(m => (
              <CompassDot key={m.key} label={m.shortLabel} active={activeModule === m.key}
                onPress={() => { setActiveModule(m.key); hideCompass(); }} />
            ))}
          </View>
        </Animated.View>
      )}

      {/* ── First-visit hint ── */}
      {hintVisible && allNavItems.length > 0 && (
        <View style={styles.hint}>
          <Text style={styles.hintText}>Tap below to switch modules</Text>
        </View>
      )}

      {/* ── Bottom nav bar ── */}
      <View style={styles.bottomNav}>
        {allNavItems.map(item => {
          const isActive = activeModule === item.key;
          const isCore   = !!item.screen;
          return (
            <Pressable key={item.key}
              onPress={() => setActiveModule(item.key)}
              onLongPress={isCore && coreNavItems.length > 1 ? showCompass : undefined}
              onPressOut={isCore && coreNavItems.length > 1 ? hideCompass : undefined}
              delayLongPress={350}
              style={styles.navItem}>
              <Text style={[styles.navLabel, isActive && { color: item.color }]}>
                {item.shortLabel}
              </Text>
              <View style={[styles.navIndicator, isActive && { backgroundColor: item.color }]} />
            </Pressable>
          );
        })}

        <Pressable onPress={() => setPickerOpen(true)} style={styles.navItem}>
          <Plus size={14} color={colors.text.tertiary} />
          <View style={styles.navIndicator} />
        </Pressable>
      </View>

      {/* ── Module picker ── */}
      <ModulePickerSheet
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        hubId={hub?.id}
        userId={userId}
        enabledModules={enabledModules}
        installedAddons={installedAddons}
        addonDefs={addonDefs.length > 0 ? addonDefs : []}
        onToggleCore={handleToggleCore}
        onToggleAddon={handleToggleAddon}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  screen:    { flex: 1 },

  empty: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16 },
  emptyText: { fontSize: 14, color: colors.text.tertiary },
  emptyBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: colors.modules.annotate + "15",
    borderRadius: 12, borderWidth: 0.5, borderColor: colors.modules.annotate + "40",
    paddingHorizontal: 16, paddingVertical: 10,
  },
  emptyBtnText: { fontSize: 13, fontWeight: "600", color: colors.modules.annotate },

  compassOverlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, justifyContent: "center", alignItems: "center" },
  compassHUD: {
    flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 8,
    backgroundColor: "rgba(10, 10, 10, 0.88)",
    paddingVertical: 20, paddingHorizontal: 24,
    borderRadius: 28, borderWidth: 0.5, borderColor: colors.border.primary,
    maxWidth: 260,
  },
  dotWrap: { padding: 6 },
  dot: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: colors.background.secondary,
    borderWidth: 0.5, borderColor: colors.border.primary,
    alignItems: "center", justifyContent: "center",
  },
  dotActive:      { backgroundColor: colors.background.tertiary, borderColor: colors.text.tertiary },
  dotLabel:       { fontSize: 12, fontWeight: "600", color: colors.text.tertiary, letterSpacing: 1.5 },
  dotLabelActive: { color: colors.text.primary },

  hint: {
    alignSelf: "center",
    backgroundColor: "rgba(20,20,20,0.92)",
    borderRadius: 8, borderWidth: 0.5, borderColor: colors.border.primary,
    paddingHorizontal: 14, paddingVertical: 8, marginBottom: 6,
  },
  hintText: { fontSize: 12, color: colors.text.secondary },

  bottomNav: {
    flexDirection: "row",
    borderTopWidth: 0.5, borderTopColor: colors.border.primary,
    backgroundColor: colors.background.primary,
    paddingTop: 12, paddingBottom: 32,
  },
  navItem:      { flex: 1, alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 2 },
  navLabel:     { fontSize: 12, fontWeight: "600", letterSpacing: 2, color: colors.text.tertiary },
  navIndicator: { width: 4, height: 4, borderRadius: 2, backgroundColor: "transparent" },

  // ── Module picker sheet ──
  sheetOuter:    { flex: 1, backgroundColor: "rgba(0,0,0,0.5)" },
  sheetBackdrop: { flex: 1 },
  sheet: {
    backgroundColor: colors.background.primary,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    borderTopWidth: 0.5, borderColor: colors.border.primary,
    paddingHorizontal: 20, paddingTop: 20,
    maxHeight: "75%",
  },
  sheetHeader:   { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 },
  sheetTitle:    { fontSize: 16, fontWeight: "700", color: colors.text.primary },
  sheetSubtitle: { fontSize: 12, color: colors.text.tertiary, marginTop: 2 },
  sheetScroll:   { flexGrow: 0 },
  sheetGroupLabel: { fontSize: 10, fontWeight: "700", color: colors.text.tertiary + "99", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 8 },
  modRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    borderWidth: 0.5, borderColor: colors.border.primary,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    marginBottom: 8, backgroundColor: colors.background.secondary,
  },
  modIconWrap: { width: 32, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  modInfo:   { flex: 1 },
  modLabel:  { fontSize: 13, fontWeight: "600", color: colors.text.primary },
  modDesc:   { fontSize: 11, color: colors.text.tertiary, marginTop: 1 },
  modStatus: { fontSize: 11, fontWeight: "700", color: colors.text.tertiary },
});
