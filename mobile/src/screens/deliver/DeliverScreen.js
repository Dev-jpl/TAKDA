import React, { useState, useCallback } from 'react'
import {
  View, Text, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator,
  FlatList,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFocusEffect } from '@react-navigation/native'
import { supabase } from '../../services/supabase'
import { deliverService } from '../../services/deliver'
import { colors } from '../../constants/colors'
import { Plus, Info, CheckCircle, Question, Megaphone, Trash } from 'phosphor-react-native'

import DeliverDispatchSheet from './DeliverDispatchSheet'

const PROTOCOL_MAP = {
  update: { label: 'UPDATE', color: '#378ADD', icon: Megaphone },
  decision: { label: 'DECISION', color: '#EAB308', icon: Info },
  delivered: { label: 'DELIVERED', color: '#1D9E75', icon: CheckCircle },
  question: { label: 'QUESTION', color: '#E24B4A', icon: Question },
}

function DispatchCard({ item, onDelete }) {
  const protocol = PROTOCOL_MAP[item.type] || PROTOCOL_MAP.update
  const Icon = protocol.icon

  return (
    <View style={styles.card}>
      <View style={[styles.indicator, { backgroundColor: protocol.color }]} />
      <View style={styles.cardBody}>
        <View style={styles.cardHeader}>
          <View style={[styles.typeBadge, { backgroundColor: protocol.color + '15' }]}>
            <Icon color={protocol.color} size={10} weight="fill" />
            <Text style={[styles.typeText, { color: protocol.color }]}>{protocol.label}</Text>
          </View>
          <TouchableOpacity onPress={() => onDelete(item.id)} hitSlop={10}>
            <Trash color={colors.text.tertiary} size={14} weight="light" />
          </TouchableOpacity>
        </View>
        <Text style={styles.cardContent}>{item.content}</Text>
        <Text style={styles.timestamp}>
          {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {new Date(item.created_at).toLocaleDateString()}
        </Text>
      </View>
    </View>
  )
}

export default function DeliverScreen({ hub, space }) {
  const [deliveries, setDeliveries] = useState([])
  const [loading, setLoading] = useState(false)
  const [addVisible, setAddVisible] = useState(false)
  const [userId, setUserId] = useState(null)

  useFocusEffect(
    useCallback(() => {
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (user) {
          setUserId(user.id)
          loadDeliveries()
        }
      })
    }, [hub?.id])
  )

  const loadDeliveries = async () => {
    if (!hub?.id) return
    setLoading(true)
    try {
      const data = await deliverService.getDeliveries(hub.id)
      setDeliveries(data)
    } catch (e) {
      console.warn('Load deliveries error:', e)
    } finally {
      setLoading(false)
    }
  }

  const handleAddDispatch = async ({ content, type }) => {
    if (!userId) return
    try {
      const newDispatch = await deliverService.createDelivery({
        hubId: hub.id,
        userId,
        content,
        type,
      })
      setDeliveries(prev => [newDispatch, ...prev])
    } catch (e) {
      Alert.alert('Error', 'Failed to secure dispatch.')
    }
  }

  const handleDelete = (id) => {
    Alert.alert('Remove Dispatch', 'Remove this project marker?', [
      { text: 'Cancel', style: 'cancel' },
      { 
        text: 'Delete', 
        style: 'destructive',
        onPress: async () => {
          setDeliveries(prev => prev.filter(d => d.id !== id))
          try {
            await deliverService.deleteDelivery(id)
          } catch (e) {
            loadDeliveries()
          }
        }
      }
    ])
  }

  const stats = {
    updates: deliveries.filter(d => d.type === 'update').length,
    decisions: deliveries.filter(d => d.type === 'decision').length,
    delivered: deliveries.filter(d => d.type === 'delivered').length,
  }

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.headerDot} />
          <Text style={styles.headerTitle}>Deliver</Text>
          {deliveries.length > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{deliveries.length}</Text>
            </View>
          )}
        </View>
        <TouchableOpacity 
          style={styles.addBtn}
          onPress={() => setAddVisible(true)}
          hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
        >
          <Plus color={colors.text.secondary} size={20} weight="light" />
        </TouchableOpacity>
      </View>

      {/* Stats Row */}
      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={[styles.statNum, { color: '#378ADD' }]}>{stats.updates}</Text>
          <Text style={styles.statLabel}>UPDATES</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.stat}>
          <Text style={[styles.statNum, { color: '#EAB308' }]}>{stats.decisions}</Text>
          <Text style={styles.statLabel}>DECISIONS</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.stat}>
          <Text style={[styles.statNum, { color: '#1D9E75' }]}>{stats.delivered}</Text>
          <Text style={styles.statLabel}>DELIVERED</Text>
        </View>
      </View>

      {/* Dispatch Feed */}
      <View style={styles.content}>
        {loading && deliveries.length === 0 ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.modules.deliver} />
          </View>
        ) : (
          <FlatList
            data={deliveries}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => <DispatchCard item={item} onDelete={handleDelete} />}
            onRefresh={loadDeliveries}
            refreshing={loading}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyTitle}>NO DISPATCHES SECURED</Text>
                <Text style={styles.emptyHint}>Execute and capture project markers to populate the activity system.</Text>
              </View>
            }
          />
        )}
      </View>

      <DeliverDispatchSheet 
        visible={addVisible}
        onClose={() => setAddVisible(false)}
        onAdd={handleAddDispatch}
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
    paddingTop: 16,
    paddingBottom: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border.primary,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.modules.deliver,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    letterSpacing: 0.5,
  },
  badge: {
    backgroundColor: colors.modules.deliver + '15',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 0.5,
    borderColor: colors.modules.deliver + '30',
  },
  badgeText: {
    fontSize: 10,
    color: colors.modules.deliver,
    fontWeight: '700',
  },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.background.secondary,
    borderWidth: 0.5,
    borderColor: colors.border.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: colors.background.primary,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border.primary,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  statNum: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
  },
  statLabel: {
    fontSize: 9,
    color: colors.text.tertiary,
    fontWeight: '700',
    letterSpacing: 1,
  },
  statDivider: {
    width: 0.5,
    height: 16,
    backgroundColor: colors.border.primary,
  },
  content: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    padding: 20,
    paddingBottom: 100,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    paddingHorizontal: 40,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text.secondary,
    letterSpacing: 2,
  },
  emptyHint: {
    fontSize: 13,
    color: colors.text.tertiary,
    textAlign: 'center',
    lineHeight: 20,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: colors.background.tertiary,
    borderRadius: 16,
    borderWidth: 0.5,
    borderColor: colors.border.primary,
    marginBottom: 12,
    overflow: 'hidden',
  },
  indicator: {
    width: 3,
  },
  cardBody: {
    flex: 1,
    padding: 14,
    gap: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  typeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  cardContent: {
    fontSize: 15,
    color: colors.text.primary,
    lineHeight: 22,
  },
  timestamp: {
    fontSize: 10,
    color: colors.text.tertiary,
    marginTop: 4,
  },
})
