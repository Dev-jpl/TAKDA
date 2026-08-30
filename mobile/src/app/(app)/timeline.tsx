import { Text } from "react-native";

import { Screen } from "@/components/Screen";
import { fonts, useTheme } from "@/lib/theme";

export default function Timeline() {
  const t = useTheme();
  return (
    <Screen
      title="Timeline"
      subtitle="Your day, scrolled by hour and intent."
    >
      <Text
        style={{
          fontFamily: fonts.sans,
          color: t.inkMuted,
          fontSize: 14,
        }}
      >
        Nothing scheduled yet.
      </Text>
    </Screen>
  );
}
