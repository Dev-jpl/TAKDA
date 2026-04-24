import React, { useState, useCallback, useRef } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
} from 'react-native'
import { useFocusEffect, DrawerActions } from '@react-navigation/native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Plus, MagnifyingGlass, List, Sparkle } from 'phosphor-react-native'
import { useAlySheet } from '../../context/AlySheetContext'
import { colors } from '../../constants/colors'
import { spacesService } from '../../services/spaces'
import { supabase } from '../../services/supabase'
import SpaceIcon from '../../components/common/SpaceIcon'
import Shimmer from '../../components/common/Shimmer'

// ── Skeleton ──────────────────────────────────────────────────────────────────
function SpaceRowSkeleton() {
  return (
    <View style={skelStyles.row}>
      <Shimmer style={skelStyles.icon} />
      <View style={{ flex: 1, gap: 7 }}>
        <Shimmer style={{ height: 13, borderRadius: 4, width: '55%' }} />
        <Shimmer style={{ height: 10, borderRadius: 4, width: '30%' }} />
      </View>
      <Shimmer style={{ width: 8, height: 16, borderRadius: 3 }} />
    </View>
  )
}

function SpacesSkeletonList() {
  return (
    <View style={{ paddingHorizontal: 20, paddingTop: 4, gap: 8 }}>
      {[0, 1, 2, 3, 4].map(i => <SpaceRowSkeleton key={i} />)}
    </View>
  )
}

const skelStyles = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.background.secondary,
    borderRadius: 14, borderWidth: 0.5, borderColor: colors.border.primary,
    padding: 12, marginBottom: 8, gap: 12,
  },
  icon: { width: 38, height: 38, borderRadius: 10 },
})

export default function SpacesScreen({ navigation }) {
  const { openSheet } = useAlySheet()
  const [spaces, setSpaces] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [userId, setUserId] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [editingSpace, setEditingSpace] = useState(null)
  const [newSpaceName, setNewSpaceName] = useState('')
  const hasLoadedRef = useRef(false)

  useFocusEffect(
    useCallback(() => {
      if (hasLoadedRef.current) return
      hasLoadedRef.current = true
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (user) {
          setUserId(user.id)
          loadSpaces(user.id)
        }
      })
    }, [])
  )

  const loadSpaces = async (uid, isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    try {
      const data = await spacesService.getSpaces(uid)
      setSpaces(data)
    } catch (e) {
      console.warn('SpacesScreen loadSpaces error:', e)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleSpacePress = (space) => {
    navigation.navigate('Main', {
      screen: space.id,
      params: { space },
    })
  }

  const handleSpaceLongPress = (space) => {
    Alert.alert('Space Options', `"${space.name}"`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Rename', onPress: () => { setEditingSpace(space); setNewSpaceName(space.name) } },
      { text: 'Delete', style: 'destructive', onPress: () => confirmDelete(space) },
    ])
  }

  const confirmDelete = (space) => {
    Alert.alert('Delete Space', 'This will also delete all hubs inside. Continue?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await spacesService.deleteSpace(space.id)
            setSpaces(prev => prev.filter(s => s.id !== space.id))
          } catch {
            Alert.alert('Error', 'Could not delete space.')
          }
        },
      },
    ])
  }

  const submitRename = async () => {
    if (!newSpaceName.trim() || !editingSpace) return
    try {
      await spacesService.updateSpace(editingSpace.id, { name: newSpaceName.trim() })
      setSpaces(prev => prev.map(s =>
        s.id === editingSpace.id ? { ...s, name: newSpaceName.trim() } : s
      ))
      setEditingSpace(null)
    } catch {
      Alert.alert('Error', 'Could not rename space.')
    }
  }

  const filtered = spaces.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.spaceRow}
      onPress={() => handleSpacePress(item)}
      onLongPress={() => handleSpaceLongPress(item)}
      activeOpacity={0.75}
    >
      <SpaceIcon icon={item.icon || 'Folder'} color={item.color} size={38} iconSize={19} weight="light" />
      <View style={styles.spaceInfo}>
        <Text style={styles.spaceName}>{item.name}</Text>
        <Text style={styles.spaceSub}>
          {item.hubs?.length || 0} {item.hubs?.length === 1 ? 'hub' : 'hubs'}
          {item.category ? ` · ${item.category}` : ''}
        </Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </TouchableOpacity>
  )

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
          hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
        >
          <List color={colors.text.secondary} size={22} weight="light" />
        </TouchableOpacity>
        <Text style={styles.title}>Spaces</Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('CreateSpace')}
          hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
        >
          <Plus color={colors.text.secondary} size={20} weight="light" />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchRow}>
        <MagnifyingGlass color={colors.text.tertiary} size={16} weight="light" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search spaces..."
          placeholderTextColor={colors.text.tertiary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Skeleton while loading */}
      {loading && <SpacesSkeletonList />}

      {/* List */}
      <FlatList
        style={loading ? { display: 'none' } : undefined}
        data={filtered}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { hasLoadedRef.current = false; loadSpaces(userId, true) }}
            tintColor={colors.text.tertiary}
          />
        }
        ListEmptyComponent={
          !loading && (
            <View style={styles.empty}>
              <Sparkle color={colors.modules.aly} size={32} weight="fill" />
              <Text style={styles.emptyTitle}>Aly can set up your spaces</Text>
              <Text style={styles.emptyBody}>Tell her what areas of life you want to organize</Text>
              <TouchableOpacity
                style={styles.emptyAlyBtn}
                onPress={openSheet}
              >
                <Text style={styles.emptyAlyBtnText}>Talk to Aly</Text>
              </TouchableOpacity>
            </View>
          )
        }
      />

      {/* Rename modal */}
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
              placeholder="Space name"
              placeholderTextColor={colors.text.tertiary}
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity onPress={() => setEditingSpace(null)} style={styles.modalBtn}>
                <Text style={styles.modalBtnCancel}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={submitRename} style={[styles.modalBtn, styles.modalBtnSave]}>
                <Text style={styles.modalBtnSaveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  title: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.text.primary,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: colors.background.secondary,
    borderRadius: 10,
    borderWidth: 0.5,
    borderColor: colors.border.primary,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.text.primary,
  },
  list: {
    paddingHorizontal: 20,
    paddingBottom: 120,
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
  empty: {
    marginTop: 60,
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.text.primary,
    textAlign: 'center',
  },
  emptyBody: {
    fontSize: 13,
    color: colors.text.tertiary,
    textAlign: 'center',
    lineHeight: 18,
  },
  emptyAlyBtn: {
    marginTop: 8,
    backgroundColor: colors.modules.aly,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  emptyAlyBtnText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#fff',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalContent: {
    width: '100%',
    backgroundColor: colors.background.secondary,
    borderRadius: 16,
    padding: 24,
    borderWidth: 0.5,
    borderColor: colors.border.primary,
    gap: 16,
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.text.primary,
  },
  modalInput: {
    backgroundColor: colors.background.tertiary,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.text.primary,
    fontSize: 15,
    borderWidth: 0.5,
    borderColor: colors.border.primary,
  },
  modalBtns: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  modalBtn: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 8,
  },
  modalBtnCancel: {
    fontSize: 14,
    color: colors.text.tertiary,
    fontWeight: '500',
  },
  modalBtnSave: {
    backgroundColor: colors.modules.aly,
  },
  modalBtnSaveText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#fff',
  },
})
