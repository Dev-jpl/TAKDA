import React, { useState, useCallback, useMemo } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, TextInput, Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFocusEffect } from '@react-navigation/native'
import { supabase } from '../../services/supabase'
import { colors } from '../../constants/colors'
import {
  ListChecks, CheckCircle, Tray, CalendarBlank, PersonSimpleRun,
  ArrowLeft, FunnelSimple, X,
} from 'phosphor-react-native'

// ── Type config ───────────────────────────────────────────────────────────────
const TYPE_CONFIG = {
  task:   { label: 'Task',      color: '#F59E0B', Icon: ListChecks },
  done:   { label: 'Completed', color: '#22C55E', Icon: CheckCircle },
  vault:  { label: 'Captured',  color: '#3B82F6', Icon: Tray },
  event:  { label: 'Event',     color: '#8B5CF6', Icon: CalendarBlank },
  strava: { label: 'Activity',  color: '#FC4C02', Icon: PersonSimpleRun },
}

const FILTERS = ['all', 'task', 'vault', 'event', 'strava']
const FILTER_LABELS = { all: 'All', task: 'Tasks', vault: 'Vault', event: 'Events', strava: 'Strava' }

// ── Helpers ───────────────────────────────────────────────────────────────────
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

function formatGroupLabel(dateStr) {
  const d = new Date(dateStr)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000)
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return d.toLocaleDateString('en-PH', { weekday: 'long' })
  return d.toLocaleDateString('en-PH', { month: 'long', day: 'numeric' })
}

function groupByDate(entries) {
  const map = new Map()
  for (const e of entries) {
    const key = new Date(e.ts).toDateString()
    if (!map.has(key)) map.set(key, [])
    map.get(key).push(e)
  }
  return Array.from(map.entries())
}

