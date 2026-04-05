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
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { X, Tray, CurrencyDollar, ForkKnife, Note, CheckSquare } from 'phosphor-react-native'
import { colors } from '../../constants/colors'
import { vaultService } from '../../services/vault'
import { supabase } from '../../services/supabase'
import { API_URL } from '../../services/apiConfig'

const TOOLS = [
  {
    id: 'vault',
    label: 'Dump to Vault',
    icon: Tray,
    color: colors.modules.aly,
    removable: false,
  },
  {
    id: 'expense',
    label: 'Log Expense',
    icon: CurrencyDollar,
    color: colors.modules.deliver,
    removable: true,
  },
  {
    id: 'food',
    label: 'Log Calories',
    icon: ForkKnife,
    color: colors.modules.annotate,
    removable: true,
  },
  {
    id: 'note',
    label: 'Quick Note',
    icon: Note,
    color: colors.modules.knowledge,
    removable: true,
  },
]

// ─── Tool forms ───────────────────────────────────────────────────────────────

function VaultForm({ userId, onDone }) {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async () => {
    if (!text.trim()) return
    setLoading(true)
    try {
      await vaultService.createItem(userId, text.trim(), 'text')
      onDone()
    } catch (e) {
      console.warn('VaultForm error:', e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={styles.form}>
      <TextInput
        style={styles.formInput}
        placeholder="What's on your mind?"
        placeholderTextColor={colors.text.tertiary}
        value={text}
        onChangeText={setText}
        multiline
        autoFocus
      />
      <SubmitBtn label="Drop to Vault" loading={loading} disabled={!text.trim()} onPress={submit} />
    </View>
  )
}

function ExpenseForm({ userId, onDone }) {
  const [amount, setAmount] = useState('')
  const [merchant, setMerchant] = useState('')
  const [category, setCategory] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async () => {
    if (!amount) return
    setLoading(true)
    try {
      await fetch(`${API_URL}/expenses/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          amount: parseFloat(amount),
          merchant,
          category,
          currency: 'PHP',
        }),
      })
      onDone()
    } catch (e) {
      console.warn('ExpenseForm error:', e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={styles.form}>
      <TextInput style={styles.formInput} placeholder="Amount (PHP)" placeholderTextColor={colors.text.tertiary}
        value={amount} onChangeText={setAmount} keyboardType="decimal-pad" autoFocus />
      <TextInput style={styles.formInput} placeholder="Merchant (optional)" placeholderTextColor={colors.text.tertiary}
        value={merchant} onChangeText={setMerchant} />
      <TextInput style={styles.formInput} placeholder="Category (optional)" placeholderTextColor={colors.text.tertiary}
        value={category} onChangeText={setCategory} />
      <SubmitBtn label="Log Expense" loading={loading} disabled={!amount} onPress={submit} />
    </View>
  )
}

function FoodForm({ userId, onDone }) {
  const [food, setFood] = useState('')
  const [calories, setCalories] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async () => {
    if (!food.trim()) return
    setLoading(true)
    try {
      await fetch(`${API_URL}/food-logs/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, food_name: food.trim(), calories: parseFloat(calories) || 0 }),
      })
      onDone()
    } catch (e) {
      console.warn('FoodForm error:', e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={styles.form}>
      <TextInput style={styles.formInput} placeholder="Food name" placeholderTextColor={colors.text.tertiary}
        value={food} onChangeText={setFood} autoFocus />
      <TextInput style={styles.formInput} placeholder="Calories (optional)" placeholderTextColor={colors.text.tertiary}
        value={calories} onChangeText={setCalories} keyboardType="decimal-pad" />
      <SubmitBtn label="Log Food" loading={loading} disabled={!food.trim()} onPress={submit} />
    </View>
  )
}

function NoteForm({ userId, onDone }) {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async () => {
    if (!text.trim()) return
    setLoading(true)
    try {
      await vaultService.createItem(userId, text.trim(), 'text')
      onDone()
    } catch (e) {
      console.warn('NoteForm error:', e)
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

const FORMS = { vault: VaultForm, expense: ExpenseForm, food: FoodForm, note: NoteForm }

// ─── Main drawer ──────────────────────────────────────────────────────────────

export default function QuickToolsDrawer({ visible, onClose }) {
  const slideAnim = useRef(new Animated.Value(400)).current
  const [activeTool, setActiveTool] = useState(null)
  const [userId, setUserId] = useState(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id)
    })
  }, [])

  useEffect(() => {
    if (visible) {
      setActiveTool(null)
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        damping: 20,
        stiffness: 200,
      }).start()
    } else {
      Animated.timing(slideAnim, {
        toValue: 400,
        duration: 200,
        useNativeDriver: true,
      }).start()
    }
  }, [visible])

  const handleToolPress = (toolId) => {
    setActiveTool(toolId)
  }

  const handleDone = () => {
    setActiveTool(null)
    onClose()
  }

  const ActiveForm = activeTool ? FORMS[activeTool] : null

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay} />
      </TouchableWithoutFeedback>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.kavWrapper}
        pointerEvents="box-none"
      >
        <Animated.View style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}>
          <SafeAreaView style={styles.inner} edges={['bottom']}>
            <View style={styles.handle} />

            <View style={styles.header}>
              <Text style={styles.headerTitle}>
                {activeTool ? TOOLS.find(t => t.id === activeTool)?.label : 'Quick Tools'}
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
              <ScrollView contentContainerStyle={styles.toolGrid} showsVerticalScrollIndicator={false}>
                {TOOLS.map(tool => {
                  const Icon = tool.icon
                  return (
                    <TouchableOpacity
                      key={tool.id}
                      style={styles.toolItem}
                      onPress={() => handleToolPress(tool.id)}
                      activeOpacity={0.75}
                    >
                      <View style={[styles.toolIcon, { backgroundColor: tool.color + '18' }]}>
                        <Icon color={tool.color} size={22} weight="light" />
                      </View>
                      <Text style={styles.toolLabel}>{tool.label}</Text>
                    </TouchableOpacity>
                  )
                })}
              </ScrollView>
            )}
          </SafeAreaView>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  kavWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  sheet: {
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
  toolGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingBottom: 16,
  },
  toolItem: {
    width: '47%',
    backgroundColor: colors.background.tertiary,
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: colors.border.primary,
    padding: 16,
    gap: 10,
  },
  toolIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.text.primary,
  },
  form: {
    gap: 12,
    paddingBottom: 16,
  },
  formInput: {
    backgroundColor: colors.background.tertiary,
    borderRadius: 10,
    borderWidth: 0.5,
    borderColor: colors.border.primary,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.text.primary,
  },
  submitBtn: {
    backgroundColor: colors.modules.aly,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  submitBtnDisabled: {
    opacity: 0.4,
  },
  submitBtnText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#fff',
  },
})
