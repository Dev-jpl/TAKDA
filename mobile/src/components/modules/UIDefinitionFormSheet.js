/**
 * UIDefinitionFormSheet.js
 *
 * Mobile renderer for ui_definition.entry_form (UIDefinition).
 * Reads the block tree from the creator's entry form design and renders
 * React Native equivalents of each block type.
 *
 * Falls back to GenericFormSheet if no ui_definition.entry_form exists.
 */

import React, { useState, useCallback } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, Switch, Modal,
  ScrollView, KeyboardAvoidingView, Platform, Pressable,
  Alert, StyleSheet,
} from 'react-native'
import DateTimePicker from '@react-native-community/datetimepicker'
import { X, Check, Plus, Minus } from 'phosphor-react-native'
import { colors } from '../../constants/colors'

// ── Input base style ──────────────────────────────────────────────────────────

const inputStyle = {
  backgroundColor: colors.background.primary,
  borderWidth:     1,
  borderColor:     colors.border.primary,
  borderRadius:    12,
  paddingHorizontal: 14,
  paddingVertical:   10,
  fontSize:        14,
  color:           colors.text.primary,
}

// ── Field input renderers ─────────────────────────────────────────────────────

function FieldInput({ block, schemaField, value, onChange, brandColor }) {
  const [showDatePicker, setShowDatePicker] = useState(false)

  switch (block.component) {

    case 'text_input':
      return (
        <TextInput
          style={inputStyle}
          value={String(value ?? '')}
          onChangeText={onChange}
          placeholder={block.placeholder || ''}
          placeholderTextColor={colors.text.tertiary}
        />
      )

    case 'longtext_input':
      return (
        <TextInput
          style={[inputStyle, { minHeight: 80, textAlignVertical: 'top' }]}
          value={String(value ?? '')}
          onChangeText={onChange}
          placeholder={block.placeholder || ''}
          placeholderTextColor={colors.text.tertiary}
          multiline
          numberOfLines={3}
        />
      )

    case 'number_input': {
      const unit = schemaField?.config?.unit ?? ''
      return (
        <View style={{ position: 'relative' }}>
          <TextInput
            style={inputStyle}
            value={String(value ?? '')}
            onChangeText={onChange}
            placeholder={block.placeholder ?? '0'}
            placeholderTextColor={colors.text.tertiary}
            keyboardType="numeric"
          />
          {!!unit && (
            <Text style={{ position: 'absolute', right: 14, top: 10, fontSize: 13, color: colors.text.tertiary }}>
              {unit}
            </Text>
          )}
        </View>
      )
    }

    case 'currency_input':
      return (
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={{ position: 'absolute', left: 14, fontSize: 14, color: colors.text.tertiary, zIndex: 1 }}>₱</Text>
          <TextInput
            style={[inputStyle, { flex: 1, paddingLeft: 30 }]}
            value={String(value ?? '')}
            onChangeText={onChange}
            placeholder="0.00"
            placeholderTextColor={colors.text.tertiary}
            keyboardType="decimal-pad"
          />
        </View>
      )

    case 'counter_stepper': {
      const num  = Number(value ?? 0)
      const step = schemaField?.config?.step ?? 1
      const min  = schemaField?.config?.min  ?? 0
      const max  = schemaField?.config?.max  ?? Infinity
      const unit = schemaField?.config?.unit ?? ''
      return (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <TouchableOpacity
            onPress={() => onChange(Math.max(min, num - step))}
            style={[styles.stepBtn, { borderColor: colors.border.primary, backgroundColor: colors.background.tertiary }]}
          >
            <Minus size={14} color={colors.text.secondary} weight="bold" />
          </TouchableOpacity>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={{ fontSize: 26, fontWeight: '700', color: colors.text.primary }}>
              {num}{unit ? ` ${unit}` : ''}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => onChange(Math.min(max, num + step))}
            style={[styles.stepBtn, { borderColor: brandColor + '40', backgroundColor: brandColor + '20' }]}
          >
            <Plus size={14} color={brandColor} weight="bold" />
          </TouchableOpacity>
        </View>
      )
    }

    case 'boolean_toggle': {
      const checked = !!value
      return (
        <Switch
          value={checked}
          onValueChange={onChange}
          trackColor={{ false: colors.background.tertiary, true: brandColor + '80' }}
          thumbColor={checked ? brandColor : colors.text.tertiary}
        />
      )
    }

    case 'date_picker': {
      const dateVal = value ? new Date(value + 'T12:00:00') : new Date()
      return (
        <>
          <TouchableOpacity
            onPress={() => setShowDatePicker(true)}
            style={inputStyle}
          >
            <Text style={{ fontSize: 14, color: value ? colors.text.primary : colors.text.tertiary }}>
              {value || block.placeholder || 'Select date…'}
            </Text>
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker
              value={dateVal}
              mode="date"
              onChange={(_, date) => {
                setShowDatePicker(false)
                if (date) onChange(date.toLocaleDateString('en-CA'))
              }}
            />
          )}
        </>
      )
    }

    case 'datetime_picker': {
      const dtVal = value ? new Date(value) : new Date()
      return (
        <>
          <TouchableOpacity
            onPress={() => setShowDatePicker(true)}
            style={inputStyle}
          >
            <Text style={{ fontSize: 14, color: value ? colors.text.primary : colors.text.tertiary }}>
              {value ? new Date(value).toLocaleString() : block.placeholder || 'Select date & time…'}
            </Text>
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker
              value={dtVal}
              mode="datetime"
              onChange={(_, date) => {
                setShowDatePicker(false)
                if (date) onChange(date.toISOString())
              }}
            />
          )}
        </>
      )
    }

    case 'select_chips': {
      const options = schemaField?.config?.options ?? []
      return (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {options.map(opt => {
            const sel = value === opt
            return (
              <TouchableOpacity
                key={opt}
                onPress={() => onChange(opt)}
                style={[styles.chip, sel
                  ? { backgroundColor: brandColor, borderColor: brandColor }
                  : { borderColor: colors.border.primary }]}
              >
                <Text style={{ fontSize: 12, fontWeight: '600', color: sel ? '#fff' : colors.text.secondary }}>
                  {opt}
                </Text>
              </TouchableOpacity>
            )
          })}
          {options.length === 0 && (
            <Text style={{ fontSize: 12, color: colors.text.tertiary }}>No options configured.</Text>
          )}
        </View>
      )
    }

    case 'select_dropdown': {
      // On mobile: use chips for better UX (no native picker dependency needed)
      const options = schemaField?.config?.options ?? []
      return (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {options.map(opt => {
            const sel = value === opt
            return (
              <TouchableOpacity
                key={opt}
                onPress={() => onChange(opt)}
                style={[styles.chip, sel
                  ? { backgroundColor: brandColor, borderColor: brandColor }
                  : { borderColor: colors.border.primary }]}
              >
                <Text style={{ fontSize: 12, fontWeight: '600', color: sel ? '#fff' : colors.text.secondary }}>
                  {opt}
                </Text>
              </TouchableOpacity>
            )
          })}
          {options.length === 0 && (
            <Text style={{ fontSize: 12, color: colors.text.tertiary }}>No options configured.</Text>
          )}
        </View>
      )
    }

    default:
      return (
        <TextInput
          style={inputStyle}
          value={String(value ?? '')}
          onChangeText={onChange}
          placeholderTextColor={colors.text.tertiary}
        />
      )
  }
}