// ── HistoryRow ────────────────────────────────────────────────────────────────
function HistoryRow({ item, onComplete, onPress }) {
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
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.75}>
      <View style={[styles.rowIcon, { backgroundColor: color + '20' }]}>
        <Icon size={16} color={color} weight={isDone ? 'fill' : 'regular'} />
      </View>
      <View style={styles.rowContent}>
        <View style={styles.rowHeader}>
          <Text style={[styles.rowType, { color }]}>{label}</Text>
          <Text style={styles.rowTime}>{timeAgo(item.ts)}</Text>
        </View>
        <Text style={styles.rowTitle} numberOfLines={2}>{item.title}</Text>
        {item.subtitle ? <Text style={styles.rowSubtitle} numberOfLines={1}>{item.subtitle}</Text> : null}
        {item.priority && isActiveTask && (
          <View style={[styles.priorityBadge, {
            backgroundColor: item.priority === 'urgent' ? '#EF444425' : item.priority === 'high' ? '#F9731625' : '#ffffff10',
          }]}>
            <Text style={[styles.priorityText, {
              color: item.priority === 'urgent' ? '#EF4444' : item.priority === 'high' ? '#F97316' : colors.text.tertiary,
            }]}>{item.priority}</Text>
          </View>
        )}
      </View>
      {isActiveTask && (
        <TouchableOpacity onPress={handleComplete} hitSlop={{ top: 12, bottom: 12, left: 12, right: 8 }} style={styles.checkBtn}>
          <CheckCircle size={22} color={completing ? '#22C55E' : colors.border.primary} weight={completing ? 'fill' : 'regular'} />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  )
}

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function HistoryScreen({ navigation }) {
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [activeFilter, setActiveFilter] = useState('all')
  const [userId, setUserId] = useState(null)

  useFocusEffect(
    useCallback(() => {
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (user) {
          setUserId(user.id)
          loadData(user.id)
        }
      })
    }, [])
  )

  const loadData = async (uid, isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    try {
      const [{ data: tasks }, { data: vault }, { data: events }, { data: strava }] = await Promise.all([
        supabase.from('tasks').select('id,title,status,priority,created_at,updated_at').eq('user_id', uid).order('updated_at', { ascending: false }).limit(100),
        supabase.from('vault_items').select('id,content,created_at').eq('user_id', uid).order('created_at', { ascending: false }).limit(50),
        supabase.from('events').select('id,title,start_at,location').eq('user_id', uid).order('start_at', { ascending: false }).limit(50),
        supabase.from('strava_activities').select('id,name,sport_type,distance_meters,moving_time_seconds,start_date').eq('user_id', uid).order('start_date', { ascending: false }).limit(30),
      ])

      const merged = [
        ...(tasks || []).map(t => ({ type: 'task', id: t.id, title: t.title, status: t.status, priority: t.priority, ts: t.updated_at || t.created_at })),
        ...(vault || []).map(v => ({ type: 'vault', id: v.id, title: (v.content || '').slice(0, 100) || 'Vault item', ts: v.created_at })),
        ...(events || []).map(e => ({ type: 'event', id: e.id, title: e.title, subtitle: e.location, ts: e.start_at })),
        ...(strava || []).map(s => {
          const km = s.distance_meters ? (s.distance_meters / 1000).toFixed(1) : null
          const mins = s.moving_time_seconds ? Math.round(s.moving_time_seconds / 60) : null
          return { type: 'strava', id: s.id, title: s.name || s.sport_type || 'Activity', subtitle: [km && `${km} km`, mins && `${mins} min`].filter(Boolean).join(' · '), ts: s.start_date }
        }),
      ].sort((a, b) => new Date(b.ts) - new Date(a.ts))

      setEntries(merged)
    } catch (e) {
      console.warn('HistoryScreen loadData error:', e)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const completeTask = async (taskId) => {
    setEntries(prev => prev.map(e => e.id === taskId ? { ...e, status: 'done' } : e))
    await supabase.from('tasks').update({ status: 'done', updated_at: new Date().toISOString() }).eq('id', taskId)
  }

  const filtered = useMemo(() => {
    if (activeFilter === 'all') return entries
    return entries.filter(e => e.type === activeFilter)
  }, [entries, activeFilter])

  const grouped = groupByDate(filtered)

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <ActivityIndicator style={{ flex: 1 }} color={colors.text.tertiary} />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}>
          <ArrowLeft size={22} color={colors.text.secondary} weight="light" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Activity History</Text>
          <Text style={styles.headerSub}>{filtered.length} entries</Text>
        </View>
        <View style={{ width: 22 }} />
      </View>

      {/* Filters */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
        {FILTERS.map(f => {
          const cfg = f === 'all' ? null : TYPE_CONFIG[f]
          const active = activeFilter === f
          return (
            <TouchableOpacity
              key={f}
              style={[styles.filterChip, active && { backgroundColor: cfg?.color || colors.modules.aly, borderColor: 'transparent' }]}
              onPress={() => setActiveFilter(f)}
              activeOpacity={0.75}
            >
              {cfg && <cfg.Icon size={12} color={active ? '#fff' : cfg.color} weight="bold" />}
              <Text style={[styles.filterText, active && { color: '#fff' }]}>{FILTER_LABELS[f]}</Text>
            </TouchableOpacity>
          )
        })}
      </ScrollView>

      {/* Timeline */}
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadData(userId, true)} tintColor={colors.text.tertiary} />}
      >
        {grouped.length === 0 ? (
          <View style={styles.empty}>
            <FunnelSimple size={28} color={colors.text.tertiary} weight="light" />
            <Text style={styles.emptyText}>No activity found</Text>
          </View>
        ) : (
          grouped.map(([dateKey, items]) => (
            <View key={dateKey} style={styles.group}>
              <View style={styles.groupHeader}>
                <Text style={styles.groupLabel}>{formatGroupLabel(items[0].ts)}</Text>
                <Text style={styles.groupCount}>{items.length} item{items.length !== 1 ? 's' : ''}</Text>
              </View>
              {items.map(item => (
                <HistoryRow
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
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background.primary },
  scroll: { paddingHorizontal: 16, paddingBottom: 100 },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
  },
  headerCenter: { alignItems: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '600', color: colors.text.primary },
  headerSub: { fontSize: 11, color: colors.text.tertiary, marginTop: 1 },

  filterRow: { paddingHorizontal: 16, gap: 8, paddingBottom: 14 },
  filterChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 20, backgroundColor: colors.background.secondary,
    borderWidth: 1, borderColor: colors.border.primary,
  },
  filterText: { fontSize: 12, fontWeight: '600', color: colors.text.tertiary },

  group: { marginBottom: 20 },
  groupHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  groupLabel: { fontSize: 11, fontWeight: '700', color: colors.text.tertiary, letterSpacing: 1, textTransform: 'uppercase' },
  groupCount: { fontSize: 10, color: colors.text.tertiary + '99' },

  row: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    backgroundColor: colors.background.secondary, borderRadius: 14,
    borderWidth: 0.5, borderColor: colors.border.primary,
    padding: 14, marginBottom: 6,
  },
  rowIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  rowContent: { flex: 1, gap: 2 },
  rowHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowType: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  rowTime: { fontSize: 10, color: colors.text.tertiary },
  rowTitle: { fontSize: 13, fontWeight: '500', color: colors.text.primary, lineHeight: 18 },
  rowSubtitle: { fontSize: 11, color: colors.text.tertiary },
  priorityBadge: { alignSelf: 'flex-start', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, marginTop: 2 },
  priorityText: { fontSize: 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  checkBtn: { paddingLeft: 4, justifyContent: 'center', alignSelf: 'flex-start', paddingTop: 8 },

  empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: 80, gap: 10 },
  emptyText: { fontSize: 14, color: colors.text.tertiary },
})
