import React, { useState, useCallback, memo } from 'react'
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
} from 'react-native'
import {
  Briefcase, Barbell, CurrencyDollar, User, Palette,
  BookOpen, Code, MusicNote, Airplane, House,
  Heart, Flask, Camera, Rocket, Leaf,
  Star, Brain, Person, ChartBar, PencilSimple,
  Folder, Globe, GameController, Dumbbell, Bicycle,
  Coffee, Dog, Sun, Moon, Lightning,
  Fire, Plant, Sword, Trophy, Megaphone,
  Headphones, FilmSlate, ShoppingCart, Wrench, Microscope,
} from 'phosphor-react-native'
import { colors } from '../../constants/colors'

// Explicit map — avoids import * unreliability with Metro/Hermes
export const ICON_MAP = {
  Briefcase, Barbell, CurrencyDollar, User, Palette,
  BookOpen, Code, MusicNote, Airplane, House,
  Heart, Flask, Camera, Rocket, Leaf,
  Star, Brain, Person, ChartBar, PencilSimple,
  Folder, Globe, GameController, Dumbbell, Bicycle,
  Coffee, Dog, Sun, Moon, Lightning,
  Fire, Plant, Sword, Trophy, Megaphone,
  Headphones, FilmSlate, ShoppingCart, Wrench, Microscope,
}

const ICON_LIST = Object.keys(ICON_MAP)

// Memoized per-icon button — only re-renders when ITS selection state changes
const IconButton = memo(({ iconName, isSelected, color, onSelect }) => {
  const IconComponent = ICON_MAP[iconName] || Folder
  return (
    <TouchableOpacity
      style={[
        styles.iconBtn,
        isSelected && { borderColor: color, backgroundColor: color + '18' },
      ]}
      onPress={() => onSelect(iconName)}
      activeOpacity={0.7}
    >
      <IconComponent
        size={22}
        color={isSelected ? color : colors.text.tertiary}
        weight={isSelected ? 'regular' : 'light'}
      />
    </TouchableOpacity>
  )
}, (prev, next) =>
  prev.isSelected === next.isSelected &&
  prev.color === next.color &&
  prev.iconName === next.iconName
)

export default function IconPicker({ selected, color, onSelect }) {
  const [search, setSearch] = useState('')

  const filtered = search
    ? ICON_LIST.filter(n => n.toLowerCase().includes(search.toLowerCase()))
    : ICON_LIST

  // Stable renderItem — only invalidated when selected or color changes
  const renderItem = useCallback(({ item }) => (
    <IconButton
      iconName={item}
      isSelected={item === selected}
      color={color}
      onSelect={onSelect}
    />
  ), [selected, color, onSelect])

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.search}
        value={search}
        onChangeText={setSearch}
        placeholder="Search icons..."
        placeholderTextColor={colors.text.tertiary}
      />
      <FlatList
        data={filtered}
        keyExtractor={(item) => item}
        renderItem={renderItem}
        numColumns={6}
        columnWrapperStyle={styles.row}
        showsVerticalScrollIndicator={false}
        scrollEnabled={false}
        extraData={selected + color}   // tells FlatList to re-evaluate when selection changes
        removeClippedSubviews={false}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { gap: 12 },
  search: {
    backgroundColor: colors.background.secondary,
    borderWidth: 0.5,
    borderColor: colors.border.primary,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.text.primary,
  },
  row: { gap: 8, marginBottom: 8 },
  iconBtn: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background.secondary,
    borderWidth: 0.5,
    borderColor: colors.border.primary,
  },
})