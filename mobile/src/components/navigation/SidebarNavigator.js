import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { createDrawerNavigator } from '@react-navigation/drawer'
import { supabase } from '../../services/supabase'
import { spacesService } from '../../services/spaces'
import { colors } from '../../constants/colors'
import SpaceIcon from '../common/SpaceIcon'
import { House, User, Plus, Sparkle, Calendar } from 'phosphor-react-native'
import { ASSISTANT_NAME } from '../../constants/brand'

import HubsScreen from '../../screens/hubs/HubsScreen'
import HubScreen from '../../screens/hubs/HubScreen'
import CreateHubScreen from '../../screens/hubs/CreateHubScreen'
import ProfileQuickModal from './ProfileQuickModal'
import CoordinatorScreen from '../../screens/coordinator/CoordinatorScreen'
import HomeScreen from '../../screens/home/HomeScreen'

const Drawer = createDrawerNavigator()

function CustomSidebar(props) {
  const { state, navigation } = props
  const [spaces, setSpaces] = useState([])
  const [user, setUser] = useState(null)
  const [isModalVisible, setModalVisible] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
      if (user) loadSpaces(user.id)
    })

    // Refresh spaces when the sidebar might have been affected by a navigation back
    const unsubscribe = navigation.addListener('state', () => {
      if (user) loadSpaces(user.id)
    })
    return unsubscribe
  }, [user?.id, navigation])

  const loadSpaces = async (userId) => {
    try {
      const data = await spacesService.getSpaces(userId)
      setSpaces(data)
    } catch (e) {
      console.warn('Sidebar loadSpaces error:', e)
    }
  }

  const activeIndex = state.index
  const activeRouteName = state.routeNames[activeIndex]

  const initials = user?.user_metadata?.full_name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.contentWrapper}>
        <View style={styles.header}>
          <Text style={styles.brand}>TAKDA</Text>
        </View>

        <ScrollView contentContainerStyle={styles.scroll}>
          {/* Home Link */}
          <TouchableOpacity
            style={styles.navItem}
            onPress={() => {
              navigation.closeDrawer()
              navigation.navigate('Home')
            }}
          >
            <View style={styles.iconCircle}>
              <House color={colors.text.secondary} size={20} weight="light" />
            </View>
            <Text style={styles.navLabel}>Home</Text>
          </TouchableOpacity>

          {/* Calendar Link */}
          <TouchableOpacity
            style={styles.navItem}
            onPress={() => {
              navigation.closeDrawer()
              navigation.navigate('Calendar')
            }}
          >
            <View style={[styles.iconCircle, { backgroundColor: colors.modules.track + '15' }]}>
              <Calendar color={colors.modules.track} size={20} weight="light" />
            </View>
            <Text style={styles.navLabel}>Calendar</Text>
          </TouchableOpacity>

          {/* Aly Global Trigger */}
          <TouchableOpacity
            style={styles.navItem}
            onPress={() => {
              navigation.closeDrawer()
              navigation.navigate('Coordinator')
            }}
          >
            <View style={[styles.iconCircle, { backgroundColor: colors.modules.aly + '15' }]}>
              <Sparkle color={colors.modules.aly} size={20} weight="fill" />
            </View>
            <Text style={[styles.navLabel, { color: colors.modules.aly }]}>Ask {ASSISTANT_NAME}</Text>
          </TouchableOpacity>

          <View style={styles.divider} />

          {/* Spaces Section Header & New Space */}
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionHeader}>Spaces</Text>
            <TouchableOpacity 
              onPress={() => navigation.navigate('CreateSpace')}
              hitSlop={{ top: 25, bottom: 25, left: 25, right: 25 }}
            >
              <Plus size={16} color={colors.text.tertiary} weight="bold" />
            </TouchableOpacity>
          </View>

          {/* Spaces List */}
          {spaces.map((space) => {
            const isActive = activeRouteName === space.id
            return (
              <TouchableOpacity
                key={space.id}
                style={[
                  styles.item,
                  isActive && { borderLeftColor: space.color, backgroundColor: colors.background.tertiary }
                ]}
                onPress={() => {
                  navigation.navigate(space.id, { space })
                  navigation.closeDrawer()
                }}
              >
                <SpaceIcon
                  icon={space.icon}
                  color={space.color}
                  size={32}
                  iconSize={16}
                  weight={isActive ? 'regular' : 'light'}
                />
                <Text style={[styles.label, isActive && { color: colors.text.primary }]}>
                  {space.name}
                </Text>
              </TouchableOpacity>
            )
          })}
        </ScrollView>

        <View style={styles.footer}>
          <View style={styles.divider} />
          {/* Profile Quick Actions trigger at the absolute bottom */}
          <TouchableOpacity
            style={styles.profileBtn}
            onPress={() => setModalVisible(true)}
          >
            <View style={styles.miniAvatar}>
              <Text style={styles.miniAvatarText}>{initials}</Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName} numberOfLines={1}>
                {user?.user_metadata?.full_name || 'User'}
              </Text>
              <Text style={styles.profileStatus}>Verified OS</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      <ProfileQuickModal 
        visible={isModalVisible} 
        onClose={() => setModalVisible(false)} 
        navigation={navigation}
        user={user}
      />
    </SafeAreaView>
  )
}

