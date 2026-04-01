import 'react-native-gesture-handler'
import React, { useEffect, useState } from 'react'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { supabase } from '../../services/supabase'

import LoginScreen from '../../screens/auth/LoginScreen'
import RegisterScreen from '../../screens/auth/RegisterScreen'
import HomeScreen from '../../screens/home/HomeScreen'
import CreateSpaceScreen from '../../screens/home/CreateSpaceScreen'
import SpaceScreen from '../../screens/space/SpaceScreen'

const Stack = createNativeStackNavigator()

export default function RootNavigator() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
  }, [])

  if (loading) return null

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {session ? (
          <>
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen name="CreateSpace" component={CreateSpaceScreen} />
            <Stack.Screen name="Space" component={SpaceScreen} />
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