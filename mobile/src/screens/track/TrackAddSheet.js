import React, { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Modal, KeyboardAvoidingView,
  Platform, ActivityIndicator, ScrollView,
  Pressable,
} from 'react-native'
import { colors } from '../../constants/colors'
import { X, CaretDown, Flag, Info } from 'phosphor-react-native'

const PRIORITIES = ['urgent', 'high', 'low']
const STATUSES = ['todo', 'in_progress', 'done']

const PRIORITY_LABELS = { urgent: 'URGENT', high: 'HIGH', low: 'LOW' }
const PRIORITY_COLORS = {
  urgent: colors.status.urgent,
  high: colors.status.high,
  low: colors.status.low,
}

const STATUS_LABELS = { todo: 'TODO', in_progress: 'DEVELOPING', done: 'COMPLETED' }

export default function TrackAddSheet({ visible, onClose, onAdd }) {
  const [title, setTitle] = useState('')
  const [priority, setPriority] = useState('low')
  const [status, setStatus] = useState('todo')
  const [loading, setLoading] = useState(false)

  const handleAdd = async () => {
    if (!title.trim()) return
    setLoading(true)
    try {
      await onAdd({ title: title.trim(), priority, status })
      setTitle('')
      setPriority('low')
      setStatus('todo')
      onClose()
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.avoidingView}
        >
          <Pressable style={styles.sheet} onPress={e => e.stopPropagation()}>
            <View style={styles.handle} />

            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <View style={styles.headerDot} />
                <Text style={styles.title}>New Task</Text>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <X color={colors.text.tertiary} size={20} weight="bold" />
              </TouchableOpacity>
            </View>

            <ScrollView
              contentContainerStyle={styles.body}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {/* Title Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>IDENTIFIER / OBJECTIVE</Text>
                <TextInput
                  style={styles.titleInput}
                  value={title}
                  onChangeText={setTitle}
                  placeholder="Define task parameters…"
                  placeholderTextColor={colors.text.tertiary}
                  multiline
                  autoFocus
                />
              </View>

              {/* Priority Selection */}
              <View style={styles.inputGroup}>
                <View style={styles.labelRow}>
                  <Flag size={12} color={colors.text.tertiary} weight="light" />
                  <Text style={styles.label}>PRIORITY PROTOCOL</Text>
                </View>
                <View style={styles.optionRow}>
                  {PRIORITIES.map(p => (
                    <TouchableOpacity
                      key={p}
                      style={[
                        styles.optionBtn,
                        priority === p && {
                          backgroundColor: PRIORITY_COLORS[p] + '15',
                          borderColor: PRIORITY_COLORS[p] + '40',
                        },
                      ]}
                      onPress={() => setPriority(p)}
                    >
                      <View style={[styles.priorityDot, { backgroundColor: PRIORITY_COLORS[p] }]} />
                      <Text style={[
                        styles.optionLabel,
                        priority === p && { color: PRIORITY_COLORS[p], fontWeight: '700' },
                      ]}>
                        {PRIORITY_LABELS[p]}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Status Selection */}
              <View style={styles.inputGroup}>
                <View style={styles.labelRow}>
                  <Info size={12} color={colors.text.tertiary} weight="light" />
                  <Text style={styles.label}>OPERATIONAL STATUS</Text>
                </View>
                <View style={styles.optionRow}>
                  {STATUSES.map(s => (
                    <TouchableOpacity
                      key={s}
                      style={[
                        styles.optionBtn,
                        status === s && {
                          backgroundColor: colors.modules.track + '15',
                          borderColor: colors.modules.track + '40',
                        },
                      ]}
                      onPress={() => setStatus(s)}
                    >
                      <Text style={[
                        styles.optionLabel,
                        status === s && { color: colors.modules.track, fontWeight: '700' },
                      ]}>
                        {STATUS_LABELS[s]}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Commit Button */}
              <TouchableOpacity
                style={[styles.addBtn, (!title.trim() || loading) && styles.addBtnDisabled]}
                onPress={handleAdd}
                disabled={!title.trim() || loading}
              >
                {loading
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.addBtnText}>COMMIT TO SYSTEM</Text>
                }
              </TouchableOpacity>
            </ScrollView>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  avoidingView: {
    width: '100%',
  },
  sheet: {
    backgroundColor: colors.background.secondary,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    maxHeight: '90%',
    borderWidth: 0.5,
    borderColor: colors.border.primary,
    borderBottomWidth: 0,
  },
  handle: {
    width: 32,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border.primary,
    alignSelf: 'center',
    marginTop: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 20,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border.primary,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.modules.track,
  },
  title: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.text.primary,
    letterSpacing: 2,
  },
  closeBtn: {
    padding: 4,
  },
  body: {
    padding: 24,
    gap: 24,
  },
  inputGroup: {
    gap: 10,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.text.tertiary,
    letterSpacing: 1,
  },
  titleInput: {
    backgroundColor: colors.background.tertiary,
    borderRadius: 16,
    borderWidth: 0.5,
    borderColor: colors.border.primary,
    padding: 18,
    fontSize: 16,
    color: colors.text.primary,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  optionRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  optionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: colors.border.primary,
    backgroundColor: colors.background.tertiary,
  },
  priorityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  optionLabel: {
    fontSize: 11,
    color: colors.text.secondary,
    letterSpacing: 0.5,
  },
  addBtn: {
    backgroundColor: colors.modules.track,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: colors.modules.track,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  addBtnDisabled: {
    opacity: 0.3,
    backgroundColor: colors.text.tertiary,
  },
  addBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 2,
  },
})
