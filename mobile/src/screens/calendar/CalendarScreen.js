import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Modal,
  TextInput,
  RefreshControl,
} from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import Animated, { FadeInRight, FadeInUp, Layout } from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'
import { CaretLeft, CaretRight, Clock, MapPin, Plus, Sparkle, Trash } from 'phosphor-react-native'
import { colors } from '../../constants/colors'
import { eventService } from '../../services/events'
import { supabase } from '../../services/supabase'

const { width } = Dimensions.get('window')

export default function CalendarScreen({ navigation }) {
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)
  
  // Manual Add Modal State
  const [modalVisible, setModalVisible] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newTime, setNewTime] = useState('09:00')

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
    })
  }, [])

  useFocusEffect(
    useCallback(() => {
      if (user) loadEvents()
    }, [user, selectedDate.getMonth()])
  )

  const loadEvents = async () => {
    try {
      setLoading(true)
      const data = await eventService.getEvents(user.id)
      setEvents(data)
    } catch (e) {
      console.warn(e)
    } finally {
      setLoading(false)
    }
  }

  const navigateMonth = (direction) => {
    const next = new Date(selectedDate)
    next.setMonth(selectedDate.getMonth() + direction)
    setSelectedDate(next)
  }

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  }

  const handleManualCreate = async () => {
    if (!newTitle) return
    try {
      const [hours, minutes] = newTime.split(':')
      const start = new Date(selectedDate)
      start.setHours(parseInt(hours), parseInt(minutes), 0, 0)
      
      const end = new Date(start)
      end.setHours(start.getHours() + 1)

      await eventService.createEvent({
        user_id: user.id,
        title: newTitle,
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        is_all_day: false,
      })
      
      setModalVisible(false)
      setNewTitle('')
      loadEvents()
    } catch (e) {
      console.warn('Manual create error:', e)
    }
  }

  const handleDelete = async (id) => {
    try {
      await eventService.deleteEvent(id)
      loadEvents()
    } catch (e) {
      console.warn('Delete error:', e)
    }
  }

  const renderDays = () => {
    const days = []
    const start = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1)
    const end = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0)
    
    for (let i = 1; i <= end.getDate(); i++) {
        const d = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), i)
        days.push(d)
    }

    return (
      <FlatList
        horizontal
        data={days}
        keyExtractor={(item) => item.toISOString()}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.daysList}
        renderItem={({ item, index }) => {
          const isSelected = item.getDate() === selectedDate.getDate() && 
                             item.getMonth() === selectedDate.getMonth()
          
          const hasEvents = events.some(e => {
            const d = new Date(e.start_time)
            return d.getDate() === item.getDate() && 
                   d.getMonth() === item.getMonth() &&
                   d.getFullYear() === item.getFullYear()
          })

          return (
            <Animated.View entering={FadeInRight.delay(index * 50)}>
              <TouchableOpacity 
                style={[styles.dayCard, isSelected && styles.selectedDayCard]}
                onPress={() => setSelectedDate(new Date(item))}
              >
                <Text style={[styles.dayNum, isSelected && styles.selectedDayText]}>{item.getDate()}</Text>
                <Text style={[styles.dayName, isSelected && styles.selectedDayText]}>
                  {item.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()}
                </Text>
                {hasEvents && !isSelected && (
                  <View style={styles.hasEventDot} />
                )}
              </TouchableOpacity>
            </Animated.View>
          )
        }}
      />
    )
  }

  const filteredEvents = events.filter(e => {
    const d = new Date(e.start_time)
    return d.getDate() === selectedDate.getDate() && 
           d.getMonth() === selectedDate.getMonth() &&
           d.getFullYear() === selectedDate.getFullYear()
  })

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topNav}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <CaretLeft color={colors.text.primary} size={24} weight="bold" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mission Control</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
          <Plus color={colors.text.primary} size={24} weight="bold" />
        </TouchableOpacity>
      </View>

      <View style={styles.monthHeader}>
        <View style={styles.monthNav}>
          <TouchableOpacity onPress={() => navigateMonth(-1)}>
            <CaretLeft color={colors.text.tertiary} size={16} weight="bold" />
          </TouchableOpacity>
          <Text style={styles.monthTitle}>{formatDate(selectedDate)}</Text>
          <TouchableOpacity onPress={() => navigateMonth(1)}>
            <CaretRight color={colors.text.tertiary} size={16} weight="bold" />
          </TouchableOpacity>
        </View>
      </View>

      {renderDays()}

      <View style={styles.agenda}>
        <Text style={styles.agendaTitle}>Agenda</Text>
        {loading && events.length === 0 ? (
          <ActivityIndicator color={colors.text.tertiary} style={{ marginTop: 40 }} />
        ) : filteredEvents.length > 0 ? (
          <FlatList
            data={filteredEvents}
            keyExtractor={item => item.id}
            refreshControl={
              <RefreshControl 
                refreshing={loading} 
                onRefresh={loadEvents}
                tintColor={colors.modules.kalay}
              />
            }
            renderItem={({ item, index }) => (
              <Animated.View 
                entering={FadeInUp.delay(index * 100)} 
                layout={Layout.springify()}
              >
                <View style={styles.agendaItem}>
                  <View style={[styles.eventDot, { backgroundColor: item.color || colors.modules.kalay }]} />
                  <View style={styles.agendaContent}>
                    <Text style={styles.agendaItemTitle}>{item.title}</Text>
                    <View style={styles.agendaMeta}>
                      <Clock size={12} color={colors.text.tertiary} />
                      <Text style={styles.agendaTime}>
                        {new Date(item.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </View>
                    {item.description && (
                      <Text style={styles.agendaDesc} numberOfLines={2}>{item.description}</Text>
                    )}
                  </View>
                  <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.deleteBtn}>
                    <Trash size={16} color={colors.text.tertiary} />
                  </TouchableOpacity>
                </View>
              </Animated.View>
            )}
            contentContainerStyle={styles.agendaList}
          />
        ) : (
          <View style={styles.emptyAgenda}>
            <Text style={styles.emptyText}>No missions scheduled for this day</Text>
          </View>
        )}
      </View>

      {/* Manual Creation Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Manual Entry</Text>
            <TextInput 
              style={styles.modalInput} 
              placeholder="Title" 
              placeholderTextColor={colors.text.tertiary}
              value={newTitle}
              onChangeText={setNewTitle}
            />
            <TextInput 
              style={styles.modalInput} 
              placeholder="Time (HH:MM)" 
              placeholderTextColor={colors.text.tertiary}
              value={newTime}
              onChangeText={setNewTime}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.cancelBtn}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleManualCreate} style={styles.confirmBtn}>
                <Text style={styles.confirmText}>Deploy</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalDivider}>
              <Text style={styles.dividerText}>OR</Text>
            </View>
            
            <TouchableOpacity 
              style={styles.aiTrigger}
              onPress={() => {
                setModalVisible(false)
                navigation.navigate('Kalay')
              }}
            >
              <Sparkle color={colors.modules.kalay} size={18} weight="fill" />
              <Text style={styles.aiTriggerText}>Use Kalay AI Scheduling</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  topNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text.primary,
    letterSpacing: -0.5,
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background.secondary,
    borderWidth: 0.5,
    borderColor: colors.border.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthHeader: {
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  monthTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text.primary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  daysList: {
    paddingLeft: 20,
    paddingRight: 10,
    marginVertical: 10,
  },
  dayCard: {
    width: 60,
    height: 80,
    borderRadius: 16,
    backgroundColor: colors.background.secondary,
    borderWidth: 0.5,
    borderColor: colors.border.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    gap: 4,
  },
  selectedDayCard: {
    backgroundColor: colors.text.primary,
    borderColor: colors.text.primary,
  },
  dayNum: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
  },
  dayName: {
    fontSize: 10,
    color: colors.text.tertiary,
    fontWeight: '600',
  },
  selectedDayText: {
    color: colors.background.primary,
    fontWeight: '800',
  },
  hasEventDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.modules.kalay,
    position: 'absolute',
    bottom: 8,
  },
  agenda: {
    flex: 1,
    paddingHorizontal: 20,
  },
  agendaTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  agendaList: {
    paddingHorizontal: 20,
    gap: 12,
    paddingBottom: 40,
  },
  agendaItem: {
    flexDirection: 'row',
    backgroundColor: colors.background.secondary,
    borderRadius: 16,
    padding: 16,
    borderWidth: 0.5,
    borderColor: colors.border.primary,
    gap: 12,
  },
  eventDot: {
    width: 4,
    height: '100%',
    borderRadius: 2,
  },
  agendaContent: {
    flex: 1,
    gap: 4,
  },
  agendaItemTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text.primary,
  },
  agendaMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  agendaTime: {
    fontSize: 12,
    color: colors.text.tertiary,
  },
  agendaDesc: {
    fontSize: 12,
    color: colors.text.tertiary,
    marginTop: 4,
    lineHeight: 18,
  },
  deleteBtn: {
    alignSelf: 'flex-start',
    padding: 4,
  },
  emptyAgenda: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 100,
  },
  emptyText: {
    fontSize: 12,
    color: colors.text.tertiary,
    fontStyle: 'italic',
  },
  
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.background.primary,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 32,
    gap: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 8,
  },
  modalInput: {
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    padding: 16,
    color: colors.text.primary,
    fontSize: 14,
    borderWidth: 1,
    borderColor: colors.border.primary,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelBtn: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelText: {
    color: colors.text.tertiary,
    fontWeight: '600',
  },
  confirmBtn: {
    flex: 2,
    padding: 16,
    borderRadius: 12,
    backgroundColor: colors.modules.kalay,
    alignItems: 'center',
  },
  confirmText: {
    color: colors.background.primary,
    fontWeight: '700',
  },
  modalDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12,
  },
  dividerText: {
    fontSize: 10,
    color: colors.text.tertiary,
    paddingHorizontal: 12,
    fontWeight: '800',
  },
  aiTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: 16,
    borderRadius: 12,
    backgroundColor: colors.modules.kalay + '15',
    borderWidth: 1,
    borderColor: colors.modules.kalay + '30',
  },
  aiTriggerText: {
    color: colors.modules.kalay,
    fontWeight: '700',
    fontSize: 13,
  }
})
