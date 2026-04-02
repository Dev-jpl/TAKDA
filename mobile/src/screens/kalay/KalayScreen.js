import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../constants/colors';
import { supabase } from '../../services/supabase';
import { spacesService } from '../../services/spaces';
import KalayChatTab from './KalayChatTab';
import KalayOutputsTab from './KalayOutputsTab';
import KalayContextPicker from './KalayContextPicker';
import { Sparkle, CaretLeft } from 'phosphor-react-native';

const TABS = ['chat', 'outputs'];

export default function KalayScreen({ navigation }) {
  const [activeTab, setActiveTab] = useState('chat');
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

  return (
    <SafeAreaView style={styles.container}>
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
            <Sparkle size={18} color={colors.modules.kalay} weight="fill" />
            <Text style={styles.headerTitle}>KALAY</Text>
          </View>
        </View>
        
        <View style={styles.tabs}>
          {TABS.map(t => (
            <TouchableOpacity 
              key={t} 
              onPress={() => setActiveTab(t)}
              style={[styles.tab, activeTab === t && styles.tabActive]}
            >
              <Text style={[styles.tabLabel, activeTab === t && styles.tabLabelActive]}>
                {t.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Context Picker */}
      {activeTab === 'chat' && (
        <KalayContextPicker 
          spaces={spaces}
          selectedSpaceIds={selectedSpaceIds}
          onToggleSpace={handleToggleSpace}
          onToggleHub={handleToggleHub}
          selectedHubIds={selectedHubIds}
        />
      )}

      {/* Content */}
      <View style={styles.content}>
        {activeTab === 'chat' ? (
          <KalayChatTab 
            userId={userId} 
            sessionId={sessionId}
            onSessionCreated={setSessionId}
            spaceIds={selectedSpaceIds}
            hubIds={selectedHubIds}
          />
        ) : (
          <KalayOutputsTab userId={userId} />
        )}
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
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border.primary,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backBtn: {
    padding: 2,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text.primary,
    letterSpacing: 2,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: colors.background.secondary,
    borderRadius: 8,
    padding: 2,
    borderWidth: 0.5,
    borderColor: colors.border.primary,
  },
  tab: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  tabActive: {
    backgroundColor: colors.background.tertiary,
  },
  tabLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.text.tertiary,
    letterSpacing: 1,
  },
  tabLabelActive: {
    color: colors.modules.kalay,
  },
  content: {
    flex: 1,
  },
});
