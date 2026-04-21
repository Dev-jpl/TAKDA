import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import CompassNavigator from "../../components/navigation/CompassNavigator";
import { colors } from "../../constants/colors";
import SpaceIcon from "../../components/common/SpaceIcon";
import { CaretDown, CaretLeft } from "phosphor-react-native";
import HubSwitcherModal from "./HubSwitcherModal";

export default function HubScreen({ route, navigation }) {
  const { hub, space } = route.params;
  const [isSwitcherVisible, setSwitcherVisible] = useState(false);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Hub header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          hitSlop={{ top: 25, bottom: 25, left: 25, right: 25 }}
        >
          <CaretLeft color={colors.text.secondary} size={24} weight="regular" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.hubChip}
          onPress={() => setSwitcherVisible(true)}
          activeOpacity={0.7}
        >
          <SpaceIcon
            icon={hub?.icon || "Circle"}
            color={hub?.color}
            size={26}
            iconSize={13}
            weight="light"
          />
          <View style={styles.hubTitleWrapper}>
            <Text style={styles.hubName} numberOfLines={1}>{hub?.name || 'Unnamed Hub'}</Text>
            <Text style={styles.spaceName}>{space?.name?.toUpperCase() || 'SPACE'}</Text>
          </View>
          <CaretDown color={colors.text.tertiary} size={12} weight="bold" />
        </TouchableOpacity>

        {/* Spacer to keep chip centered */}
        <View style={styles.backBtn} />
      </View>

      {/* Compass navigator scoped to this hub */}
      <CompassNavigator hub={hub} space={space} />

      <HubSwitcherModal 
        visible={isSwitcherVisible}
        onClose={() => setSwitcherVisible(false)}
        currentSpace={space}
        currentHubId={hub.id}
        navigation={navigation}
      />
    </SafeAreaView>
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
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border.primary,
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: "flex-start",
    justifyContent: "center",
  },
  hubChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
    backgroundColor: colors.background.tertiary,
    borderWidth: 0.5,
    borderColor: colors.border.primary,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginHorizontal: 8,
  },
  hubTitleWrapper: {
    flex: 1,
  },
  hubNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  hubName: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.text.primary,
  },
  spaceName: {
    fontSize: 10,
    fontWeight: "500",
    color: colors.text.tertiary,
    letterSpacing: 0.8,
    marginTop: 1,
  },
});
