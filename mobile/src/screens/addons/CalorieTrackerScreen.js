import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, ActivityIndicator, Alert, RefreshControl,
  Pressable, Modal, KeyboardAvoidingView, Platform,
} from 'react-native';
import { supabase } from '../../services/supabase';
import { colors } from '../../constants/colors';
import { ForkKnife, X, Check } from 'phosphor-react-native';

// Module-level cache for module_def_id (survives re-renders, cleared on app restart)
let _calorieDefId = null;

const GOAL = 2000;

const MEALS = [
  { key: 'breakfast', label: 'Breakfast', color: '#F59E0B' },
  { key: 'lunch',     label: 'Lunch',     color: '#10B981' },
  { key: 'dinner',    label: 'Dinner',    color: '#6366F1' },
  { key: 'snack',     label: 'Snacks',    color: '#EC4899' },
];

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

function ProgressBar({ value, max, color = '#10B981' }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <View style={styles.progressTrack}>
      <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: color }]} />
    </View>
  );
}

function NutrientBar({ label, value, max, color }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <View style={styles.nutrientBar}>
      <View style={styles.nutrientLabelRow}>
        <Text style={styles.nutrientLabel}>{label}</Text>
        <Text style={styles.nutrientVal}>{Math.round(value)}g / {max}g</Text>
      </View>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

// ── Log Food Sheet ─────────────────────────────────────────────────────────────

function LogFoodSheet({ visible, onClose, onSave }) {
  const [meal,     setMeal]     = useState('breakfast');
  const [foodName, setFoodName] = useState('');
  const [calories, setCalories] = useState('');
  const [fat,      setFat]      = useState('');
  const [carbs,    setCarbs]    = useState('');
  const [protein,  setProtein]  = useState('');
  const [saving,   setSaving]   = useState(false);

  function reset() {
    setMeal('breakfast'); setFoodName(''); setCalories('');
    setFat(''); setCarbs(''); setProtein('');
  }

  function handleClose() { reset(); onClose(); }

  async function handleSave() {
    if (!foodName.trim()) { Alert.alert('Missing', 'Enter a food name'); return; }
    setSaving(true);
    try {
      await onSave({
        meal_type: meal,
        food_name: foodName.trim(),
        calories:  calories ? parseFloat(calories)  : null,
        fat_g:     fat      ? parseFloat(fat)       : null,
        carbs_g:   carbs    ? parseFloat(carbs)     : null,
        protein_g: protein  ? parseFloat(protein)   : null,
      });
      reset();
      onClose();
    } catch {
      Alert.alert('Error', 'Could not save food log.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent presentationStyle="overFullScreen">
      <KeyboardAvoidingView
        style={styles.sheetOuter}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Pressable style={styles.sheetBackdrop} onPress={handleClose} />
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Log Food</Text>
            <TouchableOpacity onPress={handleClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <X color={colors.text.tertiary} size={18} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={{ flexGrow: 0 }}>
            {/* Meal */}
            <Text style={styles.fieldLabel}>Meal</Text>
            <View style={styles.mealRow}>
              {MEALS.map(m => (
                <Pressable
                  key={m.key}
                  onPress={() => setMeal(m.key)}
                  style={[styles.mealPill, meal === m.key && { backgroundColor: m.color + '25', borderColor: m.color }]}
                >
                  <Text style={[styles.mealPillText, meal === m.key && { color: m.color }]}>{m.label}</Text>
                </Pressable>
              ))}
            </View>

            {/* Food */}
            <Text style={[styles.fieldLabel, { marginTop: 14 }]}>Food</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Banana, Fried Chicken, Rice"
              placeholderTextColor={colors.text.tertiary}
              value={foodName}
              onChangeText={setFoodName}
              autoFocus
            />

            {/* Calories */}
            <Text style={[styles.fieldLabel, { marginTop: 14 }]}>Calories</Text>
            <TextInput
              style={styles.input}
              placeholder="kcal"
              placeholderTextColor={colors.text.tertiary}
              value={calories}
              onChangeText={setCalories}
              keyboardType="numeric"
            />

            {/* Macros */}
            <View style={[styles.macroInputRow, { marginTop: 14 }]}>
              <View style={styles.macroInputCell}>
                <Text style={styles.fieldLabel}>Total Fat (g)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0"
                  placeholderTextColor={colors.text.tertiary}
                  value={fat}
                  onChangeText={setFat}
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.macroInputCell}>
                <Text style={styles.fieldLabel}>Carbs (g)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0"
                  placeholderTextColor={colors.text.tertiary}
                  value={carbs}
                  onChangeText={setCarbs}
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.macroInputCell}>
                <Text style={styles.fieldLabel}>Protein (g)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0"
                  placeholderTextColor={colors.text.tertiary}
                  value={protein}
                  onChangeText={setProtein}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View style={{ height: 16 }} />
          </ScrollView>

          <TouchableOpacity
            style={[styles.saveBtn, (!foodName.trim() || saving) && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={!foodName.trim() || saving}
          >
            {saving
              ? <ActivityIndicator size="small" color="#fff" />
              : <><Check color="#fff" size={14} weight="bold" /><Text style={styles.saveBtnText}>Add Food</Text></>
            }
          </TouchableOpacity>

          <View style={{ height: 24 }} />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Main Screen ────────────────────────────────────────────────────────────────

export default function CalorieTrackerScreen({ hub }) {
  const [logs,       setLogs]       = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userId,     setUserId]     = useState(null);
  const [showForm,   setShowForm]   = useState(false);
  const [date,       setDate]       = useState(todayStr());

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id);
    });
  }, []);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      // Resolve module_def_id (cached after first fetch)
      if (!_calorieDefId) {
        const { data: def } = await supabase
          .from('module_definitions').select('id').eq('slug', 'calorie_counter').single();
        _calorieDefId = def?.id ?? null;
      }
      if (!_calorieDefId) { setLogs([]); return; }

      let q = supabase
        .from('module_entries')
        .select('id, data, created_at, user_id, hub_id')
        .eq('module_def_id', _calorieDefId)
        .eq('hub_id', hub.id);

      if (userId) q = q.eq('user_id', userId);
      if (date) q = q.filter('data->>logged_at', 'like', `${date}%`);

      const { data } = await q.order('created_at', { ascending: false }).limit(200);

      // Flatten data JSONB column to match the shape used in UI
      const flattened = (data ?? []).map(r => ({
        id: r.id,
        ...r.data,
        created_at: r.created_at,
        user_id: r.user_id,
        hub_id: r.hub_id,
      }));
      setLogs(flattened);
    } catch (err) {
      console.error('[CalorieTracker] Load failed:', err);
      setLogs([]);
    } finally {
      setLoading(false); setRefreshing(false);
    }
  }, [hub.id, date, userId]);

  useEffect(() => { load(); }, [load]);

  async function handleSave(fields) {
    if (!userId) throw new Error('Not signed in');

    if (!_calorieDefId) {
      const { data: def } = await supabase
        .from('module_definitions').select('id').eq('slug', 'calorie_counter').single();
      _calorieDefId = def?.id ?? null;
    }
    if (!_calorieDefId) throw new Error('Module not found');

    const entryData = {
      ...fields,
      logged_at: new Date().toISOString(),
    };

    const { data: rows, error } = await supabase
      .from('module_entries')
      .insert({ module_def_id: _calorieDefId, hub_id: hub.id, user_id: userId, data: entryData })
      .select('id, data, created_at, user_id, hub_id');

    if (error) throw error;
    const r = rows[0];
    const flat = { id: r.id, ...r.data, created_at: r.created_at, user_id: r.user_id, hub_id: r.hub_id };
    setLogs(prev => [flat, ...prev]);
  }

  async function handleDelete(id) {
    setLogs(prev => prev.filter(l => l.id !== id));
    await supabase.from('module_entries').delete().eq('id', id);
  }

  const totalCalories = logs.reduce((s, l) => s + (l.calories ?? 0), 0);
  const totalFat      = logs.reduce((s, l) => s + (l.fat_g     ?? 0), 0);
  const totalCarbs    = logs.reduce((s, l) => s + (l.carbs_g   ?? 0), 0);
  const totalProtein  = logs.reduce((s, l) => s + (l.protein_g ?? 0), 0);
  const remaining     = GOAL - totalCalories;
  const over          = remaining < 0;

  const byMeal = logs.reduce((acc, l) => {
    const k = l.meal_type || 'snack';
    if (!acc[k]) acc[k] = [];
    acc[k].push(l);
    return acc;
  }, {});

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={[styles.skeleton, { width: '40%', height: 24, marginBottom: 8 }]} />
          <View style={[styles.skeleton, { width: '30%', height: 16 }]} />
        </View>
        <View style={styles.summary}>
          <View style={[styles.skeleton, { width: '100%', height: 120, borderRadius: 16 }]} />
        </View>
        <View style={[styles.group, { marginTop: 20 }]}>
          <View style={[styles.skeleton, { width: '25%', height: 20, marginBottom: 12 }]} />
          <View style={[styles.skeleton, { width: '100%', height: 50, marginBottom: 8 }]} />
          <View style={[styles.skeleton, { width: '100%', height: 50 }]} />
        </View>
      </View>
    );
  }

  return (
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.text.tertiary} />
        }
      >
        {/* ── Summary ── */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>
            Today · {new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
          </Text>

          <View style={styles.equationRow}>
            <View style={styles.equationCell}>
              <Text style={styles.equationNum}>{GOAL}</Text>
              <Text style={styles.equationLabel}>Goal</Text>
            </View>
            <Text style={styles.equationOp}>−</Text>
            <View style={styles.equationCell}>
              <Text style={styles.equationNum}>{Math.round(totalCalories)}</Text>
              <Text style={styles.equationLabel}>Food</Text>
            </View>
            <Text style={styles.equationOp}>=</Text>
            <View style={styles.equationCell}>
              <Text style={[styles.equationNum, { color: over ? colors.status.urgent : '#10B981' }]}>
                {Math.abs(Math.round(remaining))}
              </Text>
              <Text style={styles.equationLabel}>{over ? 'Over' : 'Left'}</Text>
            </View>
          </View>

          <ProgressBar value={totalCalories} max={GOAL} color={over ? colors.status.urgent : '#10B981'} />

          <View style={styles.macroGrid}>
            <NutrientBar label="Carbs"   value={totalCarbs}   max={250} color="#F59E0B" />
            <NutrientBar label="Fat"     value={totalFat}     max={65}  color="#EC4899" />
            <NutrientBar label="Protein" value={totalProtein} max={150} color="#6366F1" />
          </View>
        </View>

        {/* ── Log button ── */}
        <TouchableOpacity style={styles.logBtn} onPress={() => setShowForm(true)}>
          <ForkKnife color="#10B981" size={15} weight="duotone" />
          <Text style={styles.logBtnText}>Log Food</Text>
        </TouchableOpacity>

        {/* ── Meal groups ── */}
        {logs.length === 0 ? (
          <View style={styles.empty}>
            <ForkKnife color={colors.text.tertiary} size={28} weight="duotone" />
            <Text style={styles.emptyText}>Nothing logged today</Text>
            <Text style={styles.emptySubText}>Tap "Log Food" to get started</Text>
          </View>
        ) : (
          MEALS.filter(m => byMeal[m.key]?.length > 0).map(m => {
            const items    = byMeal[m.key];
            const mealCals = items.reduce((s, l) => s + (l.calories ?? 0), 0);
            return (
              <View key={m.key} style={styles.group}>
                <View style={styles.groupHeader}>
                  <View style={[styles.mealDot, { backgroundColor: m.color }]} />
                  <Text style={styles.groupLabel}>{m.label}</Text>
                  <Text style={styles.groupCals}>{Math.round(mealCals)} kcal</Text>
                </View>
                {items.map(log => (
                  <View key={log.id} style={styles.logRow}>
                    <View style={styles.logMain}>
                      <Text style={styles.logName} numberOfLines={1}>{log.food_name}</Text>
                      {(log.fat_g || log.carbs_g || log.protein_g) ? (
                        <Text style={styles.logMacros}>
                          {[
                            log.fat_g     ? `F ${Math.round(log.fat_g)}g`     : null,
                            log.carbs_g   ? `C ${Math.round(log.carbs_g)}g`   : null,
                            log.protein_g ? `P ${Math.round(log.protein_g)}g` : null,
                          ].filter(Boolean).join('  ·  ')}
                        </Text>
                      ) : null}
                    </View>
                    <Text style={styles.logCal}>{log.calories ? `${Math.round(log.calories)} kcal` : '—'}</Text>
                    <TouchableOpacity onPress={() => handleDelete(log.id)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                      <X color={colors.text.tertiary} size={13} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            );
          })
        )}
      </ScrollView>

      <LogFoodSheet
        visible={showForm}
        onClose={() => setShowForm(false)}
        onSave={handleSave}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background.primary },
  content:   { padding: 16, paddingBottom: 120, gap: 12 },
  skeleton: {
    backgroundColor: colors.background.tertiary,
    borderRadius: 4,
  },
  card: {
    backgroundColor: colors.background.secondary,
    borderRadius: 14, borderWidth: 0.5,
    borderColor: colors.border.primary,
    padding: 16, gap: 12,
  },

  sectionLabel: { fontSize: 10, fontWeight: '700', color: colors.text.tertiary, letterSpacing: 1.5, textTransform: 'uppercase' },

  equationRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
  equationCell: { alignItems: 'center', gap: 2 },
  equationNum:  { fontSize: 22, fontWeight: '700', color: colors.text.primary },
  equationLabel:{ fontSize: 10, color: colors.text.tertiary, letterSpacing: 0.5 },
  equationOp:   { fontSize: 18, color: colors.text.tertiary, paddingHorizontal: 4 },

  progressTrack: { height: 5, backgroundColor: colors.background.tertiary, borderRadius: 3, overflow: 'hidden' },
  progressFill:  { height: '100%', borderRadius: 3 },

  macroGrid:       { gap: 8 },
  nutrientBar:     { gap: 4 },
  nutrientLabelRow:{ flexDirection: 'row', justifyContent: 'space-between' },
  nutrientLabel:   { fontSize: 10, fontWeight: '600', color: colors.text.tertiary },
  nutrientVal:     { fontSize: 10, color: colors.text.tertiary },

  logBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: colors.background.secondary,
    borderRadius: 12, borderWidth: 0.5, borderColor: '#10B981' + '40',
    paddingVertical: 12,
  },
  logBtnText: { fontSize: 13, fontWeight: '600', color: '#10B981' },

  empty: { alignItems: 'center', paddingVertical: 40, gap: 8 },
  emptyText:    { fontSize: 14, color: colors.text.secondary, fontWeight: '500' },
  emptySubText: { fontSize: 12, color: colors.text.tertiary },

  group: {
    backgroundColor: colors.background.secondary,
    borderRadius: 12, borderWidth: 0.5,
    borderColor: colors.border.primary, overflow: 'hidden',
  },
  groupHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 14, paddingVertical: 10,
    borderBottomWidth: 0.5, borderBottomColor: colors.border.primary,
  },
  mealDot:    { width: 8, height: 8, borderRadius: 4 },
  groupLabel: { flex: 1, fontSize: 11, fontWeight: '700', color: colors.text.secondary, letterSpacing: 1, textTransform: 'uppercase' },
  groupCals:  { fontSize: 11, color: colors.text.tertiary },

  logRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 14, paddingVertical: 10,
    borderBottomWidth: 0.5, borderBottomColor: colors.border.secondary,
  },
  logMain:   { flex: 1, gap: 2 },
  logName:   { fontSize: 14, color: colors.text.primary },
  logMacros: { fontSize: 10, color: colors.text.tertiary },
  logCal:    { fontSize: 12, color: colors.text.tertiary, width: 60, textAlign: 'right' },

  // ── Sheet ──
  sheetOuter:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheetBackdrop:{ flex: 1 },
  sheet: {
    backgroundColor: colors.background.primary,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    borderTopWidth: 0.5, borderColor: colors.border.primary,
    paddingHorizontal: 20, paddingTop: 20,
    maxHeight: '80%',
  },
  sheetHeader: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 20,
  },
  sheetTitle: { fontSize: 15, fontWeight: '700', color: colors.text.primary },

  fieldLabel: { fontSize: 10, fontWeight: '700', color: colors.text.tertiary, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 6 },

  mealRow:      { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  mealPill:     { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 0.5, borderColor: colors.border.primary, backgroundColor: colors.background.secondary },
  mealPillText: { fontSize: 12, fontWeight: '600', color: colors.text.tertiary },

  input: {
    backgroundColor: colors.background.secondary,
    borderRadius: 10, borderWidth: 0.5,
    borderColor: colors.border.primary,
    paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 14, color: colors.text.primary,
  },

  macroInputRow:  { flexDirection: 'row', gap: 8 },
  macroInputCell: { flex: 1, gap: 6 },

  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, backgroundColor: '#10B981',
    borderRadius: 10, paddingVertical: 13, marginTop: 4,
  },
  saveBtnDisabled: { opacity: 0.4 },
  saveBtnText:     { fontSize: 13, fontWeight: '700', color: '#fff' },
});
