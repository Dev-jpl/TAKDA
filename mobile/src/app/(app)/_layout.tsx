import { Redirect } from "expo-router";
import { NativeTabs } from "expo-router/unstable-native-tabs";

import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";

export default function AppLayout() {
  const { state } = useAuth();
  const t = useTheme();

  // Auth guard. Loading is handled by the root index; we only land here
  // once state is resolved.
  if (state.status === "loading") return null;
  if (state.status === "signedOut") return <Redirect href="/login" />;

  return (
    <NativeTabs
      backgroundColor={t.paper}
      // iOS uses system blue for selected icons/labels unless we override.
      tintColor={t.ink}
      iconColor={{ default: t.inkFaint, selected: t.ink }}
      labelStyle={{
        default: { color: t.inkMuted },
        selected: { color: t.ink },
      }}
    >
      <NativeTabs.Trigger name="home">
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: "house", selected: "house.fill" }}
        />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="timeline">
        <NativeTabs.Trigger.Label>Timeline</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: "clock", selected: "clock.fill" }}
        />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="spaces">
        <NativeTabs.Trigger.Label>Spaces</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: "square.stack", selected: "square.stack.fill" }}
        />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="quick-tools">
        <NativeTabs.Trigger.Label>Tools</NativeTabs.Trigger.Label>
        {/* Single, simple glyph — matches the visual weight of the other
            tabs. `bolt` reads as "quick" without the busy wrench/screwdriver
            silhouette that was crowding the corner. */}
        <NativeTabs.Trigger.Icon
          sf={{ default: "bolt", selected: "bolt.fill" }}
        />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
