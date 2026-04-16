import React, { useEffect, useState, useCallback, useRef } from 'react'
import { View, StyleSheet } from 'react-native'
import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { supabase } from '../../services/supabase'

import LoginScreen from '../../screens/auth/LoginScreen'
import RegisterScreen from '../../screens/auth/RegisterScreen'
import SidebarNavigator from './SidebarNavigator'
import ProfileScreen from '../../screens/auth/ProfileScreen'
import SettingsScreen from '../../screens/settings/SettingsScreen'
import CreateSpaceScreen from '../../screens/home/CreateSpaceScreen'
import CoordinatorScreen from '../../screens/coordinator/CoordinatorScreen'
import AssistantQuiz from '../../screens/coordinator/QuizScreen'
import CalendarScreen from '../../screens/calendar/CalendarScreen'
import VaultScreen from '../../screens/vault/VaultScreen'
import StravaScreen from '../../screens/integrations/StravaScreen'
import FitnessScreen from '../../screens/integrations/FitnessScreen'
import HistoryScreen from '../../screens/home/HistoryScreen'
import BottomNav from './BottomNav'
import AlyButton from '../common/AlyButton'
import AlySheet from '../common/AlySheet'
import QuickToolsDrawer from '../../screens/quicktools/QuickToolsDrawer'
import { AlySheetProvider } from '../../context/AlySheetContext'
import { useFitnessSync } from '../../hooks/useFitnessSync'

const Stack = createNativeStackNavigator()

// Recursively find the deepest active route name
function getActiveRouteName(state) {
  if (!state || !state.routes) return null
  const route = state.routes[state.index ?? 0]
  if (route.state) return getActiveRouteName(route.state)
  return route.name
}

// Check if the drawer navigator inside Main is currently open
function isDrawerOpen(state) {
  if (!state?.routes) return false
  const mainRoute = state.routes.find(r => r.name === 'Main')
  if (!mainRoute?.state) return false
  return mainRoute.state.history?.some(h => h.type === 'drawer') ?? false
}

function AppShell({ session }) {
  useFitnessSync()
  const [activeRouteName, setActiveRouteName] = useState('Home')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [quickToolsVisible, setQuickToolsVisible] = useState(false)
  const [alySheetVisible, setAlySheetVisible] = useState(false)
  const navigationRef = useNavigationContainerRef()

  // Stable ref so any screen can call openSheet() via context
  const openAlySheetRef = useRef(() => setAlySheetVisible(true))

  const handleStateChange = useCallback((state) => {
    const name = getActiveRouteName(state)
    if (name) setActiveRouteName(name)
    setDrawerOpen(isDrawerOpen(state))
  }, [])

  const HUB_ROUTES = ['Hub', 'CreateHub']
  const AUTH_ROUTES = ['Login', 'Register']
  const isInHub = HUB_ROUTES.includes(activeRouteName)
  const isInAuth = AUTH_ROUTES.includes(activeRouteName)

  const bottomNavVisible = session && !isInHub && !isInAuth && !drawerOpen

  return (
    <AlySheetProvider sheetRef={openAlySheetRef}>
      <NavigationContainer ref={navigationRef} onStateChange={handleStateChange}>
        <View style={styles.root}>
          <Stack.Navigator
            screenOptions={{ headerShown: false }}
            initialRouteName={session ? 'Main' : 'Login'}
          >
            {session ? (
              <>
                <Stack.Screen name="Main" component={SidebarNavigator} />
                <Stack.Screen name="Profile" component={ProfileScreen} />
                <Stack.Screen name="Settings" component={SettingsScreen} />
                <Stack.Screen name="CreateSpace" component={CreateSpaceScreen} />
                <Stack.Screen name="Coordinator" component={CoordinatorScreen} />
                <Stack.Screen name="AssistantQuiz" component={AssistantQuiz} />
                <Stack.Screen name="Calendar" component={CalendarScreen} />
                <Stack.Screen name="Vault" component={VaultScreen} />
                <Stack.Screen name="Strava" component={StravaScreen} />
                <Stack.Screen name="Fitness" component={FitnessScreen} />
                <Stack.Screen name="History" component={HistoryScreen} />
              </>
            ) : (
              <>
                <Stack.Screen name="Login" component={LoginScreen} />
                <Stack.Screen name="Register" component={RegisterScreen} />
              </>
            )}
          </Stack.Navigator>

          {session && (
            <>
              <BottomNav
                visible={bottomNavVisible}
                activeTab={activeRouteName}
                onHomePress={() => navigationRef.isReady() && navigationRef.navigate('Main', { screen: 'Home' })}
                onQuickToolsPress={() => setQuickToolsVisible(true)}
                onSpacesPress={() => navigationRef.isReady() && navigationRef.navigate('Main', { screen: 'Spaces' })}
                onAlyPress={() => setAlySheetVisible(true)}
              />
              <AlyButton 
                visible={!bottomNavVisible} 
                onOpen={() => setAlySheetVisible(true)} 
              />
              <AlySheet
                visible={alySheetVisible}
                onClose={() => setAlySheetVisible(false)}
              />
              <QuickToolsDrawer
                visible={quickToolsVisible}
                onClose={() => setQuickToolsVisible(false)}
              />
            </>
          )}
        </View>
      </NavigationContainer>
    </AlySheetProvider>
  )
}

export default function RootNavigator() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) return null

  return <AppShell session={session} />
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
})
