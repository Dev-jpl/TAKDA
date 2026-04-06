import React, { useEffect, useRef } from 'react'
import {
  TouchableOpacity,
  StyleSheet,
  Animated,
  View,
} from 'react-native'
import { Sparkle } from 'phosphor-react-native'
import { colors } from '../../constants/colors'

export default function AlyButton({ onOpen, hasProactiveSuggestion = false }) {
  const breathAnim = useRef(new Animated.Value(0.85)).current

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(breathAnim, {
          toValue: 1.0,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(breathAnim, {
          toValue: 0.85,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start()
  }, [])

  return (
    <Animated.View style={[styles.fab, { opacity: breathAnim }]}>
      <TouchableOpacity
        style={styles.touch}
        onPress={onOpen}
        activeOpacity={0.8}
      >
        <Sparkle color="#fff" size={24} weight="fill" />
        {hasProactiveSuggestion && <View style={styles.badge} />}
      </TouchableOpacity>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: 90,
    right: 20,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.modules.aly,
    shadowColor: colors.modules.aly,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 8,
  },
  touch: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 26,
  },
  badge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: colors.modules.aly,
  },
})
