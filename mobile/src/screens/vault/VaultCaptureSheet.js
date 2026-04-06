import React, { useRef, useState, useEffect } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Animated,
  Platform,
  ActivityIndicator,
  useWindowDimensions,
  Keyboard,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { X, PaperPlaneTilt, Camera, Microphone, Link, Tray } from 'phosphor-react-native'
import { colors } from '../../constants/colors'
import { vaultService } from '../../services/vault'
import { supabase } from '../../services/supabase'

const PEEK = 64

export default function VaultCaptureSheet({ visible, onClose, onCapture }) {
  const { height } = useWindowDimensions()
  const slideAnim = useRef(new Animated.Value(height)).current
  const bottomAnim = useRef(new Animated.Value(0)).current
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [userId, setUserId] = useState(null)
  const inputRef = useRef(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id)
    })
  }, [])

  // Slide in/out
  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: false,
        damping: 20,
        stiffness: 200,
      }).start(() => inputRef.current?.focus())
    } else {
      Keyboard.dismiss()
      bottomAnim.setValue(0)
      Animated.timing(slideAnim, {
        toValue: height,
        duration: 250,
        useNativeDriver: false,
      }).start()
      setText('')
    }
  }, [visible])

  // Shrink sheet to fit between PEEK and keyboard top
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

  const handleSubmit = async () => {
    if (!text.trim() || !userId) return
    setLoading(true)
    try {
      await vaultService.createItem(userId, text.trim(), 'text')
      setText('')
      onCapture?.()
      onClose()
    } catch (e) {
      console.warn('VaultCapture error:', e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose} />

      <Animated.View style={[styles.sheet, { top: PEEK, bottom: bottomAnim, transform: [{ translateY: slideAnim }] }]}>
        <SafeAreaView style={styles.inner} edges={['bottom']}>
          <View style={styles.handle} />

          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.iconWrap}>
                <Tray color={colors.modules.aly} size={16} weight="light" />
              </View>
              <View>
                <Text style={styles.title}>Dump to Vault</Text>
                <Text style={styles.subtitle}>Capture anything — sort it later</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}>
              <X color={colors.text.tertiary} size={20} weight="light" />
            </TouchableOpacity>
          </View>

          <View style={styles.inputArea}>
            <TextInput
              ref={inputRef}
              style={styles.input}
              placeholder="What's on your mind? A link, idea, note, task…"
              placeholderTextColor={colors.text.tertiary}
              value={text}
              onChangeText={setText}
              multiline
              maxLength={2000}
              autoFocus={false}
              textAlignVertical="top"
            />
          </View>

          <View style={styles.toolbar}>
            <View style={styles.toolbarLeft}>
              <TouchableOpacity style={styles.toolBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Camera color={colors.text.tertiary} size={20} weight="light" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.toolBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Microphone color={colors.text.tertiary} size={20} weight="light" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.toolBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Link color={colors.text.tertiary} size={20} weight="light" />
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={[styles.sendBtn, (!text.trim() || loading) && styles.sendBtnDisabled]}
              onPress={handleSubmit}
              disabled={!text.trim() || loading}
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
  inputArea: {
    flex: 1,
    marginBottom: 12,
    minHeight: 60,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: colors.text.primary,
    lineHeight: 24,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 0.5,
    borderTopColor: colors.border.primary,
    paddingTop: 12,
    paddingBottom: 8,
  },
  toolbarLeft: {
    flexDirection: 'row',
    gap: 20,
  },
  toolBtn: {
    padding: 4,
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
