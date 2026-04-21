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
import {
  Plus, CheckCircle, PencilSimple, Files, PaperPlaneRight, GitBranch,
  ForkKnife, CurrencyDollar, X,
} from "phosphor-react-native";

import TrackScreen from "../../screens/track/TrackScreen";
import AnnotateScreen from "../../screens/annotate/AnnotateScreen";
import KnowledgeScreen from "../../screens/knowledge/KnowledgeScreen";
import DeliverScreen from "../../screens/deliver/DeliverScreen";
import AutomateScreen from "../../screens/automate/AutomateScreen";
import CalorieTrackerScreen from "../../screens/addons/CalorieTrackerScreen";
import ExpenseTrackerScreen from "../../screens/addons/ExpenseTrackerScreen";

// ─── Module catalog ──────────────────────────────────────────────────────────

const CORE_CATALOG = [
  { key: "track",    label: "Tasks",       shortLabel: "T",  color: colors.modules.track,    Icon: CheckCircle,    screen: TrackScreen },
  { key: "annotate", label: "Notes",       shortLabel: "A",  color: colors.modules.annotate, Icon: PencilSimple,   screen: AnnotateScreen },
  { key: "knowledge",label: "Resources",   shortLabel: "K",  color: colors.modules.knowledge,Icon: Files,          screen: KnowledgeScreen },
  { key: "deliver",  label: "Outcomes",    shortLabel: "D",  color: colors.modules.deliver,  Icon: PaperPlaneRight,screen: DeliverScreen },
  { key: "automate", label: "Automations", shortLabel: "Au", color: "#a78bfa",               Icon: GitBranch,      screen: AutomateScreen },
];

const ADDON_CATALOG = [
  { key: "calorie_counter", label: "Calories",  shortLabel: "Cal", color: "#10B981", Icon: ForkKnife,       screen: CalorieTrackerScreen },
  { key: "expense_tracker", label: "Expenses",  shortLabel: "Exp", color: "#6366F1", Icon: CurrencyDollar,  screen: ExpenseTrackerScreen },
];

// ─── Compass Dot ─────────────────────────────────────────────────────────────

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

