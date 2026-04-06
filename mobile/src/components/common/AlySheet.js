import React, { useEffect, useRef, useState } from 'react'
import {
  View,
  Text,
  Modal,
  StyleSheet,
  Animated,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Platform,
  Keyboard,
  useWindowDimensions,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Sparkle, X, ChatCircleText, ClockCounterClockwise, NotePencil } from 'phosphor-react-native'
import { colors } from '../../constants/colors'
import { ASSISTANT_NAME } from '../../constants/brand'
import { supabase } from '../../services/supabase'
import ChatTab from '../../screens/coordinator/ChatTab'
import HistoryTab from '../../screens/coordinator/HistoryTab'

const PEEK = 64

export default function AlySheet({ visible, onClose }) {
  const { height } = useWindowDimensions()
  const slideAnim = useRef(new Animated.Value(height)).current
  const bottomAnim = useRef(new Animated.Value(0)).current
  const [userId, setUserId] = useState(null)
  const [activeTab, setActiveTab] = useState('chat')
  const [sessionId, setSessionId] = useState(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id)
    })
  }, [])

  // Reset to chat tab when sheet opens
  useEffect(() => {
    if (visible) setActiveTab('chat')
  }, [visible])

  // Slide in/out
  useEffect(() => {
    if (visible) {
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
        duration: 250,
        useNativeDriver: false,
      }).start()
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

  const handleResumeSession = (sid) => {
    setSessionId(sid)
    setActiveTab('chat')
  }

  const handleNewChat = () => {
    setSessionId(null)
    setActiveTab('chat')
  }

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay} />
      </TouchableWithoutFeedback>

      <Animated.View style={[styles.sheet, { top: PEEK, bottom: bottomAnim, transform: [{ translateY: slideAnim }] }]}>
        <SafeAreaView style={styles.inner} edges={['bottom']}>
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.alyDot}>
                <Sparkle color="#fff" size={14} weight="fill" />
              </View>
              <Text style={styles.headerTitle}>{ASSISTANT_NAME}</Text>
            </View>

            <View style={styles.headerRight}>
              {/* New chat button — only show on history tab */}
              {activeTab === 'history' && (
                <TouchableOpacity
                  style={styles.newChatBtn}
                  onPress={handleNewChat}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                  <NotePencil size={16} color={colors.modules.aly} weight="light" />
                </TouchableOpacity>
              )}

              {/* Tab switcher */}
              <View style={styles.tabPill}>
                <TouchableOpacity
                  style={[styles.tabBtn, activeTab === 'chat' && styles.tabBtnActive]}
                  onPress={() => setActiveTab('chat')}
                >
                  <ChatCircleText
                    size={15}
                    color={activeTab === 'chat' ? '#fff' : colors.text.tertiary}
                    weight={activeTab === 'chat' ? 'fill' : 'light'}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.tabBtn, activeTab === 'history' && styles.tabBtnActive]}
                  onPress={() => setActiveTab('history')}
                >
                  <ClockCounterClockwise
                    size={15}
                    color={activeTab === 'history' ? '#fff' : colors.text.tertiary}
                    weight={activeTab === 'history' ? 'fill' : 'light'}
                  />
                </TouchableOpacity>
              </View>

              <TouchableOpacity onPress={onClose} hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}>
                <X color={colors.text.tertiary} size={20} weight="light" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Content */}
          <View style={styles.content}>
            {activeTab === 'chat' ? (
              userId ? (
                <ChatTab
                  userId={userId}
                  selectedSpaceIds={[]}
                  selectedHubIds={[]}
                  sessionId={sessionId}
                />
              ) : null
            ) : (
              userId ? (
                <HistoryTab
                  userId={userId}
                  onResume={handleResumeSession}
                  onNewChat={handleNewChat}
                />
              ) : null
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
    paddingHorizontal: 16,
    paddingVertical: 10,
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
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  newChatBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.modules.aly + '15',
    borderWidth: 0.5,
    borderColor: colors.modules.aly + '40',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabPill: {
    flexDirection: 'row',
    backgroundColor: colors.background.tertiary,
    borderRadius: 10,
    padding: 2,
    borderWidth: 0.5,
    borderColor: colors.border.primary,
    gap: 2,
  },
  tabBtn: {
    width: 30,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBtnActive: {
    backgroundColor: colors.modules.aly,
  },
  content: {
    flex: 1,
  },
})
