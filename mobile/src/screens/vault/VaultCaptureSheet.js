import React, { useRef, useState, useEffect } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Animated,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { X, PaperPlaneTilt, Camera, Microphone, Link } from 'phosphor-react-native'
import { colors } from '../../constants/colors'
import { vaultService } from '../../services/vault'
import { supabase } from '../../services/supabase'

export default function VaultCaptureSheet({ visible, onClose, onCapture }) {
  const slideAnim = useRef(new Animated.Value(300)).current
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [userId, setUserId] = useState(null)
  const inputRef = useRef(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id)
    })
  }, [])

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        damping: 20,
        stiffness: 200,
      }).start(() => inputRef.current?.focus())
    } else {
      Animated.timing(slideAnim, {
        toValue: 300,
        duration: 200,
        useNativeDriver: true,
      }).start()
      setText('')
    }
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

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.kavWrapper}
        pointerEvents="box-none"
      >
        <Animated.View style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}>
          <SafeAreaView style={styles.inner} edges={['bottom']}>
            <View style={styles.handle} />

            <View style={styles.header}>
              <Text style={styles.title}>Dump to Vault</Text>
              <TouchableOpacity onPress={onClose} hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}>
                <X color={colors.text.tertiary} size={20} weight="light" />
              </TouchableOpacity>
            </View>

            <View style={styles.inputRow}>
              <TextInput
                ref={inputRef}
                style={styles.input}
                placeholder="Anything on your mind..."
                placeholderTextColor={colors.text.tertiary}
                value={text}
                onChangeText={setText}
                multiline
                maxLength={2000}
                autoFocus={false}
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
    marginBottom: 16,
  },
  title: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.text.primary,
  },
  inputRow: {
    minHeight: 80,
    maxHeight: 160,
    marginBottom: 12,
  },
  input: {
    fontSize: 15,
    color: colors.text.primary,
    lineHeight: 22,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 8,
  },
  toolbarLeft: {
    flexDirection: 'row',
    gap: 16,
  },
  toolBtn: {
    padding: 4,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.modules.aly,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    opacity: 0.4,
  },
})
