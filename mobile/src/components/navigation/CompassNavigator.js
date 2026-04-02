import React, { useState, useEffect, useRef } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
} from "react-native-reanimated";
import { colors } from "../../constants/colors";

import TrackScreen from "../../screens/track/TrackScreen";
import AnnotateScreen from "../../screens/annotate/AnnotateScreen";
import KnowledgeScreen from "../../screens/knowledge/KnowledgeScreen";
import DeliverScreen from "../../screens/deliver/DeliverScreen";
import AutomateScreen from "../../screens/automate/AutomateScreen";

const SCREENS = {
  track: TrackScreen,
  annotate: AnnotateScreen,
  knowledge: KnowledgeScreen,
  deliver: DeliverScreen,
  automate: AutomateScreen,
};

const MODULES = [
  { key: "track",    label: "T" },
  { key: "annotate", label: "A" },
  { key: "knowledge",label: "K" },
  { key: "deliver",  label: "D" },
  { key: "automate", label: "A" },
];

// ─── Compass Dot ────────────────────────────────────────────────────────────

function CompassDot({ label, active, onPress }) {
  return (
    <Pressable onPress={onPress} style={styles.dotWrap}>
      <View style={[styles.dot, active && styles.dotActive]}>
        <Text style={[styles.dotLabel, active && styles.dotLabelActive]}>
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

// ─── Main Navigator ──────────────────────────────────────────────────────────

export default function CompassNavigator({ hub, space }) {
  const [activeModule, setActiveModule] = useState("track");
  const [compassOpen, setCompassOpen] = useState(false);
  const hideTimerRef = useRef(null);

  const compassOpacity = useSharedValue(0);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  // Reset compass when space changes
  useEffect(() => {
    compassOpacity.value = 0;
    setCompassOpen(false);
    setActiveModule("track");
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
  }, [space?.id, hub?.id]);

  const navigateTo = (module) => {
    setActiveModule(module);
  };

  const showCompass = () => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    setCompassOpen(true);
    compassOpacity.value = withTiming(1, { duration: 180 });
  };

  const hideCompass = () => {
    compassOpacity.value = withTiming(0, { duration: 220 });
    hideTimerRef.current = setTimeout(() => setCompassOpen(false), 220);
  };

  // Swipe gesture on screen content
  const gesture = Gesture.Pan()
    .onEnd((e) => {
      const { translationX, translationY } = e;
      const absX = Math.abs(translationX);
      const absY = Math.abs(translationY);
      const threshold = 60;

      if (absX > absY) {
        if (translationX < -threshold) navigateTo("annotate");
        else if (translationX > threshold) navigateTo("track");
      } else {
        if (translationY < -threshold) navigateTo("knowledge");
        else if (translationY > threshold) navigateTo("deliver");
      }

      translateX.value = withSpring(0);
      translateY.value = withSpring(0);
    })
    .runOnJS(true);

  const screenAnimStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
    ],
  }));

  const compassOverlayStyle = useAnimatedStyle(() => ({
    opacity: compassOpacity.value,
  }));

  const ActiveScreen = SCREENS[activeModule];

  return (
    <View style={styles.container}>

      {/* ── Active screen content ── */}
      <GestureDetector gesture={gesture}>
        <Animated.View style={[styles.screen, screenAnimStyle]}>
          <ActiveScreen hub={hub} space={space} />
        </Animated.View>
      </GestureDetector>

      {/* ── Compass overlay (fades in on nav press-hold) ── */}
      <Animated.View
        style={[styles.compassOverlay, compassOverlayStyle]}
        pointerEvents={compassOpen ? "box-none" : "none"}
      >
        <View style={styles.compassHUD}>
          {/* North: Knowledge */}
          <View style={styles.compassRow}>
            <CompassDot
              label="K"
              active={activeModule === "knowledge"}
              onPress={() => { navigateTo("knowledge"); hideCompass(); }}
            />
          </View>

          {/* West / Center / East: Track · Annotate */}
          <View style={styles.compassRow}>
            <CompassDot
              label="T"
              active={activeModule === "track"}
              onPress={() => { navigateTo("track"); hideCompass(); }}
            />
            <View style={styles.compassCenter}>
              <View style={styles.compassCenterDot} />
            </View>
            <CompassDot
              label="A"
              active={activeModule === "annotate"}
              onPress={() => { navigateTo("annotate"); hideCompass(); }}
            />
          </View>

          {/* South: Deliver */}
          <View style={styles.compassRow}>
            <CompassDot
              label="D"
              active={activeModule === "deliver"}
              onPress={() => { navigateTo("deliver"); hideCompass(); }}
            />
          </View>
        </View>
      </Animated.View>

      {/* ── Bottom nav bar ── */}
      <View style={styles.bottomNav}>
        {MODULES.map(({ key, label }) => {
          const isActive = activeModule === key;
          const accentColor = colors.modules[key];

          return (
            <Pressable
              key={key}
              onPress={() => navigateTo(key)}
              onLongPress={showCompass}
              onPressOut={hideCompass}
              delayLongPress={350}
              style={styles.navItem}
            >
              <Text
                style={[
                  styles.navLabel,
                  isActive && { color: accentColor },
                ]}
              >
                {label}
              </Text>
              <View
                style={[
                  styles.navIndicator,
                  isActive && { backgroundColor: accentColor },
                ]}
              />
            </Pressable>
          );
        })}
      </View>

    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // Screen
  screen: {
    flex: 1,
  },

  // Compass overlay
  compassOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
  },
  compassHUD: {
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(10, 10, 10, 0.85)",
    paddingVertical: 20,
    paddingHorizontal: 24,
    borderRadius: 28,
    borderWidth: 0.5,
    borderColor: colors.border.primary,
  },
  compassRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  dotWrap: {
    padding: 6,
  },
  dot: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.background.secondary,
    borderWidth: 0.5,
    borderColor: colors.border.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  dotActive: {
    backgroundColor: colors.background.tertiary,
    borderColor: colors.text.tertiary,
  },
  dotLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.text.tertiary,
    letterSpacing: 1.5,
  },
  dotLabelActive: {
    color: colors.text.primary,
  },
  compassCenter: {
    width: 56,
    alignItems: "center",
    justifyContent: "center",
  },
  compassCenterDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border.primary,
  },

  // Bottom nav
  bottomNav: {
    flexDirection: "row",
    borderTopWidth: 0.5,
    borderTopColor: colors.border.primary,
    backgroundColor: colors.background.primary,
    paddingTop: 12,
    paddingBottom: 32,
  },
  navItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 2,
  },
  navLabel: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 2,
    color: colors.text.tertiary,
  },
  navIndicator: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "transparent",
  },
});
