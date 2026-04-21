import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, Animated,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFocusEffect } from '@react-navigation/native'
import { supabase } from '../../services/supabase'
import { API_URL } from '../../services/apiConfig'
import { useAlySheet } from '../../context/AlySheetContext'
import { colors } from '../../constants/colors'
import { ASSISTANT_NAME } from '../../constants/brand'
import { MarkdownRenderer } from '../../components/common/MarkdownRenderer'
import Svg, { Circle as SvgCircle, Rect as SvgRect, Text as SvgText, G as SvgG, Polyline as SvgPolyline, Polygon as SvgPolygon, Circle as SvgDot } from 'react-native-svg'
import {
  List, User, Sparkle, ArrowRight, AppWindow,
  CheckCircle, Circle, FileText, NotePencil,
  ForkKnife, CurrencyDollar, CalendarBlank, Lightning,
  Clock, Bicycle, Megaphone, Barbell, ListChecks,
  ArrowUp, Moon,
} from 'phosphor-react-native'

// ── Widget types that must always be full-width on mobile ─────────────────────
const FORCE_FULL = new Set([
  'tasks', 'notes', 'docs', 'outcomes',
  'upcoming_events', 'upcoming_global',
  'strava_stats', 'space_pulse', 'weekly_progress', 'hub_overview',
  'expense_tracker', 'calorie_counter',
])

// ── Expense category colors ───────────────────────────────────────────────────
const CAT_COLORS = {
  General:       '#94a3b8',
  Food:          '#fb923c',
  Transport:     '#60a5fa',
  Health:        '#f87171',
  Entertainment: '#c084fc',
  Shopping:      '#f472b6',
  Utilities:     '#facc15',
  Other:         '#6b7280',
}

// ── SVG Chart components ──────────────────────────────────────────────────────

const DONUT_R    = 36
const DONUT_CIRC = 2 * Math.PI * DONUT_R

function MobileDonutChart({ segments }) {
  let cumPct = 0
  return (
    <Svg width={96} height={96} viewBox="0 0 100 100">
      {/* Track */}
      <SvgCircle cx={50} cy={50} r={DONUT_R}
        fill="none" stroke="#1f2937" strokeWidth={13} />
      {segments.map((seg, i) => {
        const dash   = (seg.pct / 100) * DONUT_CIRC
        const gap    = DONUT_CIRC - dash
        const offset = DONUT_CIRC - (cumPct / 100) * DONUT_CIRC
        cumPct += seg.pct
        return (
          <SvgCircle key={i} cx={50} cy={50} r={DONUT_R}
            fill="none" stroke={seg.color} strokeWidth={13}
            strokeDasharray={`${dash} ${gap}`}
            strokeDashoffset={offset}
            rotation={-90} originX={50} originY={50}
          />
        )
      })}
    </Svg>
  )
}

function MobileBarChart({ bars, labels, color }) {
  const maxVal   = Math.max(...bars, 1)
  const count    = bars.length
  const BAR_H    = 72
  const LABEL_H  = 14
  const VIEW_W   = Math.max(count * 18, 200)

  return (
    <Svg width="100%" height={BAR_H + LABEL_H}
      viewBox={`0 0 ${VIEW_W} ${BAR_H + LABEL_H}`}
      preserveAspectRatio="none">
      {bars.map((val, i) => {
        const barW  = VIEW_W / count
        const bw    = Math.max(barW * 0.72, 4)
        const x     = i * barW + (barW - bw) / 2
        const bh    = val > 0 ? Math.max(3, (val / maxVal) * BAR_H) : 0
        return (
          <SvgG key={i}>
            {/* Track */}
            <SvgRect x={x} y={0} width={bw} height={BAR_H}
              rx={3} fill={color} fillOpacity={0.07} />
            {/* Value */}
            {bh > 0 && (
              <SvgRect x={x} y={BAR_H - bh} width={bw} height={bh}
                rx={3} fill={color} fillOpacity={0.85} />
            )}
            {/* Label */}
            <SvgText
              x={x + bw / 2} y={BAR_H + 11}
              textAnchor="middle"
              fontSize={Math.max(5, Math.min(8, barW * 0.5))}
              fill="#6b7280"
            >
              {labels[i]}
            </SvgText>
          </SvgG>
        )
      })}
    </Svg>
  )
}

// ── Widget meta (icon, label, accent color) ───────────────────────────────────
const WIDGET_META = {
  hub_overview:    { label: 'Hub Overview',   Icon: ListChecks,     accent: colors.modules.track     },
  tasks:           { label: 'Tasks',          Icon: CheckCircle,    accent: colors.modules.track     },
  notes:           { label: 'Notes',          Icon: NotePencil,     accent: colors.modules.aly       },
  docs:            { label: 'Resources',      Icon: FileText,       accent: colors.modules.knowledge },
  outcomes:        { label: 'Outcomes',       Icon: Megaphone,      accent: colors.modules.deliver   },
  calorie_counter: { label: 'Calories',       Icon: ForkKnife,      accent: '#22c55e'                },
  expense_tracker: { label: 'Expenses',       Icon: CurrencyDollar, accent: colors.modules.deliver   },
  upcoming_events: { label: 'Events',         Icon: CalendarBlank,  accent: colors.modules.automate  },
  upcoming_global: { label: 'Upcoming',       Icon: CalendarBlank,  accent: colors.modules.automate  },
  sleep_tracker:   { label: 'Sleep',          Icon: Moon,           accent: '#818cf8'                },
  workout_log:     { label: 'Workout',        Icon: Barbell,        accent: '#f59e0b'                },
  space_pulse:     { label: 'Space Pulse',    Icon: AppWindow,      accent: colors.modules.aly       },
  quick_clock:     { label: 'Clock',          Icon: Clock,          accent: colors.modules.knowledge },
  weekly_progress: { label: 'Progress',       Icon: ArrowUp,        accent: colors.modules.track     },
  strava_stats:    { label: 'Strava',         Icon: Bicycle,        accent: '#fc5200'                },
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}
function formatDate() {
  return new Date().toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric' })
}
function fmtTime(iso) {
  const d = new Date(iso)
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) +
    ' · ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
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

// ── Shared widget pieces ───────────────────────────────────────────────────────
function WidgetSkeleton() {
  return (
    <View style={wStyles.skeleton}>
      {[70, 50, 80, 45, 60].map((w, i) => (
        <View key={i} style={[wStyles.skeletonRow, { width: `${w}%` }]} />
      ))}
    </View>
  )
}
function WidgetEmpty({ label }) {
  return <Text style={wStyles.emptyText}>{label}</Text>
}

