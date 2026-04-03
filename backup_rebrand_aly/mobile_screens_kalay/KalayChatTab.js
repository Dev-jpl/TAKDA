import React, { useState, useEffect, useRef } from 'react';
import { 
  View, Text, StyleSheet, FlatList, 
  TextInput, TouchableOpacity, ActivityIndicator,
  KeyboardAvoidingView, Platform, Animated, Keyboard, TouchableWithoutFeedback
} from 'react-native';
import { colors } from '../../constants/colors';
import { 
  PaperPlaneRight, Sparkle, Calendar, ArrowRight, 
  Brain, Globe, Folder, ChartBar, MagicWand, 
  ListChecks, Plus, Camera, Image, File, 
  Database, Microphone, MapPin, X
} from 'phosphor-react-native';
import { kalayService } from '../../services/kalay';
import { useNavigation } from '@react-navigation/native';
import { ICON_MAP } from '../../components/common/IconPicker';
import { supabase } from '../../services/supabase';

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
           isEvent ? 'EVENT SCHEDULED' :
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

function WelcomeView({ userName, onSelectSuggestion }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 800, useNativeDriver: true }),
    ]).start();
  }, []);

  const suggestions = [
    { id: '1', label: 'Analyze my data', icon: <ChartBar size={18} color={colors.modules.kalay} />, prompt: 'Can you analyze my tasks and hubs to see what I should focus on?' },
    { id: '2', label: 'Plan an event', icon: <MagicWand size={18} color={colors.modules.kalay} />, prompt: 'I want to plan a new event coordination. Help me break it down.' },
    { id: '3', label: 'Quiz of the day', icon: <Brain size={18} color={colors.modules.kalay} />, prompt: 'Generate a short quiz based on my stored knowledge.' },
    { id: '4', label: 'Status Report', icon: <ListChecks size={18} color={colors.modules.kalay} />, prompt: 'Give me a summary of all my active tasks and their priorities.' },
  ];

  return (
    <Animated.View style={[styles.welcomeContainer, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      <View style={styles.welcomeHeader}>
        <View style={styles.welcomeIcon}>
          <Sparkle size={32} color={colors.modules.kalay} weight="fill" />
        </View>
        <Text style={styles.welcomeGreeting}>Glad you're here, {userName || 'Agent'}!</Text>
        <Text style={styles.welcomeSub}>I'm Kalay, your event coordinator. Ready to optimize your workflow?</Text>
      </View>

      <View style={styles.suggestionGrid}>
        {suggestions.map(s => (
          <TouchableOpacity 
            key={s.id} 
            style={styles.suggestionChip}
            onPress={() => onSelectSuggestion(s.prompt)}
          >
            <View style={styles.chipIcon}>{s.icon}</View>
            <Text style={styles.chipLabel}>{s.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </Animated.View>
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

export default function KalayChatTab({ userId, sessionId, spaceIds, hubIds, onSessionCreated, onNewChat }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState(sessionId);
  const [userName, setUserName] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [actionDrawerVisible, setActionDrawerVisible] = useState(false);
  const flatListRef = useRef(null);

  useEffect(() => {
    if (userId) fetchProfile();
  }, [userId]);

  const fetchProfile = async () => {
    try {
      const { data } = await supabase.from('profiles').select('display_name').eq('id', userId).single();
      if (data?.display_name) setUserName(data.display_name.split(' ')[0]);
    } catch (e) {
      console.warn('fetchProfile error:', e);
    }
  };

  useEffect(() => {
    setActiveSessionId(sessionId);
    if (!sessionId) {
      setMessages([]);
    }
  }, [sessionId]);

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
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={{ flex: 1 }}>
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={item => item.id.toString()}
            contentContainerStyle={styles.list}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            onScrollBeginDrag={Keyboard.dismiss}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              item.streaming && item.content === '' ? null : <MessageBubble msg={item} />
            )}
            ListHeaderComponent={(!activeSessionId && messages.length === 0) ? (
              <WelcomeView userName={userName} onSelectSuggestion={setInput} />
            ) : null}
            ListFooterComponent={loading && !messages.some(m => m.streaming && m.content === '') ? <TypingIndicator /> : null}
          />
        </View>
      </TouchableWithoutFeedback>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
      >
        <View style={styles.inputContainer}>
          <View style={[styles.inputArea, isFocused && styles.inputAreaActive]}>
            <View 
              style={styles.textInputRow}
            >
              <TouchableOpacity style={styles.inlinePlusBtn} onPress={() => setActionDrawerVisible(true)}>
                <Plus size={20} color={isFocused ? colors.text.tertiary : colors.modules.kalay} weight="bold" />
              </TouchableOpacity>
              <TextInput
                style={styles.input}
                value={input}
                onChangeText={setInput}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                placeholder="Message Kalay"
                placeholderTextColor={colors.text.tertiary}
                multiline
                blurOnSubmit={false}
              />
              {!isFocused && (
                <TouchableOpacity 
                  style={[styles.smallSendBtn, !input.trim() && { opacity: 0.5 }]} 
                  onPress={handleSend}
                  disabled={!input.trim() || loading}
                >
                  <PaperPlaneRight size={18} color="#fff" weight="bold" />
                </TouchableOpacity>
              )}
            </View>

            {isFocused && (
              <View style={styles.actionRow}>
                <View style={{ flex: 1 }} />
                
                <TouchableOpacity 
                  style={[styles.smallSendBtn, !input.trim() && { opacity: 0.5 }]} 
                  onPress={handleSend}
                  disabled={!input.trim() || loading}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <PaperPlaneRight size={18} color="#fff" weight="bold" />
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
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
  inputContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: 'transparent',
  },
  inputArea: {
    padding: 8,
    paddingLeft: 12,
    backgroundColor: colors.background.tertiary + 'CC',
    borderRadius: 24,
    borderWidth: 0.5,
    borderColor: colors.border.primary + '40',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  inputAreaActive: {
    borderRadius: 16,
    paddingVertical: 12,
    backgroundColor: colors.background.secondary, // More solid when active
  },
  textInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingHorizontal: 4,
  },
  input: {
    flex: 1,
    maxHeight: 120,
    color: colors.text.primary,
    fontSize: 15,
    paddingVertical: 6,
  },
  sendBtn: {
    width: 32, // Reduced
    height: 32, // Reduced
    borderRadius: 16,
    backgroundColor: colors.modules.kalay,
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallSendBtn: {
    width: 28, // Reduced
    height: 28, // Reduced
    borderRadius: 14,
    backgroundColor: colors.modules.kalay,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  plusBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.background.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.5,
    borderColor: colors.border.primary,
  },
  inlinePlusBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  drawerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  drawerSheet: {
    backgroundColor: colors.background.secondary,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingBottom: 40,
    borderWidth: 1,
    borderColor: colors.border.primary,
  },
  drawerHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border.primary,
    alignSelf: 'center',
    marginTop: 12,
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  drawerTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.text.tertiary,
    letterSpacing: 1.5,
  },
  mediaRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    paddingBottom: 24,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border.primary,
  },
  mediaBtn: {
    alignItems: 'center',
    gap: 8,
  },
  mediaIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  drawerList: {
    paddingTop: 12,
    paddingHorizontal: 20,
  },
  drawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 16,
  },
  itemIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text.primary,
  },
  itemSub: {
    fontSize: 12,
    color: colors.text.tertiary,
  },
  welcomeContainer: {
    paddingTop: 40,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  welcomeHeader: {
    alignItems: 'center',
    marginBottom: 32,
  },
  welcomeIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.modules.kalay + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  welcomeGreeting: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 8,
    textAlign: 'center',
  },
  welcomeSub: {
    fontSize: 14,
    color: colors.text.tertiary,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 20,
  },
  suggestionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 10,
  },
  suggestionChip: {
    width: '46%',
    backgroundColor: colors.background.tertiary,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border.primary,
    alignItems: 'center',
    gap: 8,
  },
  chipIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.background.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.5,
    borderColor: colors.border.primary,
  },
  chipLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text.primary,
    textAlign: 'center',
  },
});
