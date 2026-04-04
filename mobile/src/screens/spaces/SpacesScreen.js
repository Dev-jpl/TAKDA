import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  Platform,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { useFocusEffect, DrawerActions } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { List, Plus, Binoculars, ChartLineUp, Database, Sparkle, MagnifyingGlass } from 'phosphor-react-native';
import { colors } from '../../constants/colors';
import { spacesService } from '../../services/spaces';
import { hubsService } from '../../services/hubs';
import { eventService } from '../../services/events';
import SpaceIcon from '../../components/common/SpaceIcon';
import AssistantFAB from '../../components/common/AssistantFAB';

const { width } = Dimensions.get('window');
const COLUMN_WIDTH = (width - 48) / 2;

function StatCard({ label, value, icon: Icon, color }) {
  return (
    <View style={styles.statCard}>
      <Icon size={12} color={color} weight="duotone" style={{ marginRight: 4 }} />
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export default function SpacesScreen({ navigation }) {
  const [spaces, setSpaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({
    domains: 0,
    hubs: 0,
    iq: 0,
    velocity: 0
  });

  // High-Fidelity Management State
  const [editingSpace, setEditingSpace] = useState(null)
  const [newSpaceName, setNewSpaceName] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  const loadData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const u = (await import('../../services/supabase')).supabase.auth.getUser();
      const userData = (await u).data.user;
      if (!userData) return;

      const spacesData = await spacesService.getSpaces(userData.id);
      setSpaces(spacesData);

      // Aggregate high-fidelity stats
      const totalHubs = spacesData.reduce((acc, s) => acc + (s.hubs?.length || 0), 0);
      const eventsData = await eventService.getEvents(userData.id);
      const upcoming = eventsData.filter(e => new Date(e.start_time) > new Date()).length;

      setStats({
        domains: spacesData.length,
        hubs: totalHubs,
        iq: totalHubs * 12 + spacesData.length * 5, // Representational IQ based on structure
        velocity: upcoming
      });
    } catch (e) {
      console.warn('SpacesScreen loadData error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const handleSpaceLongPress = (space) => {
    Alert.alert(
      'Space Options',
      `Manage "${space.name}"`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Rename', onPress: () => {
          setEditingSpace(space)
          setNewSpaceName(space.name)
        }},
        { text: 'Delete', style: 'destructive', onPress: () => confirmDeleteSpace(space) },
      ]
    )
  }

  const confirmDeleteSpace = (space) => {
    Alert.alert(
      'Delete Space',
      'This will also delete ALL mission-critical hubs inside. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await (import('../../services/spaces')).spacesService.deleteSpace(space.id)
            setSpaces(prev => prev.filter(s => s.id !== space.id))
          } catch (err) {
            Alert.alert('Error', 'Registry could not be cleared.')
          }
        }},
      ]
    )
  }

  const submitRename = async () => {
    if (!newSpaceName.trim() || !editingSpace) return
    try {
      await (import('../../services/spaces')).spacesService.updateSpace(editingSpace.id, { name: newSpaceName.trim() })
      setSpaces(prev => prev.map(s => s.id === editingSpace.id ? { ...s, name: newSpaceName.trim() } : s))
      setEditingSpace(null)
    } catch (err) {
      Alert.alert('Error', 'Registry could not be updated.')
    }
  }

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <View style={styles.topNav}>
        <TouchableOpacity
          onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
          style={styles.menuBtn}
        >
          <List color={colors.text.secondary} size={20} weight="light" />
        </TouchableOpacity>
        <Text style={styles.screenTitle}>OVERSIGHT</Text>
        <View style={{ width: 40 }} /> 
      </View>

      <View style={styles.statsGrid}>
        <StatCard label="Domains" value={stats.domains} icon={Binoculars} color={colors.modules.aly} />
        <StatCard label="Hubs" value={stats.hubs} icon={Database} color={colors.modules.track} />
        <StatCard label="IQ Index" value={stats.iq} icon={Sparkle} color={colors.modules.knowledge} />
        <StatCard label="Velocity" value={stats.velocity} icon={ChartLineUp} color="#FFD700" />
      </View>

      <View style={styles.sectionDivider}>
        <Text style={styles.sectionLabel}>Life Domains</Text>
      </View>
    </View>
  );

  const renderSpaceCard = ({ item }) => (
    <TouchableOpacity
      style={styles.spaceRow}
      onPress={() => navigation.navigate(item.id, { space: item })}
      onLongPress={() => handleSpaceLongPress(item)}
      activeOpacity={0.75}
    >
      <SpaceIcon icon={item.icon || 'Folder'} color={item.color} size={38} iconSize={19} weight="light" />
      <View style={styles.spaceInfo}>
        <Text style={styles.spaceName}>{item.name}</Text>
        <Text style={styles.spaceSub}>{item.category || 'Life Domain'} • {item.hubs?.length || 0} Hubs</Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </TouchableOpacity>
  );

  const filteredSpaces = spaces.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.category && s.category.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.modules.aly} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <FlatList
        data={filteredSpaces}
        keyExtractor={item => item.id}
        renderItem={renderSpaceCard}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadData(true)}
            tintColor={colors.modules.aly}
          />
        }
      />

      {/* Floating Search Dock */}
      <View style={styles.floatingControls}>
        <View style={styles.searchBar}>
          <MagnifyingGlass size={18} color={colors.text.tertiary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Identify space..."
            placeholderTextColor={colors.text.tertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <TouchableOpacity style={styles.minNewBtn} onPress={() => navigation.navigate('CreateSpace')} activeOpacity={0.7}>
          <Plus size={20} color={colors.modules.aly} weight="bold" />
        </TouchableOpacity>
      </View>

      {/* High-Fidelity Rename Modal */}
      <Modal
        visible={!!editingSpace}
        transparent
        animationType="fade"
        onRequestClose={() => setEditingSpace(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Rename Space</Text>
            <TextInput
              style={styles.modalInput}
              value={newSpaceName}
              onChangeText={setNewSpaceName}
              autoFocus
              placeholder="Enter new name..."
              placeholderTextColor={colors.text.tertiary}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.modalBtn} 
                onPress={() => setEditingSpace(null)}
              >
                <Text style={styles.modalBtnCancel}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalBtn, styles.modalBtnSave]} 
                onPress={submitRename}
              >
                <Text style={styles.modalBtnText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <AssistantFAB />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  centered: {
    flex: 1,
    backgroundColor: colors.background.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerContainer: {
    paddingBottom: 24,
  },
  topNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 10,
    marginBottom: 24,
  },
  menuBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.5,
    borderColor: colors.border.primary,
  },
  screenTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.text.tertiary,
    letterSpacing: 6,
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.5,
    borderColor: colors.border.primary,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.tertiary + '80', // More subtle
    width: '48.5%', // Solid 2-per-row with gap
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: colors.border.primary,
    marginBottom: 8,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '700',
    marginRight: 4,
  },
  statLabel: {
    fontSize: 9,
    color: colors.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionDivider: {
    paddingHorizontal: 20,
    marginTop: 16,
    marginBottom: 12,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  list: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  spaceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: colors.border.primary,
    padding: 12,
    marginBottom: 8,
    gap: 12,
  },
  spaceInfo: {
    flex: 1,
    gap: 3,
  },
  spaceName: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.text.primary,
  },
  spaceSub: {
    fontSize: 11,
    color: colors.text.tertiary,
  },
  chevron: {
    fontSize: 20,
    color: colors.text.tertiary,
    lineHeight: 24,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalContent: {
    width: '100%',
    backgroundColor: colors.background.secondary,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.border.primary,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 20,
  },
  modalInput: {
    backgroundColor: colors.background.tertiary,
    borderRadius: 12,
    padding: 16,
    color: colors.text.primary,
    fontSize: 16,
    borderWidth: 0.5,
    borderColor: colors.border.primary,
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  modalBtn: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  modalBtnSave: {
    backgroundColor: colors.modules.aly,
  },
  modalBtnCancel: {
    color: colors.text.tertiary,
    fontWeight: '600',
  },
  modalBtnText: {
    color: '#FFF',
    fontWeight: '700',
  },

  // Floating Search Dock Styles
  floatingControls: {
    position: 'absolute',
    bottom: 24,
    left: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
    borderRadius: 30,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    borderWidth: 1.5,
    borderColor: colors.border.primary,
    zIndex: 999,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
      },
      android: {
        elevation: 15,
      },
    }),
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.secondary + '80',
    borderRadius: 24,
    paddingHorizontal: 14,
    height: 44,
    borderWidth: 0.5,
    borderColor: colors.border.primary,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    color: colors.text.primary,
    fontSize: 14,
  },
  minNewBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.modules.aly + '25',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.5,
    borderColor: colors.modules.aly + '30',
  },
})
