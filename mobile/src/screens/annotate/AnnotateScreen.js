import React, { useState, useCallback } from 'react'
import {
  View, Text, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFocusEffect } from '@react-navigation/native'
import { supabase } from '../../services/supabase'
import { annotateService } from '../../services/annotate'
import { knowledgeService } from '../../services/knowledge'
import { colors } from '../../constants/colors'
import { Plus } from 'phosphor-react-native'

// Internal components to be created next
import AnnotateDashboard from './AnnotateDashboard'
import AnnotateNoteSheet from './AnnotateNoteSheet'

export default function AnnotateScreen({ hub, space }) {
  const [annotations, setAnnotations] = useState([])
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(false)
  const [addVisible, setAddVisible] = useState(false)
  const [activeTab, setActiveTab] = useState('insights') // 'insights' | 'docs'
  const [user, setUser] = useState(null)

  useFocusEffect(
    useCallback(() => {
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (user) {
          setUser(user)
          loadContent(user.id)
        }
      })
    }, [hub?.id])
  )

  const loadContent = async (userId) => {
    if (!hub?.id) return
    setLoading(true)
    try {
      const [annos, docs] = await Promise.all([
        annotateService.getAnnotations(hub.id),
        knowledgeService.getDocuments(userId, hub.id),
      ])
      setAnnotations(annos)
      setDocuments(docs)
    } catch (e) {
      console.warn('Annotate load error:', e)
    } finally {
      setLoading(false)
    }
  }

  const handleAddInsight = async ({ content, category, documentId }) => {
    if (!user) return
    try {
      const newAnno = await annotateService.createAnnotation({
        hubId: hub.id,
        userId: user.id,
        documentId,
        content,
        category,
      })
      setAnnotations(prev => [newAnno, ...prev])
    } catch (e) {
      Alert.alert('Error', 'Could not save insight unit.')
    }
  }

  const handleDelete = (id) => {
    Alert.alert('Delete Insight', 'Remove this unit from system?', [
      { text: 'Cancel', style: 'cancel' },
      { 
        text: 'Delete', 
        style: 'destructive',
        onPress: async () => {
          setAnnotations(prev => prev.filter(a => a.id !== id))
          try {
            await annotateService.deleteAnnotation(id)
          } catch (e) {
            loadContent(user.id)
          }
        }
      }
    ])
  }

  // Stats calculation
  const stats = {
    ideas: annotations.filter(a => a.category === 'idea').length,
    refs: annotations.filter(a => a.category === 'reference').length,
    actions: annotations.filter(a => a.category === 'action').length,
  }

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.headerDot} />
          <Text style={styles.headerTitle}>Annotate</Text>
          {annotations.length > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{annotations.length}</Text>
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

      {/* Stats Dash */}
      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={[styles.statNum, { color: '#EAB308' }]}>{stats.ideas}</Text>
          <Text style={styles.statLabel}>IDEAS</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.stat}>
          <Text style={[styles.statNum, { color: '#378ADD' }]}>{stats.refs}</Text>
          <Text style={styles.statLabel}>REFS</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.stat}>
          <Text style={[styles.statNum, { color: '#1D9E75' }]}>{stats.actions}</Text>
          <Text style={styles.statLabel}>ACTIONS</Text>
        </View>
      </View>

      {/* View Toggle */}
      <View style={styles.toggleRow}>
        <View style={styles.pillContainer}>
          {['insights', 'docs'].map(t => (
            <TouchableOpacity
              key={t}
              style={[styles.toggleBtn, activeTab === t && styles.toggleBtnActive]}
              onPress={() => setActiveTab(t)}
            >
              <Text style={[styles.toggleLabel, activeTab === t && styles.toggleLabelActive]}>
                {t.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Main Content Area */}
      <View style={styles.content}>
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.modules.annotate} />
          </View>
        ) : (
          <AnnotateDashboard 
            view={activeTab}
            annotations={annotations}
            documents={documents}
            onDelete={handleDelete}
            onRefresh={() => loadContent(user.id)}
          />
        )}
      </View>

      <AnnotateNoteSheet 
        visible={addVisible}
        onClose={() => setAddVisible(false)}
        onAdd={handleAddInsight}
        documents={documents}
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
    backgroundColor: colors.modules.annotate,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    letterSpacing: 0.5,
  },
  badge: {
    backgroundColor: colors.modules.annotate + '15',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 0.5,
    borderColor: colors.modules.annotate + '30',
  },
  badgeText: {
    fontSize: 10,
    color: colors.modules.annotate,
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
  toggleRow: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  pillContainer: {
    flexDirection: 'row',
    backgroundColor: colors.background.secondary,
    padding: 2,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: colors.border.primary,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
  },
  toggleBtnActive: {
    backgroundColor: colors.background.tertiary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.text.tertiary,
    letterSpacing: 1,
  },
  toggleLabelActive: {
    color: colors.text.primary,
  },
  content: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
