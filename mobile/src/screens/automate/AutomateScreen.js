import React, { useState, useCallback } from 'react'
import {
  View, Text, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator,
  FlatList, ScrollView,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFocusEffect } from '@react-navigation/native'
import { supabase } from '../../services/supabase'
import { automateService } from '../../services/automate'
import { colors } from '../../constants/colors'
import { MagicWand, Sparkle, Clock, Trash, ArrowRight, ShieldCheck } from 'phosphor-react-native'

import AutomateBriefingView from './AutomateBriefingView'

export default function AutomateScreen({ hub, space }) {
  const [briefings, setBriefings] = useState([])
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [selectedBriefing, setSelectedBriefing] = useState(null)
  const [userId, setUserId] = useState(null)

  useFocusEffect(
    useCallback(() => {
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (user) {
          setUserId(user.id)
          loadBriefings()
        }
      })
    }, [hub?.id])
  )

  const loadBriefings = async () => {
    if (!hub?.id) return
    setLoading(true)
    try {
      const data = await automateService.getBriefings(hub.id)
      setBriefings(data)
    } catch (e) {
      console.warn('Load briefings error:', e)
    } finally {
      setLoading(false)
    }
  }

  const handleGenerate = async () => {
    if (!userId || !hub?.id) return
    setGenerating(true)
    try {
      const newBriefing = await automateService.generateBriefing({
        hubId: hub.id,
        userId,
        type: 'daily',
      })
      setBriefings(prev => [newBriefing, ...prev])
      setSelectedBriefing(newBriefing)
    } catch (e) {
      Alert.alert('Synthesis Error', e.message || 'Failed to generate briefing.')
    } finally {
      setGenerating(false)
    }
  }

  const handleDelete = (id) => {
    Alert.alert('Remove Record', 'Purge this briefing from system history?', [
      { text: 'Cancel', style: 'cancel' },
      { 
        text: 'Delete', 
        style: 'destructive',
        onPress: async () => {
          setBriefings(prev => prev.filter(b => b.id !== id))
          try {
            await automateService.deleteBriefing(id)
          } catch (e) {
            loadBriefings()
          }
        }
      }
    ])
  }

  const latestBriefing = briefings[0]

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.headerDot} />
          <Text style={styles.headerTitle}>Automate</Text>
        </View>
        <TouchableOpacity 
          style={styles.genBtn}
          onPress={handleGenerate}
          disabled={generating}
        >
          {generating 
            ? <ActivityIndicator size="small" color={colors.modules.automate} />
            : <MagicWand color={colors.modules.automate} size={20} weight="light" />
          }
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollBody} showsVerticalScrollIndicator={false}>
        {/* Main Briefing Card */}
        <View style={styles.heroSection}>
          <Text style={styles.sectionLabel}>ACTIVE RHYTHM</Text>
          <TouchableOpacity 
            style={styles.briefingCard}
            onPress={() => latestBriefing && setSelectedBriefing(latestBriefing)}
            activeOpacity={0.8}
          >
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderLeft}>
                <Sparkle color={colors.modules.automate} size={16} weight="fill" />
                <Text style={styles.cardTitle}>{latestBriefing?.title || 'Initialize Briefing'}</Text>
              </View>
              <Text style={styles.cardDate}>
                {latestBriefing ? new Date(latestBriefing.created_at).toLocaleDateString() : 'READY'}
              </Text>
            </View>
            
            <Text style={styles.cardPreview} numberOfLines={3}>
              {latestBriefing?.content || 'Aggregate your project state across all modules to generate a professional AI synthesis of your current mission velocity.'}
            </Text>

            <View style={styles.cardFooter}>
              <View style={styles.agencyBadge}>
                <ShieldCheck color={colors.modules.automate} size={12} weight="bold" />
                <Text style={styles.agencyText}>AGENCY ACTIVE</Text>
              </View>
              <ArrowRight color={colors.text.tertiary} size={14} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Stats Row */}
        <View style={styles.metricsRow}>
          <View style={styles.metric}>
            <Text style={styles.metricNum}>3</Text>
            <Text style={styles.metricLabel}>AGREEMENTS</Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metric}>
            <Text style={styles.metricNum}>12</Text>
            <Text style={styles.metricLabel}>FLOWS</Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metric}>
            <Text style={styles.metricNum}>0</Text>
            <Text style={styles.metricLabel}>ALERTS</Text>
          </View>
        </View>

        {/* History */}
        <View style={styles.historySection}>
          <Text style={styles.sectionLabel}>SYSTEM HISTORY</Text>
          {briefings.map(item => (
            <TouchableOpacity 
              key={item.id} 
              style={styles.historyItem}
              onPress={() => setSelectedBriefing(item)}
            >
              <View style={styles.historyIcon}>
                <Clock color={colors.text.tertiary} size={16} />
              </View>
              <View style={styles.historyInfo}>
                <Text style={styles.historyTitle}>{item.title}</Text>
                <Text style={styles.historyMeta}>
                  {new Date(item.created_at).toLocaleDateString()} · {item.type.toUpperCase()}
                </Text>
              </View>
              <TouchableOpacity onPress={() => handleDelete(item.id)} hitSlop={10}>
                <Trash color={colors.text.tertiary} size={14} weight="light" />
              </TouchableOpacity>
            </TouchableOpacity>
          ))}
          {briefings.length === 0 && !loading && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No historical rhythms found.</Text>
            </View>
          )}
        </View>
      </ScrollView>

      <AutomateBriefingView 
        briefing={selectedBriefing}
        onClose={() => setSelectedBriefing(null)}
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
    backgroundColor: colors.modules.automate,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    letterSpacing: 0.5,
  },
  genBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.background.secondary,
    borderWidth: 0.5,
    borderColor: colors.border.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollBody: {
    paddingBottom: 120,
  },
  heroSection: {
    padding: 20,
    gap: 12,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.text.tertiary,
    letterSpacing: 1.5,
  },
  briefingCard: {
    backgroundColor: colors.background.tertiary,
    borderRadius: 24,
    borderWidth: 0.5,
    borderColor: colors.border.primary,
    padding: 20,
    gap: 16,
    shadowColor: colors.modules.automate,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text.primary,
  },
  cardDate: {
    fontSize: 11,
    color: colors.text.tertiary,
    fontWeight: '600',
  },
  cardPreview: {
    fontSize: 14,
    color: colors.text.secondary,
    lineHeight: 22,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    paddingTop: 16,
    borderTopWidth: 0.5,
    borderTopColor: colors.border.primary,
  },
  agencyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: colors.modules.automate + '15',
    borderRadius: 6,
  },
  agencyText: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.modules.automate,
    letterSpacing: 0.5,
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderTopWidth: 0.5,
    borderBottomWidth: 0.5,
    borderColor: colors.border.primary,
  },
  metric: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  metricNum: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text.primary,
  },
  metricLabel: {
    fontSize: 9,
    color: colors.text.tertiary,
    fontWeight: '700',
    letterSpacing: 1,
  },
  metricDivider: {
    width: 0.5,
    height: 16,
    backgroundColor: colors.border.primary,
  },
  historySection: {
    padding: 20,
    gap: 16,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.tertiary,
    borderRadius: 16,
    borderWidth: 0.5,
    borderColor: colors.border.primary,
    padding: 14,
    gap: 12,
  },
  historyIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.background.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.5,
    borderColor: colors.border.primary,
  },
  historyInfo: {
    flex: 1,
    gap: 4,
  },
  historyTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
  },
  historyMeta: {
    fontSize: 11,
    color: colors.text.tertiary,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 13,
    color: colors.text.tertiary,
  },
})
