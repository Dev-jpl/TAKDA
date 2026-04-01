import React, { useState, useCallback, memo } from 'react'
import { View, TextInput, TouchableOpacity, StyleSheet } from 'react-native'
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

// Explicit map — one source of truth shared with SpaceIcon
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

// ─── Per-icon button ──────────────────────────────────────────────────────────
// Custom comparator ignores `onSelect` (stable ref) — only re-renders when
// THIS button's selection state or color changes
const IconButton = memo(({ iconName, isSelected, color, onSelect }) => {
  const IconComponent = ICON_MAP[iconName]
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

// ─── Picker ───────────────────────────────────────────────────────────────────
// Wrapped in React.memo so parent re-renders (e.g. SpaceIcon preview updating)
// don't cascade back into the grid.
// Selection state lives HERE — not in the parent — so tapping an icon only
// re-renders IconPicker once (internal state), not twice.
function IconPicker({ defaultSelected = 'Folder', color, onSelect }) {
  const [selected, setSelected] = useState(defaultSelected)
  const [search, setSearch] = useState('')

  // Stable handler — doesn't change between renders
  const handleSelect = useCallback((iconName) => {
    setSelected(iconName)
    onSelect(iconName)
  }, [onSelect])

  const filtered = search
    ? ICON_LIST.filter(n => n.toLowerCase().includes(search.toLowerCase()))
    : ICON_LIST

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.search}
        value={search}
        onChangeText={setSearch}
        placeholder="Search icons..."
        placeholderTextColor={colors.text.tertiary}
      />
      {/* Plain flexWrap View — faster than FlatList for a small static list */}
      <View style={styles.grid}>
        {filtered.map(iconName => (
          <IconButton
            key={iconName}
            iconName={iconName}
            isSelected={iconName === selected}
            color={color}
            onSelect={handleSelect}
          />
        ))}
      </View>
    </View>
  )
}

export default memo(IconPicker)

// ─── Styles ───────────────────────────────────────────────────────────────────
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
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
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