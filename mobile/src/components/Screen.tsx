import { Pressable, StyleSheet, Text, View, type ViewStyle } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { type, useTheme } from "@/lib/theme";

// Editorial page shell — paper background, BRAND eyebrow, big serif title,
// optional subtitle, then the screen content. Mirrors the web's panel/header
// pattern so every tab feels like a TAKDA surface.
export function Screen({
  title,
  subtitle,
  showBack = false,
  headerRight,
  children,
  contentStyle,
}: {
  title: string;
  subtitle?: string;
  /** Render a "‹ Back" affordance above the eyebrow. Pop on tap. */
  showBack?: boolean;
  /** Subtle action slotted into the header row, right-aligned with the
   *  title. Designed for tertiary affordances — settings, menus, info. */
  headerRight?: React.ReactNode;
  children?: React.ReactNode;
  contentStyle?: ViewStyle;
}) {
  const t = useTheme();
  const router = useRouter();
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: t.paper }]} edges={["top"]}>
      <View style={[styles.container, contentStyle]}>
        {showBack && (
          <Pressable
            onPress={() => router.back()}
            hitSlop={12}
            style={({ pressed }) => [styles.back, pressed && { opacity: 0.5 }]}
          >
            <Text style={[styles.backLabel, { color: t.inkMuted }]}>
              ‹ Back
            </Text>
          </Pressable>
        )}
        <Text style={[styles.brand, { color: t.inkFaint }]}>TAKDA</Text>
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: t.ink }]}>{title}</Text>
          {headerRight && <View style={styles.headerRight}>{headerRight}</View>}
        </View>
        {subtitle && (
          <Text style={[styles.subtitle, { color: t.inkMuted }]}>{subtitle}</Text>
        )}
        <View style={styles.body}>{children}</View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { flex: 1, paddingHorizontal: 24, paddingTop: 16 },
  back: { paddingVertical: 8, marginBottom: 4, alignSelf: "flex-start" },
  backLabel: { ...type.label },
  brand: { ...type.eyebrow, marginBottom: 12 },
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 12,
  },
  title: { ...type.display, flex: 1 },
  headerRight: { paddingBottom: 6 },
  subtitle: { ...type.body, marginTop: 4 },
  body: { flex: 1, marginTop: 24 },
});
