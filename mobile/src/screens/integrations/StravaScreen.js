import React, { useState, useCallback } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, Linking, RefreshControl,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFocusEffect } from '@react-navigation/native'
import {
  CaretLeft, Lightning, ArrowsClockwise, CheckCircle,
  Bicycle, Sneaker, PersonSimpleRun, Barbell,
  MapPin, Timer, ArrowUp, Heartbeat,
} from 'phosphor-react-native'
import { colors } from '../../constants/colors'
import { supabase } from '../../services/supabase'
import { integrationsService } from '../../services/integrations'

const STRAVA_ORANGE = '#FC5200'

// ── Sport colour mapping ──────────────────────────────────────────────────────
function sportColor(type) {
  const t = (type || '').toLowerCase()
  if (t.includes('run'))                            return '#EF4444' // red
  if (t.includes('ride') || t.includes('cycling')) return '#3B82F6' // blue
  if (t.includes('walk') || t.includes('hike'))    return '#22C55E' // green
  if (t.includes('swim'))                           return '#06B6D4' // cyan
  if (t.includes('weight') || t.includes('workout')) return '#F59E0B' // amber
  return '#6B7280'
}

// ── Sport icon mapping ────────────────────────────────────────────────────────
function SportIcon({ type, size = 18, color }) {
  const c = color || sportColor(type)
  switch ((type || '').toLowerCase()) {
    case 'ride': case 'virtualride': case 'ebikeride':
      return <Bicycle size={size} color={c} weight="light" />
    case 'run': case 'virtualrun':
      return <PersonSimpleRun size={size} color={c} weight="light" />
    case 'walk': case 'hike':
      return <Sneaker size={size} color={c} weight="light" />
    default:
      return <Barbell size={size} color={c} weight="light" />
  }
}

// ── Format helpers ────────────────────────────────────────────────────────────
function fmtDistance(meters) {
  if (!meters && meters !== 0) return '—'
  const km = meters / 1000
  return km >= 1 ? `${km.toFixed(1)} km` : `${Math.round(meters)} m`
}

