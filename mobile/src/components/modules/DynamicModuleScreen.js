/**
 * DynamicModuleScreen.js
 *
 * React Native port of the web's DynamicModuleView.
 * Reads layout config from module_definitions and renders accordingly.
 *
 * Supported layout.type values:
 *   • goal_progress  → Calorie Counter (and any future goal-tracking module)
 *   • trend_chart    → Expense Tracker (and any future trend-tracking module)
 *   • (fallback)     → Generic entry list
 *
 * Adding a new dynamic module via the web Module Creator will automatically
 * adopt here without any code changes.
 */

import React, {
  useState, useEffect, useCallback, useMemo, useRef,
} from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Modal, TextInput, Pressable, KeyboardAvoidingView, Platform,
  RefreshControl, Alert, ActivityIndicator, Switch,
} from 'react-native'
import Svg, {
  Circle as SvgCircle, Rect as SvgRect, Text as SvgText, G as SvgG,
  Polygon as SvgPolygon, Polyline as SvgPolyline,
} from 'react-native-svg'
import { supabase } from '../../services/supabase'
import { getEntries, addEntry, deleteEntry } from '../../services/moduleData'
import { colors } from '../../constants/colors'
import Shimmer from '../common/Shimmer'
import { Plus, X, Check, Trash } from 'phosphor-react-native'

// ── Colour helpers ────────────────────────────────────────────────────────────
const CAT_HEX = {
  general:'#94a3b8', food:'#fb923c', transport:'#60a5fa', health:'#f87171',
  entertainment:'#c084fc', shopping:'#f472b6', utilities:'#facc15', other:'#6b7280',
  meal:'#fb923c', snack:'#facc15', drink:'#60a5fa', breakfast:'#f59e0b',
  lunch:'#10b981', dinner:'#6366f1',
}
function catHex(cat) { return CAT_HEX[(cat ?? '').toLowerCase()] ?? '#6b7280' }

const DONUT_R = 24
const DONUT_CIRC = 2 * Math.PI * DONUT_R

// ── Shared primitives ─────────────────────────────────────────────────────────

function ProgressBar({ value, max, color = '#22c55e' }) {
  const pct = Math.min((value / Math.max(max, 1)) * 100, 100)
  return (
    <View style={prim.track}>
      <View style={[prim.fill, { width: `${pct}%`, backgroundColor: color }]} />
    </View>
  )
}

// ── SVG bar chart (mobile port of TrendBar) ───────────────────────────────────

function BarChart({ bars, labels, hex, currency = '' }) {
  const [selIdx, setSelIdx] = useState(null)
  if (!bars?.length) return null
  const maxVal = Math.max(...bars.map(v => isNaN(v) ? 0 : v), 1)
  const count  = bars.length
  const BAR_H  = 72
  const LABEL_H = 14
  const VIEW_W  = Math.max(count * 18, 200)
  const barW    = VIEW_W / count
  const fmt     = n => n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })
  const selX    = selIdx !== null ? (selIdx * barW + barW / 2) : 0
  const selPct  = (selX / VIEW_W) * 100

  return (
    <View style={{ marginTop: selIdx !== null ? 24 : 0 }}>
      {selIdx !== null && (
        <View style={{ position: 'absolute', top: -28, left: `${selPct}%`, transform: [{ translateX: -44 }], width: 88, alignItems: 'center', zIndex: 10 }}>
          <View style={{ backgroundColor: colors.background.tertiary, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 0.5, borderColor: colors.border.primary }}>
            <Text style={{ fontSize: 8, color: colors.text.tertiary, fontWeight: '600' }}>{labels[selIdx]}</Text>
            <Text style={{ fontSize: 11, fontWeight: '800', color: '#fff' }}>{currency}{fmt(bars[selIdx])}</Text>
          </View>
          <View style={{ width: 0, height: 0, borderLeftWidth: 4, borderRightWidth: 4, borderTopWidth: 4, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: colors.border.primary }} />
        </View>
      )}
      {selIdx === null && (
        <View style={{ height: 12, marginBottom: 6, alignItems: 'center' }}>
          <Text style={{ fontSize: 8, color: colors.text.tertiary + '80', fontStyle: 'italic' }}>Tap bar for details</Text>
        </View>
      )}
      <Svg width="100%" height={BAR_H + LABEL_H} viewBox={`0 0 ${VIEW_W} ${BAR_H + LABEL_H}`} preserveAspectRatio="none">
        {bars.map((rawVal, i) => {
          const val  = isNaN(rawVal) ? 0 : rawVal
          const bw   = Math.max(barW * 0.72, 4)
          const x    = i * barW + (barW - bw) / 2
          const bh   = val > 0 ? Math.max(3, (val / maxVal) * BAR_H) : 0
          const isSel = selIdx === i
          const lbl  = labels[i] ?? ''
          const showLabel = count <= 31 || i % Math.ceil(count / 12) === 0 || isSel
          return (
            <SvgG key={i} onPress={() => setSelIdx(selIdx === i ? null : i)}>
              <SvgRect x={i * barW} y={0} width={barW} height={BAR_H + LABEL_H} fill="transparent" />
              <SvgRect x={x} y={0} width={bw} height={BAR_H} rx={3} fill={hex} fillOpacity={isSel ? 0.2 : 0.07} />
              {bh > 0 && <SvgRect x={x} y={BAR_H - bh} width={bw} height={bh} rx={3} fill={hex} fillOpacity={isSel ? 1 : 0.85} />}
              {showLabel && (
                <SvgText x={x + bw / 2} y={BAR_H + 11} textAnchor="middle"
                  fontSize={Math.max(5, Math.min(8, barW * 0.5))}
                  fontWeight={isSel ? 'bold' : 'normal'}
                  fill={isSel ? hex : '#6b7280'}>{lbl}</SvgText>
              )}
            </SvgG>
          )
        })}
      </Svg>
    </View>
  )
}

// ── GoalProgressView (e.g. Calorie Counter) ───────────────────────────────────

