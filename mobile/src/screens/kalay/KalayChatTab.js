import React, { useState, useEffect, useRef } from 'react';
import { 
  View, Text, StyleSheet, FlatList, 
  TextInput, TouchableOpacity, ActivityIndicator,
  KeyboardAvoidingView, Platform, Animated
} from 'react-native';
import { colors } from '../../constants/colors';
import { PaperPlaneRight, Sparkle, Calendar, ArrowRight, Brain, Globe, Folder } from 'phosphor-react-native';
import { kalayService } from '../../services/kalay';
import { useNavigation } from '@react-navigation/native';
import { ICON_MAP } from '../../components/common/IconPicker';

function TypingIndicator() {
  const dot1 = useRef(new Animated.Value(0)).current
  const dot2 = useRef(new Animated.Value(0)).current
  const dot3 = useRef(new Animated.Value(0)).current

  useEffect(() => {
    const pulse = (dot, delay) => {
      const anim = Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0, duration: 300, useNativeDriver: true }),
          Animated.delay(600 - delay),
        ])
      )
      anim.start()
      return anim
    }

    const a1 = pulse(dot1, 0)
    const a2 = pulse(dot2, 200)
    const a3 = pulse(dot3, 400)

    return () => {
      a1.stop()
      a2.stop()
      a3.stop()
    }
  }, [])

  const dotStyle = (anim) => ({
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: colors.modules.kalay,
    marginHorizontal: 2,
    opacity: anim,
  })

  return (
    <View style={styles.aiRow}>
      <View style={styles.aiAvatar}>
        <View style={styles.aiAvatarDot} />
      </View>
      <View style={styles.aiBubble}>
        <View style={{ flexDirection: 'row', alignItems: 'center', height: 20 }}>
          <Animated.View style={dotStyle(dot1)} />
          <Animated.View style={dotStyle(dot2)} />
          <Animated.View style={dotStyle(dot3)} />
        </View>
      </View>
    </View>
  )
}

function ActionCard({ action }) {
  const navigation = useNavigation();
  const isTask = action.type === 'task_created';
  const isSpace = action.type === 'space_created';
  const isHub = action.type === 'hub_created';
  const isQuiz = action.type === 'quiz_generated';
  const isEvent = action.type === 'event_created';

  // AI-selected icon Component
  const CustomIcon = action.icon ? ICON_MAP[action.icon] : null;
  
  return (
    <View style={styles.actionCard}>
      <View style={[styles.actionIcon, { backgroundColor: colors.modules.kalay + '15' }]}>
        {isTask ? <Sparkle size={14} color={colors.modules.kalay} weight="bold" /> :
         isSpace ? (CustomIcon ? <CustomIcon size={14} color={colors.modules.kalay} weight="bold" /> : <Globe size={14} color={colors.modules.kalay} />) :
         isHub ? (CustomIcon ? <CustomIcon size={14} color={colors.modules.kalay} weight="bold" /> : <Folder size={14} color={colors.modules.kalay} />) :
         isQuiz ? <Brain size={14} color={colors.modules.kalay} weight="bold" /> :
         isEvent ? <Calendar size={14} color={colors.modules.kalay} weight="bold" /> :
         <Sparkle size={14} color={colors.modules.kalay} weight="bold" />}
      </View>
      <View style={styles.actionInfo}>
        <Text style={styles.actionStatus}>
          {isTask ? 'TASK INITIALIZED' : 
           isSpace ? 'SPACE CONSTRUCTED' : 
           isHub ? 'HUB ACTIVATED' :
           isQuiz ? 'QUIZ GENERATED' :
           isEvent ? 'MISSION SCHEDULED' :
           'OUTPUT SECURED'}
        </Text>
        <Text style={styles.actionLabel} numberOfLines={1}>{action.label}</Text>
      </View>
      {isQuiz && (
        <TouchableOpacity 
          style={styles.actionBtn}
          onPress={() => navigation.navigate('KalayQuiz', { quizId: action.id })}
        >
        </TouchableOpacity>
      )}
      {isEvent && (
        <TouchableOpacity 
          style={styles.actionBtn}
          onPress={() => navigation.navigate('Calendar')}
        >
          <ArrowRight size={14} color={colors.modules.kalay} weight="bold" />
        </TouchableOpacity>
      )}
    </View>
  );
}

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

        {msg.actions && msg.actions.length > 0 && (
          <View style={styles.actionsList}>
            {msg.actions.map((act, i) => <ActionCard key={i} action={act} />)}
          </View>
        )}
      </View>
    </View>
  )
}

