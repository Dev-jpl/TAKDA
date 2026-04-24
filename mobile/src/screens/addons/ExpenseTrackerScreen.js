import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, ActivityIndicator, Alert, RefreshControl,
  Pressable, Modal, KeyboardAvoidingView, Platform,
} from 'react-native';
import { supabase } from '../../services/supabase';
import { colors } from '../../constants/colors';
import { CurrencyDollar, X, Check } from 'phosphor-react-native';

let _expenseDefId = null;

const CURRENCY = '₱';

const CATEGORIES = ['General', 'Food', 'Transport', 'Health', 'Entertainment', 'Shopping', 'Utilities', 'Other'];

const CAT_META = {
  General:       { hex: '#6B7280' },
  Food:          { hex: '#FB923C' },
  Transport:     { hex: '#60A5FA' },
  Health:        { hex: '#F87171' },
  Entertainment: { hex: '#C084FC' },
  Shopping:      { hex: '#F472B6' },
  Utilities:     { hex: '#FACC15' },
  Other:         { hex: '#6B7280' },
};

function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function fmt(n) {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function dayLabel(dateStr) {
  const d   = new Date(dateStr + 'T00:00:00');
  const now = new Date(); now.setHours(0, 0, 0, 0);
  const yd  = new Date(now); yd.setDate(now.getDate() - 1);
  if (d.toDateString() === now.toDateString()) return 'Today';
  if (d.toDateString() === yd.toDateString())  return 'Yesterday';
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

function ProgressBar({ pct, color }) {
  return (
    <View style={styles.progressTrack}>
      <View style={[styles.progressFill, { width: `${Math.min(pct, 100)}%`, backgroundColor: color }]} />
    </View>
  );
}

// ── Log Expense Sheet ──────────────────────────────────────────────────────────

function LogExpenseSheet({ visible, onClose, onSave }) {
  const [amount,   setAmount]   = useState('');
  const [item,     setItem]     = useState('');
  const [merchant, setMerchant] = useState('');
  const [category, setCategory] = useState('General');
  const [saving,   setSaving]   = useState(false);

  function reset() { setAmount(''); setItem(''); setMerchant(''); setCategory('General'); }
  function handleClose() { reset(); onClose(); }

  async function handleSave() {
    const amt = parseFloat(amount);
    if (!amt || isNaN(amt) || amt <= 0) { Alert.alert('Invalid', 'Enter a valid amount'); return; }
    setSaving(true);
    try {
      await onSave({
        amount: amt,
        item:     item.trim()     || null,
        merchant: merchant.trim() || null,
        category,
        currency: CURRENCY,
        date: new Date().toISOString().split('T')[0],
      });
      reset();
      onClose();
    } catch {
      Alert.alert('Error', 'Could not save expense.');
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
            <Text style={styles.sheetTitle}>Log Expense</Text>
            <TouchableOpacity onPress={handleClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <X color={colors.text.tertiary} size={18} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={{ flexGrow: 0 }}>
            {/* Amount */}
            <Text style={styles.fieldLabel}>Amount</Text>
            <View style={styles.amountRow}>
              <Text style={styles.currencyLabel}>{CURRENCY}</Text>
              <TextInput
                style={styles.amountInput}
                placeholder="0.00"
                placeholderTextColor={colors.text.tertiary}
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
                autoFocus
              />
            </View>

            {/* Item */}
            <Text style={[styles.fieldLabel, { marginTop: 14 }]}>Item</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Fried Chicken, Gas, Groceries"
              placeholderTextColor={colors.text.tertiary}
              value={item}
              onChangeText={setItem}
            />

            {/* Merchant */}
            <Text style={[styles.fieldLabel, { marginTop: 14 }]}>
              Merchant <Text style={styles.fieldLabelOptional}>(optional)</Text>
            </Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Jollibee, Shell, SM"
              placeholderTextColor={colors.text.tertiary}
              value={merchant}
              onChangeText={setMerchant}
            />

            {/* Category */}
            <Text style={[styles.fieldLabel, { marginTop: 14 }]}>Category</Text>
            <View style={styles.categoryWrap}>
              {CATEGORIES.map(c => {
                const meta = CAT_META[c] ?? CAT_META.Other;
                const sel  = category === c;
                return (
                  <Pressable
                    key={c}
                    onPress={() => setCategory(c)}
                    style={[styles.catPill, sel && { backgroundColor: meta.hex + '25', borderColor: meta.hex }]}
                  >
                    <Text style={[styles.catPillText, sel && { color: meta.hex }]}>{c}</Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={{ height: 16 }} />
          </ScrollView>

          <TouchableOpacity
            style={[styles.saveBtn, (!amount || saving) && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={!amount || saving}
          >
            {saving
              ? <ActivityIndicator size="small" color="#fff" />
              : <><Check color="#fff" size={14} weight="bold" /><Text style={styles.saveBtnText}>Save Expense</Text></>
            }
          </TouchableOpacity>

          <View style={{ height: 24 }} />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Main Screen ────────────────────────────────────────────────────────────────

export default function ExpenseTrackerScreen({ hub }) {
  const [expenses,  setExpenses]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [refreshing,setRefreshing]= useState(false);
  const [userId,    setUserId]    = useState(null);
  const [showForm,  setShowForm]  = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id);
    });
  }, []);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      if (!_expenseDefId) {
        const { data: def } = await supabase
          .from('module_definitions').select('id').eq('slug', 'expense_tracker').single();
        _expenseDefId = def?.id ?? null;
      }
      if (!_expenseDefId) { setExpenses([]); return; }

      const month = currentMonth();
      let q = supabase
        .from('module_entries')
        .select('id, data, created_at, user_id, hub_id')
        .eq('module_def_id', _expenseDefId)
        .eq('hub_id', hub.id)
        .filter('data->>date', 'like', `${month}%`);

      if (userId) q = q.eq('user_id', userId);

      const { data } = await q.order('created_at', { ascending: false }).limit(500);

      const flattened = (data ?? []).map(r => ({
        id: r.id,
        ...r.data,
        created_at: r.created_at,
        user_id: r.user_id,
        hub_id: r.hub_id,
      }));
      setExpenses(flattened);
    } catch (err) {
      console.error('[ExpenseTracker] Load failed:', err);
      setExpenses([]);
    } finally {
      setLoading(false); setRefreshing(false);
    }
  }, [hub.id, userId]);

  useEffect(() => { load(); }, [load]);

  async function handleSave(fields) {
    if (!userId) throw new Error('Not signed in');

    if (!_expenseDefId) {
      const { data: def } = await supabase
        .from('module_definitions').select('id').eq('slug', 'expense_tracker').single();
      _expenseDefId = def?.id ?? null;
    }
    if (!_expenseDefId) throw new Error('Module not found');

    const { data: rows, error } = await supabase
      .from('module_entries')
      .insert({ module_def_id: _expenseDefId, hub_id: hub.id, user_id: userId, data: fields })
      .select('id, data, created_at, user_id, hub_id');

    if (error) throw error;
    const r = rows[0];
    const flat = { id: r.id, ...r.data, created_at: r.created_at, user_id: r.user_id, hub_id: r.hub_id };
    setExpenses(prev => [flat, ...prev]);
  }

  async function handleDelete(id) {
    setExpenses(prev => prev.filter(e => e.id !== id));
    await supabase.from('module_entries').delete().eq('id', id);
  }

  const total    = expenses.reduce((s, e) => s + e.amount, 0);
  const count    = expenses.length;
  const dailyAvg = (() => {
    const days = new Set(expenses.map(e => e.date)).size;
    return days ? total / days : 0;
  })();

  const byCat = expenses.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] ?? 0) + e.amount;
    return acc;
  }, {});
  const topCats = Object.entries(byCat).sort(([, a], [, b]) => b - a).slice(0, 5);

  const grouped = (() => {
    const map = new Map();
    [...expenses].sort((a, b) => b.date.localeCompare(a.date)).forEach(e => {
      if (!map.has(e.date)) map.set(e.date, []);
      map.get(e.date).push(e);
    });
    return map;
  })();

  const monthLabel = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={[styles.skeleton, { width: '40%', height: 24, marginBottom: 8 }]} />
          <View style={[styles.skeleton, { width: '30%', height: 16 }]} />
        </View>
        <View style={styles.summaryCard}>
          <View style={[styles.skeleton, { width: '100%', height: 100, borderRadius: 16 }]} />
        </View>
        <View style={{ marginTop: 24, paddingHorizontal: 16 }}>
          <View style={[styles.skeleton, { width: '25%', height: 18, marginBottom: 16 }]} />
          <View style={[styles.skeleton, { width: '100%', height: 60, marginBottom: 8, borderRadius: 12 }]} />
          <View style={[styles.skeleton, { width: '100%', height: 60, borderRadius: 12 }]} />
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
        <View style={styles.summaryCard}>
          <Text style={styles.sectionLabel}>{monthLabel}</Text>
          <Text style={styles.totalAmount}>{CURRENCY} {fmt(total)}</Text>
          <View style={styles.statsRow}>
            <View style={styles.statCell}>
              <Text style={styles.statNum}>{count}</Text>
              <Text style={styles.statLabel}>Transactions</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCell}>
              <Text style={styles.statNum}>{fmt(dailyAvg)}</Text>
              <Text style={styles.statLabel}>Daily Avg</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCell}>
              <Text style={styles.statNum}>{topCats.length}</Text>
              <Text style={styles.statLabel}>Categories</Text>
            </View>
          </View>
        </View>

        {/* ── Log button ── */}
        <TouchableOpacity style={styles.logBtn} onPress={() => setShowForm(true)}>
          <CurrencyDollar color={colors.modules.deliver} size={15} weight="duotone" />
          <Text style={styles.logBtnText}>Log Expense</Text>
        </TouchableOpacity>

        {/* ── Category breakdown ── */}
        {topCats.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.sectionLabel}>By Category</Text>
            {topCats.map(([cat, amt]) => {
              const meta = CAT_META[cat] ?? CAT_META.Other;
              const pct  = total > 0 ? (amt / total) * 100 : 0;
              return (
                <View key={cat} style={styles.catRow}>
                  <View style={[styles.catDot, { backgroundColor: meta.hex }]} />
                  <Text style={styles.catName}>{cat}</Text>
                  <View style={styles.catBarWrap}><ProgressBar pct={pct} color={meta.hex} /></View>
                  <Text style={styles.catAmt}>{fmt(amt)}</Text>
                </View>
              );
            })}
          </View>
        )}

        {/* ── Transaction list ── */}
        {expenses.length === 0 ? (
          <View style={styles.empty}>
            <CurrencyDollar color={colors.text.tertiary} size={28} weight="duotone" />
            <Text style={styles.emptyText}>No expenses this month</Text>
            <Text style={styles.emptySubText}>Tap "Log Expense" to get started</Text>
          </View>
        ) : (
          [...grouped.entries()].map(([day, items]) => (
            <View key={day} style={styles.group}>
              <View style={styles.groupHeader}>
                <Text style={styles.groupLabel}>{dayLabel(day)}</Text>
                <Text style={styles.groupTotal}>{CURRENCY} {fmt(items.reduce((s, e) => s + e.amount, 0))}</Text>
              </View>
              {items.map((exp, idx) => {
                const meta = CAT_META[exp.category] ?? CAT_META.Other;
                return (
                  <View key={exp.id} style={[styles.expRow, idx < items.length - 1 && styles.expRowBorder]}>
                    <View style={[styles.catIcon, { backgroundColor: meta.hex + '20' }]}>
                      <View style={[styles.catIconDot, { backgroundColor: meta.hex }]} />
                    </View>
                    <View style={styles.expInfo}>
                      <Text style={styles.expItem} numberOfLines={1}>
                        {exp.item || exp.merchant || exp.category}
                      </Text>
                      <Text style={styles.expSub}>
                        {[exp.merchant, exp.category].filter(Boolean).join(' · ')}
                      </Text>
                    </View>
                    <Text style={styles.expAmt}>{CURRENCY} {fmt(exp.amount)}</Text>
                    <TouchableOpacity onPress={() => handleDelete(exp.id)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} style={styles.deleteBtn}>
                      <X color={colors.text.tertiary} size={13} />
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          ))
        )}
      </ScrollView>

      <LogExpenseSheet
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
  summaryCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: 16, borderWidth: 0.5,
    borderColor: colors.modules.deliver + '30',
    padding: 20, gap: 12,
  },
  sectionLabel: { fontSize: 10, fontWeight: '700', color: colors.text.tertiary, letterSpacing: 1.5, textTransform: 'uppercase' },
  totalAmount:  { fontSize: 32, fontWeight: '700', color: colors.text.primary },
  statsRow:     { flexDirection: 'row', alignItems: 'center' },
  statCell:     { flex: 1, alignItems: 'center', gap: 2 },
  statNum:      { fontSize: 16, fontWeight: '700', color: colors.text.primary },
  statLabel:    { fontSize: 9, color: colors.text.tertiary, letterSpacing: 0.8, textTransform: 'uppercase' },
  statDivider:  { width: 0.5, height: 32, backgroundColor: colors.border.primary },

  card: {
    backgroundColor: colors.background.secondary,
    borderRadius: 14, borderWidth: 0.5,
    borderColor: colors.border.primary,
    padding: 16, gap: 10,
  },

  logBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: colors.background.secondary,
    borderRadius: 12, borderWidth: 0.5, borderColor: colors.modules.deliver + '40',
    paddingVertical: 12,
  },
  logBtnText: { fontSize: 13, fontWeight: '600', color: colors.modules.deliver },

  catRow:     { flexDirection: 'row', alignItems: 'center', gap: 8 },
  catDot:     { width: 8, height: 8, borderRadius: 4 },
  catName:    { fontSize: 12, color: colors.text.secondary, width: 80 },
  catBarWrap: { flex: 1 },
  catAmt:     { fontSize: 11, color: colors.text.primary, fontWeight: '600', width: 64, textAlign: 'right' },

  progressTrack: { height: 4, backgroundColor: colors.background.tertiary, borderRadius: 2, overflow: 'hidden' },
  progressFill:  { height: '100%', borderRadius: 2 },

  empty: { alignItems: 'center', paddingVertical: 40, gap: 8 },
  emptyText:    { fontSize: 14, color: colors.text.secondary, fontWeight: '500' },
  emptySubText: { fontSize: 12, color: colors.text.tertiary },

  group: {
    backgroundColor: colors.background.secondary,
    borderRadius: 12, borderWidth: 0.5,
    borderColor: colors.border.primary, overflow: 'hidden',
  },
  groupHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingVertical: 10,
    borderBottomWidth: 0.5, borderBottomColor: colors.border.primary,
  },
  groupLabel: { fontSize: 11, fontWeight: '700', color: colors.text.secondary, letterSpacing: 0.8, textTransform: 'uppercase' },
  groupTotal: { fontSize: 11, color: colors.text.tertiary },

  expRow:       { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 12 },
  expRowBorder: { borderBottomWidth: 0.5, borderBottomColor: colors.border.secondary },
  catIcon:      { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  catIconDot:   { width: 10, height: 10, borderRadius: 5 },
  expInfo:      { flex: 1, gap: 1 },
  expItem:      { fontSize: 14, color: colors.text.primary, fontWeight: '500' },
  expSub:       { fontSize: 10, color: colors.text.tertiary },
  expAmt:       { fontSize: 13, fontWeight: '700', color: colors.text.primary },
  deleteBtn:    { padding: 4 },

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
  sheetTitle:          { fontSize: 15, fontWeight: '700', color: colors.text.primary },
  fieldLabel:          { fontSize: 10, fontWeight: '700', color: colors.text.tertiary, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 6 },
  fieldLabelOptional:  { fontSize: 10, fontWeight: '400', color: colors.text.tertiary, textTransform: 'none', letterSpacing: 0 },

  amountRow:    { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.background.secondary, borderRadius: 10, borderWidth: 0.5, borderColor: colors.border.primary, paddingHorizontal: 12, paddingVertical: 8 },
  currencyLabel:{ fontSize: 13, fontWeight: '700', color: colors.text.tertiary },
  amountInput:  { flex: 1, fontSize: 22, fontWeight: '700', color: colors.text.primary },

  input: {
    backgroundColor: colors.background.secondary,
    borderRadius: 10, borderWidth: 0.5,
    borderColor: colors.border.primary,
    paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 14, color: colors.text.primary,
  },

  categoryWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  catPill:      { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 0.5, borderColor: colors.border.primary, backgroundColor: colors.background.secondary },
  catPillText:  { fontSize: 12, fontWeight: '600', color: colors.text.tertiary },

  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, backgroundColor: colors.modules.deliver,
    borderRadius: 10, paddingVertical: 13, marginTop: 4,
  },
  saveBtnDisabled: { opacity: 0.4 },
  saveBtnText:     { fontSize: 13, fontWeight: '700', color: '#fff' },
});
