import React from 'react'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import RootNavigator from './src/components/navigation/RootNavigator'

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <RootNavigator />
    </GestureHandlerRootView>
  )
}