export default function CompassNavigator({ space }) {
  // ... existing code stays the same ...
  // just pass space down to each screen
  const ActiveScreen = SCREENS[activeModule]

  return (
    <View style={styles.container}>
      <GestureDetector gesture={gesture}>
        <Animated.View style={[styles.screen, animatedStyle]}>
          <ActiveScreen space={space} />
        </Animated.View>
      </GestureDetector>

      {/* Compass HUD */}
      <View style={styles.hud}>
        <View style={styles.compassRow}>
          <CompassDot
            label="K"
            active={activeModule === 'knowledge'}
            onPress={() => navigateTo('knowledge')}
          />
        </View>
        <View style={styles.compassRow}>
          <CompassDot
            label="T"
            active={activeModule === 'track'}
            onPress={() => navigateTo('track')}
          />
          <View style={styles.compassCenter}>
            <Text style={styles.compassLogo}>·</Text>
          </View>
          <CompassDot
            label="A"
            active={activeModule === 'annotate'}
            onPress={() => navigateTo('annotate')}
          />
        </View>
        <View style={styles.compassRow}>
          <CompassDot
            label="D"
            active={activeModule === 'deliver'}
            onPress={() => navigateTo('deliver')}
          />
        </View>
      </View>
    </View>
  )
}