function GoalProgressView({ layout, entries }) {
  const goal         = layout.goal ?? 2000
  const aggField     = layout.aggregate ?? 'calories'
  const dateField    = layout.dateField  ?? 'logged_at'
  const macros       = layout.macros     ?? []
  const groupByField = layout.groupField ?? 'meal_type'

  const today = new Date().toLocaleDateString('en-CA')
  const todaysEntries = useMemo(() =>
    entries.filter(e => {
      const d = e.data?.[dateField] ?? ''
      return d.startsWith(today)
    }), [entries, today, dateField])

  const total     = todaysEntries.reduce((s, e) => s + (Number(e.data?.[aggField]) || 0), 0)
  const pct       = Math.min((total / goal) * 100, 100)
  const remaining = goal - total
  const over      = remaining < 0
  const mainColor = over ? '#f87171' : '#22c55e'

  // Group by meal type (or groupByField)
  const grouped = useMemo(() => {
    const map = {}
    todaysEntries.forEach(e => {
      const k = e.data?.[groupByField] ?? 'other'
      if (!map[k]) map[k] = []
      map[k].push(e)
    })
    return map
  }, [todaysEntries, groupByField])

  const groupOrder = layout.groupOrder ?? ['breakfast', 'lunch', 'dinner', 'snack', 'other', 'meal']

  return (
    <View style={{ gap: 12 }}>
      {/* ── Summary card ── */}
      <View style={gp.card}>
        <Text style={gp.dateLabel}>
          Today · {new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
        </Text>

        <View style={gp.equation}>
          <View style={gp.eqCell}>
            <Text style={gp.eqNum}>{goal}</Text>
            <Text style={gp.eqLabel}>Goal</Text>
          </View>
          <Text style={gp.eqOp}>−</Text>
          <View style={gp.eqCell}>
            <Text style={gp.eqNum}>{Math.round(total)}</Text>
            <Text style={gp.eqLabel}>Logged</Text>
          </View>
          <Text style={gp.eqOp}>=</Text>
          <View style={gp.eqCell}>
            <Text style={[gp.eqNum, { color: mainColor }]}>{Math.abs(Math.round(remaining))}</Text>
            <Text style={gp.eqLabel}>{over ? 'Over' : 'Left'}</Text>
          </View>
        </View>

        <ProgressBar value={total} max={goal} color={mainColor} />

        {macros.length > 0 && (
          <View style={gp.macros}>
            {macros.map(m => {
              const val = todaysEntries.reduce((s, e) => s + (Number(e.data?.[m.key]) || 0), 0)
              return (
                <View key={m.label} style={gp.macroRow}>
                  <Text style={gp.macroLabel}>{m.label}</Text>
                  <View style={gp.macroTrack}>
                    <View style={[gp.macroFill, { width: `${Math.min((val / (m.goal ?? 100)) * 100, 100)}%`, backgroundColor: m.color }]} />
                  </View>
                  <Text style={gp.macroVal}>{Math.round(val)}</Text>
                </View>
              )
            })}
          </View>
        )}
      </View>

      {/* ── Meal groups ── */}
      {todaysEntries.length === 0 ? (
        <View style={com.empty}>
          <Text style={com.emptyText}>Nothing logged today</Text>
          <Text style={com.emptySub}>Tap the button above to get started</Text>
        </View>
      ) : (
        [...groupOrder, ...Object.keys(grouped).filter(k => !groupOrder.includes(k))]
          .filter(k => grouped[k]?.length)
          .map(meal => {
            const items    = grouped[meal]
            const mealCals = items.reduce((s, e) => s + (Number(e.data?.[aggField]) || 0), 0)
            const hex      = catHex(meal)
            return (
              <View key={meal} style={com.group}>
                <View style={com.groupHeader}>
                  <View style={[com.groupDot, { backgroundColor: hex }]} />
                  <Text style={com.groupLabel}>{capitalize(meal)}</Text>
                  <Text style={com.groupMeta}>{Math.round(mealCals)} kcal</Text>
                </View>
                {items.map(e => (
                  <EntryRow key={e.id} entry={e} aggField={aggField}
                    label={e.data?.food_name ?? e.data?.name ?? 'Entry'}
                    sub={macros.map(m => e.data?.[m.key] ? `${m.label[0]} ${Math.round(e.data[m.key])}g` : null).filter(Boolean).join('  ·  ')}
                    unit="kcal" color={hex}
                  />
                ))}
              </View>
            )
          })
      )}
    </View>
  )
}

// ── TrendChartView (e.g. Expense Tracker) ─────────────────────────────────────

function TrendChartView({ layout, entries }) {
  const [trendPer, setTrendPer] = useState('month')

  const aggField  = layout.aggregate     ?? 'amount'
  const dateField = layout.dateField     ?? 'date'
  const catField  = layout.categoryField ?? 'category'
  const currency  = layout.defaultCurrency ?? ''
  const hex       = layout.hex ?? colors.modules.deliver

  const now    = new Date()
  const yr     = now.getFullYear()
  const mon    = now.getMonth() + 1
  const curMonth = `${yr}-${String(mon).padStart(2, '0')}`
  const todayStr = now.toLocaleDateString('en-CA')

  const monthEntries = useMemo(() =>
    entries.filter(e => String(e.data?.[dateField] ?? '').startsWith(curMonth))
  , [entries, dateField, curMonth])

  const todayEntries = useMemo(() =>
    entries.filter(e => String(e.data?.[dateField] ?? '').startsWith(todayStr))
  , [entries, dateField, todayStr])

  const total     = monthEntries.reduce((s, e) => s + (Number(e.data?.[aggField]) || 0), 0)
  const todayTotal = todayEntries.reduce((s, e) => s + (Number(e.data?.[aggField]) || 0), 0)
  const avgDaily  = monthEntries.length > 0 ? total / now.getDate() : 0
  const highest   = monthEntries.length > 0 ? monthEntries.reduce((m, e) => (Number(e.data?.[aggField]) || 0) > (Number(m.data?.[aggField]) || 0) ? e : m, monthEntries[0]) : null
  const lowest    = monthEntries.length > 0 ? monthEntries.reduce((m, e) => (Number(e.data?.[aggField]) || 0) < (Number(m.data?.[aggField]) || 0) ? e : m, monthEntries[0]) : null

  const fmt     = n => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const fmtDate = s => s ? new Date(s).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : ''

  // Donut segments
  const donutSegs = useMemo(() => {
    const map = {}
    monthEntries.forEach(e => { const c = e.data?.[catField] ?? 'Other'; map[c] = (map[c] ?? 0) + (Number(e.data?.[aggField]) || 0) })
    return Object.entries(map).sort(([,a],[,b]) => b-a).map(([cat, amt]) => {
      const pct = total > 0 ? (amt / total) * 100 : 0
      const dash = (pct / 100) * DONUT_CIRC; const gap = DONUT_CIRC - dash
      return { cat, amt, pct, dash, gap, color: catHex(cat) }
    })
  }, [monthEntries, total, aggField, catField])

  let cumPct = 0
  const segsWithOffset = donutSegs.map(seg => {
    const offset = DONUT_CIRC - (cumPct / 100) * DONUT_CIRC
    cumPct += seg.pct
    return { ...seg, offset }
  })

  // Trend data
  const trendData = useMemo(() => {
    const pad = n => String(n).padStart(2, '0')
    if (trendPer === 'week') {
      const day = now.getDay()
      const weekStart = new Date(now); weekStart.setDate(now.getDate() - (day === 0 ? 6 : day - 1)); weekStart.setHours(0,0,0,0)
      const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(weekStart); d.setDate(d.getDate() + i); return d.toISOString().split('T')[0] })
      const labels = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']
      return { bars: days.map(ds => entries.filter(e => e.data?.[dateField] === ds).reduce((s, e) => s + (Number(e.data?.[aggField]) || 0), 0)), labels }
    }
    if (trendPer === 'month') {
      const dim = new Date(yr, mon, 0).getDate()
      return {
        bars:   Array.from({ length: dim }, (_, i) => { const ds = `${curMonth}-${pad(i+1)}`; return monthEntries.filter(e => e.data?.[dateField] === ds).reduce((s, e) => s + (Number(e.data?.[aggField]) || 0), 0) }),
        labels: Array.from({ length: dim }, (_, i) => String(i+1)),
      }
    }
    const ML = ['J','F','M','A','M','J','J','A','S','O','N','D']
    return {
      bars:   Array.from({ length: 12 }, (_, i) => entries.filter(e => String(e.data?.[dateField] ?? '').startsWith(`${yr}-${pad(i+1)}`)).reduce((s, e) => s + (Number(e.data?.[aggField]) || 0), 0)),
      labels: ML,
    }
  }, [trendPer, entries, monthEntries, aggField, dateField, yr, mon, curMonth])

  // Group by date for list
  const grouped = useMemo(() => {
    const map = new Map()
    const sorted = [...monthEntries].sort((a, b) => String(b.data?.[dateField] ?? '').localeCompare(String(a.data?.[dateField] ?? '')))
    sorted.forEach(e => { const d = e.data?.[dateField] ?? ''; if (!map.has(d)) map.set(d, []); map.get(d).push(e) })
    return map
  }, [monthEntries, dateField])

  function dayLabel(ds) {
    const d = new Date(ds + 'T00:00:00')
    const t = new Date(); t.setHours(0,0,0,0)
    const y = new Date(t); y.setDate(t.getDate() - 1)
    if (d.toDateString() === t.toDateString()) return 'Today'
    if (d.toDateString() === y.toDateString()) return 'Yesterday'
    return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
  }

  return (
    <View style={{ gap: 12 }}>
      {/* ── Month / Today totals ── */}
      <View style={tc.totalsRow}>
        <View style={[tc.totalCard, { flex: 1.3 }]}>
          <Text style={tc.totalLabel}>THIS MONTH</Text>
          <Text style={tc.totalNum} numberOfLines={1} adjustsFontSizeToFit>{currency} {fmt(total)}</Text>
        </View>
        <View style={tc.totalCard}>
          <Text style={tc.totalLabel}>TODAY</Text>
          <Text style={[tc.totalNum, { fontSize: 18 }]} numberOfLines={1} adjustsFontSizeToFit>{currency} {fmt(todayTotal)}</Text>
        </View>
      </View>

      {/* ── Category donut + stats ── */}
      {donutSegs.length > 0 && (
        <View style={tc.card}>
          <Text style={tc.secLabel}>BREAKDOWN</Text>
          <View style={tc.donutRow}>
            <View style={{ width: 60, height: 60 }}>
              <Svg width={60} height={60} viewBox="0 0 60 60">
                <SvgCircle cx={30} cy={30} r={DONUT_R} fill="none" stroke="#1f2937" strokeWidth={9} />
                {segsWithOffset.map((seg, i) => (
                  <SvgCircle key={i} cx={30} cy={30} r={DONUT_R} fill="none"
                    stroke={seg.color} strokeWidth={9}
                    strokeDasharray={`${seg.dash} ${seg.gap}`}
                    strokeDashoffset={seg.offset}
                    rotation={-90} originX={30} originY={30}
                  />
                ))}
              </Svg>
            </View>
            <View style={{ flex: 1, gap: 5 }}>
              {donutSegs.slice(0, 4).map(seg => (
                <View key={seg.cat} style={tc.legendRow}>
                  <View style={[tc.legendDot, { backgroundColor: seg.color }]} />
                  <Text style={tc.legendCat} numberOfLines={1}>{seg.cat}</Text>
                  <Text style={tc.legendAmt}>{fmt(seg.amt)}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={tc.insightRow}>
            <View style={{ flex: 1 }}>
              <Text style={[tc.insightLabel, { color: '#F59E0B' }]}>AVERAGE</Text>
              <Text style={tc.insightNum}>{currency} {fmt(avgDaily)}</Text>
              <Text style={tc.insightSub}>Per Day</Text>
            </View>
            {highest && (
              <View style={{ flex: 1, alignItems: 'center' }}>
                <Text style={[tc.insightLabel, { color: '#f87171' }]}>HIGHEST</Text>
                <Text style={tc.insightNum}>{currency} {fmt(Number(highest.data?.[aggField]))}</Text>
                <Text style={tc.insightSub}>{fmtDate(highest.data?.[dateField])}</Text>
              </View>
            )}
            {lowest && (
              <View style={{ flex: 1, alignItems: 'flex-end' }}>
                <Text style={[tc.insightLabel, { color: '#22c55e' }]}>LOWEST</Text>
                <Text style={tc.insightNum}>{currency} {fmt(Number(lowest.data?.[aggField]))}</Text>
                <Text style={tc.insightSub}>{fmtDate(lowest.data?.[dateField])}</Text>
              </View>
            )}
          </View>
        </View>
      )}

      {/* ── Trend chart ── */}
      <View style={tc.card}>
        <View style={tc.trendHeader}>
          <Text style={tc.secLabel}>TREND</Text>
          <View style={tc.trendTabs}>
            {[['week','7D'],['month','1M'],['year','1Y']].map(([k, lbl]) => (
              <TouchableOpacity key={k} onPress={() => setTrendPer(k)} activeOpacity={0.7}
                style={[tc.trendTab, trendPer === k && { backgroundColor: hex + '18', borderColor: hex + '50' }]}>
                <Text style={[tc.trendTabTxt, trendPer === k && { color: hex }]}>{lbl}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        <BarChart key={trendPer} bars={trendData.bars} labels={trendData.labels} hex={hex} currency={currency} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 3 }}>
          <Text style={tc.axisLabel}>{currency} 0</Text>
          <Text style={tc.axisLabel}>{currency} {Math.max(...trendData.bars.map(v => isNaN(v) ? 0 : v), 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</Text>
        </View>
      </View>

      {/* ── Date-grouped list ── */}
      {monthEntries.length === 0 ? (
        <View style={com.empty}>
          <Text style={com.emptyText}>No entries this month</Text>
          <Text style={com.emptySub}>Tap the button above to log one</Text>
        </View>
      ) : (
        [...grouped.entries()].map(([day, items]) => (
          <View key={day} style={com.group}>
            <View style={com.groupHeader}>
              <Text style={com.groupLabel}>{dayLabel(day)}</Text>
              <Text style={com.groupMeta}>{currency} {fmt(items.reduce((s, e) => s + (Number(e.data?.[aggField]) || 0), 0))}</Text>
            </View>
            {items.map(e => {
              const cHex = catHex(e.data?.[catField] ?? 'other')
              return (
                <EntryRow key={e.id} entry={e} aggField={aggField}
                  label={e.data?.item || e.data?.merchant || e.data?.[catField] || 'Entry'}
                  sub={[e.data?.merchant, e.data?.[catField]].filter(Boolean).join(' · ')}
                  unit={currency} color={cHex} prefixUnit
                />
              )
            })}
          </View>
        ))
      )}
    </View>
  )
}

// ── Generic list view (fallback for unknown layout.type) ──────────────────────

function GenericListView({ layout, entries, schema, onDelete }) {
  const dateField = layout.dateField ?? 'created_at'
  const aggField  = layout.aggregate

  // Derive the best label and sub-label from schema fields
  const labelField = schema?.find(f => f.type === 'text' || f.type === 'string') ?? schema?.[0]
  const subField   = schema?.find(f => f.type === 'date' || f.type === 'datetime')

  return (
    <View>
      {entries.length === 0 ? (
        <View style={com.empty}>
          <Text style={com.emptyText}>No entries yet</Text>
          <Text style={com.emptySub}>Tap + to add the first one</Text>
        </View>
      ) : entries.map(e => {
        const label = labelField ? String(e.data?.[labelField.key] ?? 'Entry') : String(Object.values(e.data ?? {})[0] ?? 'Entry')
        const rawSub = subField ? e.data?.[subField.key] : e.data?.[dateField]
        const sub = rawSub ? new Date(rawSub).toLocaleDateString() : ''
        return (
          <View key={e.id} style={com.group}>
            <EntryRow
              entry={e}
              aggField={aggField}
              label={label}
              sub={sub}
              unit=""
              onDelete={onDelete}
            />
          </View>
        )
      })}
    </View>
  )
}

// ── Shared EntryRow ───────────────────────────────────────────────────────────

function EntryRow({ entry, aggField, label, sub, unit, color, prefixUnit, onDelete }) {
  const val = aggField ? Number(entry.data?.[aggField]) || 0 : null

  const confirmDelete = () => {
    if (!onDelete) return
    Alert.alert('Delete entry', 'Remove this entry?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => onDelete(entry.id) },
    ])
  }

  return (
    <View style={com.entryRow}>
      {color && (
        <View style={[com.entryDotWrap, { backgroundColor: color + '22' }]}>
          <View style={[com.entryDot, { backgroundColor: color }]} />
        </View>
      )}
      <View style={{ flex: 1, gap: 1 }}>
        <Text style={com.entryLabel} numberOfLines={1}>{label}</Text>
        {sub ? <Text style={com.entrySub} numberOfLines={1}>{sub}</Text> : null}
      </View>
      {val !== null && (
        <Text style={com.entryVal}>
          {prefixUnit ? `${unit} ` : ''}{val.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}{!prefixUnit && unit ? ` ${unit}` : ''}
        </Text>
      )}
      {onDelete && (
        <TouchableOpacity onPress={confirmDelete} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={{ marginLeft: 8 }}>
          <Trash size={14} color={colors.text.tertiary} />
        </TouchableOpacity>
      )}
    </View>
  )
}

// ── Calorie Form ──────────────────────────────────────────────────────────────

function CalorieFormSheet({ visible, onClose, onSave }) {
  const MEALS = ['Breakfast', 'Lunch', 'Dinner', 'Snacks']
  const MEAL_COLORS = { Breakfast: '#F59E0B', Lunch: '#10B981', Dinner: '#6366F1', Snacks: '#EC4899' }

  const [meal, setMeal]       = useState('Breakfast')
  const [food, setFood]       = useState('')
  const [calories, setCalories] = useState('')
  const [protein, setProtein] = useState('')
  const [carbs, setCarbs]     = useState('')
  const [fat, setFat]         = useState('')
  const [saving, setSaving]   = useState(false)

  function reset() { setMeal('Breakfast'); setFood(''); setCalories(''); setProtein(''); setCarbs(''); setFat('') }
  function handleClose() { reset(); onClose() }

  async function handleSave() {
    if (!food.trim() || !calories.trim()) {
      Alert.alert('Required', 'Food name and calories are required'); return
    }
    setSaving(true)
    try {
      await onSave({
        meal_type:  meal.toLowerCase(),
        food_name:  food.trim(),
        calories:   parseFloat(calories) || 0,
        protein:    protein ? parseFloat(protein) || 0 : undefined,
        carbs:      carbs   ? parseFloat(carbs)   || 0 : undefined,
        fat:        fat     ? parseFloat(fat)      || 0 : undefined,
        logged_at:  new Date().toISOString(),
      })
      reset(); onClose()
    } catch { Alert.alert('Error', 'Could not save. Please try again.') }
    finally { setSaving(false) }
  }

  const canSave = food.trim().length > 0 && calories.trim().length > 0
  const activeColor = MEAL_COLORS[meal] ?? '#F59E0B'

  return (
    <Modal visible={visible} animationType="slide" transparent presentationStyle="overFullScreen">
      <KeyboardAvoidingView style={form.outer} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <Pressable style={form.backdrop} onPress={handleClose} />
        <View style={form.sheet}>
          <View style={form.handle} />
          <View style={form.header}>
            <Text style={form.title}>Log Calories</Text>
            <TouchableOpacity onPress={handleClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <X color={colors.text.tertiary} size={18} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={{ flexGrow: 0 }}>
            {/* Meal chips */}
            <Text style={form.label}>MEAL</Text>
            <View style={form.chipRow}>
              {MEALS.map(m => {
                const sel = meal === m
                const c   = MEAL_COLORS[m]
                return (
                  <Pressable key={m} onPress={() => setMeal(m)}
                    style={[form.pill, sel && { backgroundColor: c + '25', borderColor: c }]}>
                    <Text style={[form.pillTxt, sel && { color: c, fontWeight: '700' }]}>{m}</Text>
                  </Pressable>
                )
              })}
            </View>

            {/* Food */}
            <Text style={[form.label, { marginTop: 16 }]}>FOOD</Text>
            <TextInput style={form.input} placeholder="e.g. Banana, Fried Chicken"
              placeholderTextColor={colors.text.tertiary} value={food}
              onChangeText={setFood} autoFocus returnKeyType="next" />

            {/* Calories */}
            <Text style={[form.label, { marginTop: 14 }]}>CALORIES <Text style={form.labelSub}>(kcal)</Text></Text>
            <TextInput style={form.input} placeholder="e.g. 350"
              placeholderTextColor={colors.text.tertiary} value={calories}
              onChangeText={setCalories} keyboardType="decimal-pad" />

            {/* Macros */}
            <Text style={[form.label, { marginTop: 14 }]}>MACROS <Text style={form.labelSub}>(g, optional)</Text></Text>
            <View style={form.macroRow}>
              {[['PROTEIN', protein, setProtein], ['CARBS', carbs, setCarbs], ['FAT', fat, setFat]].map(([lbl, val, setter]) => (
                <View key={lbl} style={{ flex: 1 }}>
                  <Text style={form.macroLbl}>{lbl}</Text>
                  <TextInput style={[form.input, { textAlign: 'center' }]}
                    placeholder="0" placeholderTextColor={colors.text.tertiary}
                    value={val} onChangeText={setter} keyboardType="decimal-pad" />
                </View>
              ))}
            </View>
            <View style={{ height: 8 }} />
          </ScrollView>

          <TouchableOpacity style={[form.saveBtn, { backgroundColor: '#22c55e' }, (!canSave || saving) && form.saveBtnDis]}
            onPress={handleSave} disabled={!canSave || saving}>
            {saving
              ? <ActivityIndicator size="small" color="#fff" />
              : <><Check color="#fff" size={14} weight="bold" /><Text style={form.saveTxt}>Add Food</Text></>
            }
          </TouchableOpacity>
          <View style={{ height: 24 }} />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

// ── Expense Form ──────────────────────────────────────────────────────────────

function ExpenseFormSheet({ visible, onClose, onSave, layout }) {
  const CATS = ['General', 'Food', 'Transport', 'Health', 'Entertainment', 'Shopping', 'Utilities', 'Other']
  const currency = layout?.defaultCurrency ?? 'PHP'
  const hex      = layout?.hex ?? '#C2440E'

  const [amount,   setAmount]   = useState('')
  const [item,     setItem]     = useState('')
  const [merchant, setMerchant] = useState('')
  const [category, setCategory] = useState('General')
  const [saving,   setSaving]   = useState(false)

  function reset() { setAmount(''); setItem(''); setMerchant(''); setCategory('General') }
  function handleClose() { reset(); onClose() }

  async function handleSave() {
    if (!amount.trim()) { Alert.alert('Required', 'Amount is required'); return }
    setSaving(true)
    try {
      await onSave({
        amount:   parseFloat(amount) || 0,
        item:     item.trim()     || undefined,
        merchant: merchant.trim() || undefined,
        category: category.toLowerCase(),
        date:     new Date().toLocaleDateString('en-CA'),
      })
      reset(); onClose()
    } catch { Alert.alert('Error', 'Could not save. Please try again.') }
    finally { setSaving(false) }
  }

  const canSave = amount.trim().length > 0

  return (
    <Modal visible={visible} animationType="slide" transparent presentationStyle="overFullScreen">
      <KeyboardAvoidingView style={form.outer} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <Pressable style={form.backdrop} onPress={handleClose} />
        <View style={form.sheet}>
          <View style={form.handle} />
          <View style={form.header}>
            <Text style={form.title}>Log Expense</Text>
            <TouchableOpacity onPress={handleClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <X color={colors.text.tertiary} size={18} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={{ flexGrow: 0 }}>
            {/* Amount */}
            <Text style={form.label}>AMOUNT</Text>
            <View style={form.amountRow}>
              <Text style={form.currencyPrefix}>{currency}</Text>
              <TextInput style={[form.input, { flex: 1, borderTopLeftRadius: 0, borderBottomLeftRadius: 0, borderLeftWidth: 0 }]}
                placeholder="0.00" placeholderTextColor={colors.text.tertiary}
                value={amount} onChangeText={setAmount} keyboardType="decimal-pad" autoFocus />
            </View>

            {/* Item */}
            <Text style={[form.label, { marginTop: 14 }]}>ITEM</Text>
            <TextInput style={form.input} placeholder="e.g. Fried Chicken, Gas, Groceries"
              placeholderTextColor={colors.text.tertiary} value={item} onChangeText={setItem} />

            {/* Merchant */}
            <Text style={[form.label, { marginTop: 14 }]}>MERCHANT <Text style={form.labelSub}>(optional)</Text></Text>
            <TextInput style={form.input} placeholder="e.g. Jollibee, Shell, SM"
              placeholderTextColor={colors.text.tertiary} value={merchant} onChangeText={setMerchant} />

            {/* Category */}
            <Text style={[form.label, { marginTop: 14 }]}>CATEGORY</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={form.chipRow}>
              {CATS.map(cat => {
                const sel = category === cat
                const c   = catHex(cat)
                return (
                  <Pressable key={cat} onPress={() => setCategory(cat)}
                    style={[form.pill, sel && { backgroundColor: c + '25', borderColor: c }]}>
                    <Text style={[form.pillTxt, sel && { color: c, fontWeight: '700' }]}>{cat}</Text>
                  </Pressable>
                )
              })}
            </ScrollView>
            <View style={{ height: 8 }} />
          </ScrollView>

          <TouchableOpacity style={[form.saveBtn, { backgroundColor: hex }, (!canSave || saving) && form.saveBtnDis]}
            onPress={handleSave} disabled={!canSave || saving}>
            {saving
              ? <ActivityIndicator size="small" color="#fff" />
              : <><Check color="#fff" size={14} weight="bold" /><Text style={form.saveTxt}>Save Expense</Text></>
            }
          </TouchableOpacity>
          <View style={{ height: 24 }} />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

// ── Generic Form Sheet (fallback for unknown module types) ────────────────────

function GenericFormSheet({ visible, onClose, onSave, definition }) {
  const schema = definition?.schema ?? []
  const layout = definition?.layout ?? {}

  const initValues = () => schema.reduce((acc, f) => {
    switch (f.type) {
      case 'boolean':  acc[f.key] = false; break
      case 'counter':  acc[f.key] = 0; break
      case 'date':     acc[f.key] = new Date().toLocaleDateString('en-CA'); break
      case 'datetime': acc[f.key] = new Date().toISOString().slice(0, 16); break
      default:         acc[f.key] = ''
    }
    return acc
  }, {})

  const [values, setValues] = useState(initValues)
  const [saving, setSaving] = useState(false)

  const set = (key, val) => setValues(prev => ({ ...prev, [key]: val }))
  function reset() { setValues(initValues()) }
  function handleClose() { reset(); onClose() }

  async function handleSave() {
    const required = schema.filter(f => f.required)
    for (const f of required) {
      if (!String(values[f.key] ?? '').trim()) {
        Alert.alert('Required', `${f.label} is required`); return
      }
    }
    setSaving(true)
    try {
      const data = {}
      schema.forEach(f => {
        const raw = values[f.key]
        if (raw === '' || raw === null || raw === undefined) return
        data[f.key] = f.type === 'number' ? parseFloat(raw) || 0 : raw
      })
      if (layout.dateField && !data[layout.dateField]) {
        data[layout.dateField] = layout.dateField.includes('at')
          ? new Date().toISOString()
          : new Date().toLocaleDateString('en-CA')
      }
      await onSave(data)
      reset(); onClose()
    } catch { Alert.alert('Error', 'Could not save. Please try again.') }
    finally { setSaving(false) }
  }

  const canSave = schema.filter(f => f.required).every(f => String(values[f.key] ?? '').trim())

  return (
    <Modal visible={visible} animationType="slide" transparent presentationStyle="overFullScreen">
      <KeyboardAvoidingView style={form.outer} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <Pressable style={form.backdrop} onPress={handleClose} />
        <View style={form.sheet}>
          <View style={form.handle} />
          <View style={form.header}>
            <Text style={form.title}>Add Entry</Text>
            <TouchableOpacity onPress={handleClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <X color={colors.text.tertiary} size={18} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={{ flexGrow: 0 }}>
            {schema.map((field, idx) => {
              const cfg = field.config ?? {}
              const labelEl = (
                <Text style={form.label}>
                  {field.label.toUpperCase()}
                  {!field.required && <Text style={form.labelSub}> (optional)</Text>}
                  {cfg.unit ? <Text style={form.labelSub}> ({cfg.unit})</Text> : ''}
                </Text>
              )

              // ── select ───────────────────────────────────────────────────
              if (field.type === 'select') {
                return (
                  <View key={field.key} style={{ marginBottom: 14 }}>
                    {labelEl}
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={form.chipRow}>
                      {(cfg.options ?? []).map(opt => {
                        const sel = values[field.key] === opt
                        const hex = catHex(opt)
                        return (
                          <Pressable key={opt} onPress={() => set(field.key, opt)}
                            style={[form.pill, sel && { backgroundColor: hex + '25', borderColor: hex }]}>
                            <Text style={[form.pillTxt, sel && { color: hex, fontWeight: '700' }]}>{capitalize(opt)}</Text>
                          </Pressable>
                        )
                      })}
                    </ScrollView>
                  </View>
                )
              }

              // ── boolean ──────────────────────────────────────────────────
              if (field.type === 'boolean') {
                return (
                  <View key={field.key} style={{ marginBottom: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    {labelEl}
                    <Switch
                      value={!!values[field.key]}
                      onValueChange={v => set(field.key, v)}
                      trackColor={{ false: '#374151', true: colors.modules?.aly ?? '#6366f1' }}
                      thumbColor="#fff"
                    />
                  </View>
                )
              }

              // ── counter ──────────────────────────────────────────────────
              if (field.type === 'counter') {
                const num  = Number(values[field.key] ?? 0)
                const step = cfg.step ?? 1
                const min  = cfg.min  ?? 0
                const max  = cfg.max  ?? 99999
                return (
                  <View key={field.key} style={{ marginBottom: 14 }}>
                    {labelEl}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8 }}>
                      <TouchableOpacity
                        onPress={() => set(field.key, Math.max(min, num - step))}
                        style={[form.stepBtn, { borderColor: colors.border?.primary ?? '#374151' }]}
                      >
                        <Text style={{ color: colors.text.primary, fontSize: 18, fontWeight: '600' }}>−</Text>
                      </TouchableOpacity>
                      <View style={{ flex: 1, alignItems: 'center' }}>
                        <Text style={{ color: colors.text.primary, fontSize: 28, fontWeight: '700' }}>{num}</Text>
                        {cfg.unit ? <Text style={form.labelSub}>{cfg.unit}</Text> : null}
                      </View>
                      <TouchableOpacity
                        onPress={() => set(field.key, Math.min(max, num + step))}
                        style={[form.stepBtn, { borderColor: colors.modules?.aly ?? '#6366f1', backgroundColor: (colors.modules?.aly ?? '#6366f1') + '15' }]}
                      >
                        <Text style={{ color: colors.modules?.aly ?? '#6366f1', fontSize: 18, fontWeight: '600' }}>+</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )
              }

              // ── date / datetime → text with YYYY-MM-DD hint ──────────────
              if (field.type === 'date' || field.type === 'datetime') {
                return (
                  <View key={field.key} style={{ marginBottom: 14 }}>
                    {labelEl}
                    <TextInput
                      style={form.input}
                      placeholder={field.type === 'date' ? 'YYYY-MM-DD' : 'YYYY-MM-DD HH:MM'}
                      placeholderTextColor={colors.text.tertiary}
                      value={String(values[field.key] ?? '')}
                      onChangeText={v => set(field.key, v)}
                      keyboardType="numbers-and-punctuation"
                      autoFocus={idx === 0}
                    />
                  </View>
                )
              }

              // ── number, text, string (default) ───────────────────────────
              return (
                <View key={field.key} style={{ marginBottom: 14 }}>
                  {labelEl}
                  <TextInput style={form.input}
                    placeholder={cfg.placeholder ?? (field.type === 'number' ? '0' : '')}
                    placeholderTextColor={colors.text.tertiary}
                    value={String(values[field.key] ?? '')}
                    onChangeText={v => set(field.key, v)}
                    keyboardType={field.type === 'number' ? 'decimal-pad' : 'default'}
                    autoFocus={idx === 0} />
                </View>
              )
            })}
            <View style={{ height: 8 }} />
          </ScrollView>

          <TouchableOpacity style={[form.saveBtn, (!canSave || saving) && form.saveBtnDis]}
            onPress={handleSave} disabled={!canSave || saving}>
            {saving
              ? <ActivityIndicator size="small" color="#fff" />
              : <><Check color="#fff" size={14} weight="bold" /><Text style={form.saveTxt}>Save</Text></>
            }
          </TouchableOpacity>
          <View style={{ height: 24 }} />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

// ── Form dispatcher ───────────────────────────────────────────────────────────

function DynamicFormSheet({ visible, onClose, onSave, definition }) {
  const slug = definition?.slug ?? ''
  if (slug === 'calorie_counter') {
    return <CalorieFormSheet visible={visible} onClose={onClose} onSave={onSave} />
  }
  if (slug === 'expense_tracker') {
    return <ExpenseFormSheet visible={visible} onClose={onClose} onSave={onSave} layout={definition?.layout} />
  }
  return <GenericFormSheet visible={visible} onClose={onClose} onSave={onSave} definition={definition} />
}

// ── Main DynamicModuleScreen ──────────────────────────────────────────────────

export default function DynamicModuleScreen({ definition, hub, userId: propUserId }) {
  const [entries,    setEntries]    = useState([])
  const [loading,    setLoading]    = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [showForm,   setShowForm]   = useState(false)
  const [userId,     setUserId]     = useState(propUserId ?? null)

  // Resolve user if not passed
  useEffect(() => {
    if (!userId) {
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (user) setUserId(user.id)
      })
    }
  }, [])

  const load = useCallback(async (isRefresh = false) => {
    if (!definition?.id) return
    if (isRefresh) setRefreshing(true)

    try {
      const { data, fromCache } = await getEntries(definition.id, hub?.id, userId)

      // Sort by date field descending
      const dateField = definition.layout?.dateField ?? 'created_at'
      const sorted = [...data].sort((a, b) => {
        const va = a.data?.[dateField] ?? a.created_at ?? ''
        const vb = b.data?.[dateField] ?? b.created_at ?? ''
        return String(vb).localeCompare(String(va))
      })
      setEntries(sorted)

      // If from cache, loading spinner goes away quickly; fresh fetch happens in background
      if (!fromCache || isRefresh) setLoading(false)
      else setLoading(false)
    } catch (e) {
      console.warn('[DynamicModuleScreen] load error:', e)
      setLoading(false)
    } finally {
      setRefreshing(false)
    }
  }, [definition?.id, hub?.id, userId])

  useEffect(() => { load() }, [load])

  async function handleSave(data) {
    if (!userId || !definition?.id) throw new Error('Not ready')
    const newEntry = await addEntry(definition.id, hub?.id, userId, data)
    setEntries(prev => [newEntry, ...prev])
  }

  async function handleDeleteEntry(entryId) {
    setEntries(prev => prev.filter(e => e.id !== entryId))
    try { await deleteEntry(entryId) } catch { /* silent — optimistic */ }
  }

  const layout    = definition?.layout   ?? {}
  const layoutType = layout.type
  const hex       = layout.hex ?? layout.brand_color ?? definition?.brand_color ?? colors.modules.aly
  const defName   = definition?.name ?? 'Module'

  const logBtnColor = layoutType === 'goal_progress' ? '#22c55e'
    : layoutType === 'trend_chart'   ? hex
    : colors.modules.aly

  if (loading) return <Shimmer.Module />

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background.primary }}
        contentContainerStyle={{ padding: 16, paddingBottom: 100, gap: 14 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.text.tertiary} />
        }
      >
        {/* ── Layout-driven body ── */}
        {layoutType === 'goal_progress' && <GoalProgressView layout={layout} entries={entries} />}
        {layoutType === 'trend_chart'   && <TrendChartView   layout={layout} entries={entries} />}
        {(!layoutType || (layoutType !== 'goal_progress' && layoutType !== 'trend_chart')) && (
          <GenericListView layout={layout} entries={entries} schema={definition?.schema} onDelete={handleDeleteEntry} />
        )}
      </ScrollView>

      {/* ── Log FAB (where Aly button used to be) ── */}
      <TouchableOpacity
        style={[com.logFab, { backgroundColor: logBtnColor }]}
        onPress={() => setShowForm(true)}
        activeOpacity={0.85}
      >
        <Plus size={22} color="#fff" weight="bold" />
      </TouchableOpacity>

      <DynamicFormSheet
        visible={showForm}
        onClose={() => setShowForm(false)}
        onSave={handleSave}
        definition={definition}
      />
    </View>
  )
}

// ── Utility ───────────────────────────────────────────────────────────────────
function capitalize(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : '' }

// ── Styles ────────────────────────────────────────────────────────────────────

const prim = StyleSheet.create({
  track: { height: 5, borderRadius: 3, backgroundColor: colors.background.tertiary, overflow: 'hidden', marginVertical: 2 },
  fill:  { height: '100%', borderRadius: 3 },
})

const com = StyleSheet.create({
  logFab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },

  group: {
    backgroundColor: colors.background.secondary,
    borderRadius: 14, borderWidth: 0.5, borderColor: colors.border.primary, overflow: 'hidden',
  },
  groupHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 14, paddingVertical: 10,
    borderBottomWidth: 0.5, borderBottomColor: colors.border.primary,
  },
  groupDot:  { width: 8, height: 8, borderRadius: 4 },
  groupLabel:{ flex: 1, fontSize: 11, fontWeight: '700', color: colors.text.secondary, textTransform: 'uppercase', letterSpacing: 0.8 },
  groupMeta: { fontSize: 11, color: colors.text.tertiary },

  entryRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 14, paddingVertical: 11,
    borderBottomWidth: 0.5, borderBottomColor: colors.border.primary + '40',
  },
  entryDotWrap: { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  entryDot:     { width: 8, height: 8, borderRadius: 4 },
  entryLabel:   { fontSize: 14, fontWeight: '500', color: colors.text.primary },
  entrySub:     { fontSize: 10, color: colors.text.tertiary },
  entryVal:     { fontSize: 13, fontWeight: '700', color: colors.text.primary, minWidth: 50, textAlign: 'right' },

  empty: { alignItems: 'center', paddingVertical: 44, gap: 8 },
  emptyText: { fontSize: 14, fontWeight: '500', color: colors.text.secondary },
  emptySub:  { fontSize: 12, color: colors.text.tertiary },
})

const gp = StyleSheet.create({
  card: {
    backgroundColor: colors.background.secondary,
    borderRadius: 18, borderWidth: 0.5, borderColor: colors.border.primary,
    padding: 16, gap: 12,
  },
  dateLabel: { fontSize: 10, fontWeight: '700', color: colors.text.tertiary, letterSpacing: 1.5, textTransform: 'uppercase' },
  equation:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
  eqCell:    { alignItems: 'center', gap: 2 },
  eqNum:     { fontSize: 22, fontWeight: '800', color: colors.text.primary },
  eqLabel:   { fontSize: 9, color: colors.text.tertiary, letterSpacing: 0.5 },
  eqOp:      { fontSize: 18, color: colors.text.tertiary, paddingHorizontal: 4 },
  macros:    { gap: 8, paddingTop: 10, borderTopWidth: 0.5, borderTopColor: colors.border.primary + '40' },
  macroRow:  { flexDirection: 'row', alignItems: 'center', gap: 10 },
  macroLabel:{ fontSize: 9, color: colors.text.tertiary, width: 42 },
  macroTrack:{ flex: 1, height: 4, borderRadius: 2, backgroundColor: colors.background.tertiary, overflow: 'hidden' },
  macroFill: { height: '100%', borderRadius: 2 },
  macroVal:  { fontSize: 9, color: colors.text.secondary, width: 30, textAlign: 'right' },
})

const tc = StyleSheet.create({
  totalsRow: {
    flexDirection: 'row', gap: 10,
  },
  totalCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: 16, borderWidth: 0.5, borderColor: colors.border.primary,
    padding: 14, gap: 4, flex: 1,
  },
  totalLabel: { fontSize: 9, fontWeight: '700', color: colors.text.tertiary, textTransform: 'uppercase', letterSpacing: 0.8 },
  totalNum:   { fontSize: 22, fontWeight: '800', color: colors.text.primary, letterSpacing: -0.5 },

  card: {
    backgroundColor: colors.background.secondary,
    borderRadius: 18, borderWidth: 0.5, borderColor: colors.border.primary,
    padding: 16, gap: 12,
  },
  secLabel: { fontSize: 9, fontWeight: '700', color: colors.text.tertiary, textTransform: 'uppercase', letterSpacing: 1 },
  donutRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  legendRow:{ flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot:{ width: 7, height: 7, borderRadius: 4, flexShrink: 0 },
  legendCat:{ flex: 1, fontSize: 10, color: colors.text.secondary },
  legendAmt:{ fontSize: 10, fontWeight: '700', color: colors.text.primary },

  insightRow:   { flexDirection: 'row', backgroundColor: colors.background.tertiary, borderRadius: 14, padding: 12, borderWidth: 0.5, borderColor: colors.border.primary },
  insightLabel: { fontSize: 8, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  insightNum:   { fontSize: 13, fontWeight: '800', color: colors.text.primary, marginTop: 2 },
  insightSub:   { fontSize: 8, color: colors.text.tertiary },

  trendHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  trendTabs:   { flexDirection: 'row', gap: 4 },
  trendTab:    { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: colors.border.primary },
  trendTabTxt: { fontSize: 10, fontWeight: '700', color: colors.text.tertiary },
  axisLabel:   { fontSize: 8, color: colors.text.tertiary + 'aa' },
})

const form = StyleSheet.create({
  outer:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' },
  backdrop: { flex: 1 },
  sheet: {
    backgroundColor: colors.background.primary,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    borderTopWidth: 0.5, borderColor: colors.border.primary,
    paddingHorizontal: 20, paddingTop: 12,
    maxHeight: '88%',
  },
  handle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: colors.border.primary,
    alignSelf: 'center', marginBottom: 16,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  title:  { fontSize: 17, fontWeight: '700', color: colors.text.primary },
  label:  { fontSize: 10, fontWeight: '700', color: colors.text.tertiary, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 8 },
  labelSub: { fontSize: 10, fontWeight: '400', color: colors.text.tertiary, textTransform: 'none', letterSpacing: 0 },
  input:  { backgroundColor: colors.background.secondary, borderRadius: 10, borderWidth: 0.5, borderColor: colors.border.primary, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: colors.text.primary },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  pill:    { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 0.5, borderColor: colors.border.primary, backgroundColor: colors.background.secondary },
  pillTxt: { fontSize: 13, fontWeight: '600', color: colors.text.secondary },
  macroRow: { flexDirection: 'row', gap: 10 },
  macroLbl: { fontSize: 9, fontWeight: '700', color: colors.text.tertiary, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 6, textAlign: 'center' },
  amountRow: { flexDirection: 'row', alignItems: 'center' },
  currencyPrefix: {
    fontSize: 14, fontWeight: '700', color: colors.text.secondary,
    backgroundColor: colors.background.secondary,
    borderWidth: 0.5, borderColor: colors.border.primary,
    borderTopLeftRadius: 10, borderBottomLeftRadius: 10,
    paddingHorizontal: 12, paddingVertical: 12,
    borderRightWidth: 0,
  },
  saveBtn:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: colors.modules.aly, borderRadius: 14, paddingVertical: 14, marginTop: 8 },
  saveBtnDis: { opacity: 0.4 },
  saveTxt:    { fontSize: 14, fontWeight: '700', color: '#fff' },
  stepBtn:    { width: 44, height: 44, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
})
