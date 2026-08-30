import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from "expo-router";
import { useColorScheme } from "react-native";

import { AuthProvider } from "@/lib/auth";
import { SyncTrigger } from "@/lib/sync-trigger";

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <AuthProvider>
      <SyncTrigger />
      <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
        {/* Per-segment layouts handle their own chrome. The root just hosts
            the (auth) and (app) groups; no headers at this level so each
            tree can decide its own. */}
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(app)" />
        </Stack>
      </ThemeProvider>
    </AuthProvider>
  );
}
