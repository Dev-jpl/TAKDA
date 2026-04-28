import React from 'react'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import RootNavigator from './src/components/navigation/RootNavigator'
import { UserProfileProvider } from './src/context/UserProfileContext'

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <UserProfileProvider>
          <RootNavigator />
        </UserProfileProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}