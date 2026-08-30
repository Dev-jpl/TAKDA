import { useCallback, useMemo, useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  useFocusEffect,
  useLocalSearchParams,
  useRouter,
} from "expo-router";

import { Screen } from "@/components/Screen";
import { ModuleRenderer } from "@/components/module-runtime/Renderer";
import { type, useTheme, type ThemeColors } from "@/lib/theme";
import {
  deleteModule,
  getModule,
  useStoreReady,
  type ModuleInstance,
} from "@/lib/store";
import type { Module as MdlModule, Screen as MdlScreen } from "@/lib/module-runtime/types";

export default function ModuleScreen() {
  const { moduleId } = useLocalSearchParams<{ moduleId: string }>();
  const t = useTheme();
  const styles = useStyles(t);
  const router = useRouter();
  const ready = useStoreReady();
  const insets = useSafeAreaInsets();
  const [instance, setInstance] = useState<ModuleInstance | null>(null);
  // Bumped after a modal save so the page renderer remounts and re-reads
  // entries (its stats/lists are read-once-then-cache).
  const [pageVersion, setPageVersion] = useState(0);
  // Active modal screen key — null means no sheet open.
  const [openModalKey, setOpenModalKey] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!ready || !moduleId) return;
      let cancelled = false;
      getModule(moduleId).then((m) => {
        if (!cancelled) setInstance(m);
      });
      return () => {
        cancelled = true;
      };
    }, [ready, moduleId]),
  );

  const def: MdlModule | null = useMemo(() => {
    return (instance?.definition as MdlModule | undefined) ?? null;
  }, [instance]);

  // Separate pages from modals — pages render inline, modals are FAB- /
  // header-button-triggered sheets.
  const pages: MdlScreen[] = useMemo(
    () => (def?.screens ?? []).filter((s) => s.kind === "page"),
    [def],
  );
  const modals: MdlScreen[] = useMemo(
    () => (def?.screens ?? []).filter((s) => s.kind === "modal"),
    [def],
  );

  const [activeKey, setActiveKey] = useState<string | null>(null);
  const currentPageKey =
    activeKey ??
    def?.defaultScreenKey ??
    pages[0]?.key ??
    null;

  // First modal is the "primary action" — wired to the FAB. The rest become
  // subtle header-right buttons.
  const fabModal = modals[0] ?? null;
  const headerModals = modals.slice(1);

  const onRemove = () => {
    if (!instance) return;
    const name = def?.name ?? instance.source;
    Alert.alert(
      `Remove “${name}”?`,
      "This deletes the module and every entry logged inside it. This can't be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            await deleteModule(instance.id);
            router.back();
          },
        },
      ],
      { cancelable: true },
    );
  };

  if (!instance || !def) {
    return (
      <Screen title="Module" showBack>
        <Text style={[styles.empty, { color: t.inkMuted }]}>Loading…</Text>
      </Screen>
    );
  }

  // The active modal's screen, if one is open.
  const activeModal = openModalKey
    ? modals.find((m) => m.key === openModalKey) ?? null
    : null;

  return (
    <>
      <Screen
        title={def.name}
        showBack
        headerRight={
          <View style={styles.headerRow}>
            {headerModals.map((m) => (
              <Pressable
                key={m.key}
                onPress={() => setOpenModalKey(m.key)}
                hitSlop={8}
                style={({ pressed }) => [pressed && { opacity: 0.5 }]}
              >
                <Text style={[styles.headerAction, { color: t.inkMuted }]}>
                  {m.name}
                </Text>
              </Pressable>
            ))}
            <Pressable
              onPress={onRemove}
              hitSlop={8}
              style={({ pressed }) => [pressed && { opacity: 0.5 }]}
            >
              <Text style={[styles.headerAction, { color: t.inkMuted }]}>
                Remove
              </Text>
            </Pressable>
          </View>
        }
      >
        {pages.length > 1 && (
          <View style={styles.switcherRow}>
            {pages.map((s) => {
              const active = s.key === currentPageKey;
              return (
                <Pressable
                  key={s.key}
                  onPress={() => setActiveKey(s.key)}
                  style={({ pressed }) => [
                    styles.pill,
                    {
                      borderColor: t.rule,
                      backgroundColor: active ? t.ink : "transparent",
                    },
                    pressed && !active && { backgroundColor: t.rule },
                  ]}
                >
                  <Text
                    style={[
                      styles.pillLabel,
                      { color: active ? t.paper : t.inkMuted },
                    ]}
                  >
                    {s.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}

        <ScrollView
          contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}
          showsVerticalScrollIndicator={false}
        >
          <ModuleRenderer
            key={`page-${pageVersion}`}
            module={def}
            screenKey={currentPageKey ?? undefined}
            moduleInstanceId={instance.id}
          />
        </ScrollView>

        {/* FAB triggers the primary modal (typically "log / add"). */}
        {fabModal && (
          <Pressable
            onPress={() => setOpenModalKey(fabModal.key)}
            style={({ pressed }) => [
              styles.fab,
              {
                bottom: insets.bottom + 24,
                backgroundColor: t.ink,
              },
              pressed && { opacity: 0.85 },
            ]}
            accessibilityLabel={fabModal.name}
          >
            <Text style={[styles.fabLabel, { color: t.paper }]}>+</Text>
          </Pressable>
        )}
      </Screen>

      {/* Bottom-sheet modal — RN's Modal with a sheet-styled inner view. */}
      <Modal
        visible={!!activeModal}
        transparent
        animationType="slide"
        onRequestClose={() => setOpenModalKey(null)}
      >
        <View style={styles.sheetBackdrop}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setOpenModalKey(null)}
          />
          <View
            style={[
              styles.sheet,
              {
                backgroundColor: t.paper,
                // Safe-area clearance + ~14pt breathing room below the
                // last element. Floor of 16 so flat-bottom devices still
                // get padding above the screen edge.
                paddingBottom: Math.max(insets.bottom, 16) + 14,
              },
            ]}
          >
            <View style={[styles.sheetHandle, { backgroundColor: t.rule }]} />
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: t.ink }]}>
                {activeModal?.name ?? ""}
              </Text>
              <Pressable
                onPress={() => setOpenModalKey(null)}
                hitSlop={8}
                style={({ pressed }) => [pressed && { opacity: 0.5 }]}
              >
                <Text style={[styles.sheetClose, { color: t.inkMuted }]}>
                  Cancel
                </Text>
              </Pressable>
            </View>
            <ScrollView
              contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8 }}
              keyboardShouldPersistTaps="handled"
            >
              {activeModal && (
                <ModuleRenderer
                  // Fresh form state every time the sheet opens.
                  key={`modal-${activeModal.key}-${openModalKey}`}
                  module={def}
                  screenKey={activeModal.key}
                  moduleInstanceId={instance.id}
                  onSaved={() => {
                    setOpenModalKey(null);
                    setPageVersion((v) => v + 1);
                  }}
                />
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

function useStyles(_t: ThemeColors) {
  return StyleSheet.create({
    empty: { ...type.body, fontSize: 14 },
    headerRow: { flexDirection: "row", alignItems: "center", gap: 14 },
    headerAction: { ...type.label, fontSize: 13 },
    switcherRow: {
      flexDirection: "row",
      gap: 6,
      marginBottom: 16,
      flexWrap: "wrap",
    },
    pill: {
      borderWidth: 1,
      borderRadius: 999,
      paddingVertical: 6,
      paddingHorizontal: 12,
    },
    pillLabel: { ...type.label, fontSize: 12, fontWeight: "500" },
    fab: {
      position: "absolute",
      right: 20,
      width: 56,
      height: 56,
      borderRadius: 28,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: "#000",
      shadowOpacity: 0.18,
      shadowOffset: { width: 0, height: 4 },
      shadowRadius: 12,
      elevation: 6,
    },
    fabLabel: { ...type.title, fontSize: 28, lineHeight: 32, fontWeight: "300" },
    sheetBackdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.35)",
      justifyContent: "flex-end",
    },
    sheet: {
      borderTopLeftRadius: 18,
      borderTopRightRadius: 18,
      paddingTop: 10,
      // Let long forms reach further down the screen; short forms still
      // hug their content (the sheet sizes to its children).
      maxHeight: "92%",
    },
    sheetHandle: {
      alignSelf: "center",
      width: 36,
      height: 4,
      borderRadius: 2,
      marginBottom: 8,
    },
    sheetHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingBottom: 12,
    },
    sheetTitle: { ...type.title },
    sheetClose: { ...type.body, fontSize: 14 },
  });
}
