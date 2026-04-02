import React from 'react'
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator,
} from 'react-native'
import { colors } from '../../constants/colors'
import { Trash } from 'phosphor-react-native'

const COLUMNS = [
  { key: 'todo', label: 'TODO', color: colors.text.tertiary },
  { key: 'in_progress', label: 'DEVELOPING', color: colors.modules.track },
  { key: 'done', label: 'COMPLETED', color: colors.status.low },
]

const PRIORITY_COLORS = {
  urgent: colors.status.urgent,
  high: colors.status.high,
  low: colors.status.low,
}

function KanbanCard({ task, onMove, onDelete }) {
  const priorityColor = PRIORITY_COLORS[task.priority] || colors.status.low

  const moveForward = () => {
    const next = { todo: 'in_progress', in_progress: 'done', done: 'todo' }
    onMove(task.id, next[task.status])
  }

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={moveForward}
      activeOpacity={0.7}
    >
      <View style={[styles.priorityAccent, { backgroundColor: priorityColor }]} />
      <View style={styles.cardBody}>
        <Text style={styles.cardTitle} numberOfLines={3}>{task.title}</Text>
        <View style={styles.cardFooter}>
          <View style={[styles.priorityPill, { backgroundColor: priorityColor + '15' }]}>
            <Text style={[styles.priorityText, { color: priorityColor }]}>
              {task.priority.toUpperCase()}
            </Text>
          </View>
          <TouchableOpacity 
            onPress={() => onDelete(task.id)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Trash color={colors.text.tertiary} size={14} weight="light" />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  )
}

function KanbanColumn({ column, tasks, onMove, onDelete }) {
  return (
    <View style={styles.column}>
      <View style={styles.columnHeader}>
        <View style={styles.headerLeft}>
          <View style={[styles.headerDot, { backgroundColor: column.color }]} />
          <Text style={styles.columnTitle}>{column.label}</Text>
        </View>
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{tasks.length}</Text>
        </View>
      </View>
      
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.columnContent}
      >
        {tasks.length === 0 ? (
          <View style={styles.emptyColumn}>
            <Text style={styles.emptyColumnText}>Board Clear</Text>
          </View>
        ) : (
          tasks.map(task => (
            <KanbanCard
              key={task.id}
              task={task}
              onMove={onMove}
              onDelete={onDelete}
            />
          ))
        )}
      </ScrollView>
    </View>
  )
}

export default function TrackKanbanView({ tasks, loading, onMove, onDelete }) {
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.modules.track} />
      </View>
    )
  }

  const grouped = {
    todo: tasks.filter(t => t.status === 'todo'),
    in_progress: tasks.filter(t => t.status === 'in_progress'),
    done: tasks.filter(t => t.status === 'done'),
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.board}
      snapToInterval={292} // Column width (280) + gap (12)
      decelerationRate="fast"
    >
      {COLUMNS.map(col => (
        <KanbanColumn
          key={col.key}
          column={col}
          tasks={grouped[col.key]}
          onMove={onMove}
          onDelete={onDelete}
        />
      ))}
      <View style={{ width: 8 }} />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  board: {
    padding: 20,
    gap: 12,
    paddingBottom: 120,
  },
  column: {
    width: 280,
    backgroundColor: colors.background.secondary,
    borderRadius: 20,
    borderWidth: 0.5,
    borderColor: colors.border.primary,
    overflow: 'hidden',
    maxHeight: '100%',
  },
  columnHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
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
  },
  columnTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.text.secondary,
    letterSpacing: 1,
  },
  countBadge: {
    backgroundColor: colors.background.tertiary,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 0.5,
    borderColor: colors.border.primary,
  },
  countText: {
    fontSize: 10,
    color: colors.text.tertiary,
    fontWeight: '700',
  },
  columnContent: {
    padding: 12,
    gap: 10,
    paddingBottom: 30,
  },
  emptyColumn: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyColumnText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.text.tertiary,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  card: {
    flexDirection: 'row',
    backgroundColor: colors.background.tertiary,
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: colors.border.primary,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  priorityAccent: {
    width: 3,
  },
  cardBody: {
    flex: 1,
    padding: 12,
    gap: 10,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text.primary,
    lineHeight: 20,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  priorityPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  priorityText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  }
})