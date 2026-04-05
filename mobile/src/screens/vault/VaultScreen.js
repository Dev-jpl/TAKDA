import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import {
  CaretLeft, Tray, FileText, Link, Image, Microphone,
  CheckCircle, X, Sparkle,
} from 'phosphor-react-native'
import { colors } from '../../constants/colors'
import { ASSISTANT_NAME } from '../../constants/brand'
import { vaultService } from '../../services/vault'
import { supabase } from '../../services/supabase'
import VaultCaptureSheet from './VaultCaptureSheet'

const TABS = ['Unprocessed', 'Suggested', 'All']

const TYPE_ICONS = {
  text: FileText,
  link: Link,
  photo: Image,
  voice: Microphone,
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function VaultItem({ item, onAccept, onDismiss }) {
  const TypeIcon = TYPE_ICONS[item.content_type] || FileText
  const isSuggested = item.status === 'suggested' && item.aly_suggestion

  return (
    <View style={styles.item}>
      <View style={styles.itemRow}>
        <View style={styles.typeIcon}>
          <TypeIcon color={colors.text.tertiary} size={16} weight="light" />
        </View>
        <View style={styles.itemContent}>
          <Text style={styles.itemText} numberOfLines={3}>{item.content}</Text>
          <Text style={styles.itemTime}>{timeAgo(item.created_at)}</Text>
        </View>
      </View>

      {isSuggested && (
        <View style={styles.suggestion}>
          <View style={styles.suggestionHeader}>
            <Sparkle color={colors.modules.aly} size={13} weight="fill" />
            <Text style={styles.suggestionLabel}>{ASSISTANT_NAME}'s suggestion</Text>
          </View>
          <Text style={styles.suggestionText} numberOfLines={2}>
            {item.aly_suggestion?.reason || 'Move to a hub'}
          </Text>
          <View style={styles.suggestionActions}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.acceptBtn]}
              onPress={() => onAccept(item)}
            >
              <CheckCircle color={colors.modules.annotate} size={14} weight="light" />
              <Text style={[styles.actionText, { color: colors.modules.annotate }]}>Accept</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, styles.dismissBtn]}
              onPress={() => onDismiss(item.id)}
            >
              <X color={colors.text.tertiary} size={14} weight="light" />
              <Text style={styles.actionText}>Dismiss</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  )
}

function EmptyState({ tab }) {
  return (
    <View style={styles.empty}>
      <Tray color={colors.text.tertiary} size={36} weight="light" />
      <Text style={styles.emptyTitle}>
        {tab === 'Unprocessed' ? 'All clear' : 'Nothing here'}
      </Text>
      <Text style={styles.emptyText}>
        Drop anything here. {ASSISTANT_NAME} will help sort it.
      </Text>
    </View>
  )
}

export default function VaultScreen({ navigation }) {
  const [userId, setUserId] = useState(null)
  const [activeTab, setActiveTab] = useState('Unprocessed')
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [captureVisible, setCaptureVisible] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id)
    })
  }, [])

  const loadItems = useCallback(async (uid) => {
    if (!uid) return
    try {
      const statusMap = {
        Unprocessed: 'unprocessed',
        Suggested: 'suggested',
        All: null,
      }
      const data = await vaultService.getItems(uid, statusMap[activeTab])
      setItems(data || [])
    } catch (e) {
      console.warn('VaultScreen loadItems error:', e)
      setItems([])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [activeTab])

  useEffect(() => {
    if (userId) {
      setLoading(true)
      loadItems(userId)
    }
  }, [userId, activeTab])

  const handleRefresh = () => {
    setRefreshing(true)
    loadItems(userId)
  }

  const handleAccept = async (item) => {
    try {
      await vaultService.acceptSuggestion(
        item.id,
        item.aly_suggestion?.hub_id,
        item.aly_suggestion?.module,
      )
      loadItems(userId)
    } catch (e) {
      console.warn('accept error:', e)
    }
  }

  const handleDismiss = async (itemId) => {
    try {
      await vaultService.dismissSuggestion(itemId)
      loadItems(userId)
    } catch (e) {
      console.warn('dismiss error:', e)
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
        >
          <CaretLeft color={colors.text.secondary} size={22} weight="light" />
        </TouchableOpacity>
        <Text style={styles.title}>Vault</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => setCaptureVisible(true)}
        >
          <Tray color={colors.modules.aly} size={20} weight="light" />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {TABS.map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* List */}
      {loading ? (
        <ActivityIndicator style={styles.loader} color={colors.text.tertiary} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <VaultItem item={item} onAccept={handleAccept} onDismiss={handleDismiss} />
          )}
          contentContainerStyle={items.length === 0 ? styles.emptyContainer : styles.list}
          ListEmptyComponent={<EmptyState tab={activeTab} />}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.text.tertiary}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      <VaultCaptureSheet
        visible={captureVisible}
        onClose={() => setCaptureVisible(false)}
        onCapture={() => loadItems(userId)}
      />
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
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  title: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.text.primary,
  },
  addBtn: {
    padding: 4,
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 4,
    marginBottom: 8,
  },
  tab: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 0.5,
    borderColor: colors.border.primary,
  },
  tabActive: {
    backgroundColor: colors.background.tertiary,
    borderColor: colors.border.primary,
  },
  tabText: {
    fontSize: 13,
    color: colors.text.tertiary,
    fontWeight: '500',
  },
  tabTextActive: {
    color: colors.text.primary,
  },
  loader: {
    marginTop: 60,
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 120,
  },
  emptyContainer: {
    flex: 1,
  },
  item: {
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: colors.border.primary,
    padding: 14,
    marginBottom: 8,
  },
  itemRow: {
    flexDirection: 'row',
    gap: 12,
  },
  typeIcon: {
    marginTop: 2,
  },
  itemContent: {
    flex: 1,
    gap: 6,
  },
  itemText: {
    fontSize: 14,
    color: colors.text.primary,
    lineHeight: 20,
  },
  itemTime: {
    fontSize: 11,
    color: colors.text.tertiary,
  },
  suggestion: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 0.5,
    borderTopColor: colors.border.primary,
    gap: 6,
  },
  suggestionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  suggestionLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.modules.aly,
  },
  suggestionText: {
    fontSize: 13,
    color: colors.text.secondary,
    lineHeight: 18,
  },
  suggestionActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 0.5,
  },
  acceptBtn: {
    borderColor: colors.modules.annotate + '50',
    backgroundColor: colors.modules.annotate + '10',
  },
  dismissBtn: {
    borderColor: colors.border.primary,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.text.tertiary,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    gap: 12,
    marginTop: 80,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text.secondary,
  },
  emptyText: {
    fontSize: 14,
    color: colors.text.tertiary,
    textAlign: 'center',
    lineHeight: 20,
  },
})
