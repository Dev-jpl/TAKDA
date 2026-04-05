import React, { useEffect, useState, useCallback } from 'react'
import {
  View, Text, StyleSheet,
  TouchableOpacity, ScrollView,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { createDrawerNavigator } from '@react-navigation/drawer'
import { useFocusEffect } from '@react-navigation/native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { supabase } from '../../services/supabase'
import { spacesService } from '../../services/spaces'
import { colors } from '../../constants/colors'
import { ASSISTANT_NAME } from '../../constants/brand'
import SpaceIcon from '../common/SpaceIcon'
import {
  House, Calendar, Tray, Sparkle,
  Gear, User,
} from 'phosphor-react-native'

import HomeScreen from '../../screens/home/HomeScreen'
import CoordinatorScreen from '../../screens/coordinator/CoordinatorScreen'
import HubsScreen from '../../screens/hubs/HubsScreen'
import HubScreen from '../../screens/hubs/HubScreen'
import CreateHubScreen from '../../screens/hubs/CreateHubScreen'

const Drawer = createDrawerNavigator()
const Stack = createNativeStackNavigator()

const PINNED_KEY = 'pinned_hubs'

// ─── Sidebar content ────────────────────────────────────────────────────────

function CustomSidebar({ navigation }) {
  const [user, setUser] = useState(null)
  const [pinnedHubs, setPinnedHubs] = useState([])
  const [spaces, setSpaces] = useState([])

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user))
    loadPinnedHubs()
  }, [])

  const loadPinnedHubs = async () => {
    try {
      const raw = await AsyncStorage.getItem(PINNED_KEY)
      if (raw) setPinnedHubs(JSON.parse(raw))
    } catch (e) {
      console.warn('loadPinnedHubs error:', e)
    }
  }

  // Reload pinned hubs every time drawer opens
  useFocusEffect(useCallback(() => { loadPinnedHubs() }, []))

  const close = (cb) => {
    navigation.closeDrawer()
    setTimeout(cb, 150)
  }

  const navItem = (label, icon, color, onPress) => (
    <TouchableOpacity style={styles.navItem} onPress={() => close(onPress)} key={label}>
      <View style={[styles.iconCircle, { backgroundColor: color + '15' }]}>
        {icon}
      </View>
      <Text style={[styles.navLabel, label === `Ask ${ASSISTANT_NAME}` && { color: colors.modules.aly }]}>
        {label}
      </Text>
    </TouchableOpacity>
  )

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Text style={styles.brand}>TAKDA</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {navItem('Home', <House color={colors.text.secondary} size={18} weight="light" />, colors.text.secondary,
          () => navigation.navigate('Home'))}
        {navItem('Calendar', <Calendar color={colors.modules.track} size={18} weight="light" />, colors.modules.track,
          () => navigation.navigate('Calendar'))}
        {navItem('Vault', <Tray color={colors.modules.knowledge} size={18} weight="light" />, colors.modules.knowledge,
          () => navigation.navigate('Vault'))}
        {navItem(`Ask ${ASSISTANT_NAME}`, <Sparkle color={colors.modules.aly} size={18} weight="fill" />, colors.modules.aly,
          () => navigation.navigate('Coordinator'))}

        {pinnedHubs.length > 0 && (
          <>
            <View style={styles.divider} />
            <Text style={styles.sectionLabel}>PINNED</Text>
            {pinnedHubs.map(hub => {
              const space = spaces.find(s => s.id === hub.space_id)
              return (
                <TouchableOpacity
                  key={hub.id}
                  style={styles.hubItem}
                  onPress={() => close(() => navigation.navigate(hub.space_id, {
                    screen: 'Hub',
                    params: { hub, space: space || { id: hub.space_id } },
                  }))}
                >
                  <SpaceIcon icon={hub.icon || 'Folder'} color={hub.color || colors.modules.track} size={30} iconSize={15} weight="light" />
                  <View style={styles.hubInfo}>
                    <Text style={styles.hubName} numberOfLines={1}>{hub.name}</Text>
                    <Text style={styles.hubSpace} numberOfLines={1}>{hub.space_name || ''}</Text>
                  </View>
                </TouchableOpacity>
              )
            })}
          </>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.divider} />
        <TouchableOpacity style={styles.footerItem} onPress={() => close(() => navigation.navigate('Profile'))}>
          <Gear color={colors.text.tertiary} size={18} weight="light" />
          <Text style={styles.footerLabel}>Settings</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.footerItem} onPress={() => close(() => navigation.navigate('Profile'))}>
          <User color={colors.text.tertiary} size={18} weight="light" />
          <Text style={styles.footerLabel}>Profile</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

// ─── Space stack ─────────────────────────────────────────────────────────────

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

// ─── Navigator ───────────────────────────────────────────────────────────────

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
        overlayColor: 'rgba(0,0,0,0.6)',
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
      {spaces.length === 0 && (
        <Drawer.Screen name="NoSpaces" component={HubsScreen} />
      )}
    </Drawer.Navigator>
  )
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.secondary,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 20,
  },
  brand: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text.tertiary,
    letterSpacing: 4,
  },
  scroll: {
    paddingBottom: 12,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: 20,
    gap: 12,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text.primary,
  },
  divider: {
    height: 0.5,
    backgroundColor: colors.border.primary,
    marginHorizontal: 20,
    marginVertical: 10,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: colors.text.tertiary,
    letterSpacing: 1.5,
    paddingHorizontal: 20,
    marginBottom: 6,
  },
  hubItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    gap: 10,
  },
  hubInfo: {
    flex: 1,
    gap: 2,
  },
  hubName: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.text.primary,
  },
  hubSpace: {
    fontSize: 11,
    color: colors.text.tertiary,
  },
  footer: {
    paddingBottom: 8,
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    gap: 12,
  },
  footerLabel: {
    fontSize: 13,
    color: colors.text.tertiary,
  },
})
