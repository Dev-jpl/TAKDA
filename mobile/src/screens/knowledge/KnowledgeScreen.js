import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { colors } from '../../constants/colors'

export default function KnowledgeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.letter}>K</Text>
      <Text style={styles.name}>Knowledge</Text>
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
  letter: {
    fontSize: 64,
    fontWeight: '500',
    color: colors.text.primary,
    fontVariant: ['tabular-nums'],
  },
  name: {
    fontSize: 14,
    color: colors.text.tertiary,
    marginTop: 8,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
})