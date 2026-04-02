import React from 'react'
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator,
} from 'react-native'
import { colors } from '../../constants/colors'
import { 
  Check, Timer, Trash
} from 'phosphor-react-native'

const PRIORITY_COLORS = {
  urgent: colors.status.urgent,
  high: colors.status.high,
  low: colors.status.low,
}

const STATUS_LABELS = {
  todo: 'TODO',
  in_progress: 'DEVELOPING',
  done: 'COMPLETED',
}

function TaskCard({ task, onStatusCycle, onDelete }) {
  const priorityColor = PRIORITY_COLORS[task.priority] || colors.status.low
  const isDone = task.status === 'done'
  const isInProgress = task.status === 'in_progress'

  const cycleStatus = () => {
    const cycle = { todo: 'in_progress', in_progress: 'done', done: 'todo' }
    onStatusCycle(task.id, cycle[task.status])
  }

  return (
    <View style={[styles.card, isDone && styles.cardDone]}>
      {/* Priority accent */}
      <View style={[styles.priorityAccent, { backgroundColor: priorityColor }]} />

      <View style={styles.cardMain}>
        <View style={styles.cardHeader}>
          <TouchableOpacity 
            onPress={cycleStatus} 
            style={styles.statusBtn}
            hitSlop={{ top: 15, bottom: 15, left: 15, right: 10 }}
          >
            <View style={[
              styles.statusDot,
              { borderColor: isDone || isInProgress ? colors.modules.track : colors.text.tertiary },
              isDone && { backgroundColor: colors.modules.track }
            ]}>
              {isDone ? (
                <Check color="#fff" size={12} weight="bold" />
              ) : isInProgress ? (
                <Timer color={colors.modules.track} size={14} weight="fill" />
              ) : null}
            </View>
          </TouchableOpacity>

          <View style={styles.titleArea}>
            <Text style={[styles.taskTitle, isDone && styles.taskTitleDone]}>
              {task.title}
            </Text>
            <View style={styles.metaRow}>
              <View style={[styles.priorityPill, { backgroundColor: priorityColor + '15' }]}>
                <Text style={[styles.priorityText, { color: priorityColor }]}>
                  {task.priority.toUpperCase()}
                </Text>
              </View>
              <Text style={styles.statusBadge}>{STATUS_LABELS[task.status]}</Text>
            </View>
          </View>

          <TouchableOpacity 
            onPress={() => onDelete(task.id)} 
            style={styles.actionBtn}
            hitSlop={{ top: 15, bottom: 15, left: 10, right: 15 }}
          >
            <Trash color={colors.text.tertiary} size={18} weight="light" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  )
}

export default function TrackListView({ tasks, loading, onStatusCycle, onDelete, onRefresh }) {
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.modules.track} />
      </View>
    )
  }

  if (tasks.length === 0) {
    return (
      <View style={styles.center}>
        <View style={styles.emptyIconPlaceholder} />
        <Text style={styles.emptyTitle}>NO ACTIVE TASKS</Text>
        <Text style={styles.emptyHint}>The board is clear. Initialize a new unit.</Text>
      </View>
    )
  }

  return (
    <FlatList
      data={tasks}
      keyExtractor={t => t.id}
      contentContainerStyle={styles.list}
      renderItem={({ item }) => (
        <TaskCard
          task={item}
          onStatusCycle={onStatusCycle}
          onDelete={onDelete}
        />
      )}
      onRefresh={onRefresh}
      refreshing={loading}
      showsVerticalScrollIndicator={false}
    />
  )
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 40,
  },
  emptyIcon: {
    marginBottom: 8,
    opacity: 0.5,
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
  list: {
    padding: 20,
    paddingTop: 10,
    paddingBottom: 120,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: colors.background.tertiary,
    borderRadius: 16,
    borderWidth: 0.5,
    borderColor: colors.border.primary,
    overflow: 'hidden',
    marginBottom: 12,
  },
  cardDone: {
    opacity: 0.6,
  },
  priorityAccent: {
    width: 4,
  },
  cardMain: {
    flex: 1,
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  statusBtn: {
    paddingTop: 2,
  },
  statusDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
  },
  titleArea: {
    flex: 1,
    gap: 6,
  },
  taskTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.text.primary,
    lineHeight: 22,
  },
  taskTitleDone: {
    textDecorationLine: 'line-through',
    color: colors.text.tertiary,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  priorityPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  priorityText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  statusBadge: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.text.tertiary,
    letterSpacing: 1,
  },
  actionBtn: {
    paddingTop: 2,
  },
  deleteX: {
    color: colors.text.tertiary,
    fontSize: 16,
    fontWeight: '300',
  },
  emptyIconPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.text.tertiary,
    opacity: 0.3,
    marginBottom: 8,
  },
})