export default function SidebarNavigator() {
  const [spaces, setSpaces] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        spacesService.getSpaces(user.id).then(data => {
          setSpaces(data)
          setLoading(false)
        })
      }
    })
  }, [])

  if (loading) return null

  return (
    <Drawer.Navigator
      drawerContent={(props) => <CustomSidebar {...props} />}
      screenOptions={{
        headerShown: false,
        drawerType: 'front',
        drawerStyle: {
          width: 260,
          backgroundColor: colors.background.secondary,
          borderRightWidth: 0.5,
          borderRightColor: colors.border.primary,
        },
        overlayColor: 'rgba(0,0,0,0.7)',
      }}
    >
      <Drawer.Screen name="Home" component={HomeScreen} />
      <Drawer.Screen name="Coordinator" component={CoordinatorScreen} />
      {spaces.map(space => (
        <Drawer.Screen
          key={space.id}
          name={space.id}
          component={SpaceStack}
          initialParams={{ space }}
        />
      ))}
      {/* Fallback if no spaces */}
      {spaces.length === 0 && (
         <Drawer.Screen name="NoSpaces" component={HubsScreen} />
      )}
    </Drawer.Navigator>
  )
}

// Each space has its own stack: Hubs -> Hub -> HubDetail
import { createNativeStackNavigator } from '@react-navigation/native-stack'
const Stack = createNativeStackNavigator()

function SpaceStack({ route }) {
  const { space } = route.params
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="HubsList" component={HubsScreen} initialParams={{ space }} />
      <Stack.Screen name="Hub" component={HubScreen} />
      <Stack.Screen name="CreateHub" component={CreateHubScreen} />
    </Stack.Navigator>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.secondary,
  },
  contentWrapper: {
    flex: 1,
    justifyContent: 'space-between',
  },
  header: {
    padding: 24,
    paddingTop: 40,
  },
  brand: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.tertiary,
    letterSpacing: 4,
  },
  scroll: {
    flex: 1,
    paddingVertical: 10,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 12,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.background.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navLabel: {
    fontSize: 15,
    color: colors.text.primary,
    fontWeight: '500',
  },
  divider: {
    height: 0.5,
    backgroundColor: colors.border.primary,
    marginHorizontal: 16,
    marginVertical: 12,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingRight: 20,
    marginBottom: 8,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginLeft: 16,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderLeftWidth: 3,
    borderLeftColor: 'transparent',
    gap: 12,
  },
  label: {
    fontSize: 14,
    color: colors.text.secondary,
    fontWeight: '500',
  },
  footer: {
    paddingBottom: 20,
  },
  profileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  miniAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.modules.track + '20',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.modules.track + '40',
  },
  miniAvatarText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.modules.track,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
  },
  profileStatus: {
    fontSize: 11,
    color: colors.text.tertiary,
    marginTop: 1,
  },
});
