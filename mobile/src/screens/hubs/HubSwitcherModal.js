import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TouchableWithoutFeedback,
  ScrollView,
  TextInput,
  ActivityIndicator,
} from 'react-native'
import { colors } from '../../constants/colors'
import { hubsService } from '../../services/hubs'
import SpaceIcon from '../../components/common/SpaceIcon'
import { hubStore } from '../../services/hubStore'
import { MagnifyingGlass, X } from 'phosphor-react-native'

export default function HubSwitcherModal({ 
  visible, 
  onClose, 
  currentSpace, 
  currentHubId, 
  navigation 
}) {
  const [hubs, setHubs] = useState([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (visible && currentSpace) {
      loadHubs()
    } else {
      setSearch('')
    }
  }, [visible, currentSpace])

  const loadHubs = async () => {
    setLoading(true)
    try {
      const data = await hubsService.getHubs(currentSpace.id)
      setHubs(data)
      // Pre-populate store
      data.forEach(hub => {
        hubStore.setHubData(hub.id, {
          modules: hub.hub_modules || [],
          addons: hub.hub_addons || [],
        });
      });
    } catch (e) {
      console.warn('Switcher load error:', e)
    } finally {
      setLoading(false)
    }
  }

  const handleSelect = (hub) => {
    onClose()
    if (hub.id === currentHubId) return
    
    // Navigate with new hub params
    navigation.navigate('Hub', { hub, space: currentSpace })
  }

  const filteredHubs = hubs.filter(h => 
    h.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback onPress={e => e.stopPropagation()}>
            <View style={styles.sheet}>
              <View style={styles.handle} />

              <View style={styles.header}>
                <Text style={styles.title}>Switch hub</Text>
                <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                  <X color={colors.text.tertiary} size={20} />
                </TouchableOpacity>
              </View>

              <View style={styles.searchContainer}>
                <MagnifyingGlass color={colors.text.tertiary} size={18} />
                <TextInput
                  style={styles.searchInput}
                  value={search}
                  onChangeText={setSearch}
                  placeholder="Search hubs..."
                  placeholderTextColor={colors.text.tertiary}
                  autoFocus={false}
                />
              </View>

              <ScrollView 
                style={styles.list} 
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
              >
                {loading ? (
                  <ActivityIndicator color={colors.modules.track} style={{ marginTop: 20 }} />
                ) : (
                  filteredHubs.map(hub => {
                    const isActive = hub.id === currentHubId
                    return (
                      <TouchableOpacity
                        key={hub.id}
                        style={[
                          styles.item,
                          isActive && styles.activeItem
                        ]}
                        onPress={() => handleSelect(hub)}
                      >
                        <SpaceIcon 
                          icon={hub.icon} 
                          color={hub.color} 
                          size={36} 
                          iconSize={18} 
                        />
                        <View style={styles.itemInfo}>
                          <Text style={[
                            styles.itemName,
                            isActive && { color: colors.text.primary, fontWeight: '600' }
                          ]}>
                            {hub.name}
                          </Text>
                          {isActive && (
                            <View style={styles.activeBadge}>
                              <Text style={styles.activeText}>CURRENTLY ACTIVE</Text>
                            </View>
                          )}
                        </View>
                        {isActive && <View style={styles.activeIndicator} />}
                      </TouchableOpacity>
                    )
                  })
                )}
                
                {filteredHubs.length === 0 && !loading && (
                  <Text style={styles.emptyText}>No hubs found.</Text>
                )}
                
                <View style={{ height: 40 }} />
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.background.secondary,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    minHeight: '50%',
    maxHeight: '85%',
    borderWidth: 0.5,
    borderColor: colors.border.primary,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border.primary,
    alignSelf: 'center',
    marginTop: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 20,
  },
  title: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text.tertiary,
    letterSpacing: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.tertiary,
    marginHorizontal: 20,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 48,
    gap: 12,
    borderWidth: 0.5,
    borderColor: colors.border.primary,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: colors.text.primary,
  },
  list: {
    marginTop: 16,
  },
  listContent: {
    paddingHorizontal: 16,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    gap: 12,
    marginBottom: 4,
  },
  activeItem: {
    backgroundColor: colors.background.tertiary,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 15,
    color: colors.text.secondary,
    fontWeight: '500',
  },
  activeBadge: {
    marginTop: 2,
  },
  activeText: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.modules.track,
    letterSpacing: 0.5,
  },
  activeIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.modules.track,
  },
  emptyText: {
    textAlign: 'center',
    color: colors.text.tertiary,
    marginTop: 40,
    fontSize: 14,
  },
})
