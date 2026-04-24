import React, { useEffect, useRef } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { House, Wrench, SquaresFour, Sparkle } from 'phosphor-react-native'
import Svg, { Defs, LinearGradient as SvgGradient, Stop, Rect as SvgRect } from 'react-native-svg'
import { colors } from '../../constants/colors'

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true)
}

const { width, height } = Dimensions.get('window')

function TabItem({ label, icon, active, onPress, activeColor }) {
  return (
    <TouchableOpacity style={styles.tab} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.tabInner, active && styles.tabInnerActive]}>
        {React.cloneElement(icon, {
          color: active ? activeColor : colors.text.tertiary,
          size: 20,
          weight: active ? 'light' : 'thin',
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
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
  }, [activeTab])

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
      {/* SVG Gradient Background (Fallback for missing native module) */}
      <View style={[StyleSheet.absoluteFill, { top: -40 }]} pointerEvents="none">
        <Svg height="100%" width="100%">
          <Defs>
            <SvgGradient id="grad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="black" stopOpacity="0" />
              <Stop offset="1" stopColor="black" stopOpacity="0.9" />
            </SvgGradient>
          </Defs>
          <SvgRect x="0" y="0" width="100%" height="100%" fill="url(#grad)" />
        </Svg>
      </View>

      <View style={styles.contentContainer}>
        {/* Main Navigation Pill */}
        <View style={styles.navBar}>
          <TabItem
            label="Home"
            icon={<House />}
            active={isHome}
            onPress={onHomePress}
            activeColor="#FFFFFF"
          />
          <TabItem
            label="Spaces"
            icon={<SquaresFour />}
            active={isSpaces}
            onPress={onSpacesPress}
            activeColor="#FFFFFF"
          />
          <TabItem
            label="Tools"
            icon={<Wrench />}
            active={isTools}
            onPress={onQuickToolsPress}
            activeColor="#FFFFFF"
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
    backgroundColor: '#1c1c1e', // Richer dark
    borderRadius: 32,
    height: 60,
    paddingHorizontal: 6,
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
    flex: 1,
  },
  alyBtn: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.modules.aly,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.1)',
    shadowColor: colors.modules.aly,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 10,
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
    borderRadius: 24,
    overflow: 'hidden',
  },
  tabInnerActive: {
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
})
