import React, { useState, useCallback, useRef } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, Animated,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFocusEffect } from '@react-navigation/native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { supabase } from '../../services/supabase'
import { vaultService } from '../../services/vault'
import { API_URL } from '../../services/apiConfig'
import { useAlySheet } from '../../context/AlySheetContext'
import { colors } from '../../constants/colors'
import { ASSISTANT_NAME } from '../../constants/brand'
import SpaceIcon from '../../components/common/SpaceIcon'
import { MarkdownRenderer } from '../../components/common/MarkdownRenderer'
import VaultCaptureSheet from '../vault/VaultCaptureSheet'
import {
  List, User, Sparkle, CheckCircle, ListChecks,
  Tray, ArrowRight, CalendarBlank, PersonSimpleRun,
  Lightning, Clock, ArrowSquareOut, Fire,
} from 'phosphor-react-native'

const PINNED_KEY = 'pinned_hubs'

// ── Type config ───────────────────────────────────────────────────────────────
const TYPE_CONFIG = {
  task:   { label: 'Task',      color: '#F59E0B', Icon: ListChecks },
  done:   { label: 'Completed', color: '#22C55E', Icon: CheckCircle },
  vault:  { label: 'Captured',  color: '#3B82F6', Icon: Tray },
  event:  { label: 'Event',     color: '#8B5CF6', Icon: CalendarBlank },
  strava: { label: 'Activity',  color: '#FC4C02', Icon: PersonSimpleRun },
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function formatDate() {
  return new Date().toLocaleDateString('en-PH', {
    weekday: 'long', month: 'long', day: 'numeric',
  })
}

function timeAgo(dateStr) {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function timeUntil(dateStr) {
  if (!dateStr) return ''
  const diff = new Date(dateStr).getTime() - Date.now()
  if (diff <= 0) return 'now'
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `in ${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `in ${hrs}h`
  return `in ${Math.floor(hrs / 24)}d`
}

function isToday(dateStr) {
  if (!dateStr) return false
  return new Date(dateStr).toDateString() === new Date().toDateString()
}

function getContextualPrompt(overdueTasks, vaultCount, nextUp) {
  if (overdueTasks > 0)
    return `${overdueTasks} task${overdueTasks > 1 ? 's' : ''} overdue — help prioritize?`
  if (nextUp?.type === 'event')
    return `Prep notes for "${nextUp.title}"?`
  if (vaultCount > 0)
    return `Sort your ${vaultCount} capture${vaultCount > 1 ? 's' : ''}?`
  return `Ask ${ASSISTANT_NAME} anything`
}

// ── Next Up Card ──────────────────────────────────────────────────────────────
function NextUpCard({ item, onPress }) {
  if (!item) return null
  const isEvent = item.type === 'event'
  const color = isEvent ? '#8B5CF6' : '#F59E0B'
  const Icon = isEvent ? CalendarBlank : ListChecks
  const until = timeUntil(item.ts)

  return (
    <TouchableOpacity style={[styles.nextUpCard, { borderColor: color + '40' }]} onPress={onPress} activeOpacity={0.8}>
      <View style={[styles.nextUpIcon, { backgroundColor: color + '20' }]}>
        <Icon size={18} color={color} weight="duotone" />
      </View>
      <View style={styles.nextUpContent}>
        <Text style={styles.nextUpLabel}>NEXT UP</Text>
        <Text style={styles.nextUpTitle} numberOfLines={1}>{item.title}</Text>
        {item.subtitle ? <Text style={styles.nextUpSub} numberOfLines={1}>{item.subtitle}</Text> : null}
      </View>
      <View style={styles.nextUpRight}>
        <Text style={[styles.nextUpTime, { color }]}>{until}</Text>
        <ArrowSquareOut size={14} color={color} />
      </View>
    </TouchableOpacity>
  )
}

// ── Timeline Item ─────────────────────────────────────────────────────────────
function TimelineItem({ item, onPress, onComplete }) {
  const key = item.type === 'task' && item.status === 'done' ? 'done' : item.type
  const { label, color, Icon } = TYPE_CONFIG[key] || TYPE_CONFIG.task
  const isDone = key === 'done'
  const isActiveTask = item.type === 'task' && !isDone
  const [completing, setCompleting] = useState(false)

  const handleComplete = async () => {
    setCompleting(true)
    await onComplete?.(item.id)
  }

  return (
    <TouchableOpacity style={styles.timelineItem} onPress={onPress} activeOpacity={0.75}>
      <View style={styles.timelineLeft}>
        <View style={[styles.timelineDot, { backgroundColor: color + '25' }]}>
          <Icon size={14} color={color} weight={isDone ? 'fill' : 'regular'} />
        </View>
        <View style={styles.timelineLine} />
      </View>
      <View style={styles.timelineContent}>
        <View style={styles.timelineHeader}>
          <Text style={[styles.timelineType, { color }]}>{label}</Text>
          <Text style={styles.timelineTime}>{timeAgo(item.ts)}</Text>
        </View>
        <Text style={styles.timelineTitle} numberOfLines={2}>{item.title}</Text>
        {item.subtitle ? (
          <Text style={styles.timelineSubtitle} numberOfLines={1}>{item.subtitle}</Text>
        ) : null}
        {item.priority && isActiveTask && (
          <View style={[styles.priorityBadge, {
            backgroundColor: item.priority === 'urgent' ? '#EF444425' :
              item.priority === 'high' ? '#F9731625' : colors.border.primary
          }]}>
            <Text style={[styles.priorityText, {
              color: item.priority === 'urgent' ? '#EF4444' :
                item.priority === 'high' ? '#F97316' : colors.text.tertiary
            }]}>{item.priority}</Text>
          </View>
        )}
      </View>
      {isActiveTask && (
        <TouchableOpacity
          style={[styles.checkBtn, completing && styles.checkBtnDone]}
          onPress={handleComplete}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 4 }}
        >
          <CheckCircle
            size={22}
            color={completing ? '#22C55E' : colors.border.primary}
            weight={completing ? 'fill' : 'regular'}
          />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  )
}

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function HomeScreen({ navigation }) {
  const { openSheet } = useAlySheet()
  const [user, setUser] = useState(null)
  const [pinnedHubs, setPinnedHubs] = useState([])
  const [vaultCount, setVaultCount] = useState(0)
  const [activeTaskCount, setActiveTaskCount] = useState(0)
  const [overdueCount, setOverdueCount] = useState(0)
  const [todayEventCount, setTodayEventCount] = useState(0)
  const [weekDoneCount, setWeekDoneCount] = useState(0)
  const [dailyInsight, setDailyInsight] = useState('')
  const [nextUp, setNextUp] = useState(null)
  const [timeline, setTimeline] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [captureVisible, setCaptureVisible] = useState(false)
  const insightOpacity = useRef(new Animated.Value(0)).current

  useFocusEffect(
    useCallback(() => {
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (user) { setUser(user); loadData(user) }
      })
    }, [])
  )

  const loadData = async (u, isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    try {
      const now = new Date()
      const nowIso = now.toISOString()
      const lookback12h = new Date(now.getTime() - 12 * 60 * 60 * 1000).toISOString()
      const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0)
      const todayEnd = new Date(now); todayEnd.setHours(23, 59, 59, 999)
      const weekStart = new Date(now); weekStart.setDate(now.getDate() - 7)

      const [raw, vaultItems, insightRes] = await Promise.all([
        AsyncStorage.getItem(PINNED_KEY),
        vaultService.getItems(u.id, 'unprocessed').catch(() => []),
        fetch(`${API_URL}/aly/daily-insight?user_id=${u.id}`).then(r => r.json()).catch(() => ({})),
      ])

      if (insightRes?.insight) {
        setDailyInsight(insightRes.insight)
        Animated.timing(insightOpacity, { toValue: 1, duration: 600, useNativeDriver: true }).start()
      }

      setPinnedHubs(raw ? JSON.parse(raw) : [])
      const vaultArr = Array.isArray(vaultItems) ? vaultItems : []
      setVaultCount(vaultArr.length)

      // Today's events count
      const { data: eventsToday = [] } = await supabase
        .from('events').select('id')
        .eq('user_id', u.id)
        .gte('start_at', lookback12h)
        .lte('start_at', todayEnd.toISOString())
      setTodayEventCount((eventsToday || []).length)

      // Tasks
      const { data: allTasks = [] } = await supabase
        .from('tasks').select('id,title,status,priority,due_date,created_at,updated_at')
        .eq('user_id', u.id)
        .order('updated_at', { ascending: false })
        .limit(20)

      const active = (allTasks || []).filter(t => t.status !== 'done')
      const overdue = active.filter(t => t.due_date && new Date(t.due_date) < now)
      setActiveTaskCount(active.length)
      setOverdueCount(overdue.length)

      // Tasks done this week
      const { data: weekDone = [] } = await supabase
        .from('tasks').select('id')
        .eq('user_id', u.id).eq('status', 'done')
        .gte('updated_at', weekStart.toISOString())
      setWeekDoneCount((weekDone || []).length)

      // Next upcoming event
      const { data: nextEvents = [] } = await supabase
        .from('events').select('id,title,start_at,location')
        .eq('user_id', u.id)
        .gte('start_at', nowIso)
        .order('start_at', { ascending: true })
        .limit(1)

      // Next due task
      const nextTask = active
        .filter(t => t.due_date)
        .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))[0]

      const nextEvent = nextEvents?.[0]
      let nextUpItem = null
      if (nextEvent && nextTask) {
        nextUpItem = new Date(nextEvent.start_at) < new Date(nextTask.due_date)
          ? { type: 'event', id: nextEvent.id, title: nextEvent.title, subtitle: nextEvent.location, ts: nextEvent.start_at }
          : { type: 'task',  id: nextTask.id,  title: nextTask.title,  subtitle: `Due ${nextTask.due_date}`, ts: nextTask.due_date }
      } else if (nextEvent) {
        nextUpItem = { type: 'event', id: nextEvent.id, title: nextEvent.title, subtitle: nextEvent.location, ts: nextEvent.start_at }
      } else if (nextTask) {
        nextUpItem = { type: 'task', id: nextTask.id, title: nextTask.title, subtitle: `Due ${nextTask.due_date}`, ts: nextTask.due_date }
      }
      setNextUp(nextUpItem)

      // Recent vault items
      const { data: recentVault = [] } = await supabase
        .from('vault_items').select('id,content,created_at')
        .eq('user_id', u.id)
        .order('created_at', { ascending: false }).limit(3)

      // Today's events for timeline
      const { data: recentEvents = [] } = await supabase
        .from('events').select('id,title,start_at,location')
        .eq('user_id', u.id)
        .gte('start_at', lookback12h)
        .lte('start_at', todayEnd.toISOString())
        .order('start_at', { ascending: false }).limit(3)

      // Recent Strava
      const { data: stravaRes = [] } = await supabase
        .from('strava_activities')
        .select('id,name,sport_type,distance_meters,moving_time_seconds,start_date')
        .eq('user_id', u.id)
        .order('start_date', { ascending: false }).limit(2)

      // Build today-only timeline, max 5
      const todayTasks = (allTasks || [])
        .filter(t => isToday(t.updated_at || t.created_at))
        .map(t => ({ type: 'task', id: t.id, title: t.title, status: t.status, priority: t.priority, ts: t.updated_at || t.created_at }))

      const todayVault = (recentVault || [])
        .filter(v => isToday(v.created_at))
        .map(v => ({ type: 'vault', id: v.id, title: v.content?.slice(0, 80) || 'Vault item', ts: v.created_at }))

      const todayEvents = (recentEvents || []).map(e => ({
        type: 'event', id: e.id, title: e.title, subtitle: e.location, ts: e.start_at,
      }))

      const todayStrava = (stravaRes || [])
        .filter(s => isToday(s.start_date))
        .map(s => {
          const km = s.distance_meters ? (s.distance_meters / 1000).toFixed(1) : null
          const mins = s.moving_time_seconds ? Math.round(s.moving_time_seconds / 60) : null
          return {
            type: 'strava', id: s.id,
            title: s.name || s.sport_type || 'Activity',
            subtitle: [km && `${km} km`, mins && `${mins} min`].filter(Boolean).join(' · '),
            ts: s.start_date,
          }
        })

      const merged = [...todayTasks, ...todayVault, ...todayEvents, ...todayStrava]
        .sort((a, b) => new Date(b.ts) - new Date(a.ts))
        .slice(0, 5)

      setTimeline(merged)
    } catch (e) {
      console.warn('HomeScreen loadData error:', e)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const completeTask = async (taskId) => {
    // Optimistic update
    setTimeline(prev => prev.map(t =>
      t.id === taskId ? { ...t, status: 'done' } : t
    ))
    setActiveTaskCount(c => Math.max(0, c - 1))
    await supabase.from('tasks').update({ status: 'done', updated_at: new Date().toISOString() }).eq('id', taskId)
    setWeekDoneCount(c => c + 1)
  }

  const navigateToHub = (hub) => {
    navigation.navigate('Main', {
      screen: hub.space_id,
      params: { screen: 'Hub', params: { hub, space: { id: hub.space_id } } },
    })
  }

  const displayName = user?.user_metadata?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'there'
  const contextualPrompt = getContextualPrompt(overdueCount, vaultCount, nextUp)

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <ActivityIndicator style={{ flex: 1 }} color={colors.text.tertiary} />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.openDrawer()} hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }} style={styles.menuBtn}>
          <List color={colors.text.secondary} size={22} weight="light" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('Profile')} hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}>
          <User color={colors.text.secondary} size={20} weight="light" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadData(user, true)} tintColor={colors.text.tertiary} />}
      >
        {/* ── STATUS CARD ─────────────────────────────────────────── */}
        <View style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <View>
              <Text style={styles.greetingText}>{getGreeting()}, {displayName}</Text>
              <Text style={styles.greetingDate}>{formatDate()}</Text>
            </View>
          </View>

          {/* Stats */}
          <View style={styles.statsRow}>
            <View style={[styles.statChip, { backgroundColor: '#F59E0B20', borderColor: '#F59E0B50' }]}>
              <ListChecks size={13} color="#F59E0B" weight="bold" />
              <Text style={[styles.statValue, { color: '#F59E0B' }]}>{activeTaskCount}</Text>
              <Text style={[styles.statLabel, { color: '#F59E0BAA' }]}>active</Text>
            </View>
            {todayEventCount > 0 && (
              <TouchableOpacity style={[styles.statChip, { backgroundColor: '#8B5CF620', borderColor: '#8B5CF650' }]} onPress={() => navigation.navigate('Calendar')}>
                <CalendarBlank size={13} color="#8B5CF6" weight="bold" />
                <Text style={[styles.statValue, { color: '#8B5CF6' }]}>{todayEventCount}</Text>
                <Text style={[styles.statLabel, { color: '#8B5CF6AA' }]}>today</Text>
              </TouchableOpacity>
            )}
            {vaultCount > 0 && (
              <TouchableOpacity style={[styles.statChip, { backgroundColor: '#3B82F620', borderColor: '#3B82F650' }]} onPress={() => navigation.navigate('Vault')}>
                <Tray size={13} color="#3B82F6" weight="bold" />
                <Text style={[styles.statValue, { color: '#3B82F6' }]}>{vaultCount}</Text>
                <Text style={[styles.statLabel, { color: '#3B82F6AA' }]}>to sort</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Aly Insight */}
          {dailyInsight ? (
            <Animated.View style={[styles.insightBlock, { opacity: insightOpacity }]}>
              <View style={styles.insightLabel}>
                <Lightning size={11} color={colors.modules.aly} weight="fill" />
                <Text style={styles.insightLabelText}>{ASSISTANT_NAME}'s take</Text>
              </View>
              <MarkdownRenderer content={dailyInsight} />
            </Animated.View>
          ) : null}
        </View>

        {/* ── NEXT UP ─────────────────────────────────────────────── */}
        {nextUp && (
          <NextUpCard
            item={nextUp}
            onPress={() => {
              if (nextUp.type === 'event') navigation.navigate('Calendar')
            }}
          />
        )}

        {/* ── QUICK ACTIONS ───────────────────────────────────────── */}
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={[styles.quickBtn, styles.quickBtnPrimary]}
            onPress={() => openSheet(contextualPrompt !== `Ask ${ASSISTANT_NAME} anything` ? contextualPrompt : undefined)}
            activeOpacity={0.85}
          >
            <Sparkle size={15} color="#fff" weight="fill" />
            <Text style={styles.quickBtnTextPrimary} numberOfLines={1}>{contextualPrompt}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickBtnSecondary} onPress={() => setCaptureVisible(true)}>
            <Tray size={18} color={colors.text.secondary} />
          </TouchableOpacity>
        </View>

        {/* ── PINNED HUBS ─────────────────────────────────────────── */}
        {pinnedHubs.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>PINNED</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pinnedRow}>
              {pinnedHubs.map(hub => (
                <TouchableOpacity key={hub.id} style={styles.pinnedItem} onPress={() => navigateToHub(hub)} activeOpacity={0.75}>
                  <SpaceIcon icon={hub.icon || 'Folder'} color={hub.color || colors.modules.track} size={44} iconSize={20} weight="light" />
                  <Text style={styles.pinnedName} numberOfLines={1}>{hub.name}</Text>
                  <Text style={styles.pinnedSpace} numberOfLines={1}>{hub.space_name || ''}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* ── TIMELINE ────────────────────────────────────────────── */}
        {timeline.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionRow}>
              <Text style={styles.sectionLabel}>TODAY</Text>
              <View style={styles.sectionRowRight}>
                {weekDoneCount > 0 && (
                  <View style={styles.momentumBadge}>
                    <Fire size={11} color="#F59E0B" weight="fill" />
                    <Text style={styles.momentumText}>{weekDoneCount} done this week</Text>
                  </View>
                )}
              </View>
            </View>

            {timeline.map(item => (
              <TimelineItem
                key={`${item.type}-${item.id}`}
                item={item}
                onComplete={item.type === 'task' ? completeTask : undefined}
                onPress={() => {
                  if (item.type === 'vault') navigation.navigate('Vault')
                  else if (item.type === 'event') navigation.navigate('Calendar')
                  else if (item.type === 'strava') navigation.navigate('Strava')
                }}
              />
            ))}

            <TouchableOpacity style={styles.viewMoreBtn} onPress={() => navigation.navigate('History')}>
              <Text style={styles.viewMoreText}>View full history</Text>
              <ArrowRight size={12} color={colors.text.tertiary} />
            </TouchableOpacity>
          </View>
        )}

        {timeline.length === 0 && (
          <TouchableOpacity style={styles.emptyTimeline} onPress={openSheet} activeOpacity={0.85}>
            <Sparkle size={20} color={colors.modules.aly} weight="fill" />
            <Text style={styles.emptyTimelineText}>Talk to {ASSISTANT_NAME} to get started</Text>
            <ArrowRight size={14} color={colors.modules.aly} weight="light" />
          </TouchableOpacity>
        )}
      </ScrollView>

      <VaultCaptureSheet
        visible={captureVisible}
        onClose={() => setCaptureVisible(false)}
        onCapture={() => { setCaptureVisible(false); loadData(user, true) }}
      />
    </SafeAreaView>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background.primary },
  scroll: { paddingHorizontal: 16, paddingBottom: 120, gap: 12 },
  topBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 12, paddingHorizontal: 16,
  },
  menuBtn: { padding: 4, marginLeft: -4 },

  // Status Card
  statusCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: 20, borderWidth: 0.5, borderColor: colors.border.primary,
    padding: 20, gap: 14,
  },
  statusHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  greetingText: { fontSize: 20, fontWeight: '600', color: colors.text.primary },
  greetingDate: { fontSize: 12, color: colors.text.tertiary, marginTop: 2 },

  // Stats
  statsRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  statChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7, borderWidth: 1,
  },
  statValue: { fontSize: 15, fontWeight: '800' },
  statLabel: { fontSize: 11, fontWeight: '500' },

  // Insight
  insightBlock: { borderTopWidth: 0.5, borderTopColor: colors.border.primary, paddingTop: 14, gap: 8 },
  insightLabel: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  insightLabelText: {
    fontSize: 10, fontWeight: '700', color: colors.modules.aly,
    letterSpacing: 0.5, textTransform: 'uppercase',
  },

  // Next Up Card
  nextUpCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.background.secondary,
    borderRadius: 16, borderWidth: 1, padding: 14,
  },
  nextUpIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  nextUpContent: { flex: 1, gap: 2 },
  nextUpLabel: { fontSize: 9, fontWeight: '800', color: colors.text.tertiary, letterSpacing: 1, textTransform: 'uppercase' },
  nextUpTitle: { fontSize: 14, fontWeight: '600', color: colors.text.primary },
  nextUpSub: { fontSize: 11, color: colors.text.tertiary },
  nextUpRight: { alignItems: 'flex-end', gap: 4 },
  nextUpTime: { fontSize: 12, fontWeight: '700' },

  // Quick Actions
  quickActions: { flexDirection: 'row', gap: 8 },
  quickBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderRadius: 14, paddingVertical: 14, paddingHorizontal: 16,
  },
  quickBtnPrimary: { backgroundColor: colors.modules.aly },
  quickBtnSecondary: {
    width: 50, alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.background.secondary,
    borderRadius: 14, borderWidth: 0.5, borderColor: colors.border.primary,
  },
  quickBtnTextPrimary: { fontSize: 13, fontWeight: '600', color: '#fff', flex: 1 },

  // Section
  section: { gap: 10 },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionRowRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sectionLabel: { fontSize: 10, fontWeight: '700', color: colors.text.tertiary, letterSpacing: 1.5 },

  // Momentum
  momentumBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#F59E0B15', borderRadius: 20,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  momentumText: { fontSize: 10, color: '#F59E0B', fontWeight: '600' },

  // Pinned
  pinnedRow: { gap: 12, paddingRight: 4 },
  pinnedItem: { alignItems: 'center', width: 70, gap: 6 },
  pinnedName: { fontSize: 11, fontWeight: '500', color: colors.text.primary, textAlign: 'center' },
  pinnedSpace: { fontSize: 10, color: colors.text.tertiary, textAlign: 'center' },

  // Timeline
  timelineItem: { flexDirection: 'row', gap: 12, minHeight: 56 },
  timelineLeft: { width: 28, alignItems: 'center' },
  timelineDot: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', zIndex: 1 },
  timelineLine: { flex: 1, width: 1, backgroundColor: colors.border.primary, marginVertical: 2 },
  timelineContent: { flex: 1, paddingBottom: 14, gap: 3 },
  timelineHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  timelineType: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  timelineTime: { fontSize: 10, color: colors.text.tertiary },
  timelineTitle: { fontSize: 13, fontWeight: '500', color: colors.text.primary, lineHeight: 18 },
  timelineSubtitle: { fontSize: 11, color: colors.text.tertiary },
  priorityBadge: { alignSelf: 'flex-start', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  priorityText: { fontSize: 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  checkBtn: { paddingLeft: 4, justifyContent: 'center', alignSelf: 'flex-start', paddingTop: 14 },
  checkBtnDone: { opacity: 0.6 },

  // View more
  viewMoreBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 10, borderTopWidth: 0.5, borderTopColor: colors.border.primary, marginTop: 4,
  },
  viewMoreText: { fontSize: 12, color: colors.text.tertiary },

  // Empty
  emptyTimeline: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 0.5, borderColor: colors.modules.aly + '40',
    borderRadius: 16, paddingHorizontal: 20, paddingVertical: 18,
    backgroundColor: colors.modules.aly + '08',
  },
  emptyTimelineText: { flex: 1, fontSize: 14, fontWeight: '500', color: colors.modules.aly },
})
