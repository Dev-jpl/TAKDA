import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, RefreshControl, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import {
  CaretLeft, Footprints, Fire, MapPin, Lightning,
} from 'phosphor-react-native';
import { colors } from '../../constants/colors';
import { supabase } from '../../services/supabase';
import { fitnessService } from '../../services/fitness';

export default function FitnessScreen({ navigation }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({ steps: 0, distance: 0, calories: 0, heartRate: null });
  const [history, setHistory] = useState([]);
  const [isConnected, setIsConnected] = useState(false);

  const loadData = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const { data: { user: u } } = await supabase.auth.getUser();
      setUser(u);
      if (u) {
        const [current, hist] = await Promise.all([
          fitnessService.getTodayStats(),
          fitnessService.getSummary(u.id),
        ]);
        setStats(current);
        setHistory(hist);
        setIsConnected(current.steps > 0 || current.calories > 0);
      }
    } catch (e) {
      console.warn('[FitnessScreen] load error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const handleConnect = async () => {
    setSyncing(true);
    try {
      const success = await fitnessService.requestPermissions();
      if (success) {
        setIsConnected(true);
        loadData();
        Alert.alert('Connected', 'TAKDA is now syncing with your fitness data.');
      }
    } catch (e) {
      Alert.alert('Connection Failed', e.message || 'Could not connect to health services.');
    } finally {
      setSyncing(false);
    }
  };

  const handleSync = async () => {
    if (!user) return;
    setSyncing(true);
    try {
      const result = await fitnessService.syncWithBackend(user.id);
      if (result.status === 'success') {
        loadData();
        Alert.alert('Synced', 'Your latest fitness data has been uploaded.');
      } else {
        throw new Error(result.message);
      }
    } catch (e) {
      Alert.alert('Sync failed', e.message || 'Could not sync data. Please try again.');
    } finally {
      setSyncing(false);
    }
  };

  const formatDistance = (m) => {
    const km = m / 1000;
    return km >= 1 ? `${km.toFixed(2)} km` : `${Math.round(m)} m`;
  };
  const formatCalories = (c) => `${Math.round(c)} kcal`;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
        >
          <CaretLeft size={22} color={colors.text.secondary} weight="light" />
        </TouchableOpacity>
        <View style={styles.headerTitle}>
          <Footprints size={18} color={colors.status.success} weight="fill" />
          <Text style={styles.headerText}>Fitness</Text>
        </View>
        {isConnected ? (
          <TouchableOpacity
            onPress={handleSync}
            disabled={syncing}
            hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
          >
            {syncing
              ? <ActivityIndicator size="small" color={colors.status.success} />
              : <Lightning size={20} color={colors.status.success} weight="light" />
            }
          </TouchableOpacity>
        ) : (
          <View style={{ width: 22 }} />
        )}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.status.success} />
        </View>
      ) : !isConnected ? (
        <View style={styles.center}>
          <View style={styles.connectBox}>
            <View style={styles.connectIcon}>
              <Footprints size={32} color={colors.status.success} weight="fill" />
            </View>
            <Text style={styles.connectTitle}>Connect Fitness</Text>
            <Text style={styles.connectDesc}>
              Automatically track your steps, activity, and health data from{' '}
              {Platform.OS === 'ios' ? 'Apple HealthKit' : 'Health Connect'}.
            </Text>
            <TouchableOpacity style={styles.connectBtn} onPress={handleConnect} activeOpacity={0.85}>
              <Footprints size={16} color="#fff" weight="fill" />
              <Text style={styles.connectBtnText}>Enable Tracking</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); loadData(true); }}
              tintColor={colors.text.tertiary}
            />
          }
        >
          {/* Today card */}
          <View style={styles.mainCard}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Today's Activity</Text>
              <Text style={styles.cardSub}>
                {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>

            <View style={styles.stepsWrap}>
              <Text style={styles.stepsVal}>{stats.steps.toLocaleString()}</Text>
              <Text style={styles.stepsLabel}>STEPS</Text>
            </View>

            <View style={styles.metricsRow}>
              <View style={styles.metricItem}>
                <Fire size={16} color={colors.status.high} weight="fill" />
                <Text style={styles.metricVal}>{formatCalories(stats.calories)}</Text>
                <Text style={styles.metricLabel}>Calories</Text>
              </View>
              <View style={styles.metricDivider} />
              <View style={styles.metricItem}>
                <MapPin size={16} color={colors.status.info} weight="fill" />
                <Text style={styles.metricVal}>{formatDistance(stats.distance)}</Text>
                <Text style={styles.metricLabel}>Distance</Text>
              </View>
            </View>
          </View>

          {/* History */}
          <Text style={styles.sectionLabel}>Past 7 Days</Text>
          {history.length === 0 ? (
            <View style={styles.emptyBox}>
              <Footprints size={28} color={colors.text.tertiary} weight="light" />
              <Text style={styles.emptyText}>No historical data yet. Sync to get started.</Text>
            </View>
          ) : (
            history.map((item) => (
              <View key={item.date} style={styles.historyItem}>
                <View style={styles.historyInfo}>
                  <Text style={styles.historyDate}>
                    {new Date(item.date).toLocaleDateString(undefined, {
                      weekday: 'short', month: 'short', day: 'numeric',
                    })}
                  </Text>
                  <Text style={styles.historySteps}>{item.steps.toLocaleString()} steps</Text>
                </View>
                <View style={styles.historyBar}>
                  <View style={[styles.barFill, { width: `${Math.min(100, (item.steps / 10000) * 100)}%` }]} />
                </View>
              </View>
            ))
          )}

          <View style={{ height: 80 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background.primary },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border.primary,
  },
  headerTitle: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerText: { fontSize: 16, fontWeight: '600', color: colors.text.primary },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  // ── Not connected ────────────────────────────────────────────────────────────
  connectBox: { alignItems: 'center', gap: 14, maxWidth: 280 },
  connectIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: colors.status.success + '15',
    borderWidth: 1,
    borderColor: colors.status.success + '30',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  connectTitle: { fontSize: 18, fontWeight: '600', color: colors.text.primary },
  connectDesc: { fontSize: 14, color: colors.text.tertiary, textAlign: 'center', lineHeight: 20 },
  connectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.status.success,
    paddingHorizontal: 24,
    paddingVertical: 13,
    borderRadius: 14,
    marginTop: 8,
  },
  connectBtnText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  // ── Connected ────────────────────────────────────────────────────────────────
  scroll: { padding: 16 },
  mainCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: colors.border.primary,
    padding: 16,
    marginBottom: 20,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  cardTitle: { fontSize: 15, fontWeight: '600', color: colors.text.primary },
  cardSub: { fontSize: 11, color: colors.text.tertiary },
  stepsWrap: { alignItems: 'center', marginBottom: 20 },
  stepsVal: { fontSize: 48, fontWeight: '800', color: colors.text.primary, letterSpacing: -1 },
  stepsLabel: { fontSize: 11, fontWeight: '600', color: colors.text.tertiary, letterSpacing: 2 },
  metricsRow: {
    flexDirection: 'row',
    borderTopWidth: 0.5,
    borderTopColor: colors.border.primary,
    paddingTop: 16,
  },
  metricItem: { flex: 1, alignItems: 'center', gap: 4 },
  metricVal: { fontSize: 14, fontWeight: '700', color: colors.text.primary },
  metricLabel: {
    fontSize: 10,
    color: colors.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  metricDivider: { width: 0.5, height: 28, backgroundColor: colors.border.primary },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.text.tertiary,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 10,
    marginLeft: 2,
  },
  historyItem: {
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: colors.border.primary,
    padding: 12,
    marginBottom: 8,
    gap: 10,
  },
  historyInfo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  historyDate: { fontSize: 13, color: colors.text.primary, fontWeight: '500' },
  historySteps: { fontSize: 13, color: colors.status.success, fontWeight: '600' },
  historyBar: {
    height: 4,
    backgroundColor: colors.background.primary,
    borderRadius: 2,
    overflow: 'hidden',
  },
  barFill: { height: '100%', backgroundColor: colors.status.success },
  emptyBox: { alignItems: 'center', gap: 10, paddingVertical: 40 },
  emptyText: { fontSize: 13, color: colors.text.tertiary, textAlign: 'center', lineHeight: 19 },
});
