import { useCallback, useState } from "react";
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Screen } from "@/components/Screen";
import { fonts, useTheme, type ThemeColors } from "@/lib/theme";
import {
  createHub,
  getSpace,
  listHubs,
  useStoreReady,
  type Hub,
  type Space,
} from "@/lib/store";

export default function SpaceDetail() {
  const { spaceId } = useLocalSearchParams<{ spaceId: string }>();
  const t = useTheme();
  const styles = useStyles(t);
  const router = useRouter();
  const ready = useStoreReady();
  const insets = useSafeAreaInsets();
  const fabBottom = insets.bottom + 56;
  const [space, setSpace] = useState<Space | null>(null);
  const [hubs, setHubs] = useState<Hub[]>([]);

  useFocusEffect(
    useCallback(() => {
      if (!ready || !spaceId) return;
      let cancelled = false;
      Promise.all([getSpace(spaceId), listHubs(spaceId)]).then(([s, hs]) => {
        if (cancelled) return;
        setSpace(s);
        setHubs(hs);
      });
      return () => {
        cancelled = true;
      };
    }, [ready, spaceId]),
  );

  const onAddHub = () => {
    if (!spaceId) return;
    Alert.prompt?.("New hub", "Name it.", async (name) => {
      const trimmed = (name ?? "").trim();
      if (!trimmed) return;
      const created = await createHub({ spaceId, name: trimmed });
      setHubs((prev) => [...prev, created]);
    });
  };

  return (
    <Screen
      title={space?.name ?? "Space"}
      subtitle={space?.description ?? "Hubs grouped under this space."}
      showBack
    >
      <FlatList
        data={hubs}
        keyExtractor={(h) => h.id}
        ItemSeparatorComponent={() => (
          <View style={[styles.separator, { backgroundColor: t.rule }]} />
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>
            No hubs yet. Tap “New hub” to add one.
          </Text>
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() =>
              router.push({
                pathname: "/spaces/[spaceId]/[hubId]",
                params: { spaceId: spaceId!, hubId: item.id },
              })
            }
            style={({ pressed }) => [
              styles.row,
              pressed && { backgroundColor: t.rule },
            ]}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>{item.name}</Text>
              <Text style={styles.rowSubtitle}>
                {item.settings.syncToCloud ? "Syncing to cloud" : "Local only"}
              </Text>
            </View>
            <Text style={styles.chev}>›</Text>
          </Pressable>
        )}
        contentContainerStyle={{ paddingBottom: fabBottom + 56 }}
      />

      <Pressable
        onPress={onAddHub}
        style={({ pressed }) => [
          styles.fab,
          { bottom: fabBottom, backgroundColor: t.ink },
          pressed && { opacity: 0.85 },
        ]}
      >
        <Text style={[styles.fabLabel, { color: t.paper }]}>+ New hub</Text>
      </Pressable>
    </Screen>
  );
}

function useStyles(t: ThemeColors) {
  return StyleSheet.create({
    row: {
      paddingVertical: 16,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    rowTitle: {
      fontFamily: fonts.sans,
      fontSize: 16,
      color: t.ink,
      fontWeight: "500",
    },
    rowSubtitle: {
      fontFamily: fonts.sans,
      fontSize: 12,
      color: t.inkFaint,
      marginTop: 2,
      letterSpacing: 1,
      textTransform: "uppercase",
    },
    chev: { color: t.inkFaint, fontSize: 22 },
    separator: { height: 1 },
    empty: {
      fontFamily: fonts.sans,
      fontSize: 14,
      color: t.inkMuted,
      paddingVertical: 24,
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