// ── Block renderer ────────────────────────────────────────────────────────────

function BlockRenderer({
  block, schema, values, errors, setValues, brandColor, onSubmit, onClose, submitting,
}) {
  const set = (key, val) => setValues(prev => ({ ...prev, [key]: val }))

  switch (block.type) {

    case 'field_input': {
      const sf = schema.find(f => f.key === block.field_key)
      return (
        <View style={{ gap: 6 }}>
          {block.show_label && (
            <Text style={styles.fieldLabel}>
              {block.label}
              {sf?.required ? <Text style={{ color: '#ef4444' }}> *</Text> : null}
            </Text>
          )}
          <FieldInput
            block={block}
            schemaField={sf}
            value={values[block.field_key]}
            onChange={v => set(block.field_key, v)}
            brandColor={brandColor}
          />
          {errors[block.field_key] && (
            <Text style={{ fontSize: 11, color: '#ef4444' }}>{errors[block.field_key]}</Text>
          )}
        </View>
      )
    }

    case 'section_header':
      return (
        <View style={{ borderLeftWidth: 2, borderLeftColor: brandColor, paddingLeft: 10 }}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text.primary }}>{block.title}</Text>
          {block.subtitle ? (
            <Text style={{ fontSize: 12, color: colors.text.tertiary, marginTop: 2 }}>{block.subtitle}</Text>
          ) : null}
        </View>
      )

    case 'divider':
      return <View style={{ height: 1, backgroundColor: colors.border.primary }} />

    case 'spacer':
      return <View style={{ height: block.size === 'lg' ? 32 : block.size === 'sm' ? 8 : 16 }} />

    case 'assistant_nudge':
      return (
        <View style={[styles.nudge, { borderColor: brandColor + '30', backgroundColor: brandColor + '10' }]}>
          <Text style={{ fontSize: 12, fontWeight: '600', color: brandColor }}>Tip</Text>
          {block.hint ? <Text style={{ fontSize: 12, color: colors.text.secondary, marginTop: 2 }}>{block.hint}</Text> : null}
        </View>
      )

    case 'save_button':
      return (
        <TouchableOpacity
          onPress={onSubmit}
          disabled={submitting}
          style={[styles.saveBtn, { backgroundColor: brandColor, opacity: submitting ? 0.5 : 1 }]}
        >
          {submitting
            ? <Text style={styles.saveBtnText}>Saving…</Text>
            : <><Check size={15} color="#fff" weight="bold" /><Text style={styles.saveBtnText}>{block.label || 'Save'}</Text></>
          }
        </TouchableOpacity>
      )

    case 'cancel_button':
      return (
        <TouchableOpacity
          onPress={onClose}
          style={styles.cancelBtn}
        >
          <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text.secondary }}>{block.label || 'Cancel'}</Text>
        </TouchableOpacity>
      )

    case 'container': {
      return (
        <View style={[
          { gap: 12, borderRadius: 12 },
          block.bordered && { borderWidth: 1, borderColor: colors.border.primary, padding: 14 },
          block.background && { backgroundColor: colors.background.secondary, padding: 14 },
        ]}>
          {block.label ? (
            <Text style={{ fontSize: 10, fontWeight: '700', color: colors.text.tertiary, textTransform: 'uppercase', letterSpacing: 1 }}>
              {block.label}
            </Text>
          ) : null}
          {block.children?.map(child => (
            <BlockRenderer
              key={child.id}
              block={child.block}
              schema={schema}
              values={values}
              errors={errors}
              setValues={setValues}
              brandColor={brandColor}
              onSubmit={onSubmit}
              onClose={onClose}
              submitting={submitting}
            />
          ))}
        </View>
      )
    }

    default:
      return null
  }
}