// ── TasksWidget ───────────────────────────────────────────────────────────────
function TasksWidget({ hubId }) {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    supabase.from('tasks').select('id,title,priority,status')
      .eq('hub_id', hubId).neq('status', 'done').order('created_at', { ascending: false }).limit(8)
      .then(({ data }) => setTasks(data ?? []))
      .finally(() => setLoading(false))
  }, [hubId])

  if (loading) return <WidgetSkeleton />
  if (tasks.length === 0) return <WidgetEmpty label="All tasks done" />
  return (
    <View>
      {tasks.map(t => {
        const pColor = t.priority === 'crucial' ? '#ef4444' : t.priority === 'high' ? '#f97316' : t.priority === 'medium' ? '#f59e0b' : null
        return (
          <View key={t.id} style={wStyles.listRow}>
            <Circle size={13} color={colors.text.tertiary + '60'} />
            <Text style={wStyles.listText} numberOfLines={1}>{t.title}</Text>
            {pColor && (
              <View style={[wStyles.badge, { backgroundColor: pColor + '20' }]}>
                <Text style={[wStyles.badgeText, { color: pColor }]}>{t.priority}</Text>
              </View>
            )}
          </View>
        )
      })}
    </View>
  )
}

// ── NotesWidget ───────────────────────────────────────────────────────────────
function NotesWidget({ hubId }) {
  const [notes, setNotes] = useState([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    supabase.from('annotations').select('id,content')
      .eq('hub_id', hubId).order('created_at', { ascending: false }).limit(5)
      .then(({ data }) => setNotes(data ?? []))
      .finally(() => setLoading(false))
  }, [hubId])

  if (loading) return <WidgetSkeleton />
  if (notes.length === 0) return <WidgetEmpty label="No notes yet" />
  return (
    <View>
      {notes.map(n => (
        <View key={n.id} style={wStyles.noteRow}>
          <View style={wStyles.noteAccent} />
          <Text style={wStyles.listText} numberOfLines={2}>{n.content}</Text>
        </View>
      ))}
    </View>
  )
}

// ── DocsWidget ────────────────────────────────────────────────────────────────
function DocsWidget({ hubId, userId }) {
  const [docs, setDocs] = useState([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    if (!userId) { setLoading(false); return }
    supabase.from('documents').select('id,name,type')
      .eq('hub_id', hubId).limit(6)
      .then(({ data }) => setDocs(data ?? []))
      .finally(() => setLoading(false))
  }, [hubId, userId])

  if (loading) return <WidgetSkeleton />
  if (docs.length === 0) return <WidgetEmpty label="No resources yet" />
  return (
    <View>
      {docs.map(d => (
        <View key={d.id} style={wStyles.listRow}>
          <FileText size={13} color={colors.modules.knowledge} />
          <Text style={wStyles.listText} numberOfLines={1}>{d.name}</Text>
          <Text style={wStyles.listSub}>{d.type?.toUpperCase()}</Text>
        </View>
      ))}
    </View>
  )
}

// ── OutcomesWidget ────────────────────────────────────────────────────────────
function OutcomesWidget({ hubId }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    supabase.from('deliveries').select('id,content,type')
      .eq('hub_id', hubId).order('created_at', { ascending: false }).limit(6)
      .then(({ data }) => setItems(data ?? []))
      .finally(() => setLoading(false))
  }, [hubId])

  if (loading) return <WidgetSkeleton />
  if (items.length === 0) return <WidgetEmpty label="No outcomes yet" />
  return (
    <View>
      {items.map(d => (
        <View key={d.id} style={wStyles.listRow}>
          <View style={[wStyles.badge, { backgroundColor: colors.modules.deliver + '20' }]}>
            <Text style={[wStyles.badgeText, { color: colors.modules.deliver }]}>{d.type}</Text>
          </View>
          <Text style={wStyles.listText} numberOfLines={2}>{d.content}</Text>
        </View>
      ))}
    </View>
  )
}

// ── HubOverviewWidget ─────────────────────────────────────────────────────────
function HubOverviewWidget({ hubId }) {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    supabase.from('tasks').select('id,status').eq('hub_id', hubId)
      .then(({ data }) => setTasks(data ?? []))
      .finally(() => setLoading(false))
  }, [hubId])

  if (loading) return <WidgetSkeleton />
  const done = tasks.filter(t => t.status === 'done').length
  const total = tasks.length
  const pct = total ? Math.round((done / total) * 100) : 0
  const statuses = ['todo', 'in_progress', 'done']

  return (
    <View style={wStyles.overviewBody}>
      <View style={wStyles.overviewHeader}>
        <Text style={wStyles.listSub}>{done} / {total} tasks done</Text>
        <Text style={wStyles.overviewPct}>{pct}%</Text>
      </View>
      <View style={wStyles.progressTrack}>
        <View style={[wStyles.progressFill, { width: `${pct}%`, backgroundColor: colors.modules.track }]} />
      </View>
      <View style={wStyles.statRow}>
        {statuses.map(s => (
          <View key={s} style={wStyles.statBox}>
            <Text style={wStyles.statNum}>{tasks.filter(t => t.status === s).length}</Text>
            <Text style={wStyles.statLabel}>{s.replace('_', ' ')}</Text>
          </View>
        ))}
      </View>
    </View>
  )
}

// ── CalorieCounterWidget ──────────────────────────────────────────────────────
function CalorieCounterWidget({ hubId }) {
  const [logs,    setLogs]    = useState([])
  const [loading, setLoading] = useState(true)
  const goal = 2000
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0]
    supabase.from('food_logs').select('calories,protein_g,carbs_g,fat_g')
      .eq('hub_id', hubId)
      .gte('logged_at', `${today}T00:00:00`)
      .lte('logged_at', `${today}T23:59:59`)
      .then(({ data }) => setLogs(data ?? []))
      .finally(() => setLoading(false))
  }, [hubId])

  if (loading) return <WidgetSkeleton />

  const total   = logs.reduce((s, l) => s + (l.calories  ?? 0), 0)
  const protein = logs.reduce((s, l) => s + (l.protein_g ?? 0), 0)
  const carbs   = logs.reduce((s, l) => s + (l.carbs_g   ?? 0), 0)
  const fat     = logs.reduce((s, l) => s + (l.fat_g     ?? 0), 0)
  const pct       = Math.min((total / goal) * 100, 100)
  const remaining = goal - total
  const over      = remaining < 0

  return (
    <View style={wStyles.compactBody}>
      <View style={wStyles.calorieRow}>
        <View style={wStyles.calorieCell}>
          <Text style={wStyles.calorieNum}>{goal}</Text>
          <Text style={wStyles.calorieLabel}>Goal</Text>
        </View>
        <Text style={wStyles.calorieOp}>−</Text>
        <View style={wStyles.calorieCell}>
          <Text style={wStyles.calorieNum}>{Math.round(total)}</Text>
          <Text style={wStyles.calorieLabel}>Eaten</Text>
        </View>
        <Text style={wStyles.calorieOp}>=</Text>
        <View style={wStyles.calorieCell}>
          <Text style={[wStyles.calorieNum, { color: over ? '#f87171' : '#22c55e' }]}>
            {Math.abs(Math.round(remaining))}
          </Text>
          <Text style={wStyles.calorieLabel}>{over ? 'Over' : 'Left'}</Text>
        </View>
      </View>
      <View style={wStyles.progressTrack}>
        <View style={[wStyles.progressFill, { width: `${pct}%`, backgroundColor: over ? '#f87171' : '#22c55e' }]} />
      </View>
      {(protein > 0 || carbs > 0 || fat > 0) && (
        <View style={wStyles.macroRow}>
          <View style={wStyles.macroCell}>
            <Text style={[wStyles.macroNum, { color: '#60a5fa' }]}>{Math.round(protein)}g</Text>
            <Text style={wStyles.macroLabel}>Protein</Text>
          </View>
          <View style={wStyles.macroDivider} />
          <View style={wStyles.macroCell}>
            <Text style={[wStyles.macroNum, { color: '#fb923c' }]}>{Math.round(carbs)}g</Text>
            <Text style={wStyles.macroLabel}>Carbs</Text>
          </View>
          <View style={wStyles.macroDivider} />
          <View style={wStyles.macroCell}>
            <Text style={[wStyles.macroNum, { color: '#f472b6' }]}>{Math.round(fat)}g</Text>
            <Text style={wStyles.macroLabel}>Fat</Text>
          </View>
        </View>
      )}
    </View>
  )
}

