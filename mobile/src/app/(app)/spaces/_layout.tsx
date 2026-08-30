import { Stack } from "expo-router";

export default function SpacesLayout() {
  // Each screen owns its own editorial chrome via the <Screen> shell — no
  // system header bar. iOS swipe-back still works; we add an in-screen
  // Back affordance when we need Android parity.
  return <Stack screenOptions={{ headerShown: false }} />;
}
