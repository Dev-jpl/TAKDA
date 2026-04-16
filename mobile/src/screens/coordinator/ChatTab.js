import React, { useState, useEffect, useRef } from 'react';
import { 
  View, Text, StyleSheet, FlatList,
  TextInput, TouchableOpacity, ActivityIndicator,
  Platform, Animated, Keyboard, TouchableWithoutFeedback,
  Modal, ScrollView, StatusBar
} from 'react-native';
import { colors } from '../../constants/colors';
import { 
  PaperPlaneRight, Sparkle, Calendar, ArrowRight, 
  Brain, Globe, Folder, ChartBar, MagicWand, 
  ListChecks, Plus, Camera, Image, File, 
  Database, Microphone, MapPin, X, CaretRight,
  Info, Target
} from 'phosphor-react-native';
import { coordinatorService } from '../../services/coordinator';
import { ASSISTANT_NAME } from '../../constants/brand';
import { useNavigation } from '@react-navigation/native';
import { ICON_MAP } from '../../components/common/IconPicker';
import { supabase } from '../../services/supabase';
import { MarkdownRenderer } from '../../components/common/MarkdownRenderer';

function _confirmationText(actionType, label) {
  switch (actionType) {
    case 'CREATE_TASK':    return `Done! I've added "${label}" to your list.`;
    case 'UPDATE_TASK':    return `Got it, task updated.`;
    case 'CREATE_EVENT':   return `Scheduled! "${label}" is on your calendar.`;
    case 'UPDATE_EVENT':   return `Calendar updated.`;
    case 'DELETE_EVENT':   return `Event removed.`;
    case 'LOG_EXPENSE':    return `Logged! I've noted that expense.`;
    case 'LOG_FOOD':       return `Logged! Food entry saved.`;
    case 'SAVE_TO_VAULT':  return `Saved to your vault for later.`;
    case 'SAVE_REPORT':    return `Report saved!`;
    case 'CREATE_SPACE':   return `Space "${label}" created!`;
    case 'CREATE_HUB':     return `Hub "${label}" created!`;
    default:               return `Done!`;
  }
}

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
    width: 5, height: 5, borderRadius: 2.5,
    backgroundColor: colors.modules.aly,
    marginHorizontal: 2,
    opacity: anim,
  })

  return (
    <View style={styles.aiBlock}>
      <Text style={styles.aiName}>{ASSISTANT_NAME}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', height: 24, paddingLeft: 2 }}>
        <Animated.View style={dotStyle(dot1)} />
        <Animated.View style={dotStyle(dot2)} />
        <Animated.View style={dotStyle(dot3)} />
      </View>
    </View>
  )
}

