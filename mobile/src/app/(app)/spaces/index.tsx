import { useCallback, useState } from "react";
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Screen } from "@/components/Screen";
import { fonts, useTheme, type ThemeColors } from "@/lib/theme";
import {
  createSpace,
  listSpaces,
  useStoreReady,
  type Space,
} from "@/lib/store";

export default function SpacesIndex() {
  const t = useTheme();
  const styles = useStyles(t);
  const router = useRouter();
  const ready = useStoreReady();
  const insets = useSafeAreaInsets();
  // Tab bar sits below the safe area; lift floating UI clear of both.
  const fabBottom = insets.bottom + 56;
  const [spaces, setSpaces] = useState<Space[]>([]);

  // Refetch whenever the screen regains focus — covers the back-navigation
  // case after creating/editing a space deeper in the stack.
  useFocusEffect(
    useCallback(() => {
      if (!ready) return;
      let cancelled = false;
      listSpaces().then((rows) => {
        if (!cancelled) setSpaces(rows);
      });
      return () => {
        cancelled = true;
      };
    }, [ready]),
  );

  const onAdd = async () => {
    Alert.prompt?.("New space", "Name it.", async (name) => {
      const trimmed = (name ?? "").trim();
      if (!trimmed) return;
      const created = await createSpace({ name: trimmed });
      setSpaces((prev) => [...prev, created]);
      router.push({
        pathname: "/spaces/[spaceId]",
        params: { spaceId: created.id },
      });
    });
  };

  return (
    <Screen
      title="Spaces"
      subtitle="Rooms for the parts of your life."
    >
      <FlatList
        data={spaces}
        keyExtractor={(s) => s.id}
        ItemSeparatorComponent={() => (
          <View style={[styles.separator, { backgroundColor: t.rule }]} />
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>
            No spaces yet. Tap “New space” to make one.
          </Text>
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() =>
              router.push({
                pathname: "/spaces/[spaceId]",
                params: { spaceId: item.id },
              })
            }
            style={({ pressed }) => [
              styles.row,
              pressed && { backgroundColor: t.rule },
            ]}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>{item.name}</Text>
              {item.description && (
                <Text style={styles.rowSubtitle}>{item.description}</Text>
              )}
            </View>
            <Text style={styles.chev}>›</Text>
          </Pressable>
        )}
        contentContainerStyle={{ paddingBottom: fabBottom + 56 }}
      />

      <Pressable
        onPress={onAdd}
        style={({ pressed }) => [
          styles.fab,
          { bottom: fabBottom, backgroundColor: t.ink },
          pressed && { opacity: 0.85 },
        ]}
      >
        <Text style={[styles.fabLabel, { color: t.paper }]}>+ New space</Text>
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
      fontSize: 13,
      color: t.inkMuted,
      marginTop: 2,
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