function ModulePickerSheet({ visible, onClose, hubId, userId, enabledModules, installedAddons, onToggleCore, onToggleAddon }) {
  const [loading, setLoading] = useState(null); // key of the item being toggled

  async function handleCoreToggle(mod) {
    const isOn = enabledModules.includes(mod.key);
    setLoading(mod.key);
    try {
      if (isOn) {
        await hubsService.removeModule(hubId, mod.key);
        onToggleCore(mod.key, false);
      } else {
        await hubsService.addModule(hubId, mod.key);
        onToggleCore(mod.key, true);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(null);
    }
  }

  async function handleAddonToggle(addon) {
    const installed = installedAddons.find(a => a.type === addon.key);
    setLoading(addon.key);
    try {
      if (installed) {
        await addonsService.uninstallAddon(installed.id);
        onToggleAddon(addon.key, false, null);
      } else {
        const newAddon = await addonsService.installAddon(hubId, userId, addon.key);
        onToggleAddon(addon.key, true, newAddon);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(null);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent presentationStyle="overFullScreen">
      {/* Outer flex column: backdrop fill area + sheet — no overlap, so sheet touches are never intercepted */}
      <View style={styles.sheetOuter}>
        <Pressable style={styles.sheetBackdrop} onPress={onClose} />
        <View style={styles.sheet}>
          {/* Header */}
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
                <TouchableOpacity
                  key={mod.key}
                  style={[styles.modRow, isOn && { borderColor: mod.color + "40", backgroundColor: mod.color + "0d" }]}
                  onPress={() => handleCoreToggle(mod)}
                  activeOpacity={0.7}
                >
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

            {/* Data addons */}
            <Text style={[styles.sheetGroupLabel, { marginTop: 20 }]}>Data Tracking</Text>
            {ADDON_CATALOG.map(addon => {
              const installed = installedAddons.find(a => a.type === addon.key);
              const isOn = !!installed;
              const isLoading = loading === addon.key;
              const { Icon } = addon;
              return (
                <TouchableOpacity
                  key={addon.key}
                  style={[styles.modRow, isOn && { borderColor: addon.color + "40", backgroundColor: addon.color + "0d" }]}
                  onPress={() => handleAddonToggle(addon)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.modIconWrap, { backgroundColor: addon.color + "15" }]}>
                    <Icon size={15} weight={isOn ? "fill" : "regular"} color={isOn ? addon.color : colors.text.tertiary} />
                  </View>
                  <View style={styles.modInfo}>
                    <Text style={styles.modLabel}>{addon.label}</Text>
                  </View>
                  {isLoading
                    ? <ActivityIndicator size="small" color={colors.text.tertiary} />
                    : <Text style={[styles.modStatus, isOn && { color: addon.color }]}>{isOn ? "On" : "Off"}</Text>
                  }
                </TouchableOpacity>
              );
            })}

            <View style={{ height: 32 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ─── Main Navigator ───────────────────────────────────────────────────────────

export default function CompassNavigator({ hub, space }) {
  const [activeModule, setActiveModule] = useState(null);
  const [compassOpen,  setCompassOpen]  = useState(false);
  const [hintVisible,  setHintVisible]  = useState(false);
  const [pickerOpen,   setPickerOpen]   = useState(false);
  const [userId,       setUserId]       = useState(null);

  // Enabled core module keys derived from hub.hub_modules
  const [enabledModules, setEnabledModules] = useState(() =>
    (hub?.hub_modules ?? [])
      .filter(m => m.is_enabled)
      .map(m => m.module)
  );

  // Installed addons (full objects with id + type)
  const [installedAddons, setInstalledAddons] = useState([]);

  const hideTimerRef = useRef(null);
  const hintTimerRef = useRef(null);
  const compassOpacity = useSharedValue(0);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id);
    });
  }, []);

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

  // Reload when hub changes — fetch hub_modules if not included in the hub object
  useEffect(() => {
    if (!hub?.id) return;

    async function loadAll() {
      // Fetch hub_modules (may already be embedded on the hub object)
      let hubModules = hub.hub_modules;
      if (!hubModules) {
        const { data } = await supabase.from("hub_modules").select("*").eq("hub_id", hub.id);
        hubModules = data ?? [];
      }
      const mods = hubModules.filter(m => m.is_enabled).map(m => m.module);
      setEnabledModules(mods);

      // Fetch addons directly from Supabase (works on device; backend may not be reachable)
      const { data: addonData } = await supabase.from("hub_addons").select("*").eq("hub_id", hub.id);
      const addons = addonData ?? [];
      setInstalledAddons(addons);

      // Set first available tab — core module first, addon second
      const firstAddonKey = ADDON_CATALOG.find(a => addons.some(i => i.type === a.key))?.key ?? null;
      setActiveModule(mods[0] ?? firstAddonKey);
    }

    loadAll();

    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    compassOpacity.value = 0;
    setCompassOpen(false);
  }, [hub?.id]);


  // Build visible nav items
  const coreNavItems = CORE_CATALOG.filter(m => enabledModules.includes(m.key));
  const addonNavItems = ADDON_CATALOG.filter(a => installedAddons.some(i => i.type === a.key));
  const allNavItems = [...coreNavItems, ...addonNavItems];

  // Screen lookup
  const screenMap = {
    ...Object.fromEntries(CORE_CATALOG.map(m => [m.key, m.screen])),
    ...Object.fromEntries(ADDON_CATALOG.map(a => [a.key, a.screen])),
  };

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

  function handleToggleCore(key, enabled) {
    setEnabledModules(prev => enabled ? [...prev, key] : prev.filter(k => k !== key));
    if (!enabled && activeModule === key) {
      const remaining = enabledModules.filter(k => k !== key);
      setActiveModule(remaining[0] ?? null);
    }
  }

  function handleToggleAddon(type, enabled, addonObj) {
    if (enabled) {
      setInstalledAddons(prev => [...prev, addonObj]);
      setActiveModule(type);
    } else {
      setInstalledAddons(prev => prev.filter(a => a.type !== type));
      if (activeModule === type) {
        setActiveModule(allNavItems.find(i => i.key !== type)?.key ?? null);
      }
    }
  }

  const ActiveScreen = activeModule ? screenMap[activeModule] : null;

  return (
    <View style={styles.container}>

      {/* ── Active screen content ── */}
      <View style={styles.screen}>
        {ActiveScreen
          ? <ActiveScreen hub={hub} space={space} />
          : (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No modules enabled</Text>
              <TouchableOpacity style={styles.emptyBtn} onPress={() => setPickerOpen(true)}>
                <Plus size={13} color={colors.modules.annotate} weight="bold" />
                <Text style={styles.emptyBtnText}>Add Module</Text>
              </TouchableOpacity>
            </View>
          )
        }
      </View>

      {/* ── Compass overlay ── */}
      {coreNavItems.length > 0 && (
        <Animated.View
          style={[styles.compassOverlay, compassOverlayStyle]}
          pointerEvents={compassOpen ? "box-none" : "none"}
        >
          <View style={styles.compassHUD}>
            {coreNavItems.map(m => (
              <CompassDot
                key={m.key}
                label={m.shortLabel}
                active={activeModule === m.key}
                onPress={() => { setActiveModule(m.key); hideCompass(); }}
              />
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
          const isAddon  = !!ADDON_CATALOG.find(a => a.key === item.key);
          return (
            <Pressable
              key={item.key}
              onPress={() => setActiveModule(item.key)}
              onLongPress={!isAddon && coreNavItems.length > 1 ? showCompass : undefined}
              onPressOut={!isAddon && coreNavItems.length > 1 ? hideCompass : undefined}
              delayLongPress={350}
              style={styles.navItem}
            >
              <Text style={[styles.navLabel, isActive && { color: item.color }]}>
                {item.shortLabel}
              </Text>
              <View style={[styles.navIndicator, isActive && { backgroundColor: item.color }]} />
            </Pressable>
          );
        })}

        {/* Add / manage modules button */}
        <Pressable onPress={() => setPickerOpen(true)} style={styles.navItem}>
          <Plus size={14} color={colors.text.tertiary} />
          <View style={styles.navIndicator} />
        </Pressable>
      </View>

      {/* ── Module picker sheet ── */}
      <ModulePickerSheet
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        hubId={hub?.id}
        userId={userId}
        enabledModules={enabledModules}
        installedAddons={installedAddons}
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
    borderRadius: 12, borderWidth: 0.5,
    borderColor: colors.modules.annotate + "40",
    paddingHorizontal: 16, paddingVertical: 10,
  },
  emptyBtnText: { fontSize: 13, fontWeight: "600", color: colors.modules.annotate },

  compassOverlay: {
    position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: "center", alignItems: "center",
  },
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
  dotActive: { backgroundColor: colors.background.tertiary, borderColor: colors.text.tertiary },
  dotLabel: { fontSize: 12, fontWeight: "600", color: colors.text.tertiary, letterSpacing: 1.5 },
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
  navItem: {
    flex: 1, alignItems: "center", justifyContent: "center",
    gap: 6, paddingVertical: 2,
  },
  navLabel: { fontSize: 12, fontWeight: "600", letterSpacing: 2, color: colors.text.tertiary },
  navIndicator: { width: 4, height: 4, borderRadius: 2, backgroundColor: "transparent" },

  // ── Module picker sheet ──
  // Outer flex column — backdrop pressable takes flex:1 above the sheet; no overlap
  sheetOuter: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  sheetBackdrop: {
    flex: 1,  // fills everything above the sheet — no overlap with sheet content
  },
  sheet: {
    backgroundColor: colors.background.primary,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    borderTopWidth: 0.5, borderColor: colors.border.primary,
    paddingHorizontal: 20, paddingTop: 20,
    maxHeight: "75%",
  },
  sheetHeader: {
    flexDirection: "row", alignItems: "flex-start",
    justifyContent: "space-between", marginBottom: 20,
  },
  sheetTitle:    { fontSize: 16, fontWeight: "700", color: colors.text.primary },
  sheetSubtitle: { fontSize: 12, color: colors.text.tertiary, marginTop: 2 },
  sheetScroll:   { flexGrow: 0 },
  sheetGroupLabel: {
    fontSize: 10, fontWeight: "700", color: colors.text.tertiary + "99",
    letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 8,
  },
  modRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    borderWidth: 0.5, borderColor: colors.border.primary,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    marginBottom: 8, backgroundColor: colors.background.secondary,
  },
  modIconWrap: {
    width: 32, height: 32, borderRadius: 8,
    alignItems: "center", justifyContent: "center",
  },
  modInfo:   { flex: 1 },
  modLabel:  { fontSize: 13, fontWeight: "600", color: colors.text.primary },
  modStatus: { fontSize: 11, fontWeight: "700", color: colors.text.tertiary },
});