function ActionCard({ action, onInteraction, userId }) {
  const navigation = useNavigation();
  const [status, setStatus] = useState(action.status || 'completed');
  const [busy, setBusy] = useState(false);

  const isProposal = action.type === 'proposal';
  const isTask = action.type === 'task_created';
  const isSpace = action.type === 'space_created';
  const isHub = action.type === 'hub_created';
  const isQuiz = action.type === 'quiz_generated';
  const isEvent = action.type === 'event_created';

  const handleConfirm = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await onInteraction(action, 'confirm');
      setStatus('confirmed');
    } catch (e) {
      console.error('Confirmation failed:', e);
    } finally {
      setBusy(false);
    }
  };

  const handleAbort = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await onInteraction(action, 'abort');
      setStatus('aborted');
    } finally {
      setBusy(false);
    }
  };

  // AI-selected icon Component
  const CustomIcon = action.icon ? ICON_MAP[action.icon] : null;
  
  return (
    <View style={[
      styles.actionCard, 
      status === 'aborted' && { opacity: 0.6, backgroundColor: colors.background.secondary }
    ]}>
      <View style={[styles.actionIcon, { backgroundColor: isProposal ? colors.modules.aly + '25' : colors.modules.aly + '15' }]}>
        {isProposal ? <MagicWand size={14} color={colors.modules.aly} weight="bold" /> :
         isTask ? <Sparkle size={14} color={colors.modules.aly} weight="bold" /> :
         isSpace ? (CustomIcon ? <CustomIcon size={14} color={colors.modules.aly} weight="bold" /> : <Globe size={14} color={colors.modules.aly} />) :
         isHub ? (CustomIcon ? <CustomIcon size={14} color={colors.modules.aly} weight="bold" /> : <Folder size={14} color={colors.modules.aly} />) :
         isQuiz ? <Brain size={14} color={colors.modules.aly} weight="bold" /> :
         isEvent ? <Calendar size={14} color={colors.modules.aly} weight="bold" /> :
         <Sparkle size={14} color={colors.modules.aly} weight="bold" />}
      </View>
      <View style={styles.actionInfo}>
        <Text style={[styles.actionStatus, isProposal && { color: colors.modules.aly }]}>
          {status === 'proposed' ? 'Proposed' :
           status === 'confirmed' ? 'Done' :
           status === 'aborted' ? 'Cancelled' :
           isTask ? 'Task created' :
           isSpace ? 'Space created' :
           isHub ? 'Hub created' :
           isQuiz ? 'Quiz ready' :
           isEvent ? 'Event scheduled' :
           'Completed'}
        </Text>
        <Text style={styles.actionLabel} numberOfLines={1}>{action.label}</Text>
        
        {isProposal && status === 'proposed' && (
          <View style={styles.proposalDetails}>
            <Text style={styles.impactSummary}>{action.impact}</Text>
            <View style={styles.proposalActions}>
              <TouchableOpacity 
                style={[styles.miniBtn, styles.miniBtnConfirm]} 
                onPress={handleConfirm}
                disabled={busy}
              >
                {busy ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.miniBtnText}>Yes, do it</Text>}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.miniBtn, styles.miniBtnAbort]}
                onPress={handleAbort}
                disabled={busy}
              >
                <Text style={[styles.miniBtnText, { color: colors.text.secondary }]}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
      
      {status === 'proposed' && !isProposal && (
         <View style={styles.actionBtn}>
           <ArrowRight size={14} color={colors.modules.aly} weight="bold" />
         </View>
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
    { id: '1', label: 'My day', icon: <Info size={18} color={colors.modules.aly} />, prompt: 'What does my day look like?' },
    { id: '2', label: 'Add task', icon: <ListChecks size={18} color={colors.modules.track} />, prompt: 'I need to add a task' },
    { id: '3', label: 'Daily briefing', icon: <ChartBar size={18} color={colors.modules.aly} />, prompt: 'Give me a quick briefing on my week' },
    { id: '4', label: 'Log something', icon: <Database size={18} color={colors.modules.annotate} />, prompt: 'I want to log something' },
    { id: '5', label: 'I need help', icon: <Sparkle size={18} color={colors.modules.aly} />, prompt: 'Help me figure out what to focus on' },
    { id: '6', label: 'Quiz me', icon: <Brain size={18} color={colors.modules.aly} />, prompt: 'Create a quiz from my notes' },
    { id: '7', label: 'Schedule event', icon: <Calendar size={18} color={colors.modules.track} />, prompt: 'I need to schedule an event' },
    { id: '8', label: 'Brainstorm', icon: <MagicWand size={18} color={colors.modules.aly} />, prompt: 'Let\'s brainstorm some new directions for my projects' },
  ];

  return (
    <Animated.View style={[styles.welcomeContainer, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      <View style={styles.welcomeHeader}>
        <View style={styles.welcomeIcon}>
          <Sparkle size={32} color={colors.modules.aly} weight="fill" />
        </View>
        <Text style={styles.welcomeGreeting}>Hey{userName ? `, ${userName}` : ''}!</Text>
        <Text style={styles.welcomeSub}>I'm {ASSISTANT_NAME}. What's on your mind?</Text>
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



function MessageBubble({ msg, onInteraction, userId }) {
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
    <View style={styles.aiBlock}>
      <Text style={styles.aiName}>{ASSISTANT_NAME}</Text>
      <View style={styles.aiContent}>
        <MarkdownRenderer content={msg.content} />

        {msg.citations?.map((cite, i) => (
          <View key={i} style={styles.citation}>
            <Text style={styles.citationText} numberOfLines={1}>
              ↗ [{cite.index}] {cite.excerpt}
            </Text>
          </View>
        ))}

        {msg.actions && msg.actions.length > 0 && (
          <View style={styles.actionsList}>
            {msg.actions.map((act, i) => (
              <ActionCard
                key={i}
                action={act}
                onInteraction={onInteraction}
                userId={userId}
              />
            ))}
          </View>
        )}
      </View>
    </View>
  )
}

export default function ChatTab({ userId, sessionId, spaceIds, hubIds, onSessionCreated, onNewChat }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState(sessionId);
  const [userName, setUserName] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [actionDrawerVisible, setActionDrawerVisible] = useState(false);
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [recommendations, setRecommendations] = useState({ spaces: [], hubs: [] });
  const [userHasScrolledUp, setUserHasScrolledUp] = useState(false);
  const flatListRef = useRef(null);

  const SLASH_COMMANDS = [
    { cmd: '/briefing', label: 'Daily briefing', text: 'Give me a quick briefing on my day.' },
    { cmd: '/focus', label: 'Help me focus', text: 'Aly, I need to focus. What are my top priorities?' },
    { cmd: '/organize', label: 'Organize my spaces', text: 'Aly, analyze my current spaces and suggest improvements.' },
    { cmd: '/clean', label: 'Clean up stale hubs', text: 'Find and clean up stale hubs.' },
    { cmd: '/schedule', label: 'Schedule an event', text: 'I need to schedule an event.' },
    { cmd: '/report', label: 'Generate a report', text: 'Aly, generate a summary report.' },
    { cmd: '/quiz', label: 'Quiz me on my notes', text: 'Create a quiz based on my notes.' },
    { cmd: '/brainstorm', label: 'Brainstorm ideas', text: 'Let\'s brainstorm some new directions for my projects.' },
  ];

  const handleInputChange = (text) => {
    setInput(text);
    if (text === '/') {
      setShowSlashMenu(true);
    } else if (showSlashMenu && !text.startsWith('/')) {
      setShowSlashMenu(false);
    }
  };

  const handleSlashSelect = (cmdObj) => {
    setInput('');
    setShowSlashMenu(false);
    handleSendDirect(cmdObj.text);
  };

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
    if (actionDrawerVisible && userId) {
      fetchRecommendations();
    }
  }, [actionDrawerVisible, userId]);

  const fetchRecommendations = async () => {
    try {
      const data = await coordinatorService.getRecommendations(userId);
      setRecommendations(data);
    } catch (e) {
      console.warn('fetchRecommendations error:', e);
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
      const data = await coordinatorService.getMessages(activeSessionId);
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
      await coordinatorService.chat({
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
          ? { ...m, content: 'Something went wrong. Please try again.', streaming: false }
          : m
      ));
    } finally {
      setLoading(false);
    }
  };

  const handleSendDirect = async (directMessage) => {
    if (loading) return;
    setLoading(true);
    
    const tempUserMsg = { id: Date.now().toString(), role: 'user', content: directMessage, created_at: new Date() };
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
      await coordinatorService.chat({
        userId,
        sessionId: activeSessionId,
        message: directMessage,
        spaceIds,
        hubIds,
        onChunk: (chunk) => {
          if (chunk.includes('|||')) {
            const parts = chunk.split('|||');
            fullText += parts[0];
            try { metadata = JSON.parse(parts[1]); } catch (e) {}
          } else { fullText += chunk; }
          setMessages(prev => prev.map(m => m.id === assistantPlaceholderId ? { ...m, content: fullText } : m));
          flatListRef.current?.scrollToEnd({ animated: true });
        }
      });
      if (metadata) {
        if (!activeSessionId && metadata.session_id) {
          setActiveSessionId(metadata.session_id);
          if (onSessionCreated) onSessionCreated(metadata.session_id);
        }
        setMessages(prev => prev.map(m => m.id === assistantPlaceholderId ? { ...m, content: fullText, actions: metadata.actions, streaming: false } : m));
      } else {
        setMessages(prev => prev.map(m => m.id === assistantPlaceholderId ? { ...m, streaming: false } : m));
      }
    } catch (e) {
      setMessages(prev => prev.map(m => m.id === assistantPlaceholderId ? { ...m, content: 'Something went wrong. Please try again.', streaming: false } : m));
    } finally {
      setLoading(false);
    }
  };

  const handleActionInteraction = async (action, type) => {
    if (type === 'abort') {
      const abortMsg = { 
        id: Date.now().toString(), 
        role: 'assistant', 
        content: '_Cancelled._',
        created_at: new Date() 
      };
      setMessages(prev => [...prev, abortMsg]);
      return;
    }

    try {
      await coordinatorService.finalizeAction(userId, action.action_type, action.data);
      const confirmMsg = {
        id: Date.now().toString(),
        role: 'assistant',
        content: _confirmationText(action.action_type, action.label),
        created_at: new Date()
      };
      setMessages(prev => [...prev, confirmMsg]);
    } catch (e) {
      console.warn('finalizeAction error:', e);
      const errMsg = {
        id: Date.now().toString(),
        role: 'assistant',
        content: "Sorry, something went wrong with that. Try again?",
        created_at: new Date()
      };
      setMessages(prev => [...prev, errMsg]);
    }
  };

  return (
    <View style={styles.container}>
      <View style={{ flex: 1 }}>
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={styles.list}
          maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
          onContentSizeChange={() => {
            if (!userHasScrolledUp) {
              // Use non-animated scroll for incremental streaming to prevent jitter
              flatListRef.current?.scrollToEnd({ animated: false });
            }
          }}
          onScroll={(event) => {
            const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
            // Determine if user is close enough to bottom to trigger auto-scroll
            const isAtBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - 40;
            if (isAtBottom && userHasScrolledUp) setUserHasScrolledUp(false);
            else if (!isAtBottom && !userHasScrolledUp) setUserHasScrolledUp(true);
          }}
          onScrollBeginDrag={Keyboard.dismiss}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            item.streaming && item.content === '' ? null : (
              <MessageBubble 
                msg={item} 
                onInteraction={handleActionInteraction} 
                userId={userId} 
              />
            )
          )}
          ListHeaderComponent={(!activeSessionId && messages.length === 0) ? (
            <WelcomeView userName={userName} onSelectSuggestion={setInput} />
          ) : null}
          ListFooterComponent={loading && !messages.some(m => m.streaming && m.content === '') ? <TypingIndicator /> : null}
        />

        <View style={styles.inputContainer}>
          {showSlashMenu && (
            <View style={styles.slashMenu}>
              {SLASH_COMMANDS.map((cmd) => (
                <TouchableOpacity 
                  key={cmd.cmd} 
                  style={styles.slashItem} 
                  onPress={() => handleSlashSelect(cmd)}
                >
                  <Text style={styles.slashCmd}>{cmd.cmd}</Text>
                  <Text style={styles.slashLabel}>{cmd.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <View style={[styles.inputArea, isFocused && styles.inputAreaActive]}>
            <View style={styles.textInputRow}>
              {!isFocused && (
                <TouchableOpacity style={styles.inlinePlusBtn} onPress={() => setActionDrawerVisible(true)}>
                  <Plus size={20} color={colors.modules.aly} weight="bold" />
                </TouchableOpacity>
              )}
                <TextInput
                style={styles.input}
                value={input}
                onChangeText={handleInputChange}
                onFocus={() => setIsFocused(true)}
                onBlur={() => {
                  setIsFocused(false);
                  setTimeout(() => setShowSlashMenu(false), 200); // Small delay to allow selection
                }}
                placeholder={`Message ${ASSISTANT_NAME}`}
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
                <TouchableOpacity style={styles.inlinePlusBtn} onPress={() => setActionDrawerVisible(true)}>
                  <Plus size={20} color={colors.modules.aly} weight="bold" />
                </TouchableOpacity>
                
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
      </View>

      {/* Action Drawer Modal */}
      <Modal
        visible={actionDrawerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setActionDrawerVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setActionDrawerVisible(false)}>
          <View style={styles.drawerOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.drawerSheet}>
                <View style={styles.drawerHandle} />
                <View style={styles.drawerHeader}>
                  <Text style={styles.drawerTitle}>ATTACHMENT / ACTION</Text>
                  <TouchableOpacity onPress={() => setActionDrawerVisible(false)}>
                    <X size={20} color={colors.text.tertiary} />
                  </TouchableOpacity>
                </View>

                <View style={styles.mediaRow}>
                  <TouchableOpacity style={styles.mediaBtn}>
                    <View style={[styles.mediaIcon, { backgroundColor: colors.modules.aly + '15' }]}>
                      <Camera size={24} color={colors.modules.aly} />
                    </View>
                    <Text style={styles.mediaLabel}>Camera</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.mediaBtn}>
                    <View style={[styles.mediaIcon, { backgroundColor: colors.modules.aly + '15' }]}>
                      <Image size={24} color={colors.modules.aly} />
                    </View>
                    <Text style={styles.mediaLabel}>Image</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.mediaBtn}>
                    <View style={[styles.mediaIcon, { backgroundColor: colors.modules.aly + '15' }]}>
                      <File size={24} color={colors.modules.aly} />
                    </View>
                    <Text style={styles.mediaLabel}>File</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.drawerList}>
                   <Text style={[styles.drawerTitle, { marginBottom: 8, marginTop: 10, paddingHorizontal: 20 }]}>CORE CAPABILITIES</Text>
                   <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.drawerGrid}>
                     <TouchableOpacity 
                       style={styles.drawerGridItem}
                       onPress={() => {
                         setActionDrawerVisible(false);
                         handleSendDirect("I need to schedule a new event.");
                       }}
                     >
                       <View style={[styles.itemIcon, { backgroundColor: colors.modules.track + '15' }]}>
                         <Calendar size={18} color={colors.modules.track} />
                       </View>
                       <View style={styles.itemInfo}>
                         <Text style={styles.itemName}>Schedule</Text>
                         <Text style={styles.itemSub}>Coordinate events</Text>
                       </View>
                     </TouchableOpacity>

                     <TouchableOpacity 
                       style={styles.drawerGridItem}
                       onPress={() => {
                         setActionDrawerVisible(false);
                         handleSendDirect("Generate a detailed summary report.");
                       }}
                     >
                       <View style={[styles.itemIcon, { backgroundColor: colors.modules.aly + '15' }]}>
                         <ChartBar size={18} color={colors.modules.aly} />
                       </View>
                       <View style={styles.itemInfo}>
                         <Text style={styles.itemName}>Report</Text>
                         <Text style={styles.itemSub}>Analyze progress</Text>
                       </View>
                     </TouchableOpacity>

                     <TouchableOpacity 
                       style={styles.drawerGridItem}
                       onPress={() => {
                         setActionDrawerVisible(false);
                         handleSendDirect("Create a quiz based on my notes.");
                       }}
                     >
                       <View style={[styles.itemIcon, { backgroundColor: colors.modules.aly + '15' }]}>
                         <Brain size={18} color={colors.modules.aly} />
                       </View>
                       <View style={styles.itemInfo}>
                         <Text style={styles.itemName}>Quiz</Text>
                         <Text style={styles.itemSub}>Notes to cards</Text>
                       </View>
                     </TouchableOpacity>
                   </ScrollView>

                   <Text style={[styles.drawerTitle, { marginBottom: 8, marginTop: 24, paddingHorizontal: 20 }]}>Quick actions</Text>
                   <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.drawerGrid}>
                     <TouchableOpacity
                       style={styles.drawerGridItem}
                       onPress={() => {
                         setActionDrawerVisible(false);
                         handleSendDirect("Give me a quick briefing on my day.");
                       }}
                     >
                       <View style={[styles.itemIcon, { backgroundColor: colors.modules.aly + '15' }]}>
                         <Info size={18} color={colors.modules.aly} />
                       </View>
                       <View style={styles.itemInfo}>
                         <Text style={styles.itemName}>Daily briefing</Text>
                         <Text style={styles.itemSub}>What's on today</Text>
                       </View>
                     </TouchableOpacity>

                     <TouchableOpacity 
                       style={styles.drawerGridItem}
                       onPress={() => {
                         setActionDrawerVisible(false);
                         handleSendDirect("Aly, analyze my current spaces and suggest optimizations.");
                       }}
                     >
                       <View style={[styles.itemIcon, { backgroundColor: colors.modules.deliver + '15' }]}>
                         <MagicWand size={18} color={colors.modules.deliver} />
                       </View>
                       <View style={styles.itemInfo}>
                         <Text style={styles.itemName}>Architect</Text>
                         <Text style={styles.itemSub}>Structure audit</Text>
                       </View>
                     </TouchableOpacity>

                     <TouchableOpacity 
                       style={styles.drawerGridItem}
                       onPress={() => {
                         setActionDrawerVisible(false);
                         handleSendDirect("Find and clean up stale hubs.");
                       }}
                     >
                       <View style={[styles.itemIcon, { backgroundColor: colors.modules.annotate + '15' }]}>
                         <Database size={18} color={colors.modules.annotate} />
                       </View>
                       <View style={styles.itemInfo}>
                         <Text style={styles.itemName}>Cleanup</Text>
                         <Text style={styles.itemSub}>Inactive zones</Text>
                       </View>
                     </TouchableOpacity>

                     <TouchableOpacity 
                       style={styles.drawerGridItem}
                       onPress={() => {
                         setActionDrawerVisible(false);
                         handleSendDirect("Aly, I need to focus. What are my top priorities?");
                       }}
                     >
                       <View style={[styles.itemIcon, { backgroundColor: colors.modules.track + '15' }]}>
                         <Target size={18} color={colors.modules.track} />
                       </View>
                       <View style={styles.itemInfo}>
                         <Text style={styles.itemName}>Focus</Text>
                         <Text style={styles.itemSub}>Priority guard</Text>
                       </View>
                     </TouchableOpacity>
                   </ScrollView>

                   <Text style={[styles.drawerTitle, { marginBottom: 8, marginTop: 24, paddingHorizontal: 20 }]}>COGNITIVE TOOLS</Text>
                   <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.drawerGrid}>
                     <TouchableOpacity 
                       style={styles.drawerGridItem}
                       onPress={() => {
                         setActionDrawerVisible(false);
                         handleSendDirect("Aly, let's brainstorm some new directions for my projects.");
                       }}
                     >
                       <View style={[styles.itemIcon, { backgroundColor: colors.modules.aly + '20' }]}>
                         <Sparkle size={18} color={colors.modules.aly} />
                       </View>
                       <View style={styles.itemInfo}>
                         <Text style={styles.itemName}>Brainstorm</Text>
                         <Text style={styles.itemSub}>Ideation mode</Text>
                       </View>
                     </TouchableOpacity>
                   </ScrollView>

                   <Text style={[styles.drawerTitle, { marginBottom: 12, marginTop: 32, paddingHorizontal: 20 }]}>QUICK CONTEXT</Text>
                   <View style={{ paddingHorizontal: 20 }}>
                     {recommendations.spaces.map(s => (
                       <TouchableOpacity 
                         key={s.id} 
                         style={styles.drawerItem}
                         onPress={() => {
                           setActionDrawerVisible(false);
                           onNewChat([s.id], []);
                         }}
                       >
                         <View style={[styles.itemIcon, { backgroundColor: colors.modules.aly + '10' }]}>
                           {s.icon && ICON_MAP[s.icon] ? React.createElement(ICON_MAP[s.icon], { size: 20, color: colors.modules.aly }) : <Globe size={20} color={colors.modules.aly} />}
                         </View>
                         <View style={styles.itemInfo}>
                           <Text style={styles.itemName}>{s.name}</Text>
                           <Text style={styles.itemSub}>Switch to this space</Text>
                         </View>
                         <CaretRight size={14} color={colors.text.tertiary} />
                       </TouchableOpacity>
                     ))}
                   </View>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  list: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
    gap: 24,
  },
  userRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  userBubble: {
    backgroundColor: colors.background.secondary,
    borderRadius: 18,
    borderBottomRightRadius: 4,
    borderWidth: 0.5,
    borderColor: colors.border.primary,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxWidth: '80%',
  },
  userText: {
    color: colors.text.primary,
    fontSize: 15,
    lineHeight: 22,
  },
  aiBlock: {
    gap: 6,
  },
  aiName: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.modules.aly,
    letterSpacing: 0.3,
  },
  aiContent: {
    gap: 4,
  },
  citation: {
    backgroundColor: colors.modules.aly + '15',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  citationText: {
    fontSize: 11,
    color: colors.modules.aly,
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
    color: colors.modules.aly,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  actionLabel: {
    fontSize: 11,
    color: colors.text.primary,
    fontWeight: '500',
  },
  proposalDetails: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 0.5,
    borderTopColor: colors.border.primary + '40',
  },
  impactSummary: {
    fontSize: 10,
    color: colors.text.tertiary,
    fontStyle: 'italic',
    marginBottom: 8,
    lineHeight: 14,
  },
  proposalActions: {
    flexDirection: 'row',
    gap: 8,
  },
  miniBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.5,
  },
  miniBtnConfirm: {
    backgroundColor: colors.modules.aly,
    borderColor: colors.modules.aly,
  },
  miniBtnAbort: {
    backgroundColor: colors.background.secondary,
    borderColor: colors.border.primary,
  },
  miniBtnText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.5,
  },
  slashMenu: {
    backgroundColor: colors.background.secondary,
    borderRadius: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border.primary,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: { elevation: 4 },
    }),
  },
  slashItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border.primary,
    gap: 12,
  },
  slashCmd: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.modules.aly,
    width: 80,
  },
  slashLabel: {
    fontSize: 13,
    color: colors.text.secondary,
    flex: 1,
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
    backgroundColor: colors.modules.aly,
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallSendBtn: {
    width: 28, // Reduced
    height: 28, // Reduced
    borderRadius: 14,
    backgroundColor: colors.modules.aly,
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
  drawerGrid: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
    paddingRight: 20, // Extra padding for horizontal scroll
  },
  drawerGridItem: {
    width: 130, // Fixed width for horizontal carousel
    backgroundColor: colors.background.tertiary,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border.primary,
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 10,
  },
  itemIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemInfo: {
    flex: 0,
  },
  itemName: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text.primary,
  },
  itemSub: {
    fontSize: 10,
    color: colors.text.tertiary,
    marginTop: 2,
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
    backgroundColor: colors.modules.aly + '15',
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
    width: 36, height: 36, borderRadius: 12,
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
