// mobile/src/screens/track/TrackScreen.js
import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { colors } from '../../constants/colors'

export default function TrackScreen({ space }) {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Track</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 16,
    color: colors.text.tertiary,
    letterSpacing: 2,
  },
})