function fmtDuration(seconds) {
  if (!seconds && seconds !== 0) return '—'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

function fmtElevation(meters) {
  return meters != null ? `${Math.round(meters)} m` : '—'
}

function fmtDate(str) {
  if (!str) return ''
  const d = new Date(str)
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

// ── Activity card ─────────────────────────────────────────────────────────────
function ActivityCard({ activity }) {
  const color = sportColor(activity.sport_type)
  return (
    <View style={styles.actCard}>
      <View style={styles.actHeader}>
        <View style={[styles.actIconWrap, { backgroundColor: color + '18' }]}>
          <SportIcon type={activity.sport_type} size={16} color={color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.actName} numberOfLines={1}>{activity.name || 'Activity'}</Text>
          <Text style={styles.actDate}>{fmtDate(activity.start_date)}</Text>
        </View>
        <View style={[styles.sportBadge, { backgroundColor: color + '18', borderColor: color + '40' }]}>
          <Text style={[styles.sportBadgeText, { color }]}>{activity.sport_type || 'Workout'}</Text>
        </View>
      </View>

      <View style={styles.actStats}>
        <View style={styles.actStat}>
          <MapPin size={12} color={colors.text.tertiary} weight="light" />
          <Text style={styles.actStatVal}>{fmtDistance(activity.distance_meters)}</Text>
        </View>
        <View style={styles.actStat}>
          <Timer size={12} color={colors.text.tertiary} weight="light" />
          <Text style={styles.actStatVal}>{fmtDuration(activity.moving_time_seconds)}</Text>
        </View>
        <View style={styles.actStat}>
          <ArrowUp size={12} color={colors.text.tertiary} weight="light" />
          <Text style={styles.actStatVal}>{fmtElevation(activity.total_elevation_gain)}</Text>
        </View>
        {activity.average_heartrate ? (
          <View style={styles.actStat}>
            <Heartbeat size={12} color={colors.text.tertiary} weight="light" />
            <Text style={styles.actStatVal}>{Math.round(activity.average_heartrate)} bpm</Text>
          </View>
        ) : null}
      </View>
    </View>
  )
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function StravaScreen({ navigation }) {
  const [user, setUser] = useState(null)
  const [integration, setIntegration] = useState(null)
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true)
    try {
      const { data: { user: u } } = await supabase.auth.getUser()
      setUser(u)
      if (!u) return

      const all = await integrationsService.getIntegrations()
      const strava = all.find(i => i.provider === 'strava') || null
      setIntegration(strava)

      if (strava) {
        const res = await integrationsService.getStravaActivities(u.id, 30)
        setActivities(res?.activities || [])
      }
    } catch (e) {
      console.warn('[StravaScreen] load error:', e)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useFocusEffect(useCallback(() => { load() }, [load]))

  const handleConnect = async () => {
    if (!user) return
    try {
      const url = await integrationsService.getStravaAuthUrl(user.id)
      if (url) await Linking.openURL(url)
      else Alert.alert('Error', 'Could not get Strava sign-in URL.')
    } catch {
      Alert.alert('Error', 'Could not open Strava. Check your connection.')
    }
  }

  const handleSync = async () => {
    if (!user) return
    setSyncing(true)
    try {
      const result = await integrationsService.syncStrava(user.id)
      const count = result?.synced_count ?? 0
      Alert.alert('Synced', `${count} activit${count !== 1 ? 'ies' : 'y'} synced from Strava.`)
      load()
    } catch {
      Alert.alert('Sync failed', 'Could not sync activities. Please try again.')
    } finally {
      setSyncing(false)
    }
  }

  const athlete = integration?.metadata || {}
  const athleteName = athlete.firstname
    ? `${athlete.firstname} ${athlete.lastname || ''}`.trim()
    : null

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
          <Lightning size={18} color={STRAVA_ORANGE} weight="fill" />
          <Text style={styles.headerText}>Strava</Text>
        </View>
        {integration ? (
          <TouchableOpacity
            onPress={handleSync}
            disabled={syncing}
            hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
          >
            {syncing
              ? <ActivityIndicator size="small" color={STRAVA_ORANGE} />
              : <ArrowsClockwise size={20} color={STRAVA_ORANGE} weight="light" />
            }
          </TouchableOpacity>
        ) : (
          <View style={{ width: 22 }} />
        )}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={STRAVA_ORANGE} />
        </View>
      ) : !integration ? (
        /* ── Not connected ── */
        <View style={styles.center}>
          <View style={styles.connectBox}>
            <View style={styles.connectIcon}>
              <Lightning size={32} color={STRAVA_ORANGE} weight="fill" />
            </View>
            <Text style={styles.connectTitle}>Connect Strava</Text>
            <Text style={styles.connectDesc}>
              Sync your runs, rides, and workouts into TAKDA.
            </Text>
            <TouchableOpacity style={styles.connectBtn} onPress={handleConnect} activeOpacity={0.85}>
              <Lightning size={16} color="#fff" weight="fill" />
              <Text style={styles.connectBtnText}>Connect with Strava</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        /* ── Connected ── */
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); load(true) }}
              tintColor={colors.text.tertiary}
            />
          }
        >
          {/* Profile — flat, no card */}
          <View style={styles.profile}>
            <View style={styles.profileAvatar}>
              <Lightning size={20} color={STRAVA_ORANGE} weight="fill" />
            </View>
            <View>
              <Text style={styles.profileName}>{athleteName || 'Strava Athlete'}</Text>
              {athlete.username ? (
                <Text style={styles.profileUsername}>@{athlete.username}</Text>
              ) : null}
            </View>
            <View style={styles.connectedBadge}>
              <CheckCircle size={12} color={colors.status.success} weight="fill" />
              <Text style={styles.connectedText}>Connected</Text>
            </View>
          </View>

          {/* Stats row */}
          {activities.length > 0 && (() => {
            const totalDist = activities.reduce((s, a) => s + (a.distance_meters || 0), 0)
            const totalTime = activities.reduce((s, a) => s + (a.moving_time_seconds || 0), 0)
            const totalElev = activities.reduce((s, a) => s + (a.total_elevation_gain || 0), 0)
            return (
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{activities.length}</Text>
                  <Text style={styles.statLabel}>Activities</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{fmtDistance(totalDist)}</Text>
                  <Text style={styles.statLabel}>Distance</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{fmtDuration(totalTime)}</Text>
                  <Text style={styles.statLabel}>Time</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{fmtElevation(totalElev)}</Text>
                  <Text style={styles.statLabel}>Elevation</Text>
                </View>
              </View>
            )
          })()}

          {/* Activities */}
          <Text style={styles.sectionLabel}>Recent Activities</Text>

          {activities.length === 0 ? (
            <View style={styles.emptyBox}>
              <Lightning size={28} color={colors.text.tertiary} weight="light" />
              <Text style={styles.emptyText}>No activities yet. Tap Sync to pull from Strava.</Text>
            </View>
          ) : (
            activities.map(act => (
              <ActivityCard key={act.id || act.strava_id} activity={act} />
            ))
          )}

          <View style={{ height: 80 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border.primary,
  },
  headerTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  // ── Not connected ──────────────────────────────────────────────────────────
  connectBox: {
    alignItems: 'center',
    gap: 14,
    maxWidth: 280,
  },
  connectIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: STRAVA_ORANGE + '15',
    borderWidth: 1,
    borderColor: STRAVA_ORANGE + '30',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  connectTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
  },
  connectDesc: {
    fontSize: 14,
    color: colors.text.tertiary,
    textAlign: 'center',
    lineHeight: 20,
  },
  connectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: STRAVA_ORANGE,
    paddingHorizontal: 24,
    paddingVertical: 13,
    borderRadius: 14,
    marginTop: 8,
  },
  connectBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  // ── Connected ──────────────────────────────────────────────────────────────
  scroll: {
    padding: 16,
  },
  profile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 4,
    marginBottom: 16,
  },
  profileAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: STRAVA_ORANGE + '15',
    borderWidth: 1,
    borderColor: STRAVA_ORANGE + '30',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text.primary,
    flex: 1,
  },
  profileUsername: {
    fontSize: 12,
    color: colors.text.tertiary,
    marginTop: 1,
  },
  connectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.status.success + '15',
    borderWidth: 0.5,
    borderColor: colors.status.success + '40',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  connectedText: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.status.success,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: colors.border.primary,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
  },
  statValue: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text.primary,
  },
  statLabel: {
    fontSize: 10,
    color: colors.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statDivider: {
    width: 0.5,
    height: 28,
    backgroundColor: colors.border.primary,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.text.tertiary,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 10,
    marginLeft: 2,
  },
  // ── Activity card ──────────────────────────────────────────────────────────
  actCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: colors.border.primary,
    padding: 12,
    marginBottom: 8,
    gap: 10,
  },
  actHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  actIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actName: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text.primary,
  },
  actDate: {
    fontSize: 11,
    color: colors.text.tertiary,
    marginTop: 1,
  },
  sportBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 0.5,
  },
  sportBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  actStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actStatVal: {
    fontSize: 12,
    color: colors.text.secondary,
  },
  // ── Empty ──────────────────────────────────────────────────────────────────
  emptyBox: {
    alignItems: 'center',
    gap: 10,
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 13,
    color: colors.text.tertiary,
    textAlign: 'center',
    lineHeight: 19,
  },
})
