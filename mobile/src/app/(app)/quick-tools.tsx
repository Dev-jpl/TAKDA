import { Text } from "react-native";

import { Screen } from "@/components/Screen";
import { fonts, useTheme } from "@/lib/theme";

export default function QuickTools() {
  const t = useTheme();
  return (
    <Screen
      title="Quick Tools"
      subtitle="Small actions, always one tap away."
    >
      <Text
        style={{
          fontFamily: fonts.sans,
          color: t.inkMuted,
          fontSize: 14,
        }}
      >
        No tools pinned yet.
      </Text>
    </Screen>
  );
}