// ── ExpenseTrackerWidget ──────────────────────────────────────────────────────
function ExpenseTrackerWidget({ hubId }) {
  const currency = 'PHP'
  const [monthExp,   setMonthExp]   = useState([])
  const [weekExp,    setWeekExp]    = useState([])
  const [yearExp,    setYearExp]    = useState([])
  const [loading,    setLoading]    = useState(true)
  const [trendPer,   setTrendPer]   = useState('month')
  const [weekLoaded, setWeekLoaded] = useState(false)
  const [yearLoaded, setYearLoaded] = useState(false)

  // Month data (on mount)
  useEffect(() => {
    const d = new Date(); const yr = d.getFullYear(); const mon = d.getMonth() + 1
    const m  = `${yr}-${String(mon).padStart(2, '0')}`
    const nm = mon === 12 ? `${yr + 1}-01-01` : `${yr}-${String(mon + 1).padStart(2, '0')}-01`
    supabase.from('expenses').select('amount,category,date')
      .eq('hub_id', hubId).gte('date', `${m}-01`).lt('date', nm)
      .then(({ data }) => setMonthExp(data ?? []))
      .finally(() => setLoading(false))
  }, [hubId])

  // Week data (lazy)
  useEffect(() => {
    if (trendPer !== 'week' || weekLoaded) return
    const from = new Date(); from.setDate(from.getDate() - 6)
    const fromStr = from.toISOString().split('T')[0]
    const toStr   = new Date().toISOString().split('T')[0]
    supabase.from('expenses').select('amount,date')
      .eq('hub_id', hubId).gte('date', fromStr).lte('date', toStr)
      .then(({ data }) => { setWeekExp(data ?? []); setWeekLoaded(true) })
  }, [trendPer, weekLoaded, hubId])

  // Year data (lazy)
  useEffect(() => {
    if (trendPer !== 'year' || yearLoaded) return
    const yr = new Date().getFullYear()
    supabase.from('expenses').select('amount,date')
      .eq('hub_id', hubId).gte('date', `${yr}-01-01`).lt('date', `${yr + 1}-01-01`)
      .then(({ data }) => { setYearExp(data ?? []); setYearLoaded(true) })
  }, [trendPer, yearLoaded, hubId])

  const total = useMemo(() => monthExp.reduce((s, e) => s + e.amount, 0), [monthExp])

  const donutSegs = useMemo(() => {
    const map = {}
    monthExp.forEach(e => { map[e.category] = (map[e.category] ?? 0) + e.amount })
    return Object.entries(map)
      .sort(([, a], [, b]) => b - a)
      .map(([cat, amt]) => ({ pct: total > 0 ? (amt / total) * 100 : 0, color: CAT_COLORS[cat] ?? '#6b7280', cat, amt }))
  }, [monthExp, total])

  const trendData = useMemo(() => {
    const pad = (n) => String(n).padStart(2, '0')
    if (trendPer === 'week') {
      const days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(); d.setDate(d.getDate() - (6 - i))
        return { date: d.toISOString().split('T')[0], label: d.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 2) }
      })
      return { bars: days.map(({ date }) => weekExp.filter(e => e.date === date).reduce((s, e) => s + e.amount, 0)), labels: days.map(d => d.label) }
    }
    if (trendPer === 'month') {
      const d = new Date(); const yr = d.getFullYear(); const mon = d.getMonth() + 1
      const dim = new Date(yr, mon, 0).getDate()
      return {
        bars:   Array.from({ length: dim }, (_, i) => monthExp.filter(e => e.date === `${yr}-${pad(mon)}-${pad(i + 1)}`).reduce((s, e) => s + e.amount, 0)),
        labels: Array.from({ length: dim }, (_, i) => String(i + 1)),
      }
    }
    const yr = new Date().getFullYear()
    const ML = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
    return {
      bars:   Array.from({ length: 12 }, (_, i) => yearExp.filter(e => e.date?.startsWith(`${yr}-${pad(i + 1)}`)).reduce((s, e) => s + e.amount, 0)),
      labels: ML,
    }
  }, [trendPer, weekExp, monthExp, yearExp])

  if (loading) return <WidgetSkeleton />

  const fmt   = (n) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const ACCENT = colors.modules.deliver

  return (
    <View>
      {/* Total */}
      <View style={expSt.totalRow}>
        <Text style={expSt.totalLabel}>THIS MONTH</Text>
        <Text style={expSt.totalNum}>{currency} {fmt(total)}</Text>
      </View>

      {/* Breakdown */}
      {donutSegs.length > 0 && (
        <View style={expSt.section}>
          <Text style={expSt.secLabel}>BREAKDOWN</Text>
          <View style={expSt.donutRow}>
            <View style={expSt.donutWrap}>
              <MobileDonutChart segments={donutSegs} />
              <View style={expSt.donutCenter}>
                <Text style={expSt.donutCenterNum}>{donutSegs.length}</Text>
                <Text style={expSt.donutCenterSub}>cats</Text>
              </View>
            </View>
            <View style={expSt.legend}>
              {donutSegs.slice(0, 5).map(({ cat, amt, color }) => (
                <View key={cat} style={expSt.legendRow}>
                  <View style={[expSt.legendDot, { backgroundColor: color }]} />
                  <Text style={expSt.legendCat} numberOfLines={1}>{cat}</Text>
                  <Text style={expSt.legendAmt}>{fmt(amt)}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      )}

      {/* Trend */}
      <View style={expSt.section}>
        <View style={expSt.trendHeader}>
          <Text style={expSt.secLabel}>TREND</Text>
          <View style={expSt.trendTabs}>
            {['week', 'month', 'year'].map(p => (
              <TouchableOpacity key={p} onPress={() => setTrendPer(p)} activeOpacity={0.7}
                style={[expSt.trendTab, trendPer === p && { backgroundColor: ACCENT + '18', borderColor: ACCENT + '50' }]}>
                <Text style={[expSt.trendTabTxt, trendPer === p && { color: ACCENT }]}>
                  {p === 'week' ? '7D' : p === 'month' ? '1M' : '1Y'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        <MobileBarChart bars={trendData.bars} labels={trendData.labels} color={ACCENT} />
        <View style={expSt.axisRow}>
          <Text style={expSt.axisLabel}>{currency} 0</Text>
          <Text style={expSt.axisLabel}>{currency} {fmt(Math.max(...trendData.bars, 0))}</Text>
        </View>
      </View>
    </View>
  )
}

// ── UpcomingEventsWidget ──────────────────────────────────────────────────────
function UpcomingEventsWidget({ hubId, userId }) {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    if (!userId) { setLoading(false); return }
    const now = new Date().toISOString()
    let q = supabase.from('events').select('id,title,start_at,location').eq('user_id', userId).gte('start_at', now)
    if (hubId) q = q.eq('hub_id', hubId)
    q.order('start_at', { ascending: true }).limit(5)
      .then(({ data }) => setEvents(data ?? []))
      .finally(() => setLoading(false))
  }, [hubId, userId])

  if (loading) return <WidgetSkeleton />
  if (events.length === 0) return <WidgetEmpty label="No upcoming events" />
  return (
    <View>
      {events.map(ev => (
        <View key={ev.id} style={wStyles.listRow}>
          <CalendarBlank size={13} color={colors.modules.automate} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={wStyles.listText} numberOfLines={1}>{ev.title}</Text>
            <Text style={wStyles.listSub}>{fmtTime(ev.start_at)}</Text>
          </View>
        </View>
      ))}
    </View>
  )
}

// ── UpcomingGlobalWidget ──────────────────────────────────────────────────────
function UpcomingGlobalWidget({ userId }) {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    if (!userId) { setLoading(false); return }
    const now = new Date().toISOString()
    supabase.from('events').select('id,title,start_at').eq('user_id', userId)
      .gte('start_at', now).order('start_at', { ascending: true }).limit(8)
      .then(({ data }) => setEvents(data ?? []))
      .finally(() => setLoading(false))
  }, [userId])

  if (loading) return <WidgetSkeleton />
  if (events.length === 0) return <WidgetEmpty label="No upcoming events" />
  return (
    <View>
      {events.map(ev => (
        <View key={ev.id} style={wStyles.listRow}>
          <CalendarBlank size={13} color={colors.modules.automate} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={wStyles.listText} numberOfLines={1}>{ev.title}</Text>
            <Text style={wStyles.listSub}>{fmtTime(ev.start_at)}</Text>
          </View>
          <Text style={[wStyles.listSub, { color: colors.modules.automate }]}>{timeUntil(ev.start_at)}</Text>
        </View>
      ))}
    </View>
  )
}

// ── QuickClockWidget ──────────────────────────────────────────────────────────
function QuickClockWidget() {
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  const time = now.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  const date = now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })
  return (
    <View style={wStyles.compactBody}>
      <Text style={wStyles.clockTime}>{time}</Text>
      <Text style={wStyles.listSub}>{date}</Text>
    </View>
  )
}

