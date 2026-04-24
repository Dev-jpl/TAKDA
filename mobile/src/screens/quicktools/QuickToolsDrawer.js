import React, { useState, useEffect, useRef } from 'react'
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  StyleSheet,
  Animated,
  ScrollView,
  TextInput,
  Platform,
  Pressable,
  Keyboard,
  Alert,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import {
  X, Check, Tray, CurrencyDollar, ForkKnife, Note,
  CalendarBlank, Lightning,
} from 'phosphor-react-native'
import { colors } from '../../constants/colors'
import { vaultService } from '../../services/vault'
import { integrationsService } from '../../services/integrations'
import { supabase } from '../../services/supabase'
import VaultCaptureSheet from '../vault/VaultCaptureSheet'

const CATEGORIZED_TOOLS = [
  {
    title: 'Tools',
    items: [
      {
        id: 'vault',
        label: 'Dump to Vault',
        icon: Tray,
        color: colors.modules.aly,
      },
      {
        id: 'expense',
        label: 'Log Expense',
        icon: CurrencyDollar,
        color: colors.modules.deliver,
      },
      {
        id: 'food',
        label: 'Log Calories',
        icon: ForkKnife,
        color: colors.modules.annotate,
      },
      {
        id: 'note',
        label: 'Quick Note',
        icon: Note,
        color: colors.modules.knowledge,
      },
    ]
  },
  {
    title: 'Integrations',
    items: [
      {
        id: 'calendar',
        label: 'Sync Calendar',
        icon: CalendarBlank,
        color: colors.modules.track,
      },
      {
        id: 'strava',
        label: 'Sync Strava',
        icon: Lightning,
        color: '#FC5200', // Strava Orange
      },
    ]
  }
]

// ─── Tool forms ───────────────────────────────────────────────────────────────

const EXPENSE_CATEGORIES = ['General', 'Food', 'Transport', 'Health', 'Entertainment', 'Shopping', 'Utilities', 'Other']

const CAT_META = {
  General:       { hex: '#6B7280' },
  Food:          { hex: '#FB923C' },
  Transport:     { hex: '#60A5FA' },
  Health:        { hex: '#F87171' },
  Entertainment: { hex: '#C084FC' },
  Shopping:      { hex: '#F472B6' },
  Utilities:     { hex: '#FACC15' },
  Other:         { hex: '#6B7280' },
}

