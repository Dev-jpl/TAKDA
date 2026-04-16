import React, { useEffect, useRef } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { House, Wrench, SquaresFour, Sparkle } from 'phosphor-react-native'
import { colors } from '../../constants/colors'

const { width } = Dimensions.get('window')

function TabItem({ label, icon, active, onPress, activeColor }) {
  return (
    <TouchableOpacity style={styles.tab} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.tabInner}>
        {React.cloneElement(icon, {
          color: active ? activeColor : colors.text.tertiary,
          size: 20,
          weight: active ? 'bold' : 'light',
        })}
        {active && (
          <Text style={[styles.tabLabel, { color: activeColor }]}>
            {label}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  )
}

export default function BottomNav({ 
  visible, 
  activeTab, 
  onHomePress, 
  onQuickToolsPress, 
  onSpacesPress,
  onAlyPress 
}) {
  const insets = useSafeAreaInsets()
  const translateY = useRef(new Animated.Value(visible ? 0 : 100)).current
  const opacity = useRef(new Animated.Value(visible ? 1 : 0)).current

  useEffect(() => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: visible ? 0 : 100,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: visible ? 1 : 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start()
  }, [visible])

  // Map activeTab to index for animated pill if needed, but for now we'll stick to a clean segment style
  const isHome = activeTab === 'Home'
  const isTools = activeTab === 'QuickTools'
  const isSpaces = activeTab === 'Spaces'

  return (
    <Animated.View
      style={[
        styles.wrapper,
        {
          paddingBottom: Math.max(insets.bottom, 20),
          transform: [{ translateY }],
          opacity,
        },
      ]}
      pointerEvents={visible ? 'auto' : 'none'}
    >
      <View style={styles.contentContainer}>
        {/* Main Navigation Pill */}
        <View style={styles.navBar}>
          <TabItem
            label="Home"
            icon={<House />}
            active={isHome}
            onPress={onHomePress}
            activeColor={colors.status.info}
          />
          <TabItem
            label="Spaces"
            icon={<SquaresFour />}
            active={isSpaces}
            onPress={onSpacesPress}
            activeColor={colors.modules.knowledge}
          />
          <TabItem
            label="Tools"
            icon={<Wrench />}
            active={isTools}
            onPress={onQuickToolsPress}
            activeColor={colors.modules.deliver}
          />
        </View>

        {/* Separated Aly Button */}
        <TouchableOpacity 
          style={styles.alyBtn} 
          onPress={onAlyPress}
          activeOpacity={0.8}
        >
          <Sparkle color="#fff" size={24} weight="fill" />
        </TouchableOpacity>
      </View>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 16,
    width: '100%',
  },
  navBar: {
    flexDirection: 'row',
    backgroundColor: colors.background.tertiary,
    borderRadius: 32,
    height: 64,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border.primary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 10,
    flex: 1,
  },
  alyBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.modules.aly,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border.primary,
    shadowColor: colors.modules.aly,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 15,
    elevation: 12,
  },
  tab: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
})
