import React, { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Modal, KeyboardAvoidingView,
  Platform, ActivityIndicator, ScrollView,
  Pressable,
} from 'react-native'
import { colors } from '../../constants/colors'
import { X, Megaphone, Info, CheckCircle, Question } from 'phosphor-react-native'

const PROTOCOLS = [
  { key: 'update', label: 'UPDATE', color: '#378ADD', icon: Megaphone },
  { key: 'decision', label: 'DECISION', color: '#EAB308', icon: Info },
  { key: 'delivered', label: 'DELIVERED', color: '#1D9E75', icon: CheckCircle },
  { key: 'question', label: 'QUESTION', color: '#E24B4A', icon: Question },
]

export default function DeliverDispatchSheet({ visible, onClose, onAdd }) {
  const [content, setContent] = useState('')
  const [type, setType] = useState('update')
  const [loading, setLoading] = useState(false)

  const handleAdd = async () => {
    if (!content.trim()) return
    setLoading(true)
    try {
      await onAdd({ content: content.trim(), type })
      setContent('')
      setType('update')
      onClose()
    } finally {
      setLoading(false)
    }
  }

  const selectedProtocol = PROTOCOLS.find(p => p.key === type)

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
                <Text style={styles.title}>INITIALIZE DISPATCH</Text>
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
              {/* Protocol Picker */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>MISSION PROTOCOL</Text>
                <View style={styles.protocolGrid}>
                  {PROTOCOLS.map(p => {
                    const isActive = type === p.key
                    const Icon = p.icon
                    return (
                      <TouchableOpacity
                        key={p.key}
                        style={[
                          styles.protocolBtn,
                          isActive && { 
                            backgroundColor: p.color + '15',
                            borderColor: p.color + '40'
                          }
                        ]}
                        onPress={() => setType(p.key)}
                      >
                        <Icon color={isActive ? p.color : colors.text.tertiary} size={18} weight={isActive ? 'fill' : 'light'} />
                        <Text style={[styles.protocolLabel, isActive && { color: p.color, fontWeight: '700' }]}>
                          {p.label}
                        </Text>
                      </TouchableOpacity>
                    )
                  })}
                </View>
              </View>

              {/* Content Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>DISPATCH CONTENT</Text>
                <TextInput
                  style={styles.input}
                  value={content}
                  onChangeText={setContent}
                  placeholder="Broadcast project marker…"
                  placeholderTextColor={colors.text.tertiary}
                  multiline
                  autoFocus
                />
              </View>

              {/* Commit Button */}
              <TouchableOpacity
                style={[styles.addBtn, (!content.trim() || loading) && styles.addBtnDisabled]}
                onPress={handleAdd}
                disabled={!content.trim() || loading}
              >
                {loading
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.addBtnText}>SECURE DISPATCH</Text>
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
    backgroundColor: colors.modules.deliver,
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
    gap: 12,
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.text.tertiary,
    letterSpacing: 1,
  },
  protocolGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  protocolBtn: {
    flex: 1,
    minWidth: '45%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: colors.border.primary,
    backgroundColor: colors.background.tertiary,
  },
  protocolLabel: {
    fontSize: 10,
    color: colors.text.tertiary,
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: colors.background.tertiary,
    borderRadius: 16,
    borderWidth: 0.5,
    borderColor: colors.border.primary,
    padding: 18,
    fontSize: 16,
    color: colors.text.primary,
    minHeight: 120,
    textAlignVertical: 'top',
  },
  addBtn: {
    backgroundColor: colors.modules.deliver,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: colors.modules.deliver,
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
