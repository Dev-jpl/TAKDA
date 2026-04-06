import React, { useState, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFocusEffect, DrawerActions } from '@react-navigation/native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { supabase } from '../../services/supabase'
import { spacesService } from '../../services/spaces'
import { eventService } from '../../services/events'
import { vaultService } from '../../services/vault'
import { API_URL } from '../../services/apiConfig'
import { useAlySheet } from '../../context/AlySheetContext'
import { colors } from '../../constants/colors'
import { ASSISTANT_NAME } from '../../constants/brand'
import SpaceIcon from '../../components/common/SpaceIcon'
import {
  List, User, Tray, CalendarBlank, CheckSquare,
  Sparkle, ArrowRight,
} from 'phosphor-react-native'

const PINNED_KEY = 'pinned_hubs'

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function formatDate() {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  })
}

export default function HomeScreen({ navigation }) {
  const { openSheet } = useAlySheet()
  const [user, setUser] = useState(null)
  const [pinnedHubs, setPinnedHubs] = useState([])
  const [spaces, setSpaces] = useState([])
  const [vaultCount, setVaultCount] = useState(0)
  const [todayEvents, setTodayEvents] = useState([])
  const [dailyInsight, setDailyInsight] = useState('')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  useFocusEffect(
    useCallback(() => {
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (user) {
          setUser(user)
          loadData(user)
        }
      })
    }, [])
  )

  const loadData = async (u, isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    try {
      const [raw, spacesData, events, vaultItems, insightRes] = await Promise.all([
        AsyncStorage.getItem(PINNED_KEY),
        spacesService.getSpaces(u.id),
        eventService.getEvents(u.id),
        vaultService.getItems(u.id, 'unprocessed').catch(() => []),
        fetch(`${API_URL}/aly/daily-insight?user_id=${u.id}`).then(r => r.json()).catch(() => ({})),
      ])
      if (insightRes?.insight) setDailyInsight(insightRes.insight)

      setPinnedHubs(raw ? JSON.parse(raw) : [])
      setSpaces(spacesData)
      setVaultCount(Array.isArray(vaultItems) ? vaultItems.length : 0)

      const today = new Date().toDateString()
      const upcoming = (events || []).filter(e => {
        const d = new Date(e.start_time || e.start)
        return d.toDateString() === today || d > new Date()
      }).slice(0, 3)
      setTodayEvents(upcoming)
    } catch (e) {
      console.warn('HomeScreen loadData error:', e)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const navigateToHub = async (hub) => {
    try {
      const allSpaces = spaces.length > 0 ? spaces : await spacesService.getSpaces(user.id)
      const space = allSpaces.find(s => s.id === hub.space_id) || { id: hub.space_id }
      navigation.navigate('Main', {
        screen: hub.space_id,
        params: { screen: 'Hub', params: { hub, space } },
      })
    } catch (e) {
      console.warn('navigateToHub error:', e)
    }
  }

  const displayName = user?.user_metadata?.full_name?.split(' ')[0]
    || user?.email?.split('@')[0]
    || 'there'

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <ActivityIndicator style={{ flex: 1 }} color={colors.text.tertiary} />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadData(user, true)}
            tintColor={colors.text.tertiary}
          />
        }
      >
        {/* Top bar */}
        <View style={styles.topBar}>
          <TouchableOpacity
            onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
            hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
          >
            <List color={colors.text.secondary} size={22} weight="light" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => navigation.navigate('Profile')}
            hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
          >
            <User color={colors.text.secondary} size={20} weight="light" />
          </TouchableOpacity>
        </View>

        {/* 1. Greeting */}
        <View style={styles.greeting}>
          <Text style={styles.greetingText}>{getGreeting()}, {displayName}</Text>
          <Text style={styles.greetingDate}>{formatDate()}</Text>
        </View>

        {/* 1b. Aly daily insight */}
        {dailyInsight ? (
          <Text style={styles.insight}>{dailyInsight}</Text>
        ) : null}

        {/* 2. Vault summary */}
        {vaultCount > 0 && (
          <TouchableOpacity
            style={styles.vaultBanner}
            onPress={() => navigation.navigate('Vault')}
            activeOpacity={0.8}
          >
            <Tray color={colors.text.tertiary} size={16} weight="light" />
            <Text style={styles.vaultBannerText}>
              {vaultCount} {vaultCount === 1 ? 'item needs' : 'items need'} sorting
            </Text>
            <ArrowRight color={colors.text.tertiary} size={14} weight="light" style={{ marginLeft: 'auto' }} />
          </TouchableOpacity>
        )}

        {/* 3. Daily brief */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Today</Text>
          {todayEvents.length > 0 ? (
            <View style={styles.briefList}>
              {todayEvents.map(event => (
                <View key={event.id} style={styles.briefRow}>
                  <View style={[styles.briefDot, { backgroundColor: event.color || colors.modules.track }]} />
                  <Text style={styles.briefText} numberOfLines={1}>{event.title || event.summary}</Text>
                  <Text style={styles.briefTime}>
                    {new Date(event.start_time || event.start).toLocaleTimeString([], {
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </Text>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.briefEmpty}>
              <Sparkle color={colors.modules.aly} size={14} weight="fill" />
              <Text style={styles.briefEmptyText}>Nothing scheduled. A good day to get ahead.</Text>
            </View>
          )}
          <TouchableOpacity
            style={styles.briefLink}
            onPress={() => navigation.navigate('Calendar')}
          >
            <CalendarBlank color={colors.text.tertiary} size={13} weight="light" />
            <Text style={styles.briefLinkText}>Open calendar</Text>
          </TouchableOpacity>
        </View>

        {/* 4. Pinned hubs / Talk to Aly card */}
        {pinnedHubs.length === 0 && (
          <TouchableOpacity
            style={styles.alyCard}
            onPress={openSheet}
            activeOpacity={0.8}
          >
            <Sparkle color={colors.modules.aly} size={20} weight="fill" />
            <Text style={styles.alyCardText}>Talk to Aly to get started</Text>
            <ArrowRight color={colors.modules.aly} size={14} weight="light" />
          </TouchableOpacity>
        )}

        {pinnedHubs.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>PINNED</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.pinnedRow}
            >
              {pinnedHubs.map(hub => (
                <TouchableOpacity
                  key={hub.id}
                  style={styles.pinnedItem}
                  onPress={() => navigateToHub(hub)}
                  activeOpacity={0.75}
                >
                  <SpaceIcon
                    icon={hub.icon || 'Folder'}
                    color={hub.color || colors.modules.track}
                    size={44}
                    iconSize={20}
                    weight="light"
                  />
                  <Text style={styles.pinnedName} numberOfLines={1}>{hub.name}</Text>
                  <Text style={styles.pinnedSpace} numberOfLines={1}>{hub.space_name || ''}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* 5. Recent activity — spaces as proxy */}
        {spaces.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionRow}>
              <Text style={styles.sectionLabel}>SPACES</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Spaces')}>
                <Text style={styles.sectionLink}>See all</Text>
              </TouchableOpacity>
            </View>
            {spaces.slice(0, 5).map(space => (
              <TouchableOpacity
                key={space.id}
                style={styles.spaceRow}
                onPress={() => navigation.navigate('Main', {
                  screen: space.id,
                  params: { space },
                })}
                activeOpacity={0.75}
              >
                <SpaceIcon icon={space.icon || 'Folder'} color={space.color} size={36} iconSize={18} weight="light" />
                <View style={styles.spaceInfo}>
                  <Text style={styles.spaceName}>{space.name}</Text>
                  <Text style={styles.spaceSub}>
                    {space.hubs?.length ?? 0} {space.hubs?.length === 1 ? 'hub' : 'hubs'}
                  </Text>
                </View>
                <CheckSquare color={colors.text.tertiary} size={16} weight="light" />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {spaces.length === 0 && (
          <TouchableOpacity
            style={styles.emptySpaces}
            onPress={() => navigation.navigate('CreateSpace')}
          >
            <Text style={styles.emptySpacesText}>Create your first space to get started</Text>
            <ArrowRight color={colors.modules.aly} size={14} weight="light" />
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  scroll: {
    paddingHorizontal: 20,
    paddingBottom: 120,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },

  // Greeting
  greeting: {
    paddingTop: 8,
    paddingBottom: 20,
    gap: 4,
  },
  greetingText: {
    fontSize: 22,
    fontWeight: '500',
    color: colors.text.primary,
  },
  greetingDate: {
    fontSize: 13,
    color: colors.text.tertiary,
  },

  insight: {
    fontSize: 13,
    color: colors.modules.aly,
    fontStyle: 'italic',
    marginTop: -8,
    marginBottom: 16,
    lineHeight: 18,
  },
  alyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 0.5,
    borderColor: colors.modules.aly + '50',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 24,
    backgroundColor: colors.modules.aly + '08',
  },
  alyCardText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: colors.modules.aly,
  },

  // Vault banner
  vaultBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.background.secondary,
    borderWidth: 0.5,
    borderColor: colors.border.primary,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 16,
  },
  vaultBannerText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.text.primary,
  },

  // Daily brief card
  card: {
    backgroundColor: colors.background.secondary,
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: colors.border.primary,
    padding: 16,
    marginBottom: 24,
    gap: 12,
  },
  cardLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: colors.text.tertiary,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  briefList: {
    gap: 8,
  },
  briefRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  briefDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  briefText: {
    flex: 1,
    fontSize: 13,
    color: colors.text.primary,
  },
  briefTime: {
    fontSize: 11,
    color: colors.text.tertiary,
  },
  briefEmpty: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  briefEmptyText: {
    fontSize: 13,
    color: colors.text.secondary,
    fontStyle: 'italic',
  },
  briefLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 4,
    borderTopWidth: 0.5,
    borderTopColor: colors.border.primary,
  },
  briefLinkText: {
    fontSize: 12,
    color: colors.text.tertiary,
  },

  // Section
  section: {
    marginBottom: 24,
    gap: 12,
  },
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: colors.text.tertiary,
    letterSpacing: 1.5,
  },
  sectionLink: {
    fontSize: 11,
    color: colors.modules.aly,
  },

  // Pinned hubs
  pinnedRow: {
    gap: 12,
    paddingRight: 4,
  },
  pinnedItem: {
    alignItems: 'center',
    width: 70,
    gap: 6,
  },
  pinnedName: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.text.primary,
    textAlign: 'center',
  },
  pinnedSpace: {
    fontSize: 10,
    color: colors.text.tertiary,
    textAlign: 'center',
  },

  // Spaces list
  spaceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: colors.border.primary,
    padding: 12,
    gap: 12,
    marginBottom: 8,
  },
  spaceInfo: {
    flex: 1,
    gap: 3,
  },
  spaceName: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text.primary,
  },
  spaceSub: {
    fontSize: 11,
    color: colors.text.tertiary,
  },

  // Empty
  emptySpaces: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: colors.background.secondary,
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: colors.border.primary,
    padding: 20,
  },
  emptySpacesText: {
    fontSize: 13,
    color: colors.text.tertiary,
  },
})