// ── Main component ────────────────────────────────────────────────────────────

export function UIDefinitionFormSheet({ visible, onClose, onSave, definition }) {
  const uiDef = (() => {
    const raw = definition?.ui_definition
    if (!raw) return null
    if (Array.isArray(raw?.rows)) return raw
    return raw?.entry_form ?? null
  })()

  const schema = (() => {
    const schemas     = definition?.schemas ?? {}
    const collections = Object.values(schemas)
    if (collections.length > 0) {
      const primary = collections.find(c => c.role === 'primary') ?? collections[0]
      return primary?.fields ?? []
    }
    return definition?.schema ?? []
  })()

  const brandColor = definition?.brand_color ?? colors.modules.aly

  // Collect all field_input blocks (including inside containers) for init/validation
  const allFieldBlocks = (uiDef?.rows ?? [])
    .flatMap(r => r.columns)
    .flatMap(col =>
      col.block.type === 'container'
        ? col.block.children.map(c => c.block)
        : [col.block]
    )
    .filter(b => b.type === 'field_input')

  const initValues = useCallback(() =>
    allFieldBlocks.reduce((acc, b) => {
      const sf = schema.find(f => f.key === b.field_key)
      if (!sf) return acc
      switch (sf.type) {
        case 'boolean':  acc[b.field_key] = false; break
        case 'counter':
        case 'number':   acc[b.field_key] = ''; break
        case 'date':     acc[b.field_key] = new Date().toLocaleDateString('en-CA'); break
        case 'datetime': acc[b.field_key] = new Date().toISOString(); break
        default:         acc[b.field_key] = ''
      }
      return acc
    }, {}),
    [allFieldBlocks, schema]
  )

  const [values,     setValues]     = useState(initValues)
  const [errors,     setErrors]     = useState({})
  const [submitting, setSubmitting] = useState(false)

  // Reset when sheet opens
  React.useEffect(() => { if (visible) { setValues(initValues()); setErrors({}) } }, [visible])

  const handleClose = () => { setValues(initValues()); setErrors({}); onClose() }

  const handleSubmit = async () => {
    const newErrors = {}
    for (const b of allFieldBlocks) {
      const sf = schema.find(f => f.key === b.field_key)
      if (!sf?.required) continue
      const v = values[b.field_key]
      if (v === '' || v === null || v === undefined) {
        newErrors[b.field_key] = `${b.label} is required`
      }
    }
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return }

    setSubmitting(true)
    setErrors({})
    try {
      const data = {}
      for (const b of allFieldBlocks) {
        const v  = values[b.field_key]
        if (v === '' || v === null || v === undefined) continue
        const sf = schema.find(f => f.key === b.field_key)
        if (sf?.type === 'number' || sf?.type === 'counter') {
          data[b.field_key] = parseFloat(String(v)) || 0
        } else if (sf?.type === 'boolean') {
          data[b.field_key] = !!v
        } else {
          data[b.field_key] = v
        }
      }
      await onSave(data)
      handleClose()
    } catch (e) {
      Alert.alert('Error', e?.message ?? 'Could not save. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  // No UIDefinition — caller should fall back to GenericFormSheet
  if (!uiDef) return null

  return (
    <Modal visible={visible} animationType="slide" transparent presentationStyle="overFullScreen">
      <KeyboardAvoidingView style={form.outer} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <Pressable style={form.backdrop} onPress={handleClose} />
        <View style={form.sheet}>
          <View style={form.handle} />

          {/* Header */}
          <View style={form.header}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: brandColor }} />
              <Text style={form.title}>Add Entry</Text>
            </View>
            <TouchableOpacity onPress={handleClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <X color={colors.text.tertiary} size={18} />
            </TouchableOpacity>
          </View>

          {/* Form rows from UIDefinition */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: 40 }}
          >
            {uiDef.rows.map(row => (
              <View key={row.id} style={{ gap: 12 }}>
                {row.columns.map(col => (
                  <BlockRenderer
                    key={col.id}
                    block={col.block}
                    schema={schema}
                    values={values}
                    errors={errors}
                    setValues={setValues}
                    brandColor={brandColor}
                    onSubmit={handleSubmit}
                    onClose={handleClose}
                    submitting={submitting}
                  />
                ))}
              </View>
            ))}

            {/* Global error */}
            {errors._submit && (
              <Text style={{ fontSize: 12, color: '#ef4444', backgroundColor: '#ef444415', borderRadius: 10, padding: 12 }}>
                {errors._submit}
              </Text>
            )}

            {/* Fallback save button if UIDefinition has no save_button block */}
            {!allFieldBlocks.some(b => b.type === 'save_button') && (
              <TouchableOpacity
                onPress={handleSubmit}
                disabled={submitting}
                style={[styles.saveBtn, { backgroundColor: brandColor, opacity: submitting ? 0.5 : 1, marginTop: 4 }]}
              >
                {submitting
                  ? <Text style={styles.saveBtnText}>Saving…</Text>
                  : <><Check size={15} color="#fff" weight="bold" /><Text style={styles.saveBtnText}>Save</Text></>
                }
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  fieldLabel: {
    fontSize: 10, fontWeight: '700', color: colors.text.tertiary,
    textTransform: 'uppercase', letterSpacing: 1,
  },
  chip: {
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 10, borderWidth: 1,
  },
  stepBtn: {
    width: 38, height: 38, borderRadius: 10,
    borderWidth: 1, alignItems: 'center', justifyContent: 'center',
  },
  nudge: {
    padding: 12, borderRadius: 12, borderWidth: 1,
  },
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 14, borderRadius: 14,
  },
  saveBtnText: {
    fontSize: 14, fontWeight: '700', color: '#fff',
  },
  cancelBtn: {
    alignItems: 'center', paddingVertical: 12,
    borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
})

const form = StyleSheet.create({
  outer: {
    flex: 1, justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sheet: {
    backgroundColor: colors.background.secondary,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    borderTopWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    maxHeight: '92%',
  },
  handle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: colors.background.tertiary,
    alignSelf: 'center', marginTop: 12,
  },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  title: {
    fontSize: 14, fontWeight: '700', color: colors.text.primary,
  },
})
