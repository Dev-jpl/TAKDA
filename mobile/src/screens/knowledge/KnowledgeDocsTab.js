import {
  View, Text, TouchableOpacity,
  FlatList, StyleSheet, ActivityIndicator,
} from 'react-native'
import { colors } from '../../constants/colors'

function DocRow({ doc, onDelete }) {
  return (
    <View style={styles.row}>
      <View style={styles.rowIcon}>
        <Text style={styles.rowIconText}>
          {doc.source_type === 'url' ? '🔗' : '📄'}
        </Text>
      </View>
      <View style={styles.rowInfo}>
        <Text style={styles.rowName} numberOfLines={1}>{doc.title || doc.source_url || 'Untitled'}</Text>
        <Text style={styles.rowMeta}>
          {doc.chunk_count ?? 0} chunks · {doc.source_type?.toUpperCase()}
        </Text>
      </View>
      <TouchableOpacity style={styles.deleteBtn} onPress={() => onDelete(doc.id)}>
        <Text style={styles.deleteText}>✕</Text>
      </TouchableOpacity>
    </View>
  )
}

export default function KnowledgeDocsTab({ docs, loading, onDelete, onRefresh }) {
  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.modules.knowledge} />
      </View>
    )
  }

  if (docs.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyTitle}>No sources</Text>
        <Text style={styles.emptyHint}>Add a PDF or URL to get started.</Text>
      </View>
    )
  }

  return (
    <FlatList
      data={docs}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <DocRow doc={item} onDelete={onDelete} />}
      contentContainerStyle={styles.list}
      showsVerticalScrollIndicator={false}
      onRefresh={onRefresh}
      refreshing={loading}
    />
  )
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.text.secondary,
  },
  emptyHint: {
    fontSize: 13,
    color: colors.text.tertiary,
  },
  list: {
    padding: 16,
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
    borderRadius: 10,
    borderWidth: 0.5,
    borderColor: colors.border.primary,
    padding: 12,
    gap: 10,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: colors.modules.knowledge + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowIconText: {
    fontSize: 16,
  },
  rowInfo: {
    flex: 1,
    gap: 3,
  },
  rowName: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text.primary,
  },
  rowMeta: {
    fontSize: 11,
    color: colors.text.tertiary,
  },
  deleteBtn: {
    padding: 4,
  },
  deleteText: {
    fontSize: 14,
    color: colors.text.tertiary,
  },
})
