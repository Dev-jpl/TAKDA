import React, { useState, useEffect, useCallback } from 'react'
import {
  View, Text, TouchableOpacity,
  StyleSheet,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFocusEffect } from '@react-navigation/native'
import { supabase } from '../../services/supabase'
import { knowledgeService } from '../../services/knowledge'
import { colors } from '../../constants/colors'
import KnowledgeChatTab from './KnowledgeChatTab'
import KnowledgeDocsTab from './KnowledgeDocsTab'
import KnowledgeUploadModal from './KnowledgeUploadModal'

const TABS = ['chat', 'docs']

export default function KnowledgeScreen({ space }) {
  const [activeTab, setActiveTab] = useState('chat')
  const [docs, setDocs] = useState([])
  const [docsLoading, setDocsLoading] = useState(false)
  const [uploadVisible, setUploadVisible] = useState(false)
  const [userId, setUserId] = useState(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserId(user?.id)
    })
  }, [])

  useEffect(() => {
    if (userId) loadDocs()
  }, [userId])

  useFocusEffect(
    useCallback(() => {
      if (userId) loadDocs()
    }, [userId])
  )

  const loadDocs = async () => {
    if (!userId) return
    setDocsLoading(true)
    try {
      const data = await knowledgeService.getDocuments(userId, space?.id)
      setDocs(data)
    } catch (e) {
      console.warn('loadDocs error:', e)
    } finally {
      setDocsLoading(false)
    }
  }

  const handleDelete = async (docId) => {
    try {
      await knowledgeService.deleteDocument(docId)
      setDocs(prev => prev.filter(d => d.id !== docId))
    } catch (e) {
      console.warn('delete error:', e)
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.headerDot} />
          <Text style={styles.headerTitle}>Knowledge</Text>
          {docs.length > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{docs.length}</Text>
            </View>
          )}
        </View>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => setUploadVisible(true)}
        >
          <Text style={styles.addBtnText}>+</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {TABS.map(tab => (
          <TouchableOpacity
            key={tab}
            style={styles.tab}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab.toUpperCase()}
            </Text>
            {activeTab === tab && <View style={styles.tabUnderline} />}
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      <View style={styles.content}>
        {activeTab === 'chat' && (
          <KnowledgeChatTab userId={userId} spaceId={space?.id} docs={docs} />
        )}
        {activeTab === 'docs' && (
          <KnowledgeDocsTab
            docs={docs}
            loading={docsLoading}
            onDelete={handleDelete}
            onRefresh={loadDocs}
          />
        )}
      </View>

      {/* Upload modal */}
      <KnowledgeUploadModal
        visible={uploadVisible}
        userId={userId}
        spaceId={space?.id}
        onClose={() => setUploadVisible(false)}
        onUploaded={loadDocs}
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
    paddingBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.modules.knowledge,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text.primary,
  },
  badge: {
    backgroundColor: colors.modules.knowledge + '20',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeText: {
    fontSize: 11,
    color: colors.modules.knowledge,
    fontWeight: '500',
  },
  addBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.background.secondary,
    borderWidth: 0.5,
    borderColor: colors.border.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnText: {
    fontSize: 20,
    color: colors.text.secondary,
    lineHeight: 24,
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border.primary,
  },
  tab: {
    marginRight: 20,
    paddingBottom: 10,
    position: 'relative',
  },
  tabText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.text.tertiary,
    letterSpacing: 1,
  },
  tabTextActive: {
    color: colors.modules.knowledge,
  },
  tabUnderline: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 1.5,
    backgroundColor: colors.modules.knowledge,
    borderRadius: 1,
  },
  content: {
    flex: 1,
  },
})