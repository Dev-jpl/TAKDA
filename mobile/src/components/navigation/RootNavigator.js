import React, { useEffect, useState } from 'react'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { supabase } from '../../services/supabase'

import LoginScreen from '../../screens/auth/LoginScreen'
import RegisterScreen from '../../screens/auth/RegisterScreen'
import SidebarNavigator from './SidebarNavigator'
import HomeScreen from '../../screens/home/HomeScreen'
import ProfileScreen from '../../screens/auth/ProfileScreen'
import CreateSpaceScreen from '../../screens/home/CreateSpaceScreen'

const Stack = createNativeStackNavigator()

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

  return (
    <NavigationContainer>
      <Stack.Navigator 
        screenOptions={{ headerShown: false }}
        initialRouteName={session ? "Home" : "Login"}
      >
        {session ? (
          <>
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen name="Main" component={SidebarNavigator} />
            <Stack.Screen name="Profile" component={ProfileScreen} />
            <Stack.Screen name="CreateSpace" component={CreateSpaceScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  )
}