import { Pressable, StyleSheet, Text, View } from "react-native";

import { Screen } from "@/components/Screen";
import { useAuth } from "@/lib/auth";
import { fonts, useTheme } from "@/lib/theme";

export default function Home() {
  const { state, signOut } = useAuth();
  const t = useTheme();
  const email = state.status === "signedIn" ? state.session.user.email : "—";

  return (
    <Screen title="Good morning" subtitle="Your personal OS.">
      <View style={styles.card}>
        <Text style={[styles.eyebrow, { color: t.inkFaint }]}>Signed in</Text>
        <Text style={[styles.email, { color: t.ink }]}>{email}</Text>
      </View>

      <Pressable
        onPress={signOut}
        style={({ pressed }) => [
          styles.button,
          { borderColor: t.rule },
          pressed && { opacity: 0.7 },
        ]}
      >
        <Text style={[styles.buttonLabel, { color: t.ink }]}>Sign out</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    padding: 20,
    borderRadius: 8,
    gap: 6,
  },
  eyebrow: {
    fontFamily: fonts.sans,
    fontSize: 10,
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  email: { fontFamily: fonts.sans, fontSize: 16, fontWeight: "500" },
  button: {
    marginTop: 24,
    alignSelf: "flex-start",
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  buttonLabel: { fontSize: 14, fontFamily: fonts.sans },
});