// ── SpacePulseWidget ──────────────────────────────────────────────────────────
function SpacePulseWidget({ userId }) {
  const [spaces, setSpaces] = useState([])
  const [hubCount, setHubCount] = useState(0)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    if (!userId) { setLoading(false); return }
    supabase.from('spaces').select('id,name,color').eq('user_id', userId).order('name').limit(6)
      .then(async ({ data: sp }) => {
        setSpaces(sp ?? [])
        if (sp?.length) {
          const ids = sp.map(s => s.id)
          const { data: hubs } = await supabase.from('hubs').select('id,space_id').in('space_id', ids)
          setHubCount((hubs ?? []).length)
        }
      })
      .finally(() => setLoading(false))
  }, [userId])

  if (loading) return <WidgetSkeleton />
  return (
    <View style={wStyles.overviewBody}>
      <View style={wStyles.statRow}>
        <View style={wStyles.statBox}>
          <Text style={wStyles.statNum}>{spaces.length}</Text>
          <Text style={wStyles.statLabel}>Spaces</Text>
        </View>
        <View style={wStyles.statBox}>
          <Text style={wStyles.statNum}>{hubCount}</Text>
          <Text style={wStyles.statLabel}>Hubs</Text>
        </View>
      </View>
      {spaces.slice(0, 4).map(s => (
        <View key={s.id} style={[wStyles.listRow, { marginTop: 6 }]}>
          <View style={[wStyles.spaceDot, { backgroundColor: s.color ?? colors.modules.aly }]} />
          <Text style={wStyles.listText} numberOfLines={1}>{s.name}</Text>
        </View>
      ))}
    </View>
  )
}

// ── WeeklyProgressWidget ──────────────────────────────────────────────────────
function WeeklyProgressWidget({ userId }) {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    if (!userId) { setLoading(false); return }
    supabase.from('tasks').select('id,status').eq('user_id', userId)
      .then(({ data }) => {
        const all = data ?? []
        setStats({ done: all.filter(t => t.status === 'done').length, total: all.length })
      })
      .finally(() => setLoading(false))
  }, [userId])

  if (loading) return <WidgetSkeleton />
  if (!stats || stats.total === 0) return <WidgetEmpty label="No tasks tracked yet" />
  const pct = Math.round((stats.done / stats.total) * 100)
  return (
    <View style={wStyles.overviewBody}>
      <View style={wStyles.overviewHeader}>
        <Text style={wStyles.listSub}>{stats.done} / {stats.total} done</Text>
        <Text style={wStyles.overviewPct}>{pct}%</Text>
      </View>
      <View style={wStyles.progressTrack}>
        <View style={[wStyles.progressFill, { width: `${pct}%`, backgroundColor: colors.modules.track }]} />
      </View>
    </View>
  )
}

// ── StravaStatsWidget ─────────────────────────────────────────────────────────
const STRAVA = '#FC5200'
const STRAVA_TYPES = { Run: 'Run', Walk: 'Walk', Ride: 'Ride' }

function MobileStravaChart({ weeks }) {
  // weeks: array of 12 objects { label, dist }
  const W = 280; const H = 80; const PAD_L = 28; const PAD_B = 16
  const chartW = W - PAD_L; const chartH = H - PAD_B
  const maxDist = Math.max(...weeks.map(w => w.dist), 1)
  const pts = weeks.map((w, i) => {
    const x = PAD_L + (i / (weeks.length - 1)) * chartW
    const y = chartH - (w.dist / maxDist) * chartH
    return { x, y, ...w }
  })
  const polyPts = pts.map(p => `${p.x},${p.y}`).join(' ')
  const fillPts = `${pts[0].x},${chartH} ${polyPts} ${pts[pts.length - 1].x},${chartH}`

  // Y-axis labels
  const yLabels = [maxDist, maxDist / 2, 0].map(v => ({
    val: (v / 1000).toFixed(1),
    y: chartH - (v / maxDist) * chartH,
  }))

  // Month labels — show first week of each new month
  const monthLabels = []
  let lastMonth = null
  pts.forEach((p, i) => {
    const m = p.label ? p.label.split('/')[0] : null
    if (m && m !== lastMonth) { monthLabels.push({ x: p.x, label: p.label }); lastMonth = m }
  })

  return (
    <Svg width="100%" height={H + 4} viewBox={`0 0 ${W} ${H + 4}`} preserveAspectRatio="none">
      {/* Y-axis labels */}
      {yLabels.map((yl, i) => (
        <SvgText key={i} x={PAD_L - 3} y={yl.y + 3} textAnchor="end" fontSize={6} fill="#6b7280">{yl.val}</SvgText>
      ))}
      {/* Grid lines */}
      {yLabels.map((yl, i) => (
        <SvgRect key={i} x={PAD_L} y={yl.y} width={chartW} height={0.4} fill="#374151" />
      ))}
      {/* Filled area */}
      <SvgPolygon points={fillPts} fill={STRAVA} fillOpacity={0.15} />
      {/* Line */}
      <SvgPolyline points={polyPts} fill="none" stroke={STRAVA} strokeWidth={1.8} strokeLinejoin="round" strokeLinecap="round" />
      {/* Dots */}
      {pts.map((p, i) => (
        <SvgCircle key={i} cx={p.x} cy={p.y} r={2.2} fill={STRAVA} />
      ))}
      {/* X-axis month labels */}
      {monthLabels.slice(0, 4).map((ml, i) => (
        <SvgText key={i} x={Math.min(ml.x, W - 12)} y={H + 2} textAnchor="middle" fontSize={6} fill="#6b7280">
          {ml.label}
        </SvgText>
      ))}
    </Svg>
  )
}

