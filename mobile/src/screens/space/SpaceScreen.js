import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import CompassNavigator from "../../components/navigation/CompassNavigator";
import { colors } from "../../constants/colors";
import SpaceIcon from "../../components/common/SpaceIcon";

export default function SpaceScreen({ route, navigation }) {
  const { space } = route.params;

  return (
    <View style={styles.container}>
      {/* Space header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
        >
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <View style={styles.spaceInfo}>
          <SpaceIcon
            icon={space.icon || "Folder"}
            color={space.color}
            size={32}
            iconSize={16}
            weight="light"
          />
          <Text style={styles.spaceName}>{space.name}</Text>
        </View>
        <View style={styles.placeholder} />
      </View>

      {/* Compass navigator scoped to this space */}
      <CompassNavigator space={space} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 56,
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border.primary,
  },
  backBtn: {
    width: 36,
    alignItems: "flex-start",
  },
  backText: {
    fontSize: 28,
    color: colors.text.secondary,
    lineHeight: 32,
  },
  spaceInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  spaceEmoji: {
    fontSize: 18,
  },
  spaceName: {
    fontSize: 16,
    fontWeight: "500",
    color: colors.text.primary,
  },
  placeholder: {
    width: 36,
  },
});
