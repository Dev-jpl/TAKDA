import { useRef, useState, useEffect, useCallback } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Modal, Animated, Platform, ActivityIndicator,
  useWindowDimensions, Keyboard, Alert, ScrollView,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import {
  X, PaperPlaneTilt, Tray, Trash,
  ListBullets, CheckSquare, TextHOne,
  ArrowLineLeft, ArrowLineRight, TextB, TextItalic,
  Palette, Check,
} from 'phosphor-react-native'
import { colors } from '../../constants/colors'
import { vaultService } from '../../services/vault'
import { supabase } from '../../services/supabase'

const PEEK = 64

const COLOR_OPTIONS = [
  { key: 'yellow', hex: '#F5C842', bg: '#F5C84230' },
  { key: 'blue',   hex: '#378ADD', bg: '#378ADD30' },
  { key: 'green',  hex: '#1D9E75', bg: '#1D9E7530' },
  { key: 'red',    hex: '#E24B4A', bg: '#E24B4A30' },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function newLine(overrides = {}) {
  return {
    id: `${Date.now()}${Math.random().toString(36).slice(2)}`,
    text: '',
    type: 'normal', // 'normal' | 'bullet' | 'checkbox' | 'heading'
    bold: false,
    italic: false,
    color: null,    // null | 'yellow' | 'blue' | 'green' | 'red'
    indent: 0,
    checked: false,
    tags: [],
    ...overrides,
  }
}

function parseTags(text) {
  return (text.match(/#(\w+)/g) || []).map(t => t.slice(1))
}

function serializeLines(lines) {
  return lines.map(l => {
    let prefix = ''
    if (l.type === 'bullet')   prefix = '• '
    if (l.type === 'checkbox') prefix = l.checked ? '☑ ' : '☐ '
    if (l.type === 'heading')  prefix = '# '
    const indent = '  '.repeat(l.indent)
    let t = l.text
    if (l.bold)   t = `**${t}**`
    if (l.italic) t = `_${t}_`
    return indent + prefix + t
  }).join('\n')
}

// ── ToolBtn ───────────────────────────────────────────────────────────────────

function ToolBtn({ active, disabled, onPress, children }) {
  return (
    <TouchableOpacity
      style={[styles.toolBtnFmt, active && styles.toolBtnActive]}
      onPress={onPress}
      disabled={disabled}
      hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
      activeOpacity={0.7}
    >
      {children}
    </TouchableOpacity>
  )
}

// ── ColorPickerRow ────────────────────────────────────────────────────────────

function ColorPickerRow({ anim, activeColor, onSelect }) {
  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [40, 0] })
  return (
    <Animated.View style={[styles.colorRow, { opacity: anim, transform: [{ translateY }] }]}>
      {COLOR_OPTIONS.map(c => (
        <TouchableOpacity
          key={c.key}
          style={[styles.colorCircle, { backgroundColor: c.hex }]}
          onPress={() => onSelect(c.key)}
          activeOpacity={0.8}
        >
          {activeColor === c.key && <Check size={12} color="#fff" weight="fill" />}
        </TouchableOpacity>
      ))}
    </Animated.View>
  )
}

// ── FormattingToolbar ─────────────────────────────────────────────────────────

function FormattingToolbar({ activeLine, onToggle, colorPickerOpen, onToggleColorPicker }) {
  const { type, bold, italic, color, indent } = activeLine || {}
  const dimColor = colors.text.tertiary + '40'
  const activeColor = colors.modules.aly
  const inactiveColor = colors.text.tertiary
  const appliedColor = COLOR_OPTIONS.find(c => c.key === color)?.hex

  return (
    <View style={styles.formattingBar}>
      <ToolBtn active={type === 'bullet'} onPress={() => onToggle('type', 'bullet')}>
        <ListBullets size={18} color={type === 'bullet' ? activeColor : inactiveColor} weight="light" />
      </ToolBtn>
      <ToolBtn active={type === 'checkbox'} onPress={() => onToggle('type', 'checkbox')}>
        <CheckSquare size={18} color={type === 'checkbox' ? activeColor : inactiveColor} weight="light" />
      </ToolBtn>
      <ToolBtn active={type === 'heading'} onPress={() => onToggle('type', 'heading')}>
        <TextHOne size={18} color={type === 'heading' ? activeColor : inactiveColor} weight="light" />
      </ToolBtn>
      <ToolBtn active={false} disabled={!indent} onPress={() => onToggle('outdent')}>
        <ArrowLineLeft size={18} color={!indent ? dimColor : inactiveColor} weight="light" />
      </ToolBtn>
      <ToolBtn active={indent > 0} onPress={() => onToggle('indent')}>
        <ArrowLineRight size={18} color={indent > 0 ? activeColor : inactiveColor} weight="light" />
      </ToolBtn>
      <ToolBtn active={bold} onPress={() => onToggle('bold')}>
        <TextB size={18} color={bold ? activeColor : inactiveColor} weight="light" />
      </ToolBtn>
      <ToolBtn active={italic} onPress={() => onToggle('italic')}>
        <TextItalic size={18} color={italic ? activeColor : inactiveColor} weight="light" />
      </ToolBtn>
      <ToolBtn active={!!color || colorPickerOpen} onPress={onToggleColorPicker}>
        <Palette size={18} color={colorPickerOpen ? activeColor : (appliedColor || inactiveColor)} weight="light" />
      </ToolBtn>
    </View>
  )
}

// ── RichTextEditor ────────────────────────────────────────────────────────────

function RichTextEditor({ lines, setLines, setActiveLineId, lineRefs }) {
  const handleChangeText = useCallback((id, newText) => {
    let type = null
    let text = newText
    if (newText === '- ')       { type = 'bullet';   text = '' }
    else if (newText === '[] ') { type = 'checkbox'; text = '' }
    else if (newText === '# ')  { type = 'heading';  text = '' }

    setLines(prev => prev.map(l =>
      l.id === id
        ? { ...l, text, tags: parseTags(text), ...(type ? { type } : {}) }
        : l
    ))
  }, [setLines])

  const handleKeyPress = useCallback((id, key) => {
    if (key !== 'Backspace') return
    setLines(prev => {
      const idx = prev.findIndex(l => l.id === id)
      const line = prev[idx]
      if (line.text.length > 0) return prev
      // Remove formatting on non-normal empty line
      if (line.type !== 'normal') {
        return prev.map(l => l.id === id ? { ...l, type: 'normal', checked: false } : l)
      }
      // Delete empty normal line and focus previous
      if (idx === 0) return prev
      const prevLine = prev[idx - 1]
      setTimeout(() => {
        lineRefs.current[prevLine.id]?.focus()
        setActiveLineId(prevLine.id)
      }, 0)
      return prev.filter(l => l.id !== id)
    })
  }, [setLines, setActiveLineId, lineRefs])

  const handleSubmitEditing = useCallback((id) => {
    setLines(prev => {
      const idx = prev.findIndex(l => l.id === id)
      const line = prev[idx]
      // Heading always creates normal; bullet/checkbox continues if line has content
      let nextType = 'normal'
      if ((line.type === 'bullet' || line.type === 'checkbox') && line.text.trim()) {
        nextType = line.type
      }
      const next = newLine({ type: nextType })
      const updated = [...prev.slice(0, idx + 1), next, ...prev.slice(idx + 1)]
      setTimeout(() => {
        lineRefs.current[next.id]?.focus()
        setActiveLineId(next.id)
      }, 0)
      return updated
    })
  }, [setLines, setActiveLineId, lineRefs])

  return (
    <ScrollView
      style={styles.editorScroll}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {lines.map((line, idx) => {
        const colorOpt = COLOR_OPTIONS.find(c => c.key === line.color)
        return (
          <View
            key={line.id}
            style={[styles.lineRow, colorOpt && { backgroundColor: colorOpt.bg }]}
          >
            {line.type === 'bullet' && <View style={styles.bulletDot} />}
            {line.type === 'checkbox' && (
              <TouchableOpacity
                onPress={() => setLines(prev =>
                  prev.map(l => l.id === line.id ? { ...l, checked: !l.checked } : l)
                )}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                style={styles.checkboxBtn}
              >
                <CheckSquare
                  size={16}
                  color={line.checked ? colors.modules.aly : colors.text.tertiary}
                  weight={line.checked ? 'fill' : 'light'}
                />
              </TouchableOpacity>
            )}
            <TextInput
              ref={r => { lineRefs.current[line.id] = r }}
              style={[
                styles.lineText,
                line.type === 'heading' && styles.lineHeading,
                line.bold && styles.lineBold,
                line.italic && styles.lineItalic,
                line.type === 'checkbox' && line.checked && styles.lineChecked,
                { paddingLeft: line.indent * 20 },
              ]}
              value={line.text}
              onChangeText={t => handleChangeText(line.id, t)}
              onKeyPress={({ nativeEvent: { key } }) => handleKeyPress(line.id, key)}
              onSubmitEditing={() => handleSubmitEditing(line.id)}
              onFocus={() => setActiveLineId(line.id)}
              multiline={false}
              submitBehavior="submit"
              returnKeyType="next"
              placeholder={idx === 0 ? "What's on your mind?" : ''}
              placeholderTextColor={colors.text.tertiary}
              selectionColor={colors.modules.aly}
            />
          </View>
        )
      })}
      <View style={{ height: 40 }} />
    </ScrollView>
  )
}

// ── VaultCaptureSheet ─────────────────────────────────────────────────────────

export default function VaultCaptureSheet({ visible, onClose, onCapture, editItem = null }) {
  const { height } = useWindowDimensions()
  const slideAnim = useRef(new Animated.Value(height)).current
  const bottomAnim = useRef(new Animated.Value(0)).current
  const colorPickerAnim = useRef(new Animated.Value(0)).current
  const lineRefs = useRef({})

  const [lines, setLines] = useState(() => [newLine()])
  const [activeLineId, setActiveLineId] = useState(null)
  const [colorPickerOpen, setColorPickerOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [userId, setUserId] = useState(null)

  const isEdit = !!editItem
  const activeLine = lines.find(l => l.id === activeLineId) ?? lines[0]

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id)
    })
  }, [])

  useEffect(() => {
    if (editItem) {
      const rawLines = (editItem.content || '').split('\n')
      const parsed = rawLines.map(raw => {
        let text = raw
        let type = 'normal'
        let checked = false
        let bold = false
        let italic = false
        let indent = 0

        // Count leading spaces for indent (2 spaces per level)
        const indentMatch = text.match(/^( +)/)
        if (indentMatch) {
          indent = Math.floor(indentMatch[1].length / 2)
          text = text.trimStart()
        }

        if (text.startsWith('# '))  { type = 'heading';  text = text.slice(2) }
        else if (text.startsWith('• '))  { type = 'bullet';   text = text.slice(2) }
        else if (text.startsWith('☑ ')) { type = 'checkbox'; text = text.slice(2); checked = true }
        else if (text.startsWith('☐ ')) { type = 'checkbox'; text = text.slice(2) }

        if (text.startsWith('**') && text.endsWith('**')) { bold = true; text = text.slice(2, -2) }
        if (text.startsWith('_')  && text.endsWith('_'))  { italic = true; text = text.slice(1, -1) }

        return newLine({ text, type, checked, bold, italic, indent, tags: parseTags(text) })
      })
      const firstId = parsed[0]?.id ?? null
      setLines(parsed)
      setActiveLineId(firstId)
    } else {
      const initial = newLine()
      setLines([initial])
      setActiveLineId(initial.id)
    }
  }, [editItem])

  const closeColorPicker = useCallback(() => {
    Animated.timing(colorPickerAnim, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => {
      setColorPickerOpen(false)
    })
  }, [colorPickerAnim])

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: false,
        damping: 20,
        stiffness: 200,
      }).start(() => {
        const firstId = lines[0]?.id
        if (firstId) lineRefs.current[firstId]?.focus()
      })
    } else {
      closeColorPicker()
      Keyboard.dismiss()
      bottomAnim.setValue(0)
      Animated.timing(slideAnim, { toValue: height, duration: 250, useNativeDriver: false }).start()
      if (!isEdit) {
        const initial = newLine()
        setLines([initial])
        setActiveLineId(initial.id)
      }
    }
  }, [visible])

  useEffect(() => {
    if (!visible) return
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow'
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide'
    const onShow = (e) => Animated.timing(bottomAnim, {
      toValue: e.endCoordinates.height,
      duration: Platform.OS === 'ios' ? e.duration : 250,
      useNativeDriver: false,
    }).start()
    const onHide = () => Animated.timing(bottomAnim, {
      toValue: 0, duration: 250, useNativeDriver: false,
    }).start()
    const showSub = Keyboard.addListener(showEvent, onShow)
    const hideSub = Keyboard.addListener(hideEvent, onHide)
    return () => { showSub.remove(); hideSub.remove() }
  }, [visible])

  const handleToggle = useCallback((prop, value) => {
    setLines(prev => prev.map(l => {
      if (l.id !== activeLineId) return l
      if (prop === 'type')    return { ...l, type: l.type === value ? 'normal' : value, checked: false }
      if (prop === 'bold')    return { ...l, bold: !l.bold }
      if (prop === 'italic')  return { ...l, italic: !l.italic }
      if (prop === 'indent')  return { ...l, indent: Math.min(4, l.indent + 1) }
      if (prop === 'outdent') return { ...l, indent: Math.max(0, l.indent - 1) }
      return l
    }))
  }, [activeLineId])

  const handleToggleColorPicker = useCallback(() => {
    if (colorPickerOpen) {
      closeColorPicker()
    } else {
      setColorPickerOpen(true)
      Animated.timing(colorPickerAnim, { toValue: 1, duration: 150, useNativeDriver: true }).start()
    }
  }, [colorPickerOpen, closeColorPicker, colorPickerAnim])

  const handleColorSelect = useCallback((colorKey) => {
    setLines(prev => prev.map(l =>
      l.id === activeLineId
        ? { ...l, color: l.color === colorKey ? null : colorKey }
        : l
    ))
    closeColorPicker()
  }, [activeLineId, closeColorPicker])

  const handleSubmit = async () => {
    const hasContent = lines.some(l => l.text.trim())
    if (!hasContent) return
    setLoading(true)
    try {
      const content = serializeLines(lines)
      const allTags = [...new Set(lines.flatMap(l => l.tags))]
      const metadata = { lines, tags: allTags }
      if (isEdit) {
        await vaultService.updateItem(editItem.id, content, metadata)
      } else {
        if (!userId) return
        await vaultService.createItem(userId, content, 'rich_text', metadata)
      }
      onCapture?.()
      onClose()
    } catch (e) {
      console.warn('VaultCapture error:', e)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = () => {
    Alert.alert('Delete note', 'Remove this from the vault?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await vaultService.deleteItem(editItem.id)
            onCapture?.()
            onClose()
          } catch (e) {
            console.warn('VaultDelete error:', e)
          }
        },
      },
    ])
  }

  const hasContent = lines.some(l => l.text.trim())

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose} />

      <Animated.View style={[styles.sheet, { top: PEEK, bottom: bottomAnim, transform: [{ translateY: slideAnim }] }]}>
        <SafeAreaView style={styles.inner} edges={['bottom']}>
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.iconWrap}>
                <Tray color={colors.modules.aly} size={16} weight="light" />
              </View>
              <View>
                <Text style={styles.title}>{isEdit ? 'Edit note' : 'Dump to Vault'}</Text>
                <Text style={styles.subtitle}>
                  {isEdit ? 'Tap anywhere to edit' : 'Capture anything — sort it later'}
                </Text>
              </View>
            </View>
            <View style={styles.headerRight}>
              {isEdit && (
                <TouchableOpacity
                  onPress={handleDelete}
                  hitSlop={{ top: 20, bottom: 20, left: 12, right: 12 }}
                  style={styles.deleteBtn}
                >
                  <Trash color="#FF5C5C" size={18} weight="light" />
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={onClose} hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}>
                <X color={colors.text.tertiary} size={20} weight="light" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Editor */}
          <View style={styles.inputArea}>
            <RichTextEditor
              lines={lines}
              setLines={setLines}
              activeLineId={activeLineId}
              setActiveLineId={setActiveLineId}
              lineRefs={lineRefs}
            />
          </View>

          {/* Color picker — always rendered, animated in/out */}
          <ColorPickerRow
            anim={colorPickerAnim}
            activeColor={activeLine?.color}
            onSelect={handleColorSelect}
          />

          {/* Formatting toolbar */}
          <FormattingToolbar
            activeLine={activeLine}
            onToggle={handleToggle}
            colorPickerOpen={colorPickerOpen}
            onToggleColorPicker={handleToggleColorPicker}
          />

          {/* Send bar */}
          <View style={styles.sendBar}>
            <Text style={styles.charCount}>
              {lines.reduce((s, l) => s + l.text.length, 0)} chars
            </Text>
            <TouchableOpacity
              style={[styles.sendBtn, (!hasContent || loading) && styles.sendBtnDisabled]}
              onPress={handleSubmit}
              disabled={!hasContent || loading}
            >
              {loading
                ? <ActivityIndicator size="small" color="#fff" />
                : <PaperPlaneTilt color="#fff" size={18} weight="fill" />
              }
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Animated.View>
    </Modal>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    backgroundColor: colors.background.secondary,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 0.5,
    borderColor: colors.border.primary,
  },
  inner: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border.primary,
    alignSelf: 'center',
    marginBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.modules.aly + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.text.primary,
  },
  subtitle: {
    fontSize: 12,
    color: colors.text.tertiary,
    marginTop: 2,
  },
  deleteBtn: {
    padding: 4,
  },
  // ── Editor ─────────────────────────────────────────────────────────────────
  inputArea: {
    flex: 1,
    minHeight: 60,
  },
  editorScroll: {
    flex: 1,
  },
  lineRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    minHeight: 32,
    borderRadius: 4,
    marginHorizontal: -4,
    paddingHorizontal: 4,
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.text.secondary,
    marginTop: 9,
    marginRight: 8,
    flexShrink: 0,
  },
  checkboxBtn: {
    marginTop: 5,
    marginRight: 8,
    flexShrink: 0,
  },
  lineText: {
    flex: 1,
    fontSize: 15,
    color: colors.text.primary,
    lineHeight: 24,
    paddingVertical: 4,
  },
  lineHeading: {
    fontSize: 18,
    fontWeight: '500',
  },
  lineBold: {
    fontWeight: '500',
  },
  lineItalic: {
    fontStyle: 'italic',
  },
  lineChecked: {
    textDecorationLine: 'line-through',
    color: colors.text.tertiary,
  },
  // ── Color picker ───────────────────────────────────────────────────────────
  colorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  colorCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // ── Formatting toolbar ─────────────────────────────────────────────────────
  formattingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    borderTopWidth: 0.5,
    borderTopColor: colors.border.primary,
    paddingHorizontal: 8,
    gap: 4,
  },
  toolBtnFmt: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolBtnActive: {
    backgroundColor: colors.modules.aly + '20',
  },
  // ── Send bar ───────────────────────────────────────────────────────────────
  sendBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 0.5,
    borderTopColor: colors.border.primary,
    paddingTop: 10,
    paddingBottom: 8,
  },
  charCount: {
    fontSize: 11,
    color: colors.text.tertiary,
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.modules.aly,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    opacity: 0.4,
  },
})
