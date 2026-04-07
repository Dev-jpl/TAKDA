import React, { useEffect, useRef } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { House, Wrench, SquaresFour } from 'phosphor-react-native'
import { colors } from '../../constants/colors'

function TabItem({ label, icon, active, onPress, activeColor }) {
  return (
    <TouchableOpacity style={styles.tab} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.tabInner}>
        {React.cloneElement(icon, {
          color: active ? activeColor : colors.text.tertiary,
          size: 22,
          weight: 'light',
        })}
        <Text style={[styles.tabLabel, active && { color: activeColor }]}>
          {label}
        </Text>
      </View>
    </TouchableOpacity>
  )
}

export default function BottomNav({ visible, activeTab, onHomePress, onQuickToolsPress, onSpacesPress }) {
  const insets = useSafeAreaInsets()
  const translateY = useRef(new Animated.Value(0)).current
  const opacity = useRef(new Animated.Value(1)).current

  useEffect(() => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: visible ? 0 : 100,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: visible ? 1 : 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start()
  }, [visible])

  return (
    <Animated.View
      style={[
        styles.container,
        {
          paddingBottom: Math.min(insets.bottom, 10),
          transform: [{ translateY }],
          opacity,
        },
      ]}
      pointerEvents={visible ? 'auto' : 'none'}
    >
      <View style={styles.border} />
      <View style={styles.tabs}>
        <TabItem
          label="Home"
          icon={<House />}
          active={activeTab === 'Home'}
          onPress={onHomePress}
          activeColor={colors.text.primary}
        />
        <TabItem
          label="Quick Access"
          icon={<Wrench />}
          active={activeTab === 'QuickTools'}
          onPress={onQuickToolsPress}
          activeColor={colors.modules.deliver}
        />
        <TabItem
          label="Spaces"
          icon={<SquaresFour />}
          active={activeTab === 'Spaces'}
          onPress={onSpacesPress}
          activeColor={colors.modules.knowledge}
        />
      </View>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.background.secondary,
  },
  border: {
    height: 0.5,
    backgroundColor: colors.border.primary,
  },
  tabs: {
    flexDirection: 'row',
    height: 56,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabInner: {
    alignItems: 'center',
    gap: 4,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: colors.text.tertiary,
    letterSpacing: 0.3,
  },
})
