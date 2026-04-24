import React, { useState, useCallback, useRef, useEffect } from 'react'
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, Alert,
  Modal, TextInput, Animated, Platform, Keyboard,
  useWindowDimensions,
} from 'react-native'
import Shimmer from '../../components/common/Shimmer'

function HubsSkeletonGrid() {
  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 16, gap: 12 }}>
      {[0, 1, 2, 3].map(i => <Shimmer.HubPair key={i} />)}
    </View>
  )
}
import { useFocusEffect, DrawerActions } from '@react-navigation/native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { supabase } from '../../services/supabase'
import { hubsService } from '../../services/hubs'
import { spacesService } from '../../services/spaces'
import { colors } from '../../constants/colors'
import { hubStore } from '../../services/hubStore'
import SpaceIcon from '../../components/common/SpaceIcon'
import { CaretLeft, CaretDown, Plus, MagnifyingGlass, Check, X } from 'phosphor-react-native'

const PEEK = 64

// ─── Space switcher sheet ──────────────────────────────────────────────────────

function SpaceSwitcherSheet({ visible, onClose, currentSpaceId, onSelect }) {
  const { height } = useWindowDimensions()
  const slideAnim = useRef(new Animated.Value(height)).current
  const bottomAnim = useRef(new Animated.Value(0)).current
  const [spaces, setSpaces] = useState([])
  const [query, setQuery] = useState('')

  // Load spaces when shown
  React.useEffect(() => {
    if (!visible) return
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) spacesService.getSpaces(user.id).then(setSpaces).catch(() => {})
    })
    setQuery('')
  }, [visible])

  // Slide in/out
  React.useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0, useNativeDriver: false, damping: 20, stiffness: 200,
      }).start()
    } else {
      Keyboard.dismiss()
      bottomAnim.setValue(0)
      Animated.timing(slideAnim, {
        toValue: height, duration: 250, useNativeDriver: false,
      }).start()
    }
  }, [visible])

  // Keyboard handling
  React.useEffect(() => {
    if (!visible) return
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow'
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide'
    const onShow = (e) => Animated.timing(bottomAnim, {
      toValue: e.endCoordinates.height,
      duration: Platform.OS === 'ios' ? e.duration : 250,
      useNativeDriver: false,
    }).start()
    const onHide = () => Animated.timing(bottomAnim, {
      toValue: 0, duration: 250, useNativeDriver: false,
    }).start()
    const s1 = Keyboard.addListener(showEvent, onShow)
    const s2 = Keyboard.addListener(hideEvent, onHide)
    return () => { s1.remove(); s2.remove() }
  }, [visible])

  const filtered = spaces.filter(s =>
    s.name.toLowerCase().includes(query.toLowerCase())
  )

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <TouchableOpacity style={sheet.overlay} activeOpacity={1} onPress={onClose} />
      <Animated.View style={[sheet.container, { top: PEEK, bottom: bottomAnim, transform: [{ translateY: slideAnim }] }]}>
        <SafeAreaView style={sheet.inner} edges={['bottom']}>
          <View style={sheet.handle} />

          <View style={sheet.header}>
            <Text style={sheet.title}>Switch Space</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}>
              <X color={colors.text.tertiary} size={20} weight="light" />
            </TouchableOpacity>
          </View>

          <View style={sheet.searchRow}>
            <MagnifyingGlass color={colors.text.tertiary} size={16} weight="light" />
            <TextInput
              style={sheet.searchInput}
              placeholder="Search spaces..."
              placeholderTextColor={colors.text.tertiary}
              value={query}
              onChangeText={setQuery}
              autoFocus={false}
            />
          </View>

          <FlatList
            data={filtered}
            keyExtractor={item => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={sheet.list}
            renderItem={({ item }) => {
              const active = item.id === currentSpaceId
              return (
                <TouchableOpacity
                  style={[sheet.spaceRow, active && sheet.spaceRowActive]}
                  onPress={() => onSelect(item)}
                  activeOpacity={0.75}
                >
                  <SpaceIcon icon={item.icon || 'Folder'} color={item.color} size={36} iconSize={18} weight="light" />
                  <View style={sheet.spaceInfo}>
                    <Text style={sheet.spaceName}>{item.name}</Text>
                    <Text style={sheet.spaceSub}>
                      {item.hubs?.length || 0} {item.hubs?.length === 1 ? 'hub' : 'hubs'}
                    </Text>
                  </View>
                  {active && <Check color={colors.modules.aly} size={16} weight="bold" />}
                </TouchableOpacity>
              )
            }}
          />
        </SafeAreaView>
      </Animated.View>
    </Modal>
  )
}

