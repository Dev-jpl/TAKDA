import React from 'react'
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, Dimensions,
} from 'react-native'
import { colors } from '../../constants/colors'
import { 
  Lightbulb, BookmarkSimple, Target, 
  Trash, FileText, Globe, ArrowRight 
} from 'phosphor-react-native'

const { width } = Dimensions.get('window')

const CATEGORY_MAP = {
  idea: { label: 'IDEA', color: '#EAB308', icon: Lightbulb },
  reference: { label: 'REF', color: '#378ADD', icon: BookmarkSimple },
  action: { label: 'ACTION', color: '#1D9E75', icon: Target },
}

function InsightCard({ item, onDelete }) {
  const cat = CATEGORY_MAP[item.category] || CATEGORY_MAP.idea
  const Icon = cat.icon

  return (
    <View style={styles.card}>
      <View style={[styles.categoryIndicator, { backgroundColor: cat.color }]} />
      <View style={styles.cardMain}>
        <View style={styles.cardHeader}>
          <View style={[styles.categoryBadge, { backgroundColor: cat.color + '15' }]}>
            <Icon color={cat.color} size={12} weight="fill" />
            <Text style={[styles.categoryText, { color: cat.color }]}>{cat.label}</Text>
          </View>
          <TouchableOpacity onPress={() => onDelete(item.id)} hitSlop={10}>
            <Trash color={colors.text.tertiary} size={16} weight="light" />
          </TouchableOpacity>
        </View>
        <Text style={styles.cardContent}>{item.content}</Text>
        <View style={styles.cardFooter}>
          <Text style={styles.timestamp}>
            {new Date(item.created_at).toLocaleDateString()}
          </Text>
          {item.document_id && (
            <View style={styles.linkBadge}>
              <Text style={styles.linkText}>LINKED TO UNIT</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  )
}

function DocCard({ item }) {
  const isUrl = item.source_type === 'url'
  const Icon = isUrl ? Globe : FileText

  return (
    <View style={styles.docCard}>
      <View style={styles.docIconWrap}>
        <Icon color={colors.text.secondary} size={20} weight="light" />
      </View>
      <View style={styles.docInfo}>
        <Text style={styles.docTitle} numberOfLines={1}>{item.title || 'Untitled Unit'}</Text>
        <Text style={styles.docMeta}>{item.source_type.toUpperCase()} · READY FOR PROCESSING</Text>
      </View>
      <ArrowRight color={colors.text.tertiary} size={16} weight="light" />
    </View>
  )
}

export default function AnnotateDashboard({ view, annotations, documents, onDelete, onRefresh }) {
  const isEmpty = view === 'insights' ? annotations.length === 0 : documents.length === 0

  if (isEmpty) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>
          {view === 'insights' ? 'NO INSIGHT UNITS' : 'NO PROCESSING TARGETS'}
        </Text>
        <Text style={styles.emptyHint}>
          {view === 'insights' 
            ? 'Start capturing ideas or actions from your knowledge base.' 
            : 'Initialize a document in the Knowledge module to begin annotating.'}
        </Text>
      </View>
    )
  }

  return (
    <FlatList
      data={view === 'insights' ? annotations : documents}
      keyExtractor={item => item.id}
      contentContainerStyle={styles.list}
      renderItem={({ item }) => (
        view === 'insights' 
          ? <InsightCard item={item} onDelete={onDelete} />
          : <DocCard item={item} />
      )}
      onRefresh={onRefresh}
      refreshing={false}
      showsVerticalScrollIndicator={false}
    />
  )
}

const styles = StyleSheet.create({
  list: {
    padding: 20,
    paddingTop: 10,
    paddingBottom: 120,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
  // Insight Card
  card: {
    flexDirection: 'row',
    backgroundColor: colors.background.tertiary,
    borderRadius: 16,
    borderWidth: 0.5,
    borderColor: colors.border.primary,
    marginBottom: 12,
    overflow: 'hidden',
  },
  categoryIndicator: {
    width: 4,
  },
  cardMain: {
    flex: 1,
    padding: 16,
    gap: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  cardContent: {
    fontSize: 15,
    color: colors.text.primary,
    lineHeight: 22,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  timestamp: {
    fontSize: 11,
    color: colors.text.tertiary,
  },
  linkBadge: {
    backgroundColor: colors.background.secondary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 0.5,
    borderColor: colors.border.primary,
  },
  linkText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.text.tertiary,
  },
  // Doc Card
  docCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.tertiary,
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: colors.border.primary,
    padding: 14,
    gap: 12,
    marginBottom: 10,
  },
  docIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: colors.background.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.5,
    borderColor: colors.border.primary,
  },
  docInfo: {
    flex: 1,
    gap: 4,
  },
  docTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
  },
  docMeta: {
    fontSize: 10,
    color: colors.text.tertiary,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
})
