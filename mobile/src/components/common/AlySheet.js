import React, { useEffect, useRef, useState } from 'react'
import {
  View,
  Text,
  Modal,
  StyleSheet,
  Animated,
  TouchableOpacity,
  TouchableWithoutFeedback,
  useWindowDimensions,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Sparkle, X } from 'phosphor-react-native'
import { colors } from '../../constants/colors'
import { ASSISTANT_NAME } from '../../constants/brand'
import { supabase } from '../../services/supabase'
import ChatTab from '../../screens/coordinator/ChatTab'

export default function AlySheet({ visible, onClose }) {
  const { height } = useWindowDimensions()
  const slideAnim = useRef(new Animated.Value(height)).current
  const [userId, setUserId] = useState(null)

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
      }).start()
    } else {
      Animated.timing(slideAnim, {
        toValue: height,
        duration: 250,
        useNativeDriver: true,
      }).start()
    }
  }, [visible])

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay} />
      </TouchableWithoutFeedback>

      <Animated.View style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}>
        <SafeAreaView style={styles.inner} edges={['bottom']}>
          {/* Handle */}
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.alyDot}>
                <Sparkle color="#fff" size={14} weight="fill" />
              </View>
              <Text style={styles.headerTitle}>{ASSISTANT_NAME}</Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}>
              <X color={colors.text.tertiary} size={20} weight="light" />
            </TouchableOpacity>
          </View>

          {/* Chat */}
          <View style={styles.chatArea}>
            {userId && (
              <ChatTab
                userId={userId}
                selectedSpaceIds={[]}
                selectedHubIds={[]}
                sessionId={null}
              />
            )}
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
    bottom: 0,
    left: 0,
    right: 0,
    height: '65%',
    backgroundColor: colors.background.secondary,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 0.5,
    borderColor: colors.border.primary,
  },
  inner: {
    flex: 1,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border.primary,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border.primary,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  alyDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.modules.aly,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.text.primary,
  },
  chatArea: {
    flex: 1,
  },
})
