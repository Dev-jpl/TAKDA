import React, { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Modal, KeyboardAvoidingView,
  Platform, ActivityIndicator, ScrollView,
  Pressable,
} from 'react-native'
import { colors } from '../../constants/colors'
import { X, Lightbulb, BookmarkSimple, Target, CaretDown } from 'phosphor-react-native'

const CATEGORIES = [
  { key: 'idea', label: 'IDEA', color: '#EAB308', icon: Lightbulb },
  { key: 'reference', label: 'REFERENCE', color: '#378ADD', icon: BookmarkSimple },
  { key: 'action', label: 'ACTION', color: '#1D9E75', icon: Target },
]

export default function AnnotateNoteSheet({ visible, onClose, onAdd, documents = [] }) {
  const [content, setContent] = useState('')
  const [category, setCategory] = useState('idea')
  const [documentId, setDocumentId] = useState(null)
  const [loading, setLoading] = useState(false)
  const [showDocPicker, setShowDocPicker] = useState(false)

  const handleAdd = async () => {
    if (!content.trim()) return
    setLoading(true)
    try {
      await onAdd({ content: content.trim(), category, documentId })
      setContent('')
      setCategory('idea')
      setDocumentId(null)
      onClose()
    } finally {
      setLoading(false)
    }
  }

  const selectedDoc = documents.find(d => d.id === documentId)

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
                <Text style={styles.title}>New Note</Text>
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
              {/* Category Picker */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>CLASSIFICATION PROTOCOL</Text>
                <View style={styles.categoryRow}>
                  {CATEGORIES.map(cat => {
                    const isActive = category === cat.key
                    const Icon = cat.icon
                    return (
                      <TouchableOpacity
                        key={cat.key}
                        style={[
                          styles.catBtn,
                          isActive && { 
                            backgroundColor: cat.color + '15',
                            borderColor: cat.color + '40'
                          }
                        ]}
                        onPress={() => setCategory(cat.key)}
                      >
                        <Icon color={isActive ? cat.color : colors.text.tertiary} size={16} weight={isActive ? 'fill' : 'light'} />
                        <Text style={[styles.catLabel, isActive && { color: cat.color, fontWeight: '700' }]}>
                          {cat.label}
                        </Text>
                      </TouchableOpacity>
                    )
                  })}
                </View>
              </View>

              {/* Content Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>INSIGHT CONTENT</Text>
                <TextInput
                  style={styles.input}
                  value={content}
                  onChangeText={setContent}
                  placeholder="Capture insight or synthesis unit…"
                  placeholderTextColor={colors.text.tertiary}
                  multiline
                  autoFocus
                />
              </View>

              {/* Document Linker */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>LINK TO UNIT (OPTIONAL)</Text>
                <TouchableOpacity 
                  style={styles.docPickerBtn}
                  onPress={() => setShowDocPicker(!showDocPicker)}
                >
                  <Text style={[styles.docPickerText, selectedDoc && { color: colors.text.primary }]}>
                    {selectedDoc ? (selectedDoc.title || 'Untitled Unit') : 'Select target unit…'}
                  </Text>
                  <CaretDown color={colors.text.tertiary} size={14} />
                </TouchableOpacity>

                {showDocPicker && (
                  <View style={styles.docList}>
                    {documents.map(doc => (
                      <TouchableOpacity
                        key={doc.id}
                        style={styles.docItem}
                        onPress={() => {
                          setDocumentId(doc.id === documentId ? null : doc.id)
                          setShowDocPicker(false)
                        }}
                      >
                        <Text style={[
                          styles.docItemText,
                          documentId === doc.id && { color: colors.modules.annotate }
                        ]}>
                          {doc.title || 'Untitled Unit'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                    {documents.length === 0 && (
                      <Text style={styles.emptyDocs}>No active units found.</Text>
                    )}
                  </View>
                )}
              </View>

              {/* Commit Button */}
              <TouchableOpacity
                style={[styles.addBtn, (!content.trim() || loading) && styles.addBtnDisabled]}
                onPress={handleAdd}
                disabled={!content.trim() || loading}
              >
                {loading
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.addBtnText}>SECURE INSIGHT</Text>
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
    backgroundColor: colors.modules.annotate,
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
  categoryRow: {
    flexDirection: 'row',
    gap: 8,
  },
  catBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: colors.border.primary,
    backgroundColor: colors.background.tertiary,
  },
  catLabel: {
    fontSize: 11,
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
    minHeight: 100,
    textAlignVertical: 'top',
  },
  docPickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background.tertiary,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: colors.border.primary,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  docPickerText: {
    fontSize: 14,
    color: colors.text.tertiary,
  },
  docList: {
    backgroundColor: colors.background.tertiary,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: colors.border.primary,
    maxHeight: 200,
    marginTop: 4,
    padding: 8,
  },
  docItem: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 4,
  },
  docItemText: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  emptyDocs: {
    textAlign: 'center',
    fontSize: 12,
    color: colors.text.tertiary,
    paddingVertical: 20,
  },
  addBtn: {
    backgroundColor: colors.modules.annotate,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: colors.modules.annotate,
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
