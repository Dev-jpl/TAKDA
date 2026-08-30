import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { useFocusEffect, useLocalSearchParams } from "expo-router";

import { Screen } from "@/components/Screen";
import { fonts, useTheme, type ThemeColors } from "@/lib/theme";
import {
  getHub,
  pendingCount,
  updateHubSettings,
  useStoreReady,
  type Hub,
} from "@/lib/store";
import { drainOutbox } from "@/lib/store/sync";

export default function HubSettings() {
  const { hubId } = useLocalSearchParams<{ hubId: string }>();
  const t = useTheme();
  const styles = useStyles(t);
  const ready = useStoreReady();
  const [hub, setHub] = useState<Hub | null>(null);
  const [pending, setPending] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!hubId) return;
    const [h, p] = await Promise.all([getHub(hubId), pendingCount()]);
    setHub(h);
    setPending(p);
  }, [hubId]);

  useFocusEffect(
    useCallback(() => {
      if (!ready) return;
      let cancelled = false;
      refresh().then(() => {
        if (cancelled) return;
      });
      return () => {
        cancelled = true;
      };
    }, [ready, refresh]),
  );

  const toggleSync = async (next: boolean) => {
    if (!hub) return;
    const settings = await updateHubSettings(hub.id, { syncToCloud: next });
    setHub({ ...hub, settings });
    // Kick a drain right away so the user sees movement instead of waiting
    // for the next foreground / auth event.
    if (next) void runSync();
  };

  const runSync = async () => {
    setSyncing(true);
    setSyncMsg(null);
    try {
      const result = await drainOutbox();
      if (result.skipped > 0) {
        setSyncMsg("Sign in to sync.");
      } else if (result.attempted === 0) {
        setSyncMsg("Nothing to sync.");
      } else {
        const parts: string[] = [];
        if (result.pushed > 0) parts.push(`pushed ${result.pushed}`);
        if (result.failed > 0) parts.push(`failed ${result.failed}`);
        setSyncMsg(parts.join(" · "));
      }
      await refresh();
    } catch (err) {
      setSyncMsg(err instanceof Error ? err.message : "Sync failed.");
    } finally {
      setSyncing(false);
    }
  };

  if (!hub) {
    return (
      <Screen title="Hub settings">
        <Text style={styles.empty}>Loading…</Text>
      </Screen>
    );
  }

  const lastSyncedAt = hub.settings.extras?.lastSyncedAt as string | undefined;
  const settingsExtras = hub.settings as unknown as {
    lastSyncedAt?: string;
  };
  // We store `lastSyncedAt` at the top level of settings, not inside extras.
  // Accommodate both for forward compat.
  const lastSynced = lastSyncedAt ?? settingsExtras.lastSyncedAt;

  return (
    <Screen title={hub.name} subtitle="Hub settings" showBack>
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Sync</Text>
        <View style={[styles.row, { borderColor: t.rule }]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowTitle}>Sync to cloud</Text>
            <Text style={styles.rowHint}>
              {hub.settings.syncToCloud
                ? "Changes mirror to Supabase. Other devices on your account can read this hub."
                : "Everything stays on this device. Toggle on to mirror future changes to your TAKDA account."}
            </Text>
          </View>
          <Switch
            value={hub.settings.syncToCloud}
            onValueChange={toggleSync}
            trackColor={{ false: t.rule, true: t.ink }}
            thumbColor={t.paper}
            ios_backgroundColor={t.rule}
          />
        </View>
      </View>

      {hub.settings.syncToCloud && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Sync status</Text>
          <View style={[styles.row, { borderColor: t.rule }]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>
                {pending === 0
                  ? "Up to date"
                  : `${pending} change${pending === 1 ? "" : "s"} pending`}
              </Text>
              <Text style={styles.rowHint}>
                {lastSynced
                  ? `Last synced ${formatRelative(lastSynced)}`
                  : "No successful sync yet."}
              </Text>
              {syncMsg && (
                <Text style={[styles.rowHint, { color: t.ink }]}>
                  {syncMsg}
                </Text>
              )}
            </View>
            <Pressable
              onPress={runSync}
              disabled={syncing}
              style={({ pressed }) => [
                styles.syncBtn,
                { borderColor: t.rule },
                pressed && !syncing && { opacity: 0.7 },
                syncing && { opacity: 0.5 },
              ]}
            >
              {syncing ? (
                <ActivityIndicator color={t.ink} />
              ) : (
                <Text style={[styles.syncBtnLabel, { color: t.ink }]}>
                  Sync now
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      )}

      <Text style={styles.fineprint}>
        Local-first by default. The cloud copy is a mirror — your device
        is the source of truth.
      </Text>
    </Screen>
  );
}

function formatRelative(iso: string): string {
  const then = new Date(iso).getTime();
  const ago = Date.now() - then;
  if (ago < 60_000) return "just now";
  if (ago < 3_600_000) return `${Math.floor(ago / 60_000)}m ago`;
  if (ago < 86_400_000) return `${Math.floor(ago / 3_600_000)}h ago`;
  return new Date(iso).toLocaleDateString();
}

function useStyles(t: ThemeColors) {
  return StyleSheet.create({
    section: { marginBottom: 20 },
    sectionLabel: {
      fontFamily: fonts.sans,
      fontSize: 11,
      letterSpacing: 2,
      textTransform: "uppercase",
      color: t.inkFaint,
      marginBottom: 8,
    },
    row: {
      borderWidth: 1,
      borderRadius: 8,
      padding: 16,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    rowTitle: {
      fontFamily: fonts.sans,
      fontSize: 15,
      fontWeight: "500",
      color: t.ink,
    },
    rowHint: {
      fontFamily: fonts.sans,
      fontSize: 12,
      color: t.inkMuted,
      marginTop: 4,
    },
    syncBtn: {
      borderWidth: 1,
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 6,
    },
    syncBtnLabel: { fontFamily: fonts.sans, fontSize: 13, fontWeight: "500" },
    empty: { fontFamily: fonts.sans, fontSize: 14, color: t.inkMuted },
    fineprint: {
      fontFamily: fonts.sans,
      fontSize: 12,
      color: t.inkFaint,
      marginTop: 8,
    },
  });
}
