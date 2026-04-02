import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
} from 'react-native'
import { useFocusEffect, DrawerActions } from '@react-navigation/native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { supabase } from '../../services/supabase'
import { spacesService } from '../../services/spaces'
import { hubsService } from '../../services/hubs'
import { colors } from '../../constants/colors'
import { User, Plus, Sparkle, Calendar, Clock, List } from 'phosphor-react-native'
import KalayFAB from '../../components/common/KalayFAB'
import SpaceIcon from '../../components/common/SpaceIcon'
import { eventService } from '../../services/events'

export default function HomeScreen({ navigation }) {
  const [spaces, setSpaces] = useState([])
  const [recentHubs, setRecentHubs] = useState([])
  const [upcomingEvents, setUpcomingEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [user, setUser] = useState(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user))
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
      const spacesData = await spacesService.getSpaces(user.id)
      setSpaces(spacesData)

      if (spacesData.length > 0) {
        const hubsResults = await Promise.all(spacesData.slice(0, 3).map(s => hubsService.getHubs(s.id)))
        setRecentHubs(hubsResults.flat().slice(0, 6))
      }

      const eventsData = await eventService.getEvents(user.id)
      setUpcomingEvents(eventsData.slice(0, 3))
    } catch (e) {
      console.warn('loadAllData error:', e)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleSpacePress = (space) => {
    navigation.navigate(space.id, { space })
  }

  const renderHeader = () => (
    <View style={styles.header}>

      {/* Top bar */}
      <View style={styles.topNav}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <TouchableOpacity
            onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
            style={styles.menuBtn}
          >
            <List color={colors.text.secondary} size={20} weight="light" />
          </TouchableOpacity>
          <Text style={styles.brand}>TAKDA</Text>
        </View>
        <TouchableOpacity
          style={styles.avatarBtn}
          onPress={() => navigation.navigate('Profile')}
          hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
        >
          <User color={colors.text.secondary} size={16} weight="light" />
        </TouchableOpacity>
      </View>

      {/* Recents Quick Access */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recents</Text>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.recentsList}
        >
          {recentHubs.map((hub) => (
            <TouchableOpacity 
              key={hub.id} 
              style={styles.recentItem}
              onPress={() => navigation.navigate('Main', { 
                screen: hub.space_id, 
                params: { 
                  screen: 'Hub', 
                  params: { hub, space: { id: hub.space_id } } 
                } 
              })}
            >
              <View style={[styles.recentIcon, { backgroundColor: hub.color + '15' }]}>
                <SpaceIcon icon={hub.icon} color={hub.color} size={28} iconSize={14} />
              </View>
              <Text style={styles.recentLabel} numberOfLines={1}>{hub.name}</Text>
            </TouchableOpacity>
          ))}
          {recentHubs.length === 0 && (
            <Text style={styles.emptyRecentText}>No recent activity</Text>
          )}
        </ScrollView>
      </View>

      {/* Upcoming missions */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Upcoming</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Calendar')}>
            <Text style={styles.sectionLink}>See all</Text>
          </TouchableOpacity>
        </View>

        {upcomingEvents.length > 0 ? (
          <View style={styles.eventList}>
            {upcomingEvents.map((event) => (
              <TouchableOpacity key={event.id} style={styles.eventRow} activeOpacity={0.7}>
                <View style={[styles.eventAccent, { backgroundColor: event.color || colors.modules.kalay }]} />
                <View style={styles.eventInfo}>
                  <Text style={styles.eventTitle} numberOfLines={1}>{event.title}</Text>
                  <View style={styles.eventMeta}>
                    <Clock size={11} color={colors.text.tertiary} />
                    <Text style={styles.eventTime}>
                      {new Date(event.start_time).toLocaleDateString([], {
                        month: 'short', day: 'numeric',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <TouchableOpacity style={styles.emptyEvent} onPress={() => navigation.navigate('Calendar')}>
            <Sparkle size={14} color={colors.text.tertiary} />
            <Text style={styles.emptyEventText}>No upcoming events</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Spaces header */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Spaces</Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('CreateSpace')}
          hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
        >
          <Plus color={colors.text.tertiary} size={16} weight="bold" />
        </TouchableOpacity>
      </View>

    </View>
  )

  const renderSpace = ({ item }) => (
    <TouchableOpacity
      style={styles.spaceRow}
      onPress={() => handleSpacePress(item)}
      onLongPress={() => {}}
      activeOpacity={0.75}
    >
      <SpaceIcon icon={item.icon || 'Folder'} color={item.color} size={38} iconSize={19} weight="light" />
      <View style={styles.spaceInfo}>
        <Text style={styles.spaceName}>{item.name}</Text>
        <Text style={styles.spaceSub}>{item.category || 'Life Domain'}</Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </TouchableOpacity>
  )

  const renderFooter = () => (
    <TouchableOpacity style={styles.addSpace} onPress={() => navigation.navigate('CreateSpace')} activeOpacity={0.7}>
      <Plus color={colors.text.tertiary} size={14} weight="bold" />
      <Text style={styles.addSpaceText}>New space</Text>
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
        renderItem={renderSpace}
        ListHeaderComponent={renderHeader}
        ListFooterComponent={renderFooter}
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
      <KalayFAB />
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
    paddingBottom: 100,
  },

  // Header
  header: {
    paddingTop: 8,
    paddingBottom: 16,
  },
  topNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  brand: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.text.tertiary,
    letterSpacing: 5,
  },
  avatarBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.background.secondary,
    borderWidth: 0.5,
    borderColor: colors.border.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.background.secondary,
    borderWidth: 0.5,
    borderColor: colors.border.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Recents
  recentsList: {
    paddingVertical: 12,
    gap: 16,
  },
  recentItem: {
    alignItems: 'center',
    width: 64,
  },
  recentIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  recentLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: colors.text.secondary,
    textAlign: 'center',
  },
  emptyRecentText: {
    fontSize: 11,
    color: colors.text.tertiary,
    fontStyle: 'italic',
    paddingVertical: 10,
  },

  // Section
  section: {
    backgroundColor: colors.background.secondary,
    borderRadius: 16,
    borderWidth: 0.5,
    borderColor: colors.border.primary,
    padding: 16,
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  sectionLink: {
    fontSize: 11,
    color: colors.modules.kalay,
    fontWeight: '600',
    letterSpacing: 0.5,
  },

  // Events
  eventList: {
    gap: 8,
  },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.tertiary,
    borderRadius: 10,
    padding: 10,
    gap: 10,
    borderWidth: 0.5,
    borderColor: colors.border.primary,
  },
  eventAccent: {
    width: 3,
    height: 28,
    borderRadius: 2,
  },
  eventInfo: {
    flex: 1,
    gap: 3,
  },
  eventTitle: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.text.primary,
  },
  eventMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  eventTime: {
    fontSize: 11,
    color: colors.text.tertiary,
  },
  emptyEvent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
  },
  emptyEventText: {
    fontSize: 13,
    color: colors.text.tertiary,
  },

  // Spaces list
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
  addSpace: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background.secondary,
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: colors.border.primary,
    borderStyle: 'dashed',
    padding: 14,
    gap: 8,
    marginTop: 4,
  },
  addSpaceText: {
    fontSize: 13,
    color: colors.text.tertiary,
  },
})
