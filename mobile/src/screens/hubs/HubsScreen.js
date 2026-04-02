import React, { useState, useCallback, useEffect } from 'react'
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, Alert } from 'react-native'
import { useFocusEffect, DrawerActions } from '@react-navigation/native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { supabase } from '../../services/supabase'
import { hubsService } from '../../services/hubs'
import { colors } from '../../constants/colors'
import SpaceIcon from '../../components/common/SpaceIcon'
import { List } from 'phosphor-react-native'

export default function HubsScreen({ navigation, route }) {
  const { space } = route.params
  const [hubs, setHubs] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [user, setUser] = useState(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
    })
  }, [])

  useFocusEffect(
    useCallback(() => {
      if (user && space) loadHubs()
    }, [user, space])
  )

  const loadHubs = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)

    try {
      const data = await hubsService.getHubs(space.id)
      setHubs(data)
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
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          Alert.alert('Delete hub', 'Are you sure? This will delete all content within this hub.', [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Delete',
              style: 'destructive',
              onPress: async () => {
                try {
                  await hubsService.deleteHub(hub.id)
                  setHubs(prev => prev.filter(h => h.id !== hub.id))
                } catch (e) {
                  Alert.alert('Error', 'Failed to delete hub.')
                }
              }
            }
          ])
        }
      },
      { text: 'Cancel', style: 'cancel' }
    ])
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

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            onPress={() => navigation.dispatch(DrawerActions.toggleDrawer())}
            style={styles.menuBtn}
            hitSlop={{ top: 25, bottom: 25, left: 25, right: 25 }}
          >
            <List color={colors.text.secondary} size={24} weight="light" />
          </TouchableOpacity>
          <View>
            <View style={styles.titleRow}>
              <SpaceIcon icon={space.icon} color={space.color} size={24} iconSize={12} />
              <Text style={styles.title}>{space.name}</Text>
            </View>
            {space.category && (
              <View style={[styles.badge, { backgroundColor: space.color + '15' }]}>
                <Text style={[styles.badgeText, { color: space.color }]}>{space.category.toUpperCase()}</Text>
              </View>
            )}
          </View>
        </View>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={handleAddHub}
          hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
        >
          <Text style={styles.addText}>+</Text>
        </TouchableOpacity>
      </View>

      <FlatList
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
              <Text style={styles.emptyTitle}>No hubs in this space</Text>
              <Text style={styles.emptyHint}>
                Tap + to create your first working hub.
              </Text>
            </View>
          )
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  menuBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.background.secondary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 0.5,
    borderColor: colors.border.primary,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
    color: colors.text.primary,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
  },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.background.secondary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 0.5,
    borderColor: colors.border.primary,
  },
  addText: {
    fontSize: 24,
    color: colors.text.secondary,
    marginTop: -2,
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 40,
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
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.text.secondary,
    marginBottom: 4,
  },
  emptyHint: {
    fontSize: 13,
    color: colors.text.tertiary,
  }
})