function StravaStatsWidget({ userId }) {
  const [activities, setActivities] = useState([])
  const [sport, setSport] = useState('Run')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) { setLoading(false); return }
    supabase.from('strava_activities')
      .select('id,name,sport_type,distance_meters,moving_time_seconds,total_elevation_gain,start_date')
      .eq('user_id', userId).order('start_date', { ascending: false }).limit(200)
      .then(({ data }) => setActivities(data ?? []))
      .finally(() => setLoading(false))
  }, [userId])

  if (loading) return <WidgetSkeleton />

  const now = new Date()
  const day = now.getDay()
  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() - (day === 0 ? 6 : day - 1))
  weekStart.setHours(0, 0, 0, 0)
  const lastWeekStart = new Date(weekStart)
  lastWeekStart.setDate(lastWeekStart.getDate() - 7)

  const filtered = activities.filter(a => a.sport_type === sport)
  const thisWeek = filtered.filter(a => new Date(a.start_date) >= weekStart)
  const lastWeek = filtered.filter(a => {
    const d = new Date(a.start_date); return d >= lastWeekStart && d < weekStart
  })

  const sum = (arr, key) => arr.reduce((s, a) => s + (a[key] ?? 0), 0)
  const fmtDist = (m) => (m / 1000).toFixed(1) + ' km'
  const fmtSecs = (s) => { const m = Math.floor(s / 60); const h = Math.floor(m / 60); return h > 0 ? `${h}h ${m % 60}m` : `${m}m` }
  const fmtElev = (e) => e.toFixed(0) + ' m'

  const thisStats = { dist: sum(thisWeek, 'distance_meters'), secs: sum(thisWeek, 'moving_time_seconds'), elev: sum(thisWeek, 'total_elevation_gain') }
  const lastStats = { dist: sum(lastWeek, 'distance_meters'), secs: sum(lastWeek, 'moving_time_seconds'), elev: sum(lastWeek, 'total_elevation_gain') }

  const distDelta = thisStats.dist - lastStats.dist
  const deltaSign = distDelta >= 0 ? '+' : ''
  const deltaColor = distDelta >= 0 ? '#22c55e' : '#f87171'

  // 12-week chart data
  const weeks = useMemo(() => {
    const result = []
    for (let w = 11; w >= 0; w--) {
      const wStart = new Date(weekStart)
      wStart.setDate(wStart.getDate() - w * 7)
      const wEnd = new Date(wStart)
      wEnd.setDate(wEnd.getDate() + 7)
      const wActs = filtered.filter(a => { const d = new Date(a.start_date); return d >= wStart && d < wEnd })
      const dist = sum(wActs, 'distance_meters')
      const mo = wStart.getMonth() + 1
      const dy = wStart.getDate()
      result.push({ dist, label: `${mo}/${dy}` })
    }
    return result
  }, [filtered, weekStart])

  const STAT_LABELS = ['Distance', 'Time', 'Elevation']
  const thisVals = [fmtDist(thisStats.dist), fmtSecs(thisStats.secs), fmtElev(thisStats.elev)]
  const lastVals = [fmtDist(lastStats.dist), fmtSecs(lastStats.secs), fmtElev(lastStats.elev)]

  return (
    <View style={{ paddingHorizontal: 14, paddingBottom: 14, paddingTop: 10 }}>
      {/* Sport tabs */}
      <View style={wStyles.sportTabs}>
        {Object.keys(STRAVA_TYPES).map(s => (
          <TouchableOpacity key={s} onPress={() => setSport(s)} activeOpacity={0.7}
            style={[wStyles.sportTab, sport === s && { backgroundColor: STRAVA + '22', borderColor: STRAVA }]}>
            <Text style={[wStyles.sportTabText, sport === s && { color: STRAVA }]}>{s}</Text>
          </TouchableOpacity>
        ))}
        {distDelta !== 0 && (
          <View style={{ marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 2 }}>
            <Text style={{ fontSize: 9, fontWeight: '700', color: deltaColor }}>
              {deltaSign}{(distDelta / 1000).toFixed(1)} km
            </Text>
            <Text style={{ fontSize: 8, color: colors.text.tertiary }}>vs last wk</Text>
          </View>
        )}
      </View>

      {/* This week vs Last week */}
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
        {[
          { label: 'THIS WEEK', vals: thisVals, highlight: true },
          { label: 'LAST WEEK', vals: lastVals, highlight: false },
        ].map(({ label, vals, highlight }) => (
          <View key={label} style={{
            flex: 1, backgroundColor: highlight ? STRAVA + '14' : colors.background.primary,
            borderRadius: 10, borderWidth: 0.5,
            borderColor: highlight ? STRAVA + '40' : colors.border.primary,
            padding: 10,
          }}>
            <Text style={[wStyles.listSub, { marginBottom: 6, color: highlight ? STRAVA : colors.text.tertiary }]}>{label}</Text>
            {STAT_LABELS.map((sl, i) => (
              <View key={sl} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 }}>
                <Text style={{ fontSize: 9, color: colors.text.tertiary }}>{sl}</Text>
                <Text style={{ fontSize: 10, fontWeight: '600', color: highlight ? colors.text.primary : colors.text.secondary }}>{vals[i]}</Text>
              </View>
            ))}
          </View>
        ))}
      </View>

      {/* 12-week chart */}
      <View style={{ marginTop: 12 }}>
        <Text style={[wStyles.listSub, { marginBottom: 6 }]}>LAST 12 WEEKS</Text>
        <MobileStravaChart weeks={weeks} />
      </View>

      {filtered.length === 0 && <WidgetEmpty label={`No ${sport} activities yet`} />}
    </View>
  )
}

// ── SleepTrackerWidget ────────────────────────────────────────────────────────
function SleepTrackerWidget() {
  return (
    <View style={wStyles.compactBody}>
      <Text style={wStyles.listSub}>Sleep data</Text>
      <Text style={wStyles.listText}>Log via Aly chat</Text>
    </View>
  )
}

