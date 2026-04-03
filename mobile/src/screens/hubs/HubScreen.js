import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { DrawerActions } from "@react-navigation/native";
import CompassNavigator from "../../components/navigation/CompassNavigator";
import { colors } from "../../constants/colors";
import SpaceIcon from "../../components/common/SpaceIcon";
import { List, CaretDown, CaretLeft } from "phosphor-react-native";
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
          style={styles.hubInfo}
          onPress={() => setSwitcherVisible(true)}
          activeOpacity={0.7}
        >
            <SpaceIcon
              icon={hub?.icon || "Circle"}
              color={hub?.color}
              size={32}
              iconSize={16}
              weight="light"
            />
            <View style={styles.hubTitleWrapper}>
              <View style={styles.hubNameRow}>
                <Text style={styles.hubName} numberOfLines={1}>{hub?.name || 'Unnamed Hub'}</Text>
                <CaretDown color={colors.text.tertiary} size={14} weight="bold" />
              </View>
              <Text style={styles.spaceName}>{space?.name?.toUpperCase() || 'MISSION ZONE'}</Text>
            </View>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => navigation.dispatch(DrawerActions.toggleDrawer())}
          style={styles.menuBtn}
          hitSlop={{ top: 25, bottom: 25, left: 25, right: 25 }}
        >
          <List color={colors.text.tertiary} size={22} weight="light" />
        </TouchableOpacity>
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
    paddingTop: 8,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border.primary,
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: "flex-start",
    justifyContent: "center",
  },
  hubInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
    paddingHorizontal: 10,
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
    fontSize: 15,
    fontWeight: "600",
    color: colors.text.primary,
  },
  spaceName: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.text.tertiary,
    letterSpacing: 1,
  },
  menuBtn: {
    width: 44,
    height: 44,
    alignItems: "flex-end",
    justifyContent: "center",
  },
});
