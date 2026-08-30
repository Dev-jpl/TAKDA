// TAKDA design tokens — mirrors web/src/app/globals.css so mobile and web
// stay visually aligned. When the web tokens change, update both.

export const lightTheme = {
  paper: "#FAF8F3",
  paperDot: "#D9D6CF",
  ink: "#1F1F1F",
  inkMuted: "#6B6B6B",
  inkFaint: "#B5B1A8",
  rule: "#E5E2DA",
  error: "#B33A2C",
};

export const darkTheme = {
  paper: "#141413",
  paperDot: "#2A2A28",
  ink: "#EDEAE3",
  inkMuted: "#8A8A85",
  inkFaint: "#4A4A47",
  rule: "#2A2A28",
  error: "#E27063",
};

export type ThemeColors = typeof lightTheme;

import { useColorScheme } from "react-native";

export function useTheme(): ThemeColors {
  const scheme = useColorScheme();
  return scheme === "dark" ? darkTheme : lightTheme;
}

// Typography — all-sans, all-system. Cleaner read than mixing serif
// display + sans body. We rely on weight + size + letter-spacing for
// hierarchy instead of font-family switching. SF on iOS, Roboto on
// Android, system stack on web.
import { Platform } from "react-native";

export const fonts = Platform.select({
  ios: {
    sans: "system-ui",
    mono: "ui-monospace",
  },
  default: {
    sans: "System",
    mono: "Courier",
  },
}) as { sans: string; mono: string };

/** Type tokens — use these instead of repeating raw size/weight/spacing in
 *  every StyleSheet. Modeled on Apple HIG with editorial restraint:
 *    display — big screen titles
 *    title   — section / card titles
 *    body    — main reading text
 *    label   — small inputs/secondary text
 *    eyebrow — uppercase tracking, used for brand and section labels
 *    stat    — numeric values; renders with tabular figures so digits align
 */
export const type = {
  display: {
    fontFamily: Platform.OS === "ios" ? "system-ui" : "System",
    fontSize: 28,
    fontWeight: "600" as const,
    letterSpacing: -0.4,
  },
  title: {
    fontFamily: Platform.OS === "ios" ? "system-ui" : "System",
    fontSize: 18,
    fontWeight: "600" as const,
    letterSpacing: -0.2,
  },
  body: {
    fontFamily: Platform.OS === "ios" ? "system-ui" : "System",
    fontSize: 15,
    fontWeight: "400" as const,
  },
  label: {
    fontFamily: Platform.OS === "ios" ? "system-ui" : "System",
    fontSize: 13,
    fontWeight: "400" as const,
  },
  eyebrow: {
    fontFamily: Platform.OS === "ios" ? "system-ui" : "System",
    fontSize: 11,
    fontWeight: "500" as const,
    letterSpacing: 1.8,
    textTransform: "uppercase" as const,
  },
  stat: {
    fontFamily: Platform.OS === "ios" ? "system-ui" : "System",
    fontSize: 30,
    fontWeight: "600" as const,
    letterSpacing: -0.5,
    // SF supports tabular-nums via fontVariant so digits don't shift width
    // as values update.
    fontVariant: ["tabular-nums"] as ("tabular-nums")[],
  },
};
