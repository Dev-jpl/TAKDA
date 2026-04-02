import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal } from 'react-native';
import { colors } from '../../constants/colors';
import SpaceIcon from '../../components/common/SpaceIcon';
import { Plus, X, Checks } from 'phosphor-react-native';

export default function KalayContextPicker({ 
  spaces, 
  selectedSpaceIds, 
  onToggleSpace, 
  onToggleHub, 
  selectedHubIds 
}) {
  const [modalVisible, setModalVisible] = useState(false);
  const [activeSpaceForHubs, setActiveSpaceForHubs] = useState(null);

  const handleLongPress = (space) => {
    setActiveSpaceForHubs(space);
    setModalVisible(true);
  };

  const isAll = selectedSpaceIds.length === 0 && selectedHubIds.length === 0;

  return (
    <View style={styles.container}>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false} 
        contentContainerStyle={styles.scroll}
      >
        <TouchableOpacity
          style={[styles.chip, isAll && styles.chipActive]}
          onPress={() => onToggleSpace('all')}
        >
          <Text style={[styles.chipLabel, isAll && styles.chipLabelActive]}>ALL</Text>
        </TouchableOpacity>

        {spaces.map(space => {
          const isActive = selectedSpaceIds.includes(space.id);
          const hasHubFilters = selectedHubIds.some(hid => space.hubs?.some(h => h.id === hid));
          
          return (
            <TouchableOpacity
              key={space.id}
              style={[
                styles.chip, 
                isActive && { backgroundColor: space.color + '20', borderColor: space.color + '60' },
                hasHubFilters && { borderStyle: 'dashed' }
              ]}
              onPress={() => onToggleSpace(space.id)}
              onLongPress={() => handleLongPress(space)}
            >
              <SpaceIcon 
                icon={space.icon} 
                color={isActive || hasHubFilters ? space.color : colors.text.tertiary} 
                size={16} 
                iconSize={10} 
              />
              <Text style={[
                styles.chipLabel, 
                (isActive || hasHubFilters) && { color: colors.text.primary }
              ]}>
                {space.name.toUpperCase()}
              </Text>
              {hasHubFilters && <View style={[styles.dot, { backgroundColor: space.color }]} />}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Hub Picker Modal */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Hubs in {activeSpaceForHubs?.name}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X color={colors.text.secondary} size={20} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.hubList}>
              {activeSpaceForHubs?.hubs?.map(hub => {
                const isHubActive = selectedHubIds.includes(hub.id);
                return (
                  <TouchableOpacity 
                    key={hub.id} 
                    style={styles.hubItem}
                    onPress={() => onToggleHub(hub.id)}
                  >
                    <View style={[
                      styles.checkbox, 
                      isHubActive && { backgroundColor: activeSpaceForHubs.color, borderColor: activeSpaceForHubs.color }
                    ]}>
                      {isHubActive && <Checks size={12} color="#fff" weight="bold" />}
                    </View>
                    <Text style={[styles.hubLabel, isHubActive && { color: colors.text.primary }]}>
                      {hub.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border.primary,
  },
  scroll: {
    paddingHorizontal: 20,
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 0.5,
    borderColor: colors.border.primary,
    backgroundColor: colors.background.tertiary,
  },
  chipActive: {
    backgroundColor: colors.modules.kalay + '20',
    borderColor: colors.modules.kalay + '60',
  },
  chipLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.text.tertiary,
    letterSpacing: 1,
  },
  chipLabelActive: {
    color: colors.modules.kalay,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginLeft: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    width: '100%',
    backgroundColor: colors.background.secondary,
    borderRadius: 20,
    borderWidth: 0.5,
    borderColor: colors.border.primary,
    maxHeight: '60%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border.primary,
  },
  modalTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
  },
  hubList: {
    padding: 10,
  },
  hubItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 12,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hubLabel: {
    fontSize: 14,
    color: colors.text.secondary,
  },
});