// ── WorkoutLogWidget ──────────────────────────────────────────────────────────
function WorkoutLogWidget() {
  return (
    <View style={wStyles.compactBody}>
      <Text style={wStyles.listSub}>Workout log</Text>
      <Text style={wStyles.listText}>Log via Aly chat</Text>
    </View>
  )
}

// ── Widget card wrapper ───────────────────────────────────────────────────────
function MobileWidget({ widget, userId, half }) {
  const meta = WIDGET_META[widget.type] ?? { label: widget.type, Icon: AppWindow, accent: colors.text.tertiary }
  const { Icon, accent, label } = meta
  const title = widget.title || label

  const renderBody = () => {
    const hId = widget.hub_id
    switch (widget.type) {
      case 'tasks':           return <TasksWidget hubId={hId} />
      case 'notes':           return <NotesWidget hubId={hId} />
      case 'docs':            return <DocsWidget hubId={hId} userId={userId} />
      case 'outcomes':        return <OutcomesWidget hubId={hId} />
      case 'hub_overview':    return <HubOverviewWidget hubId={hId} />
      case 'calorie_counter': return <CalorieCounterWidget hubId={hId} />
      case 'expense_tracker': return <ExpenseTrackerWidget hubId={hId} />
      case 'upcoming_events': return <UpcomingEventsWidget hubId={hId} userId={userId} />
      case 'upcoming_global': return <UpcomingGlobalWidget userId={userId} />
      case 'quick_clock':     return <QuickClockWidget />
      case 'space_pulse':     return <SpacePulseWidget userId={userId} />
      case 'weekly_progress': return <WeeklyProgressWidget userId={userId} />
      case 'strava_stats':    return <StravaStatsWidget userId={userId} />
      case 'sleep_tracker':   return <SleepTrackerWidget />
      case 'workout_log':     return <WorkoutLogWidget />
      default:                return <WidgetEmpty label="Unknown widget" />
    }
  }

  const noHub = !widget.hub_id && !['quick_clock','space_pulse','weekly_progress','upcoming_global','strava_stats'].includes(widget.type)

  return (
    <View style={[wStyles.card, half && wStyles.cardHalf]}>
      {/* Header */}
      <View style={wStyles.cardHeader}>
        <View style={[wStyles.cardIconBg, { backgroundColor: accent + '18' }]}>
          <Icon size={12} color={accent} weight="bold" />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={wStyles.cardTitle} numberOfLines={1}>{title}</Text>
          {widget.hub_id && widget.hubName && (
            <Text style={wStyles.cardSub} numberOfLines={1}>{widget.hubName}</Text>
          )}
        </View>
      </View>
      {/* Body */}
      {noHub
        ? <WidgetEmpty label="No hub selected" />
        : renderBody()
      }
    </View>
  )
}

// ── Grid layout helper ────────────────────────────────────────────────────────
function layoutWidgets(widgets) {
  const rows = []
  const sorted = [...widgets].sort((a, b) => a.position - b.position)
  let i = 0
  while (i < sorted.length) {
    const w = sorted[i]
    const span = Math.min(3, Math.max(1, Number(w.config?.colSpan ?? 1)))
    const isHalf = span === 1 && !FORCE_FULL.has(w.type)
    if (isHalf) {
      const next = sorted[i + 1]
      const nextSpan = next ? Math.min(3, Math.max(1, Number(next.config?.colSpan ?? 1))) : 0
      const nextIsHalf = next && nextSpan === 1 && !FORCE_FULL.has(next.type)
      if (nextIsHalf) {
        rows.push({ type: 'pair', a: w, b: next })
        i += 2
      } else {
        rows.push({ type: 'pair', a: w, b: null })
        i += 1
      }
    } else {
      rows.push({ type: 'full', w })
      i += 1
    }
  }
  return rows
}

