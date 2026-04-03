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
  Platform,
} from 'react-native'
import { useFocusEffect, useIsFocused } from '@react-navigation/native'
import Animated, { FadeInRight, FadeInUp, Layout } from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'
import { CaretLeft, CaretRight, Clock, MapPin, Plus, Sparkle, Trash } from 'phosphor-react-native'
import { colors } from '../../constants/colors'
import { eventService } from '../../services/events'
import { supabase } from '../../services/supabase'
import { ASSISTANT_NAME } from '../../constants/brand'

const { width } = Dimensions.get('window')

export default function CalendarScreen({ navigation }) {
  const isFocused = useIsFocused()
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [viewType, setViewType] = useState('daily') // 'daily', 'weekly', 'monthly'
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)
  
  // Manual Add Modal State
  const [modalVisible, setModalVisible] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newDescription, setNewDescription] = useState('')
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
        description: newDescription,
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        is_all_day: false,
      })
      
      setModalVisible(false)
      setNewTitle('')
      setNewDescription('')
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

  const renderWeeklyView = () => {
    const weekDays = [];
    for (let i = 0; i < 7; i++) {
        const d = new Date(selectedDate);
        d.setDate(selectedDate.getDate() + i);
        weekDays.push(d);
    }

    return (
      <FlatList
        data={weekDays}
        keyExtractor={item => item.toISOString()}
        contentContainerStyle={styles.weeklyList}
        renderItem={({ item, index }) => {
          const dayEvents = events.filter(e => {
            const d = new Date(e.start_time);
            return d.getDate() === item.getDate() && 
                   d.getMonth() === item.getMonth() &&
                   d.getFullYear() === item.getFullYear();
          });

          return (
            <Animated.View entering={FadeInUp.delay(index * 100)} style={styles.weeklyDayRow}>
              <View style={styles.weeklyDateCol}>
                <Text style={styles.weeklyDayName}>{item.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()}</Text>
                <Text style={styles.weeklyDayNum}>{item.getDate()}</Text>
              </View>
              <View style={styles.weeklyAgendaCol}>
                {dayEvents.length > 0 ? dayEvents.slice(0, 2).map((e, idx) => (
                  <View key={e.id} style={styles.weeklyEventItem}>
                    <View style={[styles.weeklyEventDot, { backgroundColor: e.color || colors.modules.aly }]} />
                    <Text style={styles.weeklyEventTitle} numberOfLines={1}>{e.title}</Text>
                  </View>
                )) : (
                  <Text style={styles.weeklyEmptyText}>No missions</Text>
                )}
                {dayEvents.length > 2 && <Text style={styles.weeklyMoreText}>+ {dayEvents.length - 2} more</Text>}
              </View>
            </Animated.View>
          );
        }}
      />
    );
  };

  const renderMonthlyView = () => {
    const start = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
    const end = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0);
    const prevEnd = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 0);
    
    const days = [];
    // Padding for start of month
    const startDay = start.getDay();
    for (let i = startDay - 1; i >= 0; i--) {
      days.push({ date: new Date(selectedDate.getFullYear(), selectedDate.getMonth() - 1, prevEnd.getDate() - i), isPadding: true });
    }
    // Days in current month
    for (let i = 1; i <= end.getDate(); i++) {
      days.push({ date: new Date(selectedDate.getFullYear(), selectedDate.getMonth(), i), isPadding: false });
    }

    const rawEvents = events.filter(e => {
      const d = new Date(e.start_time);
      return d.getMonth() === selectedDate.getMonth() && d.getFullYear() === selectedDate.getFullYear();
    }).sort((a, b) => new Date(a.start_time) - new Date(b.start_time));

    // Grouping logic for events at the same time
    const monthlyGroups = [];
    rawEvents.forEach(e => {
      const lastGroup = monthlyGroups[monthlyGroups.length - 1];
      if (lastGroup && lastGroup.time === e.start_time) {
        lastGroup.missions.push(e);
      } else {
        monthlyGroups.push({ time: e.start_time, missions: [e] });
      }
    });

    return (
      <View style={{ flex: 1 }}>
        <View style={styles.monthlyGrid}>
          <View style={styles.monthlyWeekDays}>
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <Text key={`${d}-${i}`} style={styles.monthlyWeekDayLabel}>{d}</Text>)}
          </View>
          <View style={styles.monthlyGridContent}>
            {days.map((item, index) => {
              const isToday = item.date.toDateString() === new Date().toDateString();
              const isSelected = item.date.toDateString() === selectedDate.toDateString();
              const hasEvents = events.some(e => new Date(e.start_time).toDateString() === item.date.toDateString());
              
              return (
                <TouchableOpacity 
                  key={index}
                  style={[styles.monthlyDayCell, isSelected && styles.monthlySelectedCell, item.isPadding && { opacity: 0.3 }]}
                  onPress={() => setSelectedDate(item.date)}
                >
                  <Text style={[styles.monthlyDayText, isSelected && styles.monthlySelectedText, isToday && !isSelected && { color: colors.modules.aly }]}>
                    {item.date.getDate()}
                  </Text>
                  {hasEvents && <View style={[styles.monthlyEventDot, isSelected && { backgroundColor: '#fff' }]} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.monthlyAgenda}>
          <Text style={styles.agendaTitle}>{selectedDate.toLocaleDateString('en-US', { month: 'long' })} Mission Timeline</Text>
          <FlatList
            data={monthlyGroups}
            keyExtractor={group => group.time}
            showsVerticalScrollIndicator={false}
            renderItem={({ item, index }) => (
              <Animated.View entering={FadeInUp.delay(index * 50)} style={styles.timelineItem}>
                <View style={styles.timelineDateCol}>
                  <Text style={styles.timelineDay}>{new Date(item.time).getDate()}</Text>
                  <Text style={styles.timelineMonth}>{new Date(item.time).toLocaleDateString('en-US', { month: 'short' }).toUpperCase()}</Text>
                </View>
                
                <View style={styles.timelinePathCol}>
                  <View style={[styles.timelinePathLine, index === monthlyGroups.length - 1 && { height: '50%' }, index === 0 && { top: '50%' }]} />
                  <View style={[styles.timelineNode, { backgroundColor: item.missions[0].color || colors.modules.aly }]}>
                    <Clock size={12} color="#fff" weight="bold" />
                  </View>
                </View>

                <View style={styles.timelineContentCol}>
                  <View style={styles.timelineCard}>
                    {item.missions.map((mission, idx) => (
                      <View key={mission.id} style={idx > 0 && styles.timelineInnerDivider}>
                        <View style={[styles.timelineCardHeader, idx > 0 && { marginTop: 12 }]}>
                          <Text style={styles.timelineTitle}>{mission.title}</Text>
                          {idx === 0 && (
                            <Text style={styles.timelineTime}>
                              {new Date(mission.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </Text>
                          )}
                        </View>
                        {mission.description && (
                          <Text style={styles.timelineDesc} numberOfLines={2}>{mission.description}</Text>
                        )}
                      </View>
                    ))}
                  </View>
                </View>
              </Animated.View>
            )}
            contentContainerStyle={styles.timelineList}
            ListEmptyComponent={() => (
              <View style={styles.emptyAgenda}>
                <Text style={styles.emptyText}>No missions finalized for this month</Text>
              </View>
            )}
          />
        </View>
      </View>
    );
  };

  const filteredEvents = events.filter(e => {
    const d = new Date(e.start_time)
    return d.getDate() === selectedDate.getDate() && 
           d.getMonth() === selectedDate.getMonth() &&
           d.getFullYear() === selectedDate.getFullYear()
  })

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <CaretLeft color={colors.text.primary} size={24} weight="bold" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Calendar</Text>
        </View>

        <View style={styles.headerActionsPill}>
          <View style={styles.viewSwitcher}>
            {['daily', 'weekly', 'monthly'].map((v) => {
              const isActive = viewType === v;
              const label = v.charAt(0).toUpperCase();
              return (
                <TouchableOpacity 
                  key={v} 
                  style={[styles.viewTab, isActive && styles.viewTabActive]} 
                  onPress={() => setViewType(v)}
                >
                  <Text style={[styles.viewTabText, isActive && styles.viewTabTextActive]}>{label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          
          <View style={styles.pillDivider} />

          <TouchableOpacity style={styles.pillAction} onPress={() => setSelectedDate(new Date())}>
            <View style={styles.todayIconWrapper}>
              <View style={styles.todayDot} />
              <Clock size={16} color={isFocused ? colors.text.secondary : colors.text.primary} weight="bold" />
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={styles.pillAction} onPress={() => setModalVisible(true)}>
            <Plus color={colors.text.primary} size={18} weight="bold" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.monthSubHeader}>
        <View style={styles.monthPill}>
          <TouchableOpacity onPress={() => navigateMonth(-1)} style={styles.navArrow}>
            <CaretLeft color={colors.text.tertiary} size={16} weight="bold" />
          </TouchableOpacity>
          <Text style={styles.monthLabel}>{formatDate(selectedDate)}</Text>
          <TouchableOpacity onPress={() => navigateMonth(1)} style={styles.navArrow}>
            <CaretRight color={colors.text.tertiary} size={16} weight="bold" />
          </TouchableOpacity>
        </View>
      </View>

      {viewType === 'daily' && renderDays()}

      <View style={styles.agenda}>
        {viewType === 'daily' ? (
          <>
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
                    tintColor={colors.modules.aly}
                  />
                }
                renderItem={({ item, index }) => (
                  <Animated.View 
                    entering={FadeInUp.delay(index * 100)} 
                    layout={Layout.springify()}
                  >
                    <View style={styles.agendaItem}>
                      <View style={styles.eventDot}>
                        <Clock size={20} color={item.color || colors.modules.aly} weight="bold" />
                      </View>
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
          </>
        ) : viewType === 'weekly' ? (
          renderWeeklyView()
        ) : (
          renderMonthlyView()
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
            <TextInput 
              style={[styles.modalInput, styles.modalArea]} 
              placeholder="Description (Optional)" 
              placeholderTextColor={colors.text.tertiary}
              value={newDescription}
              onChangeText={setNewDescription}
              multiline
            />
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.cancelBtn}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleManualCreate} style={styles.confirmBtn}>
                <Text style={styles.confirmText}>Create Event</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalDivider}>
              <Text style={styles.dividerText}>OR</Text>
            </View>
            
            <TouchableOpacity 
              style={styles.aiTrigger}
              onPress={() => {
                setModalVisible(false)
                navigation.navigate('Coordinator')
              }}
            >
              <Sparkle color={colors.modules.aly} size={18} weight="fill" />
              <Text style={styles.aiTriggerText}>Use {ASSISTANT_NAME} AI Scheduling</Text>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text.primary,
    letterSpacing: -0.5,
  },
  headerActionsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.tertiary,
    borderRadius: 20,
    paddingHorizontal: 2,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: colors.border.primary,
  },
  viewSwitcher: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 2,
  },
  viewTab: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewTabActive: {
    backgroundColor: colors.modules.kalay,
  },
  viewTabText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.text.tertiary,
  },
  viewTabTextActive: {
    color: '#FFFFFF',
  },
  pillAction: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillDivider: {
    width: 1,
    height: 14,
    backgroundColor: colors.border.primary,
    marginHorizontal: 4,
  },
  todayIconWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.modules.aly,
    zIndex: 1,
  },
  monthSubHeader: {
    alignItems: 'center',
    paddingBottom: 12,
  },
  monthPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
    borderRadius: 24,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.border.primary,
    gap: 12,
  },
  monthLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text.primary,
    minWidth: 140,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  navArrow: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  daysList: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  dayCard: {
    width: 58,
    height: 74,
    borderRadius: 20,
    backgroundColor: colors.background.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: colors.border.primary,
  },
  selectedDayCard: {
    backgroundColor: '#FFFFFF', // Clean White signature
    borderColor: '#FFFFFF',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  dayNum: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text.primary,
  },
  dayName: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.text.tertiary,
  },
  selectedDayText: {
    color: colors.background.primary, // Darker text on white card
    fontWeight: '900',
  },
  hasEventDot: {
    position: 'absolute',
    bottom: 8,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.modules.kalay,
  },
  agenda: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  agendaTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.text.tertiary,
    letterSpacing: 1.5,
    marginBottom: 16,
    textTransform: 'uppercase',
  },
  agendaList: {
    paddingBottom: 40,
    gap: 12,
  },
  agendaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border.primary,
    gap: 14,
  },
  eventDot: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.modules.aly + '15',
  },
  agendaContent: {
    flex: 1,
  },
  agendaItemTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 2,
  },
  agendaMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  agendaTime: {
    fontSize: 12,
    color: colors.text.tertiary,
    fontWeight: '600',
  },
  agendaDesc: {
    fontSize: 13,
    color: colors.text.tertiary,
    marginTop: 4,
    lineHeight: 18,
  },
  deleteBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background.tertiary,
    borderRadius: 8,
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
  weeklyList: {
    paddingBottom: 40,
    gap: 12,
  },
  weeklyDayRow: {
    flexDirection: 'row',
    backgroundColor: colors.background.secondary,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border.primary,
    gap: 16,
  },
  weeklyDateCol: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 44,
    borderRightWidth: 1,
    borderRightColor: colors.border.primary,
    paddingRight: 12,
  },
  weeklyDayName: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.text.tertiary,
  },
  weeklyDayNum: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text.primary,
  },
  weeklyAgendaCol: {
    flex: 1,
    justifyContent: 'center',
    gap: 4,
  },
  weeklyEventItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  weeklyEventDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  weeklyEventTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text.primary,
  },
  weeklyEmptyText: {
    fontSize: 12,
    color: colors.text.tertiary,
    fontStyle: 'italic',
  },
  weeklyMoreText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.modules.aly,
  },
  monthlyGrid: {
    flex: 1,
  },
  monthlyWeekDays: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
    paddingHorizontal: 8,
  },
  monthlyWeekDayLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.text.tertiary,
    width: 40,
    textAlign: 'center',
  },
  monthlyDayCell: {
    width: (width - 32) / 7,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  monthlySelectedCell: {
    backgroundColor: colors.modules.aly,
    borderRadius: 12,
  },
  monthlyDayText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
  },
  monthlySelectedText: {
    color: '#fff',
    fontWeight: '800',
  },
  monthlyEventDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.modules.aly,
  },
  monthlyGridContent: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  monthlyAgenda: {
    flex: 1,
    marginTop: 16,
  },
  timelineList: {
    paddingBottom: 40,
    paddingHorizontal: 8,
  },
  timelineItem: {
    flexDirection: 'row',
    minHeight: 80,
  },
  timelineDateCol: {
    width: 40,
    alignItems: 'center',
    paddingTop: 4,
  },
  timelineDay: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.text.primary,
  },
  timelineMonth: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.text.tertiary,
    letterSpacing: 0.5,
  },
  timelinePathCol: {
    width: 32,
    alignItems: 'center',
  },
  timelinePathLine: {
    position: 'absolute',
    width: 2,
    height: '100%',
    backgroundColor: colors.border.primary,
    opacity: 0.5,
  },
  timelineNode: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.modules.aly,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
    marginTop: 10,
    borderWidth: 2,
    borderColor: colors.background.primary,
  },
  timelineGroup: {
    paddingBottom: 24,
  },
  timelineInnerDivider: {
    borderTopWidth: 1,
    borderTopColor: colors.border.primary,
    opacity: 0.6,
  },
  timelineContentCol: {
    flex: 1,
    paddingLeft: 8,
    paddingBottom: 24,
  },
  timelineCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border.primary,
  },
  timelineCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  timelineTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: colors.text.primary,
  },
  timelineTime: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.modules.aly,
    backgroundColor: colors.modules.aly + '10',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  timelineDesc: {
    fontSize: 13,
    color: colors.text.tertiary,
    marginTop: 4,
    lineHeight: 18,
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
  modalArea: {
    height: 100,
    textAlignVertical: 'top',
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
    backgroundColor: colors.modules.aly,
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
    backgroundColor: colors.modules.aly + '15',
    borderWidth: 1,
    borderColor: colors.modules.aly + '30',
  },
  aiTriggerText: {
    color: colors.modules.aly,
    fontWeight: '700',
    fontSize: 13,
  }
})
