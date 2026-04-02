import React, { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { colors } from '../../constants/colors'
import { spacesService } from '../../services/spaces'
import { supabase } from '../../services/supabase'
import IconPicker from '../../components/common/IconPicker'
import { CaretLeft, Check } from 'phosphor-react-native'

const CATEGORIES = ['Personal', 'Work', 'Finance', 'Growth', 'Social', 'Other']
const THEME_COLORS = [
  colors.modules.track,
  colors.modules.annotate,
  colors.modules.knowledge,
  colors.modules.deliver,
  colors.modules.automate,
  '#E24B4A', // urgent/red
  '#EF9F27', // high/orange
  '#639922', // low/green
]

export default function CreateSpaceScreen({ navigation, route }) {
  const editingSpace = route.params?.space
  
  const [name, setName] = useState(editingSpace?.name || '')
  const [category, setCategory] = useState(editingSpace?.category || 'Personal')
  const [icon, setIcon] = useState(editingSpace?.icon || 'Folder')
  const [color, setColor] = useState(editingSpace?.color || colors.modules.track)
  const [description, setDescription] = useState(editingSpace?.description || '')
  const [loading, setLoading] = useState(false)

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a name for your space.')
      return
    }

    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No user session')

      if (editingSpace) {
        await spacesService.updateSpace(editingSpace.id, {
          name: name.trim(),
          category,
          icon,
          color,
          description: description.trim(),
        })
      } else {
        await spacesService.createSpace({
          userId: user.id,
          name: name.trim(),
          category,
          icon,
          color,
          description: description.trim(),
        })
      }

      navigation.goBack()
    } catch (e) {
      console.error('Save Space Error:', e)
      Alert.alert('Error', 'Could not save space.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backBtn} 
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 25, bottom: 25, left: 25, right: 25 }}
        >
          <CaretLeft color={colors.text.secondary} size={24} weight="light" />
        </TouchableOpacity>
        <Text style={styles.title}>{editingSpace ? 'Edit Space' : 'New Space'}</Text>
        <TouchableOpacity 
          style={styles.saveBtn} 
          onPress={handleSave}
          disabled={loading}
          hitSlop={{ top: 25, bottom: 25, left: 25, right: 25 }}
        >
          {loading ? (
            <ActivityIndicator color={colors.text.primary} size="small" />
          ) : (
            <Check color={colors.text.primary} size={24} weight="regular" />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Name Input */}
        <View style={styles.section}>
          <Text style={styles.label}>Name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="e.g. Personal Finance"
            placeholderTextColor={colors.text.tertiary}
            autoFocus={!editingSpace}
          />
        </View>

        {/* Category Selector */}
        <View style={styles.section}>
          <Text style={styles.label}>Category</Text>
          <View style={styles.categoryGrid}>
            {CATEGORIES.map(cat => (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.categoryPill,
                  category === cat && styles.activePill
                ]}
                onPress={() => setCategory(cat)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={[
                  styles.categoryText,
                  category === cat && styles.activePillText
                ]}>{cat}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Color Selector */}
        <View style={styles.section}>
          <Text style={styles.label}>Identity Color</Text>
          <View style={styles.colorGrid}>
            {THEME_COLORS.map(c => (
              <TouchableOpacity
                key={c}
                style={[
                  styles.colorCircle,
                  { backgroundColor: c },
                  color === c && { borderColor: '#fff', borderWidth: 2 }
                ]}
                onPress={() => setColor(c)}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              />
            ))}
          </View>
        </View>

        {/* Icon Picker */}
        <View style={styles.section}>
          <Text style={styles.label}>Icon</Text>
          <IconPicker 
            defaultSelected={icon} 
            color={color} 
            onSelect={setIcon} 
          />
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.label}>Description (Optional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder="What is this space for?"
            placeholderTextColor={colors.text.tertiary}
            multiline
            numberOfLines={3}
          />
        </View>
        
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border.primary,
  },
  backBtn: { width: 44, height: 44, justifyContent: 'center' },
  saveBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'flex-end' },
  title: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text.primary,
  },
  scroll: {
    padding: 20,
    gap: 24,
  },
  section: {
    gap: 12,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  input: {
    backgroundColor: colors.background.secondary,
    borderRadius: 10,
    borderWidth: 0.5,
    borderColor: colors.border.primary,
    padding: 14,
    fontSize: 15,
    color: colors.text.primary,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.background.secondary,
    borderWidth: 0.5,
    borderColor: colors.border.primary,
  },
  activePill: {
    backgroundColor: colors.background.tertiary,
    borderColor: colors.text.secondary,
  },
  categoryText: {
    fontSize: 13,
    color: colors.text.secondary,
  },
  activePillText: {
    color: colors.text.primary,
    fontWeight: '500',
  },
  colorGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  colorCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'transparent',
  },
})
