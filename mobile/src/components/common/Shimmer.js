/**
 * Shimmer.js — premium animated skeleton placeholder
 *
 * Uses a looping translateX animation to sweep a highlight across the element,
 * exactly like Messenger / Instagram skeleton loaders.
 *
 * Usage:
 *   <Shimmer style={{ width: '80%', height: 14, borderRadius: 6 }} />
 *   <Shimmer.Card style={{ height: 120 }} />
 *   <Shimmer.Row widths={['60%', '40%', '80%']} />
 */

import React, { useEffect, useRef } from 'react'
import { Animated, StyleSheet, View } from 'react-native'

// ── Shared loop (single Animated.Value driving all Shimmer instances) ────────
// We can't truly share across components in RN, but we keep individual
// animations tight (same duration = they look in-sync visually).
const DURATION = 1100

function Shimmer({ style, children }) {
  const translateX = useRef(new Animated.Value(-1)).current

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(translateX, {
          toValue: 1,
          duration: DURATION,
          useNativeDriver: true,
        }),
        Animated.timing(translateX, {
          toValue: -1,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    )
    loop.start()
    return () => loop.stop()
  }, [translateX])

  return (
    <View style={[sh.base, style]} overflow="hidden">
      {/* Dark base */}
      <View style={StyleSheet.absoluteFill} />
      {/* Sweep highlight */}
      <Animated.View
        style={[
          sh.sweep,
          {
            transform: [
              {
                translateX: translateX.interpolate({
                  inputRange: [-1, 1],
                  outputRange: ['-100%', '200%'],
                }),
              },
            ],
          },
        ]}
      />
      {children}
    </View>
  )
}

// ── Preset compositions ───────────────────────────────────────────────────────

/** A row of shimmer bars — widths is an array like ['60%', '40%'] */
Shimmer.Row = function ShimmerRow({ widths = ['80%', '60%', '70%'], gap = 10, style }) {
  return (
    <View style={[{ gap }, style]}>
      {widths.map((w, i) => (
        <Shimmer key={i} style={{ height: 11, borderRadius: 5, width: w }} />
      ))}
    </View>
  )
}

/** Card-shaped skeleton */
Shimmer.Card = function ShimmerCard({ style, children }) {
  return (
    <View style={[sh.card, style]}>
      {children}
    </View>
  )
}

/** Hub card pair (2 columns) */
Shimmer.HubPair = function ShimmerHubPair() {
  return (
    <View style={sh.hubRow}>
      <HubCardSkel />
      <HubCardSkel />
    </View>
  )
}

function HubCardSkel() {
  return (
    <Shimmer.Card style={sh.hubCard}>
      <Shimmer style={sh.hubIcon} />
      <View style={{ gap: 6, marginTop: 8 }}>
        <Shimmer style={{ height: 13, borderRadius: 4, width: '72%' }} />
        <Shimmer style={{ height: 10, borderRadius: 4, width: '45%' }} />
      </View>
    </Shimmer.Card>
  )
}

/** Module content skeleton (inside a hub screen) */
Shimmer.Module = function ShimmerModule() {
  return (
    <View style={{ flex: 1, padding: 16, gap: 14 }}>
      {/* Summary card */}
      <Shimmer.Card style={{ height: 128, borderRadius: 18 }}>
        <View style={{ flex: 1, padding: 14, gap: 12 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Shimmer style={{ height: 28, width: 60, borderRadius: 6 }} />
            <Shimmer style={{ height: 12, width: 40, borderRadius: 4 }} />
            <Shimmer style={{ height: 28, width: 60, borderRadius: 6 }} />
          </View>
          <Shimmer style={{ height: 6, borderRadius: 3 }} />
          <View style={{ gap: 6 }}>
            <Shimmer style={{ height: 4, borderRadius: 2, width: '100%' }} />
            <Shimmer style={{ height: 4, borderRadius: 2, width: '100%' }} />
          </View>
        </View>
      </Shimmer.Card>
      {/* Log button */}
      <Shimmer style={{ height: 44, borderRadius: 12 }} />
      {/* Rows */}
      {[0, 1].map(i => (
        <Shimmer.Card key={i} style={{ height: 80, borderRadius: 14 }}>
          <View style={{ flex: 1, padding: 14, gap: 8 }}>
            <Shimmer style={{ height: 12, width: '50%', borderRadius: 4 }} />
            <Shimmer style={{ height: 10, width: '70%', borderRadius: 4 }} />
            <Shimmer style={{ height: 10, width: '40%', borderRadius: 4 }} />
          </View>
        </Shimmer.Card>
      ))}
    </View>
  )
}

/** Bottom nav bar skeleton */
Shimmer.BottomNav = function ShimmerBottomNav({ count = 3 }) {
  return (
    <View style={sh.navBar}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={sh.navItem}>
          <Shimmer style={{ width: 28, height: 9, borderRadius: 4 }} />
        </View>
      ))}
    </View>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────
const sh = StyleSheet.create({
  base: {
    backgroundColor: '#161616',
    overflow: 'hidden',
    position: 'relative',
  },
  sweep: {
    position: 'absolute',
    top: 0, bottom: 0,
    width: '55%',
    backgroundColor: 'rgba(255,255,255,0.04)',
    // Soft-edged via transform; RN doesn't do CSS gradients here
    // but the translateX loop gives a convincing shimmer
  },
  card: {
    backgroundColor: '#121212',
    borderRadius: 18,
    borderWidth: 0.5,
    borderColor: '#222',
    overflow: 'hidden',
  },
  hubRow: {
    flexDirection: 'row',
    gap: 12,
  },
  hubCard: {
    flex: 1,
    borderRadius: 14,
    padding: 16,
    gap: 0,
    minHeight: 110,
  },
  hubIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
  },
  navBar: {
    flexDirection: 'row',
    borderTopWidth: 0.5,
    borderTopColor: '#1e1e1e',
    backgroundColor: '#0a0a0a',
    paddingTop: 14,
    paddingBottom: 32,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
})

export default Shimmer
