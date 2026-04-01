import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { supabase } from "../../services/supabase";
import { spacesService } from "../../services/spaces";
import { colors } from "../../constants/colors";
import SpaceIcon from "../../components/common/SpaceIcon";
import IconPicker from "../../components/common/IconPicker";

const COLORS = [
  "#7F77DD",
  "#1D9E75",
  "#378ADD",
  "#D85A30",
  "#BA7517",
  "#E24B4A",
  "#A855F7",
  "#EC4899",
];

export default function CreateSpaceScreen({ navigation }) {
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("Folder");
  const [color, setColor] = useState("#7F77DD");
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });
  }, []);

  async function handleCreate() {
    if (!name.trim()) {
      Alert.alert("Name required", "Please enter a space name.");
      return;
    }
    if (!user) return;

    setLoading(true);
    try {
      await spacesService.createSpace({
        userId: user.id,
        name: name.trim(),
        icon,
        color,
      });
      navigation.goBack();
    } catch (e) {
      Alert.alert("Error", "Failed to create space.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.inner}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.cancel}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.title}>New space</Text>
          <TouchableOpacity onPress={handleCreate} disabled={loading}>
            {loading ? (
              <ActivityIndicator size="small" color={colors.text.secondary} />
            ) : (
              <Text style={styles.create}>Create</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Preview */}
        <SpaceIcon
          icon={icon}
          color={color}
          size={72}
          iconSize={34}
          weight="light"
        />

        {/* Name */}
        <View style={styles.section}>
          <Text style={styles.label}>Name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="e.g. Side project"
            placeholderTextColor={colors.text.tertiary}
            autoFocus
            maxLength={30}
          />
        </View>

        {/* Icon picker */}
        <View style={styles.section}>
          <Text style={styles.label}>Icon</Text>
          <IconPicker selected={icon} color={color} onSelect={setIcon} />
        </View>

        {/* Color picker */}
        <View style={styles.section}>
          <Text style={styles.label}>Color</Text>
          <View style={styles.colorRow}>
            {COLORS.map((c) => (
              <TouchableOpacity
                key={c}
                style={[
                  styles.colorBtn,
                  { backgroundColor: c },
                  color === c && styles.colorBtnActive,
                ]}
                onPress={() => setColor(c)}
              />
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  inner: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 60,
    paddingBottom: 32,
  },
  cancel: {
    fontSize: 15,
    color: colors.text.tertiary,
  },
  title: {
    fontSize: 15,
    fontWeight: "500",
    color: colors.text.primary,
  },
  create: {
    fontSize: 15,
    color: colors.text.secondary,
    fontWeight: "500",
  },
  section: {
    marginBottom: 28,
    gap: 12,
  },
  label: {
    fontSize: 12,
    color: colors.text.tertiary,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  input: {
    backgroundColor: colors.background.secondary,
    borderWidth: 0.5,
    borderColor: colors.border.primary,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: colors.text.primary,
  },
  colorRow: {
    flexDirection: "row",
    gap: 10,
    flexWrap: "wrap",
  },
  colorBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 0.5,
    borderColor: "transparent",
  },
  colorBtnActive: {
    borderWidth: 2,
    borderColor: colors.text.primary,
  },
});
