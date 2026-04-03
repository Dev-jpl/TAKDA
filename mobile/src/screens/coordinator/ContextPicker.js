import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Modal, 
  ScrollView, 
  TouchableWithoutFeedback,
  Platform,
  TextInput
} from 'react-native';
import { colors } from '../../constants/colors';
import SpaceIcon from '../../components/common/SpaceIcon';
import { 
  Plus, X, Checks, CaretDown, 
  CheckSquareOffset, Square,
  MagnifyingGlass
} from 'phosphor-react-native';

export default function ContextPicker({ 
  spaces, 
  selectedSpaceIds, 
  onToggleSpace, 
  onToggleHub, 
  selectedHubIds 
}) {
  const [spaceDrawerVisible, setSpaceDrawerVisible] = useState(false);
  const [hubDrawerVisible, setHubDrawerVisible] = useState(false);
  const [spaceSearch, setSpaceSearch] = useState('');
  const [hubSearch, setHubSearch] = useState('');

  // Labels
  const spacesLabel = selectedSpaceIds.length === 0 ? 'ALL SPACES' : 
                     selectedSpaceIds.length === 1 ? spaces.find(s => s.id === selectedSpaceIds[0])?.name?.toUpperCase() || 'SPACE' :
                     `${selectedSpaceIds.length} SPACES SELECTED`;

  // Get available hubs based on selected spaces (de-duplicated by ID)
  const unfilteredHubs = spaces
    .filter(s => selectedSpaceIds.length === 0 || selectedSpaceIds.includes(s.id))
    .flatMap(s => s.hubs || []);
  
  const availableHubs = Array.from(new Map(unfilteredHubs.map(h => [h.id, h])).values());

  const hubsLabel = selectedHubIds.length === 0 ? 'ALL HUBS' :
                   selectedHubIds.length === 1 ? availableHubs.find(h => h.id === selectedHubIds[0])?.name?.toUpperCase() || 'HUB' :
                   `${selectedHubIds.length} HUBS SELECTED`;

  const handleSelectAllSpaces = () => {
    // In our logic, empty array means 'All selected'
    if (selectedSpaceIds.length === spaces.length || selectedSpaceIds.length === 0) {
      // Toggle to none (which means 'all' in current implementation, but let's make it explicit)
      onToggleSpace('all'); 
    } else {
      // Logic for explicit select all would go here if we change parent
      onToggleSpace('all');
    }
  };

  const filteredSpaces = spaces.filter(s => (s.name || '').toLowerCase().includes(spaceSearch.toLowerCase()));
  
  const filteredHubs = availableHubs.filter(h => (h.name || '').toLowerCase().includes(hubSearch.toLowerCase()));

  const handleSelectAllHubs = () => {
    const allHubIds = filteredHubs.map(h => h.id);
    if (selectedHubIds.length === allHubIds.length) {
      // Clear all
      allHubIds.forEach(id => onToggleHub(id));
    } else {
      // Add missing ones
      allHubIds.forEach(id => {
        if (!selectedHubIds.includes(id)) onToggleHub(id);
      });
    }
  };

  const isAllSpaces = selectedSpaceIds.length === 0;
  const isAllHubs = selectedHubIds.length === 0;

  return (
    <View style={styles.container}>
      <View style={styles.pillsRow}>
        <TouchableOpacity 
          style={[styles.selectPill, !isAllSpaces && styles.selectPillActive]} 
          onPress={() => setSpaceDrawerVisible(true)}
        >
          <Text 
            style={[styles.pillLabel, !isAllSpaces && styles.pillLabelActive]}
            numberOfLines={1}
          >
            {spacesLabel}
          </Text>
          <CaretDown size={14} color={isAllSpaces ? colors.text.tertiary : colors.modules.aly} weight="bold" />
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.selectPill, !isAllHubs && styles.selectPillActive]} 
          onPress={() => setHubDrawerVisible(true)}
        >
          <Text 
            style={[styles.pillLabel, !isAllHubs && styles.pillLabelActive]}
            numberOfLines={1}
          >
            {hubsLabel}
          </Text>
          <CaretDown size={14} color={isAllHubs ? colors.text.tertiary : colors.modules.aly} weight="bold" />
        </TouchableOpacity>
      </View>

      {/* Spaces Drawer */}
      <Modal visible={spaceDrawerVisible} transparent animationType="slide" onRequestClose={() => setSpaceDrawerVisible(false)}>
        <TouchableWithoutFeedback onPress={() => setSpaceDrawerVisible(false)}>
          <View style={styles.overlay}>
            <TouchableWithoutFeedback>
              <View style={styles.drawer}>
                <View style={styles.drawerHandle} />
                <View style={styles.drawerHeader}>
                  <Text style={styles.drawerTitle}>FILTER BY SPACES</Text>
                  <TouchableOpacity onPress={() => { setSpaceDrawerVisible(false); setSpaceSearch(''); }} style={styles.doneBtn}>
                    <Text style={styles.doneBtnText}>Done</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.drawerSearch}>
                  <MagnifyingGlass size={18} color={colors.text.tertiary} />
                  <TextInput
                    style={styles.drawerSearchInput}
                    placeholder="Search spaces..."
                    placeholderTextColor={colors.text.tertiary}
                    value={spaceSearch}
                    onChangeText={setSpaceSearch}
                  />
                </View>

                <TouchableOpacity style={styles.selectAllRow} onPress={handleSelectAllSpaces}>
                  <View style={[styles.checkbox, isAllSpaces && styles.checkboxActive]}>
                    {isAllSpaces ? <Checks size={12} color="#fff" weight="bold" /> : <Square size={12} color={colors.text.tertiary} />}
                  </View>
                  <Text style={styles.selectAllLabel}>SELECT ALL SPACES</Text>
                </TouchableOpacity>

                <ScrollView style={styles.drawerList}>
                  {filteredSpaces.map(space => {
                    const isActive = selectedSpaceIds.includes(space.id);
                    return (
                      <TouchableOpacity 
                        key={`space-${space.id}`} 
                        style={styles.drawerItem} 
                        onPress={() => onToggleSpace(space.id)}
                      >
                        <SpaceIcon icon={space.icon} color={space.color} size={32} iconSize={16} />
                        <Text style={[styles.itemLabel, isActive && styles.itemLabelActive]} numberOfLines={1}>{space.name}</Text>
                        {isActive && <Checks size={20} color={colors.modules.aly} weight="bold" />}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Hubs Drawer */}
      <Modal visible={hubDrawerVisible} transparent animationType="slide" onRequestClose={() => setHubDrawerVisible(false)}>
        <TouchableWithoutFeedback onPress={() => setHubDrawerVisible(false)}>
          <View style={styles.overlay}>
            <TouchableWithoutFeedback>
              <View style={styles.drawer}>
                <View style={styles.drawerHandle} />
                <View style={styles.drawerHeader}>
                  <Text style={styles.drawerTitle}>FILTER BY HUBS</Text>
                  <TouchableOpacity onPress={() => { setHubDrawerVisible(false); setHubSearch(''); }} style={styles.doneBtn}>
                    <Text style={styles.doneBtnText}>Done</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.drawerSearch}>
                  <MagnifyingGlass size={18} color={colors.text.tertiary} />
                  <TextInput
                    style={styles.drawerSearchInput}
                    placeholder="Search hubs..."
                    placeholderTextColor={colors.text.tertiary}
                    value={hubSearch}
                    onChangeText={setHubSearch}
                  />
                </View>

                <TouchableOpacity style={styles.selectAllRow} onPress={handleSelectAllHubs}>
                  <View style={[styles.checkbox, isAllHubs && styles.checkboxActive]}>
                    {isAllHubs ? <Checks size={12} color="#fff" weight="bold" /> : <Square size={12} color={colors.text.tertiary} />}
                  </View>
                  <Text style={styles.selectAllLabel}>SELECT ALL HUBS</Text>
                </TouchableOpacity>

                <ScrollView style={styles.drawerList}>
                  {filteredHubs.map(hub => {
                    const isActive = selectedHubIds.includes(hub.id);
                    return (
                      <TouchableOpacity 
                        key={`hub-${hub.id}`} 
                        style={styles.drawerItem} 
                        onPress={() => onToggleHub(hub.id)}
                      >
                        <SpaceIcon icon={hub.icon} color={hub.color} size={32} iconSize={16} />
                        <Text style={[styles.itemLabel, isActive && styles.itemLabelActive]} numberOfLines={1}>{hub.name}</Text>
                        {isActive && <Checks size={20} color={colors.modules.aly} weight="bold" />}
                      </TouchableOpacity>
                    );
                  })}
                  {availableHubs.length === 0 && (
                    <View style={styles.emptyDrawerState}>
                      <Text style={styles.emptyDrawerText}>No hubs available in selected spaces yet.</Text>
                    </View>
                  )}
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
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
  pillsRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 10,
  },
  selectPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background.tertiary,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.border.primary,
  },
  selectPillActive: {
    backgroundColor: colors.modules.aly + '10',
    borderColor: colors.modules.aly + '40',
  },
  pillLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.text.tertiary,
    letterSpacing: 1,
  },
  pillLabelActive: {
    color: colors.modules.aly,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  drawer: {
    backgroundColor: colors.background.secondary,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    maxHeight: '80%',
    paddingBottom: 40,
    borderWidth: 1,
    borderColor: colors.border.primary,
  },
  drawerHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border.primary,
    alignSelf: 'center',
    marginTop: 12,
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  drawerTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.text.tertiary,
    letterSpacing: 2,
  },
  doneBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: colors.modules.aly + '15',
    borderRadius: 8,
  },
  doneBtnText: {
    color: colors.modules.aly,
    fontSize: 12,
    fontWeight: '700',
  },
  selectAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    padding: 14,
    backgroundColor: colors.background.tertiary,
    borderRadius: 12,
    marginBottom: 12,
    gap: 12,
  },
  drawerSearch: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.tertiary,
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    borderWidth: 1,
    borderColor: colors.border.primary,
  },
  drawerSearchInput: {
    flex: 1,
    marginLeft: 8,
    color: colors.text.primary,
    fontSize: 14,
  },
  selectAllLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.text.primary,
    letterSpacing: 1,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.border.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    backgroundColor: colors.modules.aly,
    borderColor: colors.modules.aly,
  },
  drawerList: {
    paddingHorizontal: 20,
  },
  drawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border.primary,
  },
  itemLabel: {
    flex: 1,
    fontSize: 15,
    color: colors.text.secondary,
    fontWeight: '500',
  },
  itemLabelActive: {
    color: colors.text.primary,
    fontWeight: '700',
  },
  emptyDrawerState: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyDrawerText: {
    fontSize: 14,
    color: colors.text.tertiary,
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 20,
  },
});