// ── Main HomeScreen ───────────────────────────────────────────────────────────
export default function HomeScreen({ navigation }) {
  const { openSheet } = useAlySheet()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [dailyInsight, setDailyInsight] = useState('')
  const insightOpacity = useRef(new Animated.Value(0)).current
  // Screens + widgets
  const [screens, setScreens] = useState([])
  const [selectedScreenId, setSelectedScreenId] = useState(null)
  const [screenWidgets, setScreenWidgets] = useState([])
  const [widgetsLoading, setWidgetsLoading] = useState(false)

  // Hub name lookup for widget headers
  const [hubMap, setHubMap] = useState({})

  useFocusEffect(
    useCallback(() => {
      supabase.auth.getUser().then(({ data: { user: u } }) => {
        if (u) { setUser(u); loadData(u) }
      })
    }, [])
  )

  const loadData = async (u, isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    try {
      const [insightRes, screensRes] = await Promise.all([
        fetch(`${API_URL}/aly/daily-insight?user_id=${u.id}`).then(r => r.json()).catch(() => ({})),
        supabase.from('screens').select('*').eq('user_id', u.id).order('position', { ascending: true }).limit(10),
      ])

      if (insightRes?.insight) {
        setDailyInsight(insightRes.insight)
        Animated.timing(insightOpacity, { toValue: 1, duration: 600, useNativeDriver: true }).start()
      }

      const loadedScreens = screensRes?.data ?? []
      setScreens(loadedScreens)
      if (loadedScreens.length > 0) {
        const firstId = loadedScreens[0].id
        setSelectedScreenId(firstId)
        await loadWidgets(firstId, u.id)
      }
    } catch (e) {
      console.warn('HomeScreen loadData error:', e)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const loadWidgets = async (screenId, userId) => {
    setWidgetsLoading(true)
    try {
      const { data: ws } = await supabase
        .from('screen_widgets').select('*').eq('screen_id', screenId).order('position', { ascending: true })
      const widgets = ws ?? []

      // Resolve hub names for header display
      const hubIds = [...new Set(widgets.map(w => w.hub_id).filter(Boolean))]
      if (hubIds.length > 0) {
        const { data: hubs } = await supabase.from('hubs').select('id,name').in('id', hubIds)
        const map = {}
        ;(hubs ?? []).forEach(h => { map[h.id] = h.name })
        setHubMap(map)
        setScreenWidgets(widgets.map(w => ({ ...w, hubName: w.hub_id ? map[w.hub_id] : undefined })))
      } else {
        setHubMap({})
        setScreenWidgets(widgets)
      }
    } catch { setScreenWidgets([]) }
    finally { setWidgetsLoading(false) }
  }

  const selectScreen = (screenId) => {
    setSelectedScreenId(screenId)
    loadWidgets(screenId, user?.id)
  }

  const displayName = user?.user_metadata?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || ''
  const userId = user?.id

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <ActivityIndicator style={{ flex: 1 }} color={colors.text.tertiary} />
      </SafeAreaView>
    )
  }

  const widgetRows = layoutWidgets(screenWidgets)

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.openDrawer()}
          hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }} style={styles.menuBtn}>
          <List color={colors.text.secondary} size={22} weight="light" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('Profile')}
          hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}>
          <User color={colors.text.secondary} size={20} weight="light" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => loadData(user, true)} tintColor={colors.text.tertiary} />
        }
      >
        {/* ── GREETING HEADER ─────────────────────────────────────── */}
        <View style={styles.greetingHeader}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={styles.greetingDate}>{formatDate()}</Text>
            <Text style={styles.greetingText}>
              {getGreeting()}{displayName ? `, ${displayName}` : ''}
            </Text>
          </View>
          <TouchableOpacity style={styles.askAlyBtn} onPress={() => openSheet()} activeOpacity={0.85}>
            <Sparkle size={14} color={colors.modules.aly} weight="fill" />
            <Text style={styles.askAlyText}>Ask {ASSISTANT_NAME}</Text>
          </TouchableOpacity>
        </View>

        {/* ── ALY'S INSIGHTS ──────────────────────────────────────── */}
        <View style={styles.insightCard}>
          <View style={styles.insightHeader}>
            <Sparkle size={13} color={colors.modules.aly} weight="fill" />
            <Text style={styles.insightLabel}>{ASSISTANT_NAME}'s Insights</Text>
          </View>
          {dailyInsight ? (
            <Animated.View style={{ opacity: insightOpacity }}>
              <MarkdownRenderer content={dailyInsight} />
            </Animated.View>
          ) : (
            <Text style={styles.insightEmpty}>
              No insights yet — chat with {ASSISTANT_NAME} to get started.
            </Text>
          )}
          <TouchableOpacity style={styles.insightCta} onPress={() => openSheet()} activeOpacity={0.75}>
            <Text style={styles.insightCtaText}>Chat with {ASSISTANT_NAME}</Text>
            <ArrowRight size={11} color={colors.modules.aly} />
          </TouchableOpacity>
        </View>

        {/* ── MY SCREENS ──────────────────────────────────────────── */}
        {screens.length > 0 && (
          <View style={styles.section}>
            {/* Section header */}
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <AppWindow size={11} color={colors.text.tertiary} weight="bold" />
                <Text style={styles.sectionTitle}>MY SCREENS</Text>
              </View>
            </View>

            {/* Screen tabs */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.screenTabs}>
              {screens.map(s => (
                <TouchableOpacity
                  key={s.id}
                  onPress={() => selectScreen(s.id)}
                  activeOpacity={0.75}
                  style={[styles.screenTab, selectedScreenId === s.id && styles.screenTabActive]}
                >
                  <Text style={[styles.screenTabText, selectedScreenId === s.id && styles.screenTabTextActive]}>
                    {s.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Widget grid */}
            {widgetsLoading ? (
              <View style={styles.widgetSkeletonWrap}>
                {[1, 2].map(i => (
                  <View key={i} style={styles.widgetSkelCard} />
                ))}
              </View>
            ) : screenWidgets.length === 0 ? (
              <View style={styles.widgetEmpty}>
                <AppWindow size={28} color={colors.text.tertiary + '30'} weight="duotone" />
                <Text style={styles.widgetEmptyText}>No widgets on this screen yet.</Text>
              </View>
            ) : (
              <View style={styles.widgetGrid}>
                {widgetRows.map((row, idx) =>
                  row.type === 'full' ? (
                    <MobileWidget key={row.w.id} widget={row.w} userId={userId} half={false} />
                  ) : (
                    <View key={idx} style={styles.widgetPairRow}>
                      <MobileWidget widget={row.a} userId={userId} half />
                      {row.b
                        ? <MobileWidget widget={row.b} userId={userId} half />
                        : <View style={wStyles.cardHalf} />
                      }
                    </View>
                  )
                )}
              </View>
            )}
          </View>
        )}

        {/* Empty state: no screens */}
        {screens.length === 0 && (
          <View style={styles.emptyState}>
            <AppWindow size={36} color={colors.text.tertiary + '30'} weight="duotone" />
            <Text style={styles.emptyTitle}>No screens yet</Text>
            <Text style={styles.emptyBody}>
              Create a screen on the web and add widgets to build your personalized dashboard.
            </Text>
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  )
}

// ── Widget-specific styles ────────────────────────────────────────────────────
const wStyles = StyleSheet.create({
  // Card structure
  card: {
    backgroundColor: colors.background.secondary,
    borderRadius: 18, borderWidth: 0.5, borderColor: colors.border.primary,
    overflow: 'hidden', flex: 1,
  },
  cardHalf: { flex: 1 },
  cardHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 14, paddingVertical: 10,
    borderBottomWidth: 0.5, borderBottomColor: colors.border.primary + '80',
  },
  cardIconBg: { width: 24, height: 24, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 11, fontWeight: '700', color: colors.text.primary },
  cardSub: { fontSize: 9, color: colors.text.tertiary, marginTop: 1 },

  // Shared list rows
  listRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 14, paddingVertical: 9,
    borderBottomWidth: 0.5, borderBottomColor: colors.border.primary + '40',
  },
  listText: { flex: 1, fontSize: 12, color: colors.text.primary, lineHeight: 17 },
  listSub: { fontSize: 9, color: colors.text.tertiary, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.3 },
  noteRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    paddingHorizontal: 14, paddingVertical: 9,
    borderBottomWidth: 0.5, borderBottomColor: colors.border.primary + '40',
  },
  noteAccent: { width: 2, borderRadius: 2, alignSelf: 'stretch', backgroundColor: colors.modules.aly + '60' },

  // Badge
  badge: { borderRadius: 5, paddingHorizontal: 5, paddingVertical: 2 },
  badgeText: { fontSize: 8, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.4 },

  // Compact widget body
  compactBody: { padding: 14, gap: 4 },
  bigNum: { fontSize: 22, fontWeight: '800', color: colors.text.primary },

  // Calorie widget
  calorieRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  calorieCell: { alignItems: 'center', flex: 1 },
  calorieNum: { fontSize: 16, fontWeight: '800', color: colors.text.primary },
  calorieLabel: { fontSize: 8, color: colors.text.tertiary, marginTop: 1 },
  calorieOp: { fontSize: 14, color: colors.text.tertiary, marginHorizontal: 2 },

  // Progress bar
  progressTrack: { height: 5, borderRadius: 3, backgroundColor: colors.background.tertiary, overflow: 'hidden', marginTop: 4 },
  progressFill: { height: '100%', borderRadius: 3 },

  // Overview / Hub overview / Stats
  overviewBody: { padding: 14, gap: 6 },
  overviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  overviewPct: { fontSize: 13, fontWeight: '800', color: colors.text.primary },
  statRow: { flexDirection: 'row', gap: 6, marginTop: 8 },
  statBox: {
    flex: 1, backgroundColor: colors.background.tertiary,
    borderRadius: 10, padding: 8, alignItems: 'center', gap: 2,
  },
  statNum: { fontSize: 16, fontWeight: '800', color: colors.text.primary },
  statLabel: { fontSize: 8, color: colors.text.tertiary, textTransform: 'uppercase', letterSpacing: 0.3 },

  // Clock
  clockTime: { fontSize: 24, fontWeight: '800', color: colors.text.primary, letterSpacing: -0.5 },

  // Space pulse
  spaceDot: { width: 6, height: 6, borderRadius: 3 },

  // Macro row (calorie widget)
  macroRow: {
    flexDirection: 'row', alignItems: 'center',
    borderTopWidth: 0.5, borderTopColor: colors.border.primary + '60',
    marginTop: 10, paddingTop: 10,
  },
  macroCell: { flex: 1, alignItems: 'center', gap: 2 },
  macroNum:  { fontSize: 15, fontWeight: '800' },
  macroLabel:{ fontSize: 8, color: colors.text.tertiary, textTransform: 'uppercase', letterSpacing: 0.3 },
  macroDivider: { width: 0.5, height: 28, backgroundColor: colors.border.primary + '80' },

  // Strava
  sportTabs: { flexDirection: 'row', gap: 6 },
  sportTab: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
    borderWidth: 1, borderColor: colors.border.primary,
  },
  sportTabText: { fontSize: 11, fontWeight: '600', color: colors.text.tertiary },

  // Skeleton
  skeleton: { padding: 14, gap: 8 },
  skeletonRow: { height: 10, borderRadius: 5, backgroundColor: colors.background.tertiary },
  emptyText: { textAlign: 'center', fontSize: 12, color: colors.text.tertiary, paddingVertical: 20, paddingHorizontal: 14 },
})

