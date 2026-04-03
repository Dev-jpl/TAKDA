import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Keyboard, Animated, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../constants/colors';
import { supabase } from '../../services/supabase';
import { spacesService } from '../../services/spaces';
import { ASSISTANT_NAME } from '../../constants/brand';
import ChatTab from './ChatTab';
import HistoryTab from './HistoryTab';
import OutputsTab from './OutputsTab';
import ContextPicker from './ContextPicker';
import { Sparkle, CaretLeft, ChatCircleText, ClockCounterClockwise, Tray, NotePencil } from 'phosphor-react-native';

const TABS = ['chat', 'history', 'outputs'];

export default function CoordinatorScreen({ navigation }) {
  const [activeTab, setActiveTab] = useState('chat');
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);
  const [userId, setUserId] = useState(null);
  const [spaces, setSpaces] = useState([]);
  
  // Context State
  const [selectedSpaceIds, setSelectedSpaceIds] = useState([]);
  const [selectedHubIds, setSelectedHubIds] = useState([]);
  const [sessionId, setSessionId] = useState(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserId(user.id);
        loadSpaces(user.id);
      }
    });

    const showSubscription = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
    const hideSubscription = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  const loadSpaces = async (uid) => {
    try {
      const data = await spacesService.getSpaces(uid);
      setSpaces(data);
    } catch (e) {
      console.warn('loadSpaces error:', e);
    }
  };

  const handleToggleSpace = (spaceId) => {
    if (spaceId === 'all') {
      setSelectedSpaceIds([]);
      setSelectedHubIds([]);
      return;
    }
    
    setSelectedSpaceIds(prev => {
      if (prev.includes(spaceId)) return prev.filter(id => id !== spaceId);
      return [...prev, spaceId];
    });
  };

  const handleToggleHub = (hubId) => {
    setSelectedHubIds(prev => {
      if (prev.includes(hubId)) return prev.filter(id => id !== hubId);
      return [...prev, hubId];
    });
  };

  const handleResumeSession = (sid) => {
    setSessionId(sid);
    setActiveTab('chat');
  };

  const handleNewChat = () => {
    setSessionId(null);
    setActiveTab('chat');
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'chat':
        return (
          <ChatTab 
            userId={userId} 
            sessionId={sessionId}
            onSessionCreated={setSessionId}
            spaceIds={selectedSpaceIds}
            hubIds={selectedHubIds}
            onNewChat={handleNewChat}
          />
        );
      case 'history':
        return (
          <HistoryTab 
            userId={userId} 
            onResume={handleResumeSession} 
            onNewChat={handleNewChat}
          />
        );
      case 'outputs':
        return <OutputsTab userId={userId} />;
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity 
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
            hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
          >
            <CaretLeft size={20} color={colors.text.tertiary} weight="bold" />
          </TouchableOpacity>
          
          <View style={styles.titleRow}>
            <Sparkle size={18} color={colors.modules.aly} weight="fill" />
            <Text style={styles.headerTitle}>{ASSISTANT_NAME.toUpperCase()}</Text>
          </View>
        </View>

        <View style={styles.headerActionsPill}>
          {TABS.map(t => {
            const isActive = activeTab === t;
            const Icon = t === 'chat' ? ChatCircleText : t === 'history' ? ClockCounterClockwise : Tray;
            return (
              <TouchableOpacity 
                key={t} 
                onPress={() => setActiveTab(t)}
                style={[styles.headerTabBtn, isActive && styles.headerTabBtnActive]}
                activeOpacity={0.7}
              >
                <Icon size={18} color={isActive ? colors.modules.aly : colors.text.tertiary} weight={isActive ? 'fill' : 'light'} />
              </TouchableOpacity>
            );
          })}
          
          <View style={styles.headerDivider} />

          <TouchableOpacity 
            style={styles.headerNewBtn} 
            onPress={handleNewChat}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            activeOpacity={0.7}
          >
            <NotePencil size={18} color={colors.modules.aly} weight="bold" />
          </TouchableOpacity> 
        </View>
      </View>

      {/* Context Picker (only for live chat) */}
      {activeTab === 'chat' && (
        <ContextPicker 
          spaces={spaces}
          selectedSpaceIds={selectedSpaceIds}
          onToggleSpace={handleToggleSpace}
          onToggleHub={handleToggleHub}
          selectedHubIds={selectedHubIds}
        />
      )}

      {/* Content */}
      <View style={styles.content}>
        {renderContent()}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text.primary,
    letterSpacing: 2,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerActionsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.tertiary,
    borderRadius: 12,
    padding: 3,
    borderWidth: 1,
    borderColor: colors.border.primary,
    gap: 2,
  },
  headerTabBtn: {
    padding: 6,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTabBtnActive: {
    backgroundColor: colors.background.secondary,
    borderWidth: 0.5,
    borderColor: colors.border.primary,
  },
  headerDivider: {
    width: 1,
    height: 14,
    backgroundColor: colors.border.primary,
    marginHorizontal: 4,
  },
  headerNewBtn: {
    width: 30,
    height: 30,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.modules.aly + '15',
  },
  content: {
    flex: 1,
  },
});
