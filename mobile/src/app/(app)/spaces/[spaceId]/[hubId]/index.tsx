import { useCallback, useState } from "react";
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SymbolView } from "expo-symbols";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";

import { Screen } from "@/components/Screen";
import { fonts, useTheme, type ThemeColors } from "@/lib/theme";
import {
  deleteModule,
  getHub,
  installModule,
  listModulesInHub,
  useStoreReady,
  type Hub,
  type ModuleInstance,
} from "@/lib/store";
import {
  MODULE_CATALOG,
  findInCatalog,
  type CatalogEntry,
} from "@/lib/modules/catalog";
import type { Module as MdlModule } from "@/lib/module-runtime/types";

export default function HubDetail() {
  const { spaceId, hubId } = useLocalSearchParams<{
    spaceId: string;
    hubId: string;
  }>();
  const t = useTheme();
  const styles = useStyles(t);
  const router = useRouter();
  const ready = useStoreReady();
  const insets = useSafeAreaInsets();
  const fabBottom = insets.bottom + 56;
  const [hub, setHub] = useState<Hub | null>(null);
  const [modules, setModules] = useState<ModuleInstance[]>([]);

  const refresh = useCallback(async () => {
    if (!hubId) return;
    const [h, ms] = await Promise.all([
      getHub(hubId),
      listModulesInHub(hubId),
    ]);
    setHub(h);
    setModules(ms);
  }, [hubId]);

  useFocusEffect(
    useCallback(() => {
      if (!ready) return;
      let cancelled = false;
      refresh().then(() => {
        if (cancelled) return;
      });
      return () => {
        cancelled = true;
      };
    }, [ready, refresh]),
  );

  const openSettings = () => {
    if (!spaceId || !hubId) return;
    router.push({
      pathname: "/spaces/[spaceId]/[hubId]/settings",
      params: { spaceId, hubId },
    });
  };

  const onAddModule = () => {
    if (!hubId) return;
    Alert.alert(
      "Add module",
      undefined,
      [
        ...MODULE_CATALOG.map((c) => ({
          text: c.name,
          onPress: () => install(c),
        })),
        { text: "Cancel", style: "cancel" as const },
      ],
      { cancelable: true },
    );
  };

  const install = async (entry: CatalogEntry) => {
    if (!hubId) return;
    const created = await installModule({
      hubId,
      source: entry.source,
      definition: entry.definition,
    });
    setModules((prev) => [...prev, created]);
  };

  const onLongPressModule = (instance: ModuleInstance) => {
    const def = instance.definition as MdlModule | null;
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
            setModules((prev) => prev.filter((m) => m.id !== instance.id));
          },
        },
      ],
      { cancelable: true },
    );
  };

  return (
    <Screen
      title={hub?.name ?? "Hub"}
      subtitle={hub?.settings.syncToCloud ? "Cloud sync on" : "Local only"}
      showBack
      headerRight={
        <Pressable
          onPress={openSettings}
          hitSlop={8}
          style={({ pressed }) => [pressed && { opacity: 0.5 }]}
        >
          <Text style={[styles.settingsLink, { color: t.inkMuted }]}>
            Settings
          </Text>
        </Pressable>
      }
    >
      <FlatList
        data={modules}
        keyExtractor={(m) => m.id}
        numColumns={2}
        columnWrapperStyle={styles.gridRow}
        ListEmptyComponent={
          <Text style={styles.empty}>
            No modules yet. Tap “+ Add module”.
          </Text>
        }
        renderItem={({ item }) => {
          const def = item.definition as MdlModule | null;
          const catalog = findInCatalog(item.source);
          const name = def?.name ?? catalog?.name ?? item.source;
          const blurb = catalog?.blurb ?? "";
          const sf = catalog?.sfSymbol ?? "square.stack";
          return (
            <Pressable
              onPress={() =>
                router.push({
                  pathname: "/spaces/[spaceId]/[hubId]/[moduleId]",
                  params: {
                    spaceId: spaceId!,
                    hubId: hubId!,
                    moduleId: item.id,
                  },
                })
              }
              onLongPress={() => onLongPressModule(item)}
              delayLongPress={400}
              style={({ pressed }) => [
                styles.card,
                { borderColor: t.rule, backgroundColor: t.paper },
                pressed && { backgroundColor: t.rule },
              ]}
            >
              <View style={[styles.iconWrap, { backgroundColor: t.rule }]}>
                <SymbolView
                  name={sf as never}
                  size={20}
                  tintColor={t.ink}
                  resizeMode="scaleAspectFit"
                  fallback={
                    <Text style={[styles.iconFallback, { color: t.ink }]}>
                      ◇
                    </Text>
                  }
                />
              </View>
              <Text
                style={[styles.cardTitle, { color: t.ink }]}
                numberOfLines={1}
              >
                {name}
              </Text>
              {blurb ? (
                <Text
                  style={[styles.cardBlurb, { color: t.inkMuted }]}
                  numberOfLines={2}
                >
                  {blurb}
                </Text>
              ) : null}
            </Pressable>
          );
        }}
        contentContainerStyle={{ paddingBottom: fabBottom + 56, gap: 12 }}
        showsVerticalScrollIndicator={false}
      />

      <Pressable
        onPress={onAddModule}
        style={({ pressed }) => [
          styles.fab,
          { bottom: fabBottom, backgroundColor: t.ink },
          pressed && { opacity: 0.85 },
        ]}
      >
        <Text style={[styles.fabLabel, { color: t.paper }]}>+ Add module</Text>
      </Pressable>
    </Screen>
  );
}

function useStyles(t: ThemeColors) {
  return StyleSheet.create({
    gridRow: { gap: 12 },
    card: {
      flex: 1,
      borderWidth: 1,
      borderRadius: 12,
      padding: 14,
      gap: 10,
      minHeight: 130,
    },
    iconWrap: {
      width: 36,
      height: 36,
      borderRadius: 8,
      alignItems: "center",
      justifyContent: "center",
    },
    iconFallback: { fontSize: 18 },
    cardTitle: {
      fontFamily: fonts.sans,
      fontSize: 15,
      fontWeight: "600",
    },
    cardBlurb: {
      fontFamily: fonts.sans,
      fontSize: 12,
      lineHeight: 16,
    },
    empty: {
      fontFamily: fonts.sans,
      fontSize: 14,
      color: t.inkMuted,
      paddingVertical: 24,
    },
    settingsLink: {
      fontFamily: fonts.sans,
      fontSize: 13,
      letterSpacing: 0.5,
    },
    fab: {
      position: "absolute",
      right: 24,
      paddingHorizontal: 18,
      paddingVertical: 12,
      borderRadius: 999,
    },
    fabLabel: { fontFamily: fonts.sans, fontSize: 14, fontWeight: "500" },
  });
}
