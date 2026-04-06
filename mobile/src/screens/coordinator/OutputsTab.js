import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import { colors } from '../../constants/colors';
import { FileText, Trash, Calendar, CaretRight, FilePdf, Kanban, Globe } from 'phosphor-react-native';
import { coordinatorService } from '../../services/coordinator';
import { ASSISTANT_NAME } from '../../constants/brand';

function OutputCard({ output, onDelete }) {
  const isReport = output.type === 'report';
  const isPlan = output.type === 'plan';
  const isSummary = output.type === 'summary';

  const dateStr = new Date(output.created_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  const getIcon = () => {
    if (isPlan) return <Kanban size={18} color={colors.modules.aly} weight="light" />;
    if (isReport) return <FileText size={18} color={colors.modules.aly} weight="light" />;
    return <FilePdf size={18} color={colors.modules.aly} weight="light" />;
  };

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.typeBadge}>
          {getIcon()}
          <Text style={styles.typeLabel}>{output.type.toUpperCase()}</Text>
        </View>
        <TouchableOpacity onPress={() => onDelete(output.id)} style={styles.deleteBtn}>
          <Trash size={16} color={colors.text.tertiary} />
        </TouchableOpacity>
      </View>

      <Text style={styles.title} numberOfLines={2}>{output.title}</Text>

      <View style={styles.cardFooter}>
        <View style={styles.dateRow}>
          <Calendar size={12} color={colors.text.tertiary} />
          <Text style={styles.dateText}>{dateStr}</Text>
        </View>
        
        <TouchableOpacity style={styles.viewBtn}>
          <Text style={styles.viewBtnText}>VIEW UNIT</Text>
          <CaretRight size={12} color={colors.modules.aly} weight="bold" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function OutputsTab({ userId }) {
  const [outputs, setOutputs] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadOutputs = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const data = await coordinatorService.getOutputs(userId);
      setOutputs(data);
    } catch (e) {
      console.warn('loadOutputs error:', e);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadOutputs();
  }, [loadOutputs]);

  const handleDelete = (id) => {
    Alert.alert('Erase Output', 'This action will permanently delete this unit from your repository.', [
      { text: 'Cancel', style: 'cancel' },
      { 
        text: 'Delete', 
        style: 'destructive',
        onPress: async () => {
          try {
            await coordinatorService.deleteOutput(id);
            setOutputs(prev => prev.filter(o => o.id !== id));
          } catch (e) {
            Alert.alert('Error', 'Could not delete output unit.');
          }
        }
      }
    ]);
  };

  if (outputs.length === 0 && !loading) {
    return (
      <View style={styles.empty}>
        <View style={styles.emptyIconCircle}>
          <Globe size={32} color={colors.text.tertiary} weight="light" />
        </View>
        <Text style={styles.emptyTitle}>NO OUTPUTS GENERATED</Text>
        <Text style={styles.emptySub}>
          Ask {ASSISTANT_NAME} to generate a report or plan. Your saved outputs will appear here.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={outputs}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={loadOutputs} tintColor={colors.modules.aly} />
        }
        renderItem={({ item }) => (
          <OutputCard output={item} onDelete={handleDelete} />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  list: {
    padding: 20,
    gap: 16,
  },
  card: {
    backgroundColor: colors.background.secondary,
    borderRadius: 16,
    padding: 16,
    borderWidth: 0.5,
    borderColor: colors.border.primary,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.background.tertiary,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 0.5,
    borderColor: colors.border.primary,
  },
  typeLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.modules.aly,
    letterSpacing: 1,
  },
  deleteBtn: {
    padding: 4,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 16,
    lineHeight: 20,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateText: {
    fontSize: 11,
    color: colors.text.tertiary,
    fontWeight: '500',
  },
  viewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewBtnText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.modules.aly,
    letterSpacing: 1.5,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.background.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 0.5,
    borderColor: colors.border.primary,
  },
  emptyTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.text.primary,
    letterSpacing: 2,
    marginBottom: 12,
  },
  emptySub: {
    fontSize: 13,
    color: colors.text.tertiary,
    textAlign: 'center',
    lineHeight: 20,
  },
});