const sheet = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  container: {
    position: 'absolute', left: 0, right: 0,
    backgroundColor: colors.background.secondary,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    borderTopWidth: 0.5, borderColor: colors.border.primary,
  },
  inner: { flex: 1, paddingHorizontal: 20, paddingTop: 12 },
  handle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: colors.border.primary,
    alignSelf: 'center', marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  title: { fontSize: 15, fontWeight: '500', color: colors.text.primary },
  searchRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: colors.background.tertiary,
    borderRadius: 10, borderWidth: 0.5, borderColor: colors.border.primary,
    paddingHorizontal: 14, paddingVertical: 10, marginBottom: 12,
  },
  searchInput: { flex: 1, fontSize: 14, color: colors.text.primary },
  list: { paddingBottom: 16 },
  spaceRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 12, paddingHorizontal: 12,
    borderRadius: 12, marginBottom: 4, gap: 12,
  },
  spaceRowActive: {
    backgroundColor: colors.modules.aly + '10',
    borderWidth: 0.5, borderColor: colors.modules.aly + '40',
  },
  spaceInfo: { flex: 1, gap: 2 },
  spaceName: { fontSize: 14, fontWeight: '500', color: colors.text.primary },
  spaceSub: { fontSize: 11, color: colors.text.tertiary },
})

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function HubsScreen({ navigation, route }) {
  const { space } = route.params
  const [hubs, setHubs] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [switcherVisible, setSwitcherVisible] = useState(false)
  const hasLoadedRef = useRef(false)

  useFocusEffect(
    useCallback(() => {
      if (!hasLoadedRef.current) {
        hasLoadedRef.current = true
        loadHubs()
      }
    }, [space?.id])
  )

  // Reset load flag when space changes so we fetch fresh data
  useEffect(() => {
    hasLoadedRef.current = false
  }, [space?.id])

  const loadHubs = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    try {
      const data = await hubsService.getHubs(space.id)
      setHubs(data)
      // Pre-populate store
      data.forEach(hub => {
        hubStore.setHubData(hub.id, {
          modules: hub.hub_modules || [],
          addons: hub.hub_addons || [],
        });
      });
    } catch (e) {
      console.warn('loadHubs error:', e)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleHubPress = (hub) => {
    navigation.navigate('Hub', { hub, space })
  }

  const handleAddHub = () => {
    navigation.navigate('CreateHub', { spaceId: space.id })
  }

  const handleHubLongPress = (hub) => {
    Alert.alert(hub.name, 'Manage this hub', [
      { text: 'Edit', onPress: () => navigation.navigate('CreateHub', { hub, spaceId: space.id }) },
      {
        text: 'Delete', style: 'destructive',
        onPress: () => Alert.alert('Delete hub', 'Are you sure? This will delete all content within this hub.', [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete', style: 'destructive',
            onPress: async () => {
              try {
                await hubsService.deleteHub(hub.id)
                setHubs(prev => prev.filter(h => h.id !== hub.id))
              } catch {
                Alert.alert('Error', 'Failed to delete hub.')
              }
            }
          }
        ])
      },
      { text: 'Cancel', style: 'cancel' }
    ])
  }

  const handleSpaceSelect = (selectedSpace) => {
    setSwitcherVisible(false)
    if (selectedSpace.id === space.id) return
    // Navigate to the selected space
    navigation.navigate(selectedSpace.id, { space: selectedSpace })
  }

  const renderHub = ({ item }) => (
    <TouchableOpacity
      style={[styles.hubCard, { borderColor: item.color + '30' }]}
      onPress={() => handleHubPress(item)}
      onLongPress={() => handleHubLongPress(item)}
      activeOpacity={0.8}
    >
      <View style={styles.hubHeader}>
        <SpaceIcon icon={item.icon} color={item.color} size={44} iconSize={22} />
      </View>
      <Text style={styles.hubName} numberOfLines={1}>{item.name}</Text>
      <Text style={styles.modulesCount}>
        {item.hub_modules?.filter(m => m.is_enabled).length || 5} tools
      </Text>
    </TouchableOpacity>
  )

  const header = (
    <View style={styles.header}>
      <TouchableOpacity
        style={styles.backBtn}
        onPress={() => navigation.goBack()}
        hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
      >
        <CaretLeft color={colors.text.secondary} size={22} weight="light" />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.spaceChip}
        onPress={() => setSwitcherVisible(true)}
        activeOpacity={0.7}
      >
        <SpaceIcon icon={space.icon} color={space.color} size={26} iconSize={13} weight="light" />
        <View style={styles.spaceTextWrap}>
          <Text style={styles.title} numberOfLines={1}>{space.name}</Text>
          <Text style={styles.spaceSubtitle}>
            {loading ? '—' : `${hubs.length} ${hubs.length === 1 ? 'hub' : 'hubs'}`}
          </Text>
        </View>
        <CaretDown color={colors.text.tertiary} size={12} weight="bold" />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.addBtn}
        onPress={handleAddHub}
        hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
      >
        <Plus color={colors.text.secondary} size={20} weight="light" />
      </TouchableOpacity>
    </View>
  )

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {header}

      {loading ? (
        <HubsSkeletonGrid />
      ) : null}

      <FlatList
        style={loading ? { display: 'none' } : undefined}
        data={hubs}
        keyExtractor={(item) => item.id}
        renderItem={renderHub}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadHubs(true)}
            tintColor={colors.text.tertiary}
          />
        }
        ListEmptyComponent={
          !loading && (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>No hubs yet</Text>
              <Text style={styles.emptyHint}>Tap + to create your first hub.</Text>
            </View>
          )
        }
      />

      <SpaceSwitcherSheet
        visible={switcherVisible}
        onClose={() => setSwitcherVisible(false)}
        currentSpaceId={space.id}
        onSelect={handleSpaceSelect}
      />
    </SafeAreaView>
  )
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
    paddingTop: 8,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border.primary,
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  spaceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    backgroundColor: colors.background.tertiary,
    borderWidth: 0.5,
    borderColor: colors.border.primary,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginHorizontal: 8,
  },
  spaceTextWrap: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.text.primary,
  },
  spaceSubtitle: {
    fontSize: 10,
    fontWeight: '500',
    color: colors.text.tertiary,
    letterSpacing: 0.5,
    marginTop: 1,
  },
  addBtn: {
    width: 44,
    height: 44,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  list: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 120,
  },
  row: {
    gap: 12,
    marginBottom: 12,
  },
  hubCard: {
    flex: 1,
    backgroundColor: colors.background.secondary,
    borderRadius: 14,
    borderWidth: 0.5,
    padding: 16,
    gap: 8,
  },
  hubHeader: {},
  hubName: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.text.primary,
    marginTop: 4,
  },
  modulesCount: {
    fontSize: 12,
    color: colors.text.tertiary,
  },
  empty: {
    marginTop: 100,
    alignItems: 'center',
    gap: 6,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.text.secondary,
  },
  emptyHint: {
    fontSize: 13,
    color: colors.text.tertiary,
  },
})
