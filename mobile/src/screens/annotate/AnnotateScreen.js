// mobile/src/screens/track/TrackScreen.js
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors } from "../../constants/colors";

export default function AnnotateScreen({ space }) {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Annotate</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    fontSize: 16,
    color: colors.text.tertiary,
    letterSpacing: 2,
  },
});