// ── Page-level styles ─────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background.primary },
  scroll: { paddingHorizontal: 16, paddingBottom: 120, gap: 14 },

  topBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 12, paddingHorizontal: 16,
  },
  menuBtn: { padding: 4, marginLeft: -4 },

  // Greeting
  greetingHeader: {
    flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12,
  },
  greetingDate: {
    fontSize: 10, fontWeight: '700', color: colors.text.tertiary,
    textTransform: 'uppercase', letterSpacing: 1.2,
  },
  greetingText: { fontSize: 23, fontWeight: '700', color: colors.text.primary },
  askAlyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6,
    backgroundColor: colors.modules.aly + '12',
    borderWidth: 1, borderColor: colors.modules.aly + '30',
    borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8,
  },
  askAlyText: { fontSize: 12, fontWeight: '700', color: colors.modules.aly },

  // Aly's Insights
  insightCard: {
    backgroundColor: colors.modules.aly + '08',
    borderRadius: 20, borderWidth: 0.5, borderColor: colors.modules.aly + '25',
    padding: 16, gap: 10,
  },
  insightHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  insightLabel: {
    fontSize: 10, fontWeight: '700', color: colors.modules.aly,
    letterSpacing: 0.5, textTransform: 'uppercase',
  },
  insightEmpty: { fontSize: 13, color: colors.text.tertiary, fontStyle: 'italic' },
  insightCta: {
    flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start',
  },
  insightCtaText: { fontSize: 12, fontWeight: '700', color: colors.modules.aly },

  // Section
  section: { gap: 10 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  sectionTitle: { fontSize: 10, fontWeight: '700', color: colors.text.tertiary, letterSpacing: 1.5 },

  // Screen tabs
  screenTabs: { gap: 6, paddingBottom: 2 },
  screenTab: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10,
    borderWidth: 1, borderColor: colors.border.primary,
    backgroundColor: colors.background.tertiary,
  },
  screenTabActive: {
    backgroundColor: colors.modules.aly + '15',
    borderColor: colors.modules.aly + '40',
  },
  screenTabText: { fontSize: 12, fontWeight: '700', color: colors.text.secondary },
  screenTabTextActive: { color: colors.modules.aly },

  // Widget grid
  widgetGrid: { gap: 10 },
  widgetPairRow: { flexDirection: 'row', gap: 10 },

  // Skeleton placeholders
  widgetSkeletonWrap: { flexDirection: 'row', gap: 10 },
  widgetSkelCard: {
    flex: 1, height: 100, borderRadius: 18,
    backgroundColor: colors.background.secondary, borderWidth: 0.5, borderColor: colors.border.primary,
  },

  // Empty states
  widgetEmpty: { alignItems: 'center', gap: 8, paddingVertical: 28 },
  widgetEmptyText: { fontSize: 12, color: colors.text.tertiary },
  emptyState: {
    alignItems: 'center', gap: 10, paddingVertical: 40,
    backgroundColor: colors.background.secondary,
    borderRadius: 20, borderWidth: 0.5, borderColor: colors.border.primary,
    paddingHorizontal: 24,
  },
  emptyTitle: { fontSize: 14, fontWeight: '700', color: colors.text.primary },
  emptyBody: { fontSize: 12, color: colors.text.tertiary, textAlign: 'center', lineHeight: 18 },

  // Capture
  captureBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: colors.background.secondary,
    borderRadius: 14, paddingVertical: 12,
    borderWidth: 0.5, borderColor: colors.border.primary,
  },
  captureBtnText: { fontSize: 13, fontWeight: '500', color: colors.text.secondary },
})

// ── Expense widget styles ─────────────────────────────────────────────────────
const expSt = StyleSheet.create({
  totalRow: {
    paddingHorizontal: 16, paddingTop: 14, paddingBottom: 12,
    borderBottomWidth: 0.5, borderBottomColor: colors.border.primary + '50',
    gap: 2,
  },
  totalLabel: { fontSize: 9, fontWeight: '700', color: colors.text.tertiary, textTransform: 'uppercase', letterSpacing: 0.8 },
  totalNum:   { fontSize: 26, fontWeight: '800', color: colors.text.primary, letterSpacing: -0.5 },

  section: {
    paddingHorizontal: 16, paddingTop: 12, paddingBottom: 14,
    borderTopWidth: 0.5, borderTopColor: colors.border.primary + '50', gap: 10,
  },
  secLabel: { fontSize: 9, fontWeight: '700', color: colors.text.tertiary, textTransform: 'uppercase', letterSpacing: 1 },

  // Donut + legend
  donutRow:    { flexDirection: 'row', alignItems: 'center', gap: 12 },
  donutWrap:   { width: 96, height: 96, position: 'relative' },
  donutCenter: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  donutCenterNum: { fontSize: 14, fontWeight: '800', color: colors.text.primary },
  donutCenterSub: { fontSize: 8, color: colors.text.tertiary },
  legend:      { flex: 1, gap: 6 },
  legendRow:   { flexDirection: 'row', alignItems: 'center', gap: 6, minWidth: 0 },
  legendDot:   { width: 7, height: 7, borderRadius: 4, flexShrink: 0 },
  legendCat:   { flex: 1, fontSize: 11, color: colors.text.secondary },
  legendAmt:   { fontSize: 11, fontWeight: '700', color: colors.text.primary, flexShrink: 0 },

  // Trend chart
  trendHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  trendTabs:   { flexDirection: 'row', gap: 4 },
  trendTab:    { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: colors.border.primary },
  trendTabTxt: { fontSize: 10, fontWeight: '700', color: colors.text.tertiary },
  axisRow:     { flexDirection: 'row', justifyContent: 'space-between', marginTop: 3 },
  axisLabel:   { fontSize: 8, color: colors.text.tertiary + 'bb' },
})
