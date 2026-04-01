import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import { supabase } from '../../services/supabase'
import { spacesService } from '../../services/spaces'
import { colors } from '../../constants/colors'
import SpaceIcon from '../../components/common/SpaceIcon'

export default function HomeScreen({ navigation }) {
  const [spaces, setSpaces] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [user, setUser] = useState(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
    })
  }, [])

  useFocusEffect(
    useCallback(() => {
      if (user) loadSpaces()
    }, [user])
  )

  const loadSpaces = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)

    try {
      const data = await spacesService.getSpaces(user.id)
      setSpaces(data)
    } catch (e) {
      console.warn('loadSpaces error:', e)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleSpacePress = (space) => {
    navigation.navigate('Space', { space })
  }

  const handleAddSpace = () => {
    navigation.navigate('CreateSpace')
  }

  const renderSpace = ({ item }) => (
  <TouchableOpacity
    style={[styles.spaceCard, { borderColor: item.color + '30' }]}
    onPress={() => handleSpacePress(item)}
    activeOpacity={0.8}
  >
    <SpaceIcon
      icon={item.icon || 'Folder'}
      color={item.color}
      size={44}
      iconSize={22}
      weight="light"
    />
    <View style={styles.spaceInfo}>
      <Text style={styles.spaceName}>{item.name}</Text>
      <Text style={styles.spaceSub}>
        {item.space_modules?.filter(m => m.is_enabled).length || 5} tools enabled
      </Text>
    </View>
    <Text style={styles.arrowText}>›</Text>
  </TouchableOpacity>
)

  const renderHeader = () => (
    <View style={styles.header}>
      <View>
        <Text style={styles.greeting}>
          {getGreeting()}, {user?.user_metadata?.full_name?.split(' ')[0] || 'JP'}
        </Text>
        <Text style={styles.subGreeting}>Your spaces</Text>
      </View>
      <View style={styles.logoWrap}>
        <Text style={styles.logo}>TAKDA</Text>
      </View>
    </View>
  )

  const renderFooter = () => (
    <TouchableOpacity
      style={styles.addCard}
      onPress={handleAddSpace}
      activeOpacity={0.7}
    >
      <Text style={styles.addIcon}>+</Text>
      <Text style={styles.addText}>New space</Text>
    </TouchableOpacity>
  )

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.text.secondary} />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={spaces}
        keyExtractor={(item) => item.id}
        renderItem={renderSpace}
        ListHeaderComponent={renderHeader}
        ListFooterComponent={renderFooter}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadSpaces(true)}
            tintColor={colors.text.tertiary}
          />
        }
      />
    </View>
  )
}

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  centered: {
    flex: 1,
    backgroundColor: colors.background.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingTop: 60,
    paddingBottom: 32,
  },
  greeting: {
    fontSize: 24,
    fontWeight: '500',
    color: colors.text.primary,
    marginBottom: 4,
  },
  subGreeting: {
    fontSize: 13,
    color: colors.text.tertiary,
    letterSpacing: 0.5,
  },
  logoWrap: {
    paddingTop: 4,
  },
  logo: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.text.tertiary,
    letterSpacing: 3,
  },
  spaceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
    borderRadius: 14,
    borderWidth: 0.5,
    marginBottom: 10,
    padding: 14,
    gap: 12,
  },
  spaceAccent: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spaceEmoji: {
    fontSize: 22,
  },
  spaceInfo: {
    flex: 1,
    gap: 3,
  },
  spaceName: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.text.primary,
  },
  spaceSub: {
    fontSize: 12,
    color: colors.text.tertiary,
  },
  spaceArrow: {
    width: 24,
    alignItems: 'center',
  },
  arrowText: {
    fontSize: 20,
    color: colors.text.tertiary,
  },
  addCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background.secondary,
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: colors.border.primary,
    borderStyle: 'dashed',
    padding: 16,
    gap: 8,
    marginTop: 4,
  },
  addIcon: {
    fontSize: 18,
    color: colors.text.tertiary,
  },
  addText: {
    fontSize: 14,
    color: colors.text.tertiary,
  },
})