import React, { useState, useCallback } from 'react'
import {
  View, Text, TouchableOpacity,
  StyleSheet, Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFocusEffect } from '@react-navigation/native'
import { supabase } from '../../services/supabase'
import { trackService } from '../../services/track'
import { colors } from '../../constants/colors'
import TrackListView from './TrackListView'
import TrackKanbanView from './TrackKanbanView'
import TrackAddSheet from './TrackAddSheet'
import { Plus } from 'phosphor-react-native'

export default function TrackScreen({ hub, space }) {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(false)
  const [view, setView] = useState('list') // 'list' | 'kanban'
  const [addVisible, setAddVisible] = useState(false)
  const [userId, setUserId] = useState(null)

  useFocusEffect(
    useCallback(() => {
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (user) {
          setUserId(user.id)
          loadTasks(user.id)
        }
      })
    }, [hub?.id])
  )

  const loadTasks = async (uid) => {
    if (!hub?.id) return
    setLoading(true)
    try {
      const data = await trackService.getTasks(hub.id)
      setTasks(data)
    } catch (e) {
      console.warn('loadTasks error:', e)
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = async ({ title, priority, status }) => {
    const task = await trackService.createTask({
      hubId: hub.id,
      userId,
      title,
      priority,
      status,
    })
    setTasks(prev => [...prev, task])
  }

  const handleStatusCycle = async (taskId, newStatus) => {
    setTasks(prev =>
      prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t)
    )
    try {
      await trackService.updateTask(taskId, { status: newStatus })
    } catch (e) {
      loadTasks(userId) // revert on failure
    }
  }

  const handleDelete = (taskId) => {
    Alert.alert('Delete task', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setTasks(prev => prev.filter(t => t.id !== taskId))
          try {
            await trackService.deleteTask(taskId)
          } catch (e) {
            loadTasks(userId)
          }
        },
      },
    ])
  }

  const todo = tasks.filter(t => t.status === 'todo').length
  const inProgress = tasks.filter(t => t.status === 'in_progress').length
  const done = tasks.filter(t => t.status === 'done').length

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.headerDot} />
          <Text style={styles.headerTitle}>Track</Text>
          {tasks.length > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{tasks.length}</Text>
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

      {/* Stats row */}
      {tasks.length > 0 && (
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statNum}>{todo}</Text>
            <Text style={styles.statLabel}>TODO</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={[styles.statNum, { color: colors.modules.track }]}>{inProgress}</Text>
            <Text style={styles.statLabel}>PROGRESS</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={[styles.statNum, { color: colors.status.low }]}>{done}</Text>
            <Text style={styles.statLabel}>DONE</Text>
          </View>
        </View>
      )}

      {/* View toggle */}
      <View style={styles.toggleRow}>
        <View style={styles.pillContainer}>
          {['list', 'kanban'].map(v => (
            <TouchableOpacity
              key={v}
              style={[styles.toggleBtn, view === v && styles.toggleBtnActive]}
              onPress={() => setView(v)}
            >
              <Text style={[styles.toggleLabel, view === v && styles.toggleLabelActive]}>
                {v.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {view === 'list' ? (
          <TrackListView
            tasks={tasks}
            loading={loading}
            onStatusCycle={handleStatusCycle}
            onDelete={handleDelete}
            onRefresh={() => loadTasks(userId)}
          />
        ) : (
          <TrackKanbanView
            tasks={tasks}
            loading={loading}
            onMove={handleStatusCycle}
            onDelete={handleDelete}
          />
        )}
      </View>

      <TrackAddSheet
        visible={addVisible}
        onClose={() => setAddVisible(false)}
        onAdd={handleAdd}
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
    gap: 8,
  },
  headerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.modules.track,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    letterSpacing: 0.5,
  },
  badge: {
    backgroundColor: colors.modules.track + '15',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 0.5,
    borderColor: colors.modules.track + '30',
  },
  badgeText: {
    fontSize: 10,
    color: colors.modules.track,
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
})