export default function KalayChatTab({ userId, sessionId, spaceIds, hubIds, onSessionCreated }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState(sessionId);
  const flatListRef = useRef(null);

  useEffect(() => {
    if (activeSessionId) loadMessages();
  }, [activeSessionId]);

  const loadMessages = async () => {
    try {
      const data = await kalayService.getMessages(activeSessionId);
      setMessages(data);
    } catch (e) {
      console.warn('loadMessages error:', e);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const msg = input.trim();
    setInput('');
    setLoading(true);

    const tempUserMsg = { id: Date.now().toString(), role: 'user', content: msg, created_at: new Date() };
    const assistantPlaceholderId = (Date.now() + 1).toString();
    const tempAssistantMsg = { 
      id: assistantPlaceholderId, 
      role: 'assistant', 
      content: '', 
      streaming: true,
      created_at: new Date() 
    };
    
    setMessages(prev => [...prev, tempUserMsg, tempAssistantMsg]);

    let fullText = "";
    let metadata = null;

    try {
      await kalayService.chat({
        userId,
        sessionId: activeSessionId,
        message: msg,
        spaceIds,
        hubIds,
        onChunk: (chunk) => {
          if (chunk.includes('|||')) {
            const parts = chunk.split('|||');
            fullText += parts[0];
            try {
              metadata = JSON.parse(parts[1]);
            } catch (e) {
              console.warn('Metadata parse error:', e);
            }
          } else {
            fullText += chunk;
          }

          setMessages(prev => prev.map(m => 
            m.id === assistantPlaceholderId ? { ...m, content: fullText } : m
          ));
          flatListRef.current?.scrollToEnd({ animated: true });
        }
      });

      if (metadata) {
        if (!activeSessionId && metadata.session_id) {
          setActiveSessionId(metadata.session_id);
          if (onSessionCreated) onSessionCreated(metadata.session_id);
        }

        setMessages(prev => prev.map(m => 
          m.id === assistantPlaceholderId 
            ? { ...m, content: fullText, actions: metadata.actions, streaming: false } 
            : m
        ));
      } else {
        setMessages(prev => prev.map(m => 
          m.id === assistantPlaceholderId 
            ? { ...m, streaming: false } 
            : m
        ));
      }
    } catch (e) {
      console.error('Chat error:', e);
      setMessages(prev => prev.map(m => 
        m.id === assistantPlaceholderId 
          ? { ...m, content: 'Calibration failed. Please retry.', streaming: false } 
          : m
      ));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={styles.list}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        renderItem={({ item }) => (
          item.streaming && item.content === '' ? null : <MessageBubble msg={item} />
        )}
        ListFooterComponent={loading && !messages.some(m => m.streaming && m.content === '') ? <TypingIndicator /> : null}
      />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={100}>
        <View style={styles.inputArea}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="Coordinate with Kalay..."
            placeholderTextColor={colors.text.tertiary}
            multiline
          />
          <TouchableOpacity 
            style={[styles.sendBtn, !input.trim() && { opacity: 0.5 }]} 
            onPress={handleSend}
            disabled={!input.trim() || loading}
          >
            {loading ? <ActivityIndicator size="small" color="#fff" /> : <PaperPlaneRight size={20} color="#fff" weight="bold" />}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  list: {
    padding: 16,
    gap: 12,
    paddingBottom: 24,
  },
  userRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 4,
  },
  userBubble: {
    backgroundColor: colors.modules.kalay + '20',
    borderRadius: 16,
    borderBottomRightRadius: 4,
    borderWidth: 0.5,
    borderColor: colors.modules.kalay + '40',
    padding: 10,
    maxWidth: '85%',
  },
  userText: {
    color: colors.modules.kalay,
    fontSize: 14,
    lineHeight: 20,
  },
  aiRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 4,
    alignItems: 'flex-start',
  },
  aiAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.modules.kalay + '20',
    borderWidth: 0.5,
    borderColor: colors.modules.kalay + '40',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    flexShrink: 0,
  },
  aiAvatarDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.modules.kalay,
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
    backgroundColor: colors.modules.kalay + '15',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  citationText: {
    fontSize: 11,
    color: colors.modules.kalay,
  },
  actionsList: {
    marginTop: 8,
    gap: 8,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.tertiary,
    borderRadius: 10,
    padding: 8,
    borderWidth: 0.5,
    borderColor: colors.border.primary,
  },
  actionIcon: {
    width: 24, // Smaller for inline feel
    height: 24,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  actionInfo: {
    flex: 1,
  },
  actionStatus: {
    fontSize: 7,
    fontWeight: '800',
    color: colors.modules.kalay,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  actionLabel: {
    fontSize: 11,
    color: colors.text.primary,
    fontWeight: '500',
  },
  inputArea: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    paddingHorizontal: 20,
    borderTopWidth: 0.5,
    borderTopColor: colors.border.primary,
    backgroundColor: colors.background.primary,
    gap: 12,
  },
  input: {
    flex: 1,
    maxHeight: 100,
    backgroundColor: colors.background.secondary,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: colors.text.primary,
    fontSize: 14,
    borderWidth: 0.5,
    borderColor: colors.border.primary,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.modules.kalay,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
