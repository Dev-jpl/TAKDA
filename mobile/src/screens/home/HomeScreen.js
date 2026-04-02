import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Dimensions,
} from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { supabase } from '../../services/supabase'
import { spacesService } from '../../services/spaces'
import { hubsService } from '../../services/hubs'
import { colors } from '../../constants/colors'
import SpaceIcon from '../../components/common/SpaceIcon'
import { User, Plus } from 'phosphor-react-native'

const { width } = Dimensions.get('window')
const COLUMN_COUNT = 2
const GAP = 12
const CARD_WIDTH = (width - 40 - GAP) / COLUMN_COUNT

export default function HomeScreen({ navigation }) {
  const [spaces, setSpaces] = useState([])
  const [recentHubs, setRecentHubs] = useState([])
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
      if (user) loadAllData()
    }, [user])
  )

  const loadAllData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)

    try {
      // Load Spaces
      const spacesData = await spacesService.getSpaces(user.id)
      setSpaces(spacesData)

      // Load some 'Recent Activity' (hubs from the first few spaces)
      if (spacesData.length > 0) {
        const topSpaces = spacesData.slice(0, 3)
        const hubsPromises = topSpaces.map(s => hubsService.getHubs(s.id))
        const hubsResults = await Promise.all(hubsPromises)
        const allHubs = hubsResults.flat().slice(0, 6) // Take first 6
        setRecentHubs(allHubs)
      }
    } catch (e) {
      console.warn('loadAllData error:', e)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleSpacePress = (space) => {
    navigation.navigate('Main', { 
      screen: space.id, 
      params: { space } 
    })
  }

  const handleHubPress = (hub) => {
    // Find the space for this hub
    const space = spaces.find(s => s.id === hub.space_id)
    if (space) {
      navigation.navigate('Main', { 
        screen: space.id, 
        params: { space, initialScreen: 'Hub', initialParams: { hub, space } }
      })
    }
  }

  const handleAddSpace = () => {
    navigation.navigate('CreateSpace')
  }

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.topNav}>
        <Text style={styles.brand}>TAKDA</Text>
        <TouchableOpacity 
          style={styles.avatarBtn} 
          onPress={() => navigation.navigate('Profile')}
          hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
        >
          <View style={styles.avatar}>
            <User color={colors.text.primary} size={18} weight="light" />
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.greetingSection}>
        <Text style={styles.greeting}>{getGreeting()},</Text>
        <Text style={styles.userName}>{user?.user_metadata?.full_name?.toUpperCase().split(' ')[0] || 'USER'}</Text>
      </View>

      {/* Mini Dashboard */}
      <View style={styles.dashboard}>
        <View style={styles.dashCard}>
          <Text style={styles.dashValue}>{spaces.length}</Text>
          <Text style={styles.dashLabel}>Spaces</Text>
        </View>
        <View style={styles.dashCard}>
          <Text style={styles.dashValue}>{recentHubs.length}</Text>
          <Text style={styles.dashLabel}>Recent</Text>
        </View>
        <View style={[styles.dashCard, { borderRightWidth: 0 }]}>
          <Text style={styles.dashValue}>12</Text>
          <Text style={styles.dashLabel}>Tasks</Text>
        </View>
      </View>

      {/* Quick Access / Recent Activity */}
      {recentHubs.length > 0 && (
        <View style={styles.quickSection}>
          <Text style={styles.sectionHeader}>Quick Access</Text>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={recentHubs}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.quickScroll}
            renderItem={({ item }) => (
              <TouchableOpacity 
                style={styles.quickCard}
                onPress={() => handleHubPress(item)}
              >
                <SpaceIcon icon={item.icon} color={item.color} size={36} iconSize={18} />
                <Text style={styles.quickName} numberOfLines={1}>{item.name}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      )}

      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>Spaces</Text>
        <TouchableOpacity 
          onPress={handleAddSpace} 
          hitSlop={{ top: 25, bottom: 25, left: 25, right: 25 }}
        >
           <Plus color={colors.text.tertiary} size={18} weight="bold" />
        </TouchableOpacity>
      </View>
    </View>
  )

  const renderSpaceList = ({ item }) => (
    <TouchableOpacity
      style={styles.spaceListItem}
      onPress={() => handleSpacePress(item)}
      activeOpacity={0.7}
    >
      <SpaceIcon
        icon={item.icon || 'Folder'}
        color={item.color}
        size={36}
        iconSize={18}
        weight="light"
      />
      <View style={styles.spaceListContent}>
        <Text style={styles.spaceListName}>{item.name}</Text>
        <Text style={styles.spaceListSub}>{item.category || 'Life Domain'}</Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </TouchableOpacity>
  )

  if (loading && !refreshing) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.text.tertiary} size="small" />
      </View>
    )
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <FlatList
        data={spaces}
        keyExtractor={(item) => item.id}
        renderItem={renderSpaceList}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadAllData(true)}
            tintColor={colors.text.tertiary}
          />
        }
      />
    </SafeAreaView>
  )
}

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
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
  list: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  header: {
    paddingVertical: 16,
  },
  topNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  brand: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text.tertiary,
    letterSpacing: 4,
  },
  avatarBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.background.secondary,
    borderWidth: 0.5,
    borderColor: colors.border.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  greetingSection: {
    marginBottom: 20,
  },
  greeting: {
    fontSize: 14,
    color: colors.text.tertiary,
    marginBottom: 2,
  },
  userName: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text.primary,
    letterSpacing: 0.5,
  },
  dashboard: {
    flexDirection: 'row',
    backgroundColor: colors.background.secondary,
    borderRadius: 16,
    borderWidth: 0.5,
    borderColor: colors.border.primary,
    paddingVertical: 16,
    marginBottom: 24,
  },
  dashCard: {
    flex: 1,
    alignItems: 'center',
    borderRightWidth: 0.5,
    borderRightColor: colors.border.primary,
  },
  dashValue: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 4,
  },
  dashLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: colors.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  quickSection: {
    marginBottom: 24,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  quickScroll: {
    gap: 12,
  },
  quickCard: {
    width: 90,
    backgroundColor: colors.background.secondary,
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: colors.border.primary,
    padding: 12,
    alignItems: 'center',
    gap: 8,
  },
  quickName: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.text.secondary,
    textAlign: 'center',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  spaceListItem: {
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
  spaceListContent: {
    flex: 1,
    gap: 2,
  },
  spaceListName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text.primary,
  },
  spaceListSub: {
    fontSize: 11,
    color: colors.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  chevron: {
    fontSize: 18,
    color: colors.text.tertiary,
    marginRight: 4,
  },
})