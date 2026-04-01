import React, { useState, useRef, useEffect } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  FlatList, StyleSheet, Animated,
  KeyboardAvoidingView, Platform,
} from 'react-native'
import { knowledgeService } from '../../services/knowledge'
import { colors } from '../../constants/colors'

function MessageBubble({ msg }) {
  const isUser = msg.role === 'user'

  if (isUser) {
    return (
      <View style={styles.userRow}>
        <View style={styles.userBubble}>
          <Text style={styles.userText}>{msg.content}</Text>
        </View>
      </View>
    )
  }

  return (
    <View style={styles.aiRow}>
      <View style={styles.aiAvatar}>
        <View style={styles.aiAvatarDot} />
      </View>
      <View style={styles.aiBubble}>
        <Text style={styles.aiText}>{msg.content}</Text>
        {msg.citations?.map((cite, i) => (
          <View key={i} style={styles.citation}>
            <Text style={styles.citationText} numberOfLines={1}>
              ↗ [{cite.index}] {cite.excerpt}
            </Text>
          </View>
        ))}
      </View>
    </View>
  )
}

function EmptyState({ hasDocs }) {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyTitle}>
        {hasDocs ? 'Ask anything' : 'No sources yet'}
      </Text>
      <Text style={styles.emptyHint}>
        {hasDocs
          ? 'Your documents are ready. Ask questions and get cited answers.'
          : 'Add a PDF or URL first, then ask questions across your sources.'}
      </Text>
    </View>
  )
}

function TypingIndicator() {
  const dot1 = useRef(new Animated.Value(0)).current
  const dot2 = useRef(new Animated.Value(0)).current
  const dot3 = useRef(new Animated.Value(0)).current
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => setElapsed(s => s + 1), 1000)
    const pulse = (dot, delay) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0, duration: 300, useNativeDriver: true }),
          Animated.delay(600 - delay),
        ])
      ).start()
    pulse(dot1, 0)
    pulse(dot2, 200)
    pulse(dot3, 400)
    return () => clearInterval(timer)
  }, [])

  const dotStyle = (anim) => ({
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: colors.modules.knowledge,
    marginHorizontal: 2,
    opacity: anim,
  })

  return (
    <View style={typingStyles.row}>
      <View style={typingStyles.avatar}>
        <View style={typingStyles.avatarDot} />
      </View>
      <View style={typingStyles.bubble}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Animated.View style={dotStyle(dot1)} />
          <Animated.View style={dotStyle(dot2)} />
          <Animated.View style={dotStyle(dot3)} />
          <Text style={typingStyles.timer}>{elapsed}s</Text>
        </View>
      </View>
    </View>
  )
}

const typingStyles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingBottom: 8, alignItems: 'center' },
  avatar: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.modules.knowledge + '20', borderWidth: 0.5, borderColor: colors.modules.knowledge + '40', alignItems: 'center', justifyContent: 'center' },
  avatarDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.modules.knowledge },
  bubble: { backgroundColor: colors.background.secondary, borderRadius: 12, padding: 10, borderWidth: 0.5, borderColor: colors.border.primary },
  timer: { fontSize: 11, color: colors.text.tertiary, marginLeft: 6 },
})

export default function KnowledgeChatTab({ userId, spaceId, docs }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const listRef = useRef(null)

  const sendMessage = async () => {
    const text = input.trim()
    if (!text || loading) return

    const userMsg = { role: 'user', content: text }
    const newMessages = [...messages, userMsg]

    setMessages(newMessages)
    setInput('')
    setLoading(true)

    try {
      const response = await knowledgeService.chat(userId, spaceId, newMessages)
      const aiMsg = {
        role: 'assistant',
        content: response.answer,
        citations: response.citations || [],
      }
      setMessages(prev => [...prev, aiMsg])
    } catch (e) {
      const errMsg = {
        role: 'assistant',
        content: 'Something went wrong. Please try again.',
        citations: [],
      }
      setMessages(prev => [...prev, errMsg])
    } finally {
      setLoading(false)
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100)
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={120}
    >
      {messages.length === 0 ? (
        <EmptyState hasDocs={docs.length > 0} />
      ) : (
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(_, i) => String(i)}
          contentContainerStyle={styles.messageList}
          renderItem={({ item }) => <MessageBubble msg={item} />}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        />
      )}

      {loading && <TypingIndicator />}

      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder={docs.length > 0 ? 'Ask across your sources…' : 'Add a source first…'}
          placeholderTextColor={colors.text.tertiary}
          multiline
          editable={docs.length > 0}
          onSubmitEditing={sendMessage}
          returnKeyType="send"
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!input.trim() || loading) && styles.sendBtnDisabled]}
          onPress={sendMessage}
          disabled={!input.trim() || loading}
        >
          <Text style={styles.sendIcon}>↑</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  messageList: {
    padding: 16,
    gap: 12,
    paddingBottom: 8,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text.secondary,
  },
  emptyHint: {
    fontSize: 13,
    color: colors.text.tertiary,
    textAlign: 'center',
    lineHeight: 20,
  },
  userRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 10,
  },
  userBubble: {
    backgroundColor: colors.modules.knowledge + '20',
    borderRadius: 16,
    borderBottomRightRadius: 4,
    borderWidth: 0.5,
    borderColor: colors.modules.knowledge + '40',
    padding: 10,
    maxWidth: '78%',
  },
  userText: {
    color: colors.modules.knowledge,
    fontSize: 14,
    lineHeight: 20,
  },
  aiRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
    alignItems: 'flex-start',
  },
  aiAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.modules.knowledge + '20',
    borderWidth: 0.5,
    borderColor: colors.modules.knowledge + '40',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    flexShrink: 0,
  },
  aiAvatarDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.modules.knowledge,
  },
  aiBubble: {
    backgroundColor: colors.background.secondary,
    borderRadius: 4,
    borderTopRightRadius: 16,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    borderWidth: 0.5,
    borderColor: colors.border.primary,
    padding: 10,
    flex: 1,
    gap: 6,
  },
  aiText: {
    color: colors.text.primary,
    fontSize: 14,
    lineHeight: 20,
  },
  citation: {
    backgroundColor: colors.modules.knowledge + '15',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  citationText: {
    fontSize: 11,
    color: colors.modules.knowledge,
  },
  typingRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 8,
    alignItems: 'center',
  },
  typingBubble: {
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    padding: 10,
    borderWidth: 0.5,
    borderColor: colors.border.primary,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    padding: 12,
    borderTopWidth: 0.5,
    borderTopColor: colors.border.primary,
    backgroundColor: colors.background.primary,
  },
  input: {
    flex: 1,
    backgroundColor: colors.background.secondary,
    borderRadius: 20,
    borderWidth: 0.5,
    borderColor: colors.border.primary,
    paddingHorizontal: 14,
    paddingVertical: 9,
    color: colors.text.primary,
    fontSize: 14,
    maxHeight: 100,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.modules.knowledge,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    opacity: 0.35,
  },
  sendIcon: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
})