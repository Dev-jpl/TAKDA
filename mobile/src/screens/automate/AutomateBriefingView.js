import React from 'react'
import {
  View, Text, StyleSheet, Modal, 
  TouchableOpacity, ScrollView, Platform,
} from 'react-native'
import { colors } from '../../constants/colors'
import { X, Sparkle, ShareNetwork, BookmarkSimple } from 'phosphor-react-native'

export default function AutomateBriefingView({ briefing, onClose }) {
  if (!briefing) return null

  return (
    <Modal
      visible={!!briefing}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <X color={colors.text.tertiary} size={24} weight="bold" />
          </TouchableOpacity>
          <View style={styles.headerTitleWrap}>
            <Sparkle color={colors.modules.automate} size={16} weight="fill" />
            <Text style={styles.headerTitle}>ROYAL BRIEFING</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.actionBtn}>
              <ShareNetwork color={colors.text.tertiary} size={20} />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero Section */}
          <View style={styles.hero}>
            <Text style={styles.date}>
              {new Date(briefing.created_at).toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </Text>
            <Text style={styles.title}>{briefing.title}</Text>
            <View style={styles.typeBadge}>
              <Text style={styles.typeText}>{briefing.type.toUpperCase()} RHYTHM</Text>
            </View>
          </View>

          {/* AI Content */}
          <View style={styles.contentWrap}>
            <Text style={styles.content}>{briefing.content}</Text>
          </View>

          {/* Footer / Meta */}
          <View style={styles.footer}>
            <View style={styles.divider} />
            <View style={styles.metaRow}>
              <View style={styles.metaItem}>
                <BookmarkSimple color={colors.text.tertiary} size={14} />
                <Text style={styles.metaText}>Secured in System History</Text>
              </View>
              <Text style={styles.idText}>ID: {briefing.id.split('-')[0].toUpperCase()}</Text>
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
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
    paddingVertical: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border.primary,
  },
  headerTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.text.primary,
    letterSpacing: 2,
  },
  closeBtn: {
    padding: 4,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 16,
  },
  actionBtn: {
    padding: 4,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 60,
  },
  hero: {
    marginBottom: 32,
    gap: 12,
  },
  date: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.modules.automate,
    letterSpacing: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text.primary,
    lineHeight: 34,
  },
  typeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.background.secondary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 0.5,
    borderColor: colors.border.primary,
  },
  typeText: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.text.tertiary,
    letterSpacing: 1,
  },
  contentWrap: {
    backgroundColor: colors.background.tertiary,
    borderRadius: 20,
    padding: 24,
    borderWidth: 0.5,
    borderColor: colors.border.primary,
  },
  content: {
    fontSize: 16,
    color: colors.text.primary,
    lineHeight: 26,
  },
  footer: {
    marginTop: 40,
    gap: 20,
  },
  divider: {
    height: 0.5,
    backgroundColor: colors.border.primary,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metaText: {
    fontSize: 11,
    color: colors.text.tertiary,
    fontWeight: '600',
  },
  idText: {
    fontSize: 10,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    color: colors.text.tertiary,
    opacity: 0.5,
  },
})
