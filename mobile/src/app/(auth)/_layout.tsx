import { Redirect, Stack } from "expo-router";

import { useAuth } from "@/lib/auth";

export default function AuthLayout() {
  const { state } = useAuth();
  // If the user is already signed in, the auth group has nothing to show —
  // bounce them into the app.
  if (state.status === "signedIn") return <Redirect href="/home" />;
  return <Stack screenOptions={{ headerShown: false }} />;
}
