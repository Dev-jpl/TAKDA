import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, Text, StyleSheet, FlatList, 
  TouchableOpacity, ActivityIndicator, 
  RefreshControl, Alert, Modal, TextInput,
  Platform
} from 'react-native';
import { colors } from '../../constants/colors';
import { 
  ClockCounterClockwise, ChatCircleText, Trash, 
  CaretRight, Plus, PencilSimple, MagnifyingGlass,
  Sparkle
} from 'phosphor-react-native';
import { coordinatorService } from '../../services/coordinator';
import { ASSISTANT_NAME } from '../../constants/brand';

function SessionRow({ session, onResume, onDelete, onRename }) {
  const dateStr = new Date(session.updated_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const showOptions = () => {
    Alert.alert(
      'Chat Options',
      `Manage "${session.title || 'Chat'}"`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Rename', onPress: () => onRename(session) },
        { text: 'Delete', style: 'destructive', onPress: () => onDelete(session.id) },
      ]
    );
  };

  return (
    <TouchableOpacity 
      style={styles.row} 
      onPress={() => onResume(session.id)}
      onLongPress={showOptions}
      activeOpacity={0.7}
    >
      <View style={styles.rowIcon}>
        <ChatCircleText size={18} color={colors.modules.aly} weight="light" />
      </View>
      
      <View style={styles.rowContent}>
        <Text style={styles.rowTitle} numberOfLines={1}>
          {session.title || 'Chat'}
        </Text>
        <Text style={styles.rowDate}>{dateStr}</Text>
      </View>
      
      <CaretRight size={14} color={colors.border.primary} />
    </TouchableOpacity>
  );
}

export default function HistoryTab({ userId, onResume, onNewChat }) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingSession, setEditingSession] = useState(null);
  const [newTitle, setNewTitle] = useState('');

  const loadSessions = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const data = await coordinatorService.getSessions(userId);
      setSessions(data);
    } catch (e) {
      console.warn('loadSessions error:', e);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const handleRename = (session) => {
    setEditingSession(session);
    setNewTitle(session.title || '');
  };

  const submitRename = async () => {
    if (!newTitle.trim() || !editingSession) return;
    try {
      await coordinatorService.updateSession(editingSession.id, newTitle.trim());
      setSessions(prev => prev.map(s => s.id === editingSession.id ? { ...s, title: newTitle.trim() } : s));
      setEditingSession(null);
    } catch (e) {
      Alert.alert('Error', 'Could not rename session.');
    }
  };

  const handleDelete = (id) => {
    Alert.alert(
      'Delete Session',
      'Are you sure you want to delete this chat?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              await coordinatorService.deleteSession(id);
              setSessions(prev => prev.filter(s => s.id !== id));
            } catch (e) {
              Alert.alert('Error', 'Could not delete session.');
            }
          }
        }
      ]
    );
  };

  const filteredSessions = sessions.filter(s => 
    (s.title || 'Chat').toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading && sessions.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.modules.aly} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={filteredSessions}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={loadSessions} tintColor={colors.modules.aly} />
        }
        renderItem={({ item }) => (
          <SessionRow 
            session={item} 
            onResume={onResume} 
            onDelete={handleDelete} 
            onRename={handleRename}
          />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No chat history yet.</Text>
          </View>
        }
      />

      <View style={styles.floatingControls}>
        <View style={styles.searchBar}>
          <MagnifyingGlass size={18} color={colors.text.tertiary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search logs..."
            placeholderTextColor={colors.text.tertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <TouchableOpacity style={styles.minNewBtn} onPress={onNewChat} activeOpacity={0.7}>
          <Sparkle size={20} color={colors.modules.aly} weight="fill" />
        </TouchableOpacity>
      </View>

      <Modal
        visible={!!editingSession}
        transparent
        animationType="fade"
        onRequestClose={() => setEditingSession(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Rename Chat</Text>
            <TextInput
              style={styles.modalInput}
              value={newTitle}
              onChangeText={setNewTitle}
              autoFocus
              placeholder="Enter new title..."
              placeholderTextColor={colors.text.tertiary}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.modalBtn} 
                onPress={() => setEditingSession(null)}
              >
                <Text style={styles.modalBtnCancel}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalBtn, styles.modalBtnSave]} 
                onPress={submitRename}
              >
                <Text style={styles.modalBtnText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  floatingControls: {
    position: 'absolute',
    bottom: 24,
    left: 8, // Reduced margin for more width
    right: 8, // Reduced margin for more width
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
    borderRadius: 30, // Fully rounded (Capsule)
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    borderWidth: 1.5,
    borderColor: colors.border.primary,
    zIndex: 999,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
      },
      android: {
        elevation: 15,
      },
    }),
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.secondary + '80',
    borderRadius: 24, // Fully rounded
    paddingHorizontal: 14,
    height: 44,
    borderWidth: 0.5,
    borderColor: colors.border.primary,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    color: colors.text.primary,
    fontSize: 14,
  },
  minNewBtn: {
    width: 44,
    height: 44,
    borderRadius: 22, // Fully rounded (Circle)
    backgroundColor: colors.modules.aly + '25',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.5,
    borderColor: colors.modules.aly + '30',
  },
  list: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 100, // Extra space for floating dock
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    borderColor: colors.border.primary,
  },
  rowIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: colors.modules.aly + '10',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rowContent: {
    flex: 1,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 2,
  },
  rowDate: {
    fontSize: 11,
    color: colors.text.tertiary,
  },
  empty: {
    alignItems: 'center',
    paddingTop: 40,
  },
  emptyText: {
    fontSize: 13,
    color: colors.text.tertiary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalContent: {
    width: '100%',
    backgroundColor: colors.background.secondary,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.border.primary,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 20,
  },
  modalInput: {
    backgroundColor: colors.background.tertiary,
    borderRadius: 12,
    padding: 16,
    color: colors.text.primary,
    fontSize: 16,
    borderWidth: 0.5,
    borderColor: colors.border.primary,
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  modalBtn: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  modalBtnSave: {
    backgroundColor: colors.modules.aly,
  },
  modalBtnCancel: {
    color: colors.text.tertiary,
    fontWeight: '600',
  },
  modalBtnText: {
    color: '#FFF',
    fontWeight: '700',
  }
});