function ExpenseForm({ onDone }) {
  const [amount,   setAmount]   = useState('')
  const [item,     setItem]     = useState('')
  const [merchant, setMerchant] = useState('')
  const [category, setCategory] = useState('General')
  const [loading,  setLoading]  = useState(false)

  const submit = async () => {
    const amt = parseFloat(amount)
    if (!amt || isNaN(amt) || amt <= 0) return
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not signed in')

      // Get module def
      const { data: def } = await supabase.from('module_definitions').select('id').eq('slug', 'expense_tracker').single()
      if (!def) throw new Error('Expense tracker module not found')

      const { error } = await supabase.from('module_entries').insert({
        module_def_id: def.id,
        user_id:       user.id,
        hub_id:        null,
        data: {
          amount:   amt,
          item:     item.trim()     || null,
          merchant: merchant.trim() || null,
          category,
          currency: '₱',
          date:     new Date().toISOString().split('T')[0],
        }
      })
      if (error) throw error
      onDone()
    } catch (e) {
      console.warn('ExpenseForm error:', e)
      Alert.alert('Error', 'Could not save expense. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
      {/* Amount */}
      <Text style={styles.fieldLabel}>Amount</Text>
      <View style={styles.amountRow}>
        <Text style={styles.currencyLabel}>PHP</Text>
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
        style={styles.formInput}
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
        style={styles.formInput}
        placeholder="e.g. Jollibee, Shell, SM"
        placeholderTextColor={colors.text.tertiary}
        value={merchant}
        onChangeText={setMerchant}
      />

      {/* Category */}
      <Text style={[styles.fieldLabel, { marginTop: 14 }]}>Category</Text>
      <View style={styles.pillWrap}>
        {EXPENSE_CATEGORIES.map(c => {
          const meta = CAT_META[c] ?? CAT_META.Other
          const sel  = category === c
          return (
            <Pressable
              key={c}
              onPress={() => setCategory(c)}
              style={[styles.pill, sel && { backgroundColor: meta.hex + '25', borderColor: meta.hex }]}
            >
              <Text style={[styles.pillText, sel && { color: meta.hex }]}>{c}</Text>
            </Pressable>
          )
        })}
      </View>

      <TouchableOpacity
        style={[styles.saveBtn, { backgroundColor: colors.modules.deliver }, (!amount || loading) && styles.saveBtnDisabled]}
        onPress={submit}
        disabled={!amount || loading}
      >
        {loading
          ? <ActivityIndicator size="small" color="#fff" />
          : <><Check color="#fff" size={14} weight="bold" /><Text style={styles.saveBtnText}>Save Expense</Text></>
        }
      </TouchableOpacity>
      <View style={{ height: 16 }} />
    </ScrollView>
  )
}

const MEAL_TYPES = [
  { key: 'breakfast', label: 'Breakfast', color: '#F59E0B' },
  { key: 'lunch',     label: 'Lunch',     color: '#10B981' },
  { key: 'dinner',    label: 'Dinner',    color: '#6366F1' },
  { key: 'snack',     label: 'Snacks',    color: '#EC4899' },
]

function FoodForm({ onDone }) {
  const [meal,     setMeal]     = useState('breakfast')
  const [food,     setFood]     = useState('')
  const [calories, setCalories] = useState('')
  const [fat,      setFat]      = useState('')
  const [carbs,    setCarbs]    = useState('')
  const [protein,  setProtein]  = useState('')
  const [loading,  setLoading]  = useState(false)

  const submit = async () => {
    if (!food.trim()) return
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not signed in')

      // Get module def
      const { data: def } = await supabase.from('module_definitions').select('id').eq('slug', 'calorie_counter').single()
      if (!def) throw new Error('Calorie counter module not found')

      const { error } = await supabase.from('module_entries').insert({
        module_def_id: def.id,
        user_id:       user.id,
        hub_id:        null,
        data: {
          food_name: food.trim(),
          meal_type: meal,
          calories:  calories ? parseFloat(calories)  : null,
          fat_g:     fat      ? parseFloat(fat)       : null,
          carbs_g:   carbs    ? parseFloat(carbs)     : null,
          protein_g: protein  ? parseFloat(protein)   : null,
          logged_at: new Date().toISOString(),
        }
      })
      if (error) throw error
      onDone()
    } catch (e) {
      console.warn('FoodForm error:', e)
      Alert.alert('Error', 'Could not save food log. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
      {/* Meal type */}
      <Text style={styles.fieldLabel}>Meal</Text>
      <View style={styles.pillWrap}>
        {MEAL_TYPES.map(m => (
          <Pressable
            key={m.key}
            onPress={() => setMeal(m.key)}
            style={[styles.pill, meal === m.key && { backgroundColor: m.color + '25', borderColor: m.color }]}
          >
            <Text style={[styles.pillText, meal === m.key && { color: m.color }]}>{m.label}</Text>
          </Pressable>
        ))}
      </View>

      {/* Food name */}
      <Text style={[styles.fieldLabel, { marginTop: 14 }]}>Food</Text>
      <TextInput
        style={styles.formInput}
        placeholder="e.g. Banana, Fried Chicken"
        placeholderTextColor={colors.text.tertiary}
        value={food}
        onChangeText={setFood}
        autoFocus
      />

      {/* Calories */}
      <Text style={[styles.fieldLabel, { marginTop: 14 }]}>Calories <Text style={styles.fieldLabelOptional}>(kcal)</Text></Text>
      <TextInput
        style={styles.formInput}
        placeholder="e.g. 350"
        placeholderTextColor={colors.text.tertiary}
        value={calories}
        onChangeText={setCalories}
        keyboardType="decimal-pad"
      />

      {/* Macros */}
      <Text style={[styles.fieldLabel, { marginTop: 14 }]}>Macros <Text style={styles.fieldLabelOptional}>(g, optional)</Text></Text>
      <View style={styles.macroRow}>
        <View style={styles.macroCell}>
          <Text style={styles.macroLabel}>Protein</Text>
          <TextInput
            style={styles.formInput}
            placeholder="0"
            placeholderTextColor={colors.text.tertiary}
            value={protein}
            onChangeText={setProtein}
            keyboardType="decimal-pad"
          />
        </View>
        <View style={styles.macroCell}>
          <Text style={styles.macroLabel}>Carbs</Text>
          <TextInput
            style={styles.formInput}
            placeholder="0"
            placeholderTextColor={colors.text.tertiary}
            value={carbs}
            onChangeText={setCarbs}
            keyboardType="decimal-pad"
          />
        </View>
        <View style={styles.macroCell}>
          <Text style={styles.macroLabel}>Fat</Text>
          <TextInput
            style={styles.formInput}
            placeholder="0"
            placeholderTextColor={colors.text.tertiary}
            value={fat}
            onChangeText={setFat}
            keyboardType="decimal-pad"
          />
        </View>
      </View>

      <TouchableOpacity
        style={[styles.saveBtn, { backgroundColor: '#10B981' }, (!food.trim() || loading) && styles.saveBtnDisabled]}
        onPress={submit}
        disabled={!food.trim() || loading}
      >
        {loading
          ? <ActivityIndicator size="small" color="#fff" />
          : <><Check color="#fff" size={14} weight="bold" /><Text style={styles.saveBtnText}>Add Food</Text></>
        }
      </TouchableOpacity>
      <View style={{ height: 16 }} />
    </ScrollView>
  )
}

function NoteForm({ onDone }) {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async () => {
    if (!text.trim()) return
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not signed in')
      await vaultService.createItem(user.id, text.trim(), 'text')
      onDone()
    } catch (e) {
      console.warn('NoteForm error:', e)
      Alert.alert('Error', 'Could not save note. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={styles.form}>
      <TextInput style={[styles.formInput, { minHeight: 80 }]} placeholder="Write a note..." placeholderTextColor={colors.text.tertiary}
        value={text} onChangeText={setText} multiline autoFocus />
      <SubmitBtn label="Save Note" loading={loading} disabled={!text.trim()} onPress={submit} />
    </View>
  )
}

function SubmitBtn({ label, loading, disabled, onPress }) {
  return (
    <TouchableOpacity
      style={[styles.submitBtn, disabled && styles.submitBtnDisabled]}
      onPress={onPress}
      disabled={disabled || loading}
    >
      {loading
        ? <ActivityIndicator size="small" color="#fff" />
        : <Text style={styles.submitBtnText}>{label}</Text>
      }
    </TouchableOpacity>
  )
}

const FORMS = { expense: ExpenseForm, food: FoodForm, note: NoteForm }

// ─── Main drawer ──────────────────────────────────────────────────────────────

export default function QuickToolsDrawer({ visible, onClose }) {
  const { height } = useWindowDimensions()
  const slideAnim = useRef(new Animated.Value(height)).current
  const bottomAnim = useRef(new Animated.Value(0)).current
  const [activeTool, setActiveTool] = useState(null)
  const [syncing, setSyncing] = useState(null) // ID of sync item
  const [userId, setUserId] = useState(null)
  const [vaultSheetVisible, setVaultSheetVisible] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id)
    })
  }, [])

  // Slide in/out
  useEffect(() => {
    if (visible) {
      setActiveTool(null)
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: false,
        damping: 20,
        stiffness: 200,
      }).start()
    } else {
      Keyboard.dismiss()
      bottomAnim.setValue(0)
      Animated.timing(slideAnim, {
        toValue: height,
        duration: 200,
        useNativeDriver: false,
      }).start()
    }
  }, [visible])

  // Shift sheet up when keyboard appears
  useEffect(() => {
    if (!visible) return
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow'
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide'

    const onShow = (e) => {
      Animated.timing(bottomAnim, {
        toValue: e.endCoordinates.height,
        duration: Platform.OS === 'ios' ? e.duration : 250,
        useNativeDriver: false,
      }).start()
    }
    const onHide = () => {
      Animated.timing(bottomAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: false,
      }).start()
    }

    const showSub = Keyboard.addListener(showEvent, onShow)
    const hideSub = Keyboard.addListener(hideEvent, onHide)
    return () => { showSub.remove(); hideSub.remove() }
  }, [visible])

  const handleToolPress = async (toolId) => {
    if (toolId === 'vault') {
      onClose()
      setTimeout(() => setVaultSheetVisible(true), 250)
      return
    }

    if (toolId === 'calendar') {
      if (syncing) return
      setSyncing('calendar')
      try {
        await integrationsService.syncGoogleCalendar(userId)
        alert('Calendar sync complete!')
      } catch (e) {
        alert('Calendar sync failed.')
      } finally {
        setSyncing(null)
      }
      return
    }

    if (toolId === 'strava') {
      if (syncing) return
      setSyncing('strava')
      try {
        await integrationsService.syncStrava(userId)
        alert('Strava sync complete!')
      } catch (e) {
        alert('Strava sync failed.')
      } finally {
        setSyncing(null)
      }
      return
    }

    setActiveTool(toolId)
  }

  const handleDone = () => {
    setActiveTool(null)
    onClose()
  }

  const ActiveForm = activeTool ? FORMS[activeTool] : null

  return (
    <>
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay} />
      </TouchableWithoutFeedback>

      <Animated.View style={[styles.sheet, { maxHeight: height * 0.75, bottom: bottomAnim, transform: [{ translateY: slideAnim }] }]}>
        <SafeAreaView style={styles.inner} edges={['bottom']}>
          <View style={styles.handle} />

          <View style={styles.header}>
            <Text style={styles.headerTitle}>
              {activeTool 
                ? CATEGORIZED_TOOLS.flatMap(c => c.items).find(t => t.id === activeTool)?.label 
                : 'Quick Access'}
            </Text>
            <TouchableOpacity
              onPress={activeTool ? () => setActiveTool(null) : onClose}
              hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
            >
              <X color={colors.text.tertiary} size={20} weight="light" />
            </TouchableOpacity>
          </View>

          {ActiveForm ? (
            <ActiveForm userId={userId} onDone={handleDone} />
          ) : (
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
              {CATEGORIZED_TOOLS.map(cat => (
                <View key={cat.title} style={styles.categorySection}>
                  <Text style={styles.categoryTitle}>{cat.title}</Text>
                  <View style={styles.toolGrid}>
                    {cat.items.map(tool => {
                      const Icon = tool.icon
                      const isSyncing = syncing === tool.id
                      return (
                        <TouchableOpacity
                          key={tool.id}
                          style={styles.toolItem}
                          onPress={() => handleToolPress(tool.id)}
                          activeOpacity={0.75}
                          disabled={syncing !== null && syncing !== tool.id}
                        >
                          <View style={[styles.toolIcon, { backgroundColor: tool.color + '18' }]}>
                            {isSyncing ? (
                              <ActivityIndicator size="small" color={tool.color} />
                            ) : (
                              <Icon color={tool.color} size={22} weight="light" />
                            )}
                          </View>
                          <Text style={styles.toolLabel}>{tool.label}</Text>
                        </TouchableOpacity>
                      )
                    })}
                  </View>
                </View>
              ))}
            </ScrollView>
          )}
        </SafeAreaView>
      </Animated.View>
    </Modal>

    <VaultCaptureSheet
      visible={vaultSheetVisible}
      onClose={() => setVaultSheetVisible(false)}
    />
    </>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.background.secondary,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 0.5,
    borderColor: colors.border.primary,
  },
  inner: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border.primary,
    alignSelf: 'center',
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.text.primary,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  categorySection: {
    marginBottom: 20,
  },
  categoryTitle: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.text.tertiary,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 12,
    marginLeft: 4,
  },
  toolGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  toolItem: {
    width: '47%',
    backgroundColor: colors.background.tertiary,
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: colors.border.primary,
    padding: 12,
    gap: 8,
  },
  toolIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.text.primary,
  },
  form: {
    paddingBottom: 16,
  },
  formInput: {
    backgroundColor: colors.background.secondary,
    borderRadius: 10,
    borderWidth: 0.5,
    borderColor: colors.border.primary,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.text.primary,
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.text.tertiary,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  fieldLabelOptional: {
    fontSize: 10,
    fontWeight: '400',
    color: colors.text.tertiary,
    textTransform: 'none',
    letterSpacing: 0,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.background.secondary,
    borderRadius: 10,
    borderWidth: 0.5,
    borderColor: colors.border.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  currencyLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text.tertiary,
  },
  amountInput: {
    flex: 1,
    fontSize: 22,
    fontWeight: '700',
    color: colors.text.primary,
  },
  pillWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 0.5,
    borderColor: colors.border.primary,
    backgroundColor: colors.background.secondary,
  },
  pillText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text.tertiary,
  },
  macroRow: {
    flexDirection: 'row',
    gap: 8,
  },
  macroCell: {
    flex: 1,
    gap: 4,
  },
  macroLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.text.tertiary,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 10,
    paddingVertical: 13,
    marginTop: 16,
  },
  saveBtnDisabled: { opacity: 0.4 },
  saveBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },
})
