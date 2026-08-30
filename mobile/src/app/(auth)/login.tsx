import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { useAuth } from "@/lib/auth";
import { useTheme, type } from "@/lib/theme";

export default function LoginScreen() {
  const { signIn } = useAuth();
  const router = useRouter();
  const t = useTheme();
  const styles = useStyles(t);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = email.trim().length > 0 && password.length > 0 && !busy;

  const onSubmit = async () => {
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    const { error: err } = await signIn(email.trim(), password);
    setBusy(false);
    if (err) {
      setError(err);
      return;
    }
    router.replace("/home");
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.brand}>TAKDA</Text>
            <Text style={styles.title}>Welcome back</Text>
            <Text style={styles.subtitle}>Sign in to continue.</Text>
          </View>

          <View style={styles.form}>
            <Field
              label="Email"
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              textContentType="emailAddress"
            />
            <Field
              label="Password"
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              secureTextEntry
              autoComplete="password"
              textContentType="password"
              onSubmitEditing={onSubmit}
            />

            {error && <Text style={styles.error}>{error}</Text>}

            <Pressable
              onPress={onSubmit}
              disabled={!canSubmit}
              style={({ pressed }) => [
                styles.button,
                !canSubmit && styles.buttonDisabled,
                pressed && canSubmit && styles.buttonPressed,
              ]}
            >
              {busy ? (
                <ActivityIndicator color={t.paper} />
              ) : (
                <Text style={styles.buttonLabel}>Sign in</Text>
              )}
            </Pressable>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerLabel}>New here?</Text>
            {/* TODO: link once the signup screen exists. */}
            <Text style={styles.footerLink}>Create an account</Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// Simple labeled input. Lifted out so signup can reuse without duplication.
function Field(
  props: React.ComponentProps<typeof TextInput> & { label: string },
) {
  const { label, style, ...rest } = props;
  const t = useTheme();
  const styles = useStyles(t);
  return (
    <View>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        {...rest}
        style={[styles.input, style]}
        placeholderTextColor={t.inkFaint}
      />
    </View>
  );
}

import type { ThemeColors } from "@/lib/theme";

function useStyles(t: ThemeColors) {
  return StyleSheet.create({
    flex: { flex: 1 },
    safe: { flex: 1, backgroundColor: t.paper },
    container: {
      flex: 1,
      paddingHorizontal: 24,
      paddingVertical: 32,
      justifyContent: "space-between",
    },
    header: { gap: 6, paddingTop: 24 },
    brand: { ...type.eyebrow, color: t.inkFaint, marginBottom: 16 },
    title: { ...type.display, color: t.ink },
    subtitle: { ...type.body, color: t.inkMuted, fontSize: 14 },
    form: { gap: 20 },
    fieldLabel: { ...type.eyebrow, fontSize: 10, letterSpacing: 1.4, color: t.inkFaint, marginBottom: 6 },
    input: {
      ...type.body,
      fontSize: 16,
      color: t.ink,
      borderBottomWidth: 1,
      borderColor: t.rule,
      paddingVertical: 8,
    },
    error: { ...type.label, color: t.error },
    button: {
      backgroundColor: t.ink,
      paddingVertical: 14,
      borderRadius: 6,
      alignItems: "center",
      marginTop: 4,
    },
    buttonPressed: { opacity: 0.85 },
    buttonDisabled: { opacity: 0.4 },
    buttonLabel: { ...type.title, fontSize: 15, color: t.paper },
    footer: {
      flexDirection: "row",
      justifyContent: "center",
      gap: 6,
      alignItems: "center",
    },
    footerLabel: { ...type.body, fontSize: 14, color: t.inkMuted },
    footerLink: {
      ...type.body,
      fontSize: 14,
      fontWeight: "500",
      color: t.ink,
      textDecorationLine: "underline",
    },
  });
}
