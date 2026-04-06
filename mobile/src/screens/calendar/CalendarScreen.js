import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Dimensions, Alert, RefreshControl,
  Platform, ScrollView, Modal, TextInput, Keyboard,
  KeyboardAvoidingView,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  CaretLeft, CaretRight, Clock, MapPin, Plus, Sparkle,
  Trash, ArrowsClockwise, CalendarBlank,
} from 'phosphor-react-native'
import { useAlySheet } from '../../context/AlySheetContext';
import { colors } from '../../constants/colors';
import { eventService } from '../../services/events';
import { integrationsService } from '../../services/integrations';
import { supabase } from '../../services/supabase';
import { ASSISTANT_NAME } from '../../constants/brand';

const { width } = Dimensions.get('window');
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// ── helpers ────────────────────────────────────────────────────────────────

function sameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function isoForDateTime(date, timeStr) {
  const [h, m] = timeStr.split(':').map(Number);
  const d = new Date(date);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
}

function fmtTime(isoStr) {
  if (!isoStr) return '';
  return new Date(isoStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function fmtMonthYear(date) {
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

// ── Event card (daily agenda) ──────────────────────────────────────────────

function EventCard({ item, onDelete }) {
  const start = new Date(item.start_at);
  const end = new Date(item.end_at);
  const durationMin = Math.round((end - start) / 60000);
  const durationLabel =
    durationMin < 60
      ? `${durationMin}m`
      : `${Math.floor(durationMin / 60)}h${durationMin % 60 ? ` ${durationMin % 60}m` : ''}`;

  return (
    <View style={[styles.eventCard, item.color && { borderLeftColor: item.color, borderLeftWidth: 3 }]}>
      <View style={styles.eventCardLeft}>
        <View style={[styles.eventIconBox, { backgroundColor: (item.color || colors.modules.aly) + '18' }]}>
          <Clock size={16} color={item.color || colors.modules.aly} weight="bold" />
        </View>
      </View>
      <View style={styles.eventCardBody}>
        <Text style={styles.eventTitle} numberOfLines={2}>{item.title}</Text>
        <View style={styles.eventMeta}>
          <Text style={styles.eventTime}>
            {fmtTime(item.start_at)} · {durationLabel}
          </Text>
          {item.location ? (
            <>
              <Text style={styles.metaDot}>·</Text>
              <MapPin size={11} color={colors.text.tertiary} weight="bold" />
              <Text style={styles.eventLocation} numberOfLines={1}>{item.location}</Text>
            </>
          ) : null}
        </View>
        {item.description ? (
          <Text style={styles.eventDesc} numberOfLines={2}>{item.description}</Text>
        ) : null}
      </View>
      <TouchableOpacity
        onPress={() => onDelete(item.id)}
        style={styles.deleteBtn}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Trash size={15} color={colors.text.tertiary} weight="light" />
      </TouchableOpacity>
    </View>
  );
}

// ── New Event Sheet ────────────────────────────────────────────────────────

function NewEventSheet({ visible, selectedDate, userId, onClose, onCreated }) {
  const { openSheet } = useAlySheet()
  const [title, setTitle] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setTitle(''); setStartTime('09:00'); setEndTime('10:00');
    setLocation(''); setDescription('');
  };

  const handleCreate = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      await eventService.createEvent({
        user_id: userId,
        title: title.trim(),
        location: location.trim() || undefined,
        description: description.trim() || undefined,
        start_at: isoForDateTime(selectedDate, startTime),
        end_at: isoForDateTime(selectedDate, endTime),
        is_all_day: false,
      });
      reset();
      onClose();
      onCreated();
    } catch (e) {
      Alert.alert('Error', 'Could not create event. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.sheetOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <TouchableOpacity style={styles.sheetBackdrop} activeOpacity={1} onPress={() => { Keyboard.dismiss(); onClose(); }} />
        <View style={styles.sheetContent}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>New Event</Text>

          <TextInput
            style={styles.input}
            placeholder="Event title"
            placeholderTextColor={colors.text.tertiary}
            value={title}
            onChangeText={setTitle}
            autoFocus
          />

          <View style={styles.timeRow}>
            <View style={styles.timeField}>
              <Text style={styles.fieldLabel}>START</Text>
              <TextInput
                style={styles.timeInput}
                value={startTime}
                onChangeText={setStartTime}
                placeholder="09:00"
                placeholderTextColor={colors.text.tertiary}
                keyboardType="numbers-and-punctuation"
              />
            </View>
            <View style={styles.timeArrow}>
              <CaretRight size={14} color={colors.text.tertiary} weight="bold" />
            </View>
            <View style={styles.timeField}>
              <Text style={styles.fieldLabel}>END</Text>
              <TextInput
                style={styles.timeInput}
                value={endTime}
                onChangeText={setEndTime}
                placeholder="10:00"
                placeholderTextColor={colors.text.tertiary}
                keyboardType="numbers-and-punctuation"
              />
            </View>
          </View>

          <TextInput
            style={styles.input}
            placeholder="Location (optional)"
            placeholderTextColor={colors.text.tertiary}
            value={location}
            onChangeText={setLocation}
          />

          <TextInput
            style={[styles.input, styles.inputArea]}
            placeholder="Description (optional)"
            placeholderTextColor={colors.text.tertiary}
            value={description}
            onChangeText={setDescription}
            multiline
            textAlignVertical="top"
          />

          <View style={styles.sheetActions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => { reset(); onClose(); }}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.createBtn, (!title.trim() || saving) && styles.createBtnDisabled]}
              onPress={handleCreate}
              disabled={!title.trim() || saving}
            >
              {saving
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={styles.createText}>Create Event</Text>}
            </TouchableOpacity>
          </View>

          <View style={styles.orDivider}>
            <View style={styles.orLine} /><Text style={styles.orText}>OR</Text><View style={styles.orLine} />
          </View>

          <TouchableOpacity
            style={styles.aiBtn}
            onPress={() => { reset(); onClose(); openSheet(); }}
          >
            <Sparkle size={16} color={colors.modules.aly} weight="fill" />
            <Text style={styles.aiBtnText}>Schedule with {ASSISTANT_NAME}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Main screen ────────────────────────────────────────────────────────────

export default function CalendarScreen({ navigation }) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewType, setViewType] = useState('daily');
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [userId, setUserId] = useState(null);
  const [hasGoogleIntegration, setHasGoogleIntegration] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      const init = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!active || !user) return;
        setUserId(user.id);
        setLoading(true);
        try {
          const [data, integrations] = await Promise.all([
            eventService.getEvents(user.id),
            integrationsService.getIntegrations(),
          ]);
          if (!active) return;
          setEvents(data);
          setHasGoogleIntegration(integrations.some(i => i.provider === 'google'));
        } catch (e) {
          console.warn('[CalendarScreen] load error:', e);
        } finally {
          if (active) setLoading(false);
        }
      };
      init();
      return () => { active = false; };
    }, [])
  );

  const loadEvents = useCallback(async (uid = userId, isRefresh = false) => {
    if (!uid) return;
    if (isRefresh) setRefreshing(true);
    try {
      const data = await eventService.getEvents(uid);
      setEvents(data);
    } catch (e) {
      console.warn('[CalendarScreen] reload error:', e);
    } finally {
      setRefreshing(false);
    }
  }, [userId]);

  const handleSync = async () => {
    if (!userId) return;
    setSyncing(true);
    try {
      const result = await integrationsService.syncGoogleCalendar(userId);
      const count = result?.synced_count ?? 0;
      await loadEvents();
      Alert.alert('Synced', `${count} event${count !== 1 ? 's' : ''} pulled from Google Calendar.`);
    } catch (e) {
      Alert.alert('Sync failed', 'Could not sync Google Calendar.');
    } finally {
      setSyncing(false);
    }
  };

  const handleDelete = (id) => {
    Alert.alert('Delete event', 'Remove this event?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await eventService.deleteEvent(id);
            setEvents(prev => prev.filter(e => e.id !== id));
          } catch {
            Alert.alert('Error', 'Could not delete event.');
          }
        },
      },
    ]);
  };

  const navigateMonth = (dir) => {
    const d = new Date(selectedDate);
    d.setMonth(d.getMonth() + dir);
    setSelectedDate(d);
  };

  // ── Day strip (daily view) ───────────────────────────────────────────
  const renderDayStrip = () => {
    const days = [];
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }

    return (
      <FlatList
        horizontal
        data={days}
        keyExtractor={item => item.toISOString()}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.dayStrip}
        renderItem={({ item }) => {
          const isSel = sameDay(item, selectedDate);
          const isToday = sameDay(item, new Date());
          const hasDot = events.some(e => sameDay(new Date(e.start_at), item));
          return (
            <TouchableOpacity
              style={[styles.dayPill, isSel && styles.dayPillSelected, isToday && !isSel && styles.dayPillToday]}
              onPress={() => setSelectedDate(new Date(item))}
              activeOpacity={0.75}
            >
              <Text style={[styles.dayPillNum, isSel && styles.dayPillTextSel, isToday && !isSel && styles.dayPillTextToday]}>
                {item.getDate()}
              </Text>
              <Text style={[styles.dayPillName, isSel && styles.dayPillTextSel]}>
                {DAY_NAMES[item.getDay()].toUpperCase()}
              </Text>
              {hasDot && !isSel && <View style={styles.dayDot} />}
            </TouchableOpacity>
          );
        }}
      />
    );
  };

  // ── Daily agenda ────────────────────────────────────────────────────
  const renderDailyAgenda = () => {
    const dayEvents = events.filter(e => sameDay(new Date(e.start_at), selectedDate));
    const dateLabel = selectedDate.toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric',
    });

    return (
      <View style={{ flex: 1 }}>
        <View style={styles.agendaHeader}>
          <Text style={styles.agendaDateLabel}>{dateLabel}</Text>
          <Text style={styles.agendaCount}>
            {dayEvents.length > 0 ? `${dayEvents.length} event${dayEvents.length > 1 ? 's' : ''}` : 'Nothing scheduled'}
          </Text>
        </View>

        {loading && events.length === 0 ? (
          <ActivityIndicator color={colors.modules.aly} style={{ marginTop: 48 }} />
        ) : dayEvents.length > 0 ? (
          <FlatList
            data={dayEvents}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.eventList}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={() => loadEvents(userId, true)} tintColor={colors.modules.aly} />
            }
            renderItem={({ item }) => (
              <EventCard item={item} onDelete={handleDelete} />
            )}
          />
        ) : (
          <ScrollView
            contentContainerStyle={styles.emptyDay}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={() => loadEvents(userId, true)} tintColor={colors.modules.aly} />
            }
          >
            <View style={styles.emptyIconWrap}>
              <CalendarBlank size={28} color={colors.text.tertiary} weight="light" />
            </View>
            <Text style={styles.emptyTitle}>Free day</Text>
            <Text style={styles.emptyHint}>Tap + to add an event or ask {ASSISTANT_NAME} to schedule something.</Text>
          </ScrollView>
        )}
      </View>
    );
  };

  // ── Weekly view ─────────────────────────────────────────────────────
  const renderWeekly = () => {
    // Build week starting from the Monday of selectedDate's week
    const startOfWeek = new Date(selectedDate);
    const day = startOfWeek.getDay(); // 0=Sun
    startOfWeek.setDate(startOfWeek.getDate() - day); // go to Sunday

    const week = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      return d;
    });

    return (
      <FlatList
        data={week}
        keyExtractor={item => item.toISOString()}
        contentContainerStyle={styles.weekList}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => loadEvents(userId, true)} tintColor={colors.modules.aly} />
        }
        renderItem={({ item }) => {
          const dayEvents = events.filter(e => sameDay(new Date(e.start_at), item));
          const isToday = sameDay(item, new Date());
          const isSel = sameDay(item, selectedDate);

          return (
            <TouchableOpacity
              style={[styles.weekRow, isSel && styles.weekRowSelected]}
              onPress={() => { setSelectedDate(new Date(item)); setViewType('daily'); }}
              activeOpacity={0.8}
            >
              <View style={[styles.weekDateCol, isToday && styles.weekDateColToday]}>
                <Text style={[styles.weekDayName, isToday && { color: colors.modules.aly }]}>
                  {DAY_NAMES[item.getDay()].toUpperCase()}
                </Text>
                <Text style={[styles.weekDayNum, isToday && { color: colors.modules.aly }]}>
                  {item.getDate()}
                </Text>
              </View>
              <View style={styles.weekEventsCol}>
                {dayEvents.length > 0 ? (
                  dayEvents.slice(0, 3).map(e => (
                    <View key={e.id} style={styles.weekEventChip}>
                      <View style={[styles.weekEventDot, { backgroundColor: e.color || colors.modules.aly }]} />
                      <Text style={styles.weekEventTitle} numberOfLines={1}>{e.title}</Text>
                      <Text style={styles.weekEventTime}>{fmtTime(e.start_at)}</Text>
                    </View>
                  ))
                ) : (
                  <Text style={styles.weekEmpty}>—</Text>
                )}
                {dayEvents.length > 3 && (
                  <Text style={styles.weekMore}>+{dayEvents.length - 3} more</Text>
                )}
              </View>
            </TouchableOpacity>
          );
        }}
      />
    );
  };

  // ── Monthly view ────────────────────────────────────────────────────
  const renderMonthly = () => {
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const cells = [];
    for (let i = 0; i < firstDay; i++) cells.push(null); // padding
    for (let i = 1; i <= daysInMonth; i++) cells.push(new Date(year, month, i));

    // Events for selected day (agenda below grid)
    const selDayEvents = events
      .filter(e => sameDay(new Date(e.start_at), selectedDate))
      .sort((a, b) => new Date(a.start_at) - new Date(b.start_at));

    return (
      <View style={{ flex: 1 }}>
        {/* Grid */}
        <View style={styles.monthGrid}>
          <View style={styles.monthWeekRow}>
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
              <Text key={d} style={styles.monthWeekLabel}>{d}</Text>
            ))}
          </View>
          <View style={styles.monthCells}>
            {cells.map((item, idx) => {
              if (!item) return <View key={`pad-${idx}`} style={styles.monthCell} />;
              const isToday = sameDay(item, new Date());
              const isSel = sameDay(item, selectedDate);
              const hasDot = events.some(e => sameDay(new Date(e.start_at), item));

              return (
                <TouchableOpacity
                  key={item.toISOString()}
                  style={[styles.monthCell, isSel && styles.monthCellSelected]}
                  onPress={() => setSelectedDate(new Date(item))}
                  activeOpacity={0.75}
                >
                  <Text style={[
                    styles.monthCellText,
                    isToday && !isSel && { color: colors.modules.aly, fontWeight: '700' },
                    isSel && styles.monthCellTextSel,
                  ]}>
                    {item.getDate()}
                  </Text>
                  {hasDot && (
                    <View style={[styles.monthDot, isSel && { backgroundColor: '#fff' }]} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Daily agenda for selected date */}
        <View style={styles.monthAgenda}>
          <Text style={styles.monthAgendaTitle}>
            {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </Text>
          {selDayEvents.length > 0 ? (
            <FlatList
              data={selDayEvents}
              keyExtractor={item => item.id}
              contentContainerStyle={{ gap: 8, paddingBottom: 40 }}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => <EventCard item={item} onDelete={handleDelete} />}
            />
          ) : (
            <Text style={styles.monthAgendaEmpty}>Nothing scheduled</Text>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
          >
            <CaretLeft size={22} color={colors.text.secondary} weight="light" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Calendar</Text>
        </View>

        <View style={styles.headerRight}>
          {/* View switcher */}
          <View style={styles.viewPill}>
            {[['D', 'daily'], ['W', 'weekly'], ['M', 'monthly']].map(([label, val]) => (
              <TouchableOpacity
                key={val}
                style={[styles.viewPillTab, viewType === val && styles.viewPillTabActive]}
                onPress={() => setViewType(val)}
              >
                <Text style={[styles.viewPillText, viewType === val && styles.viewPillTextActive]}>
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Sync button (only if Google connected) */}
          {hasGoogleIntegration && (
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={handleSync}
              disabled={syncing}
            >
              {syncing
                ? <ActivityIndicator size="small" color={colors.text.secondary} />
                : <ArrowsClockwise size={18} color={colors.text.secondary} weight="light" />}
            </TouchableOpacity>
          )}

          {/* Add event */}
          <TouchableOpacity style={styles.iconBtn} onPress={() => setShowModal(true)}>
            <Plus size={18} color={colors.text.secondary} weight="light" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Month navigator */}
      <View style={styles.monthNav}>
        <TouchableOpacity onPress={() => navigateMonth(-1)} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <CaretLeft size={16} color={colors.text.tertiary} weight="bold" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setSelectedDate(new Date())} activeOpacity={0.7}>
          <Text style={styles.monthNavLabel}>{fmtMonthYear(selectedDate)}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigateMonth(1)} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <CaretRight size={16} color={colors.text.tertiary} weight="bold" />
        </TouchableOpacity>
      </View>

      {/* Day strip — only in daily view */}
      {viewType === 'daily' && renderDayStrip()}

      {/* Content area */}
      <View style={styles.content}>
        {viewType === 'daily' && renderDailyAgenda()}
        {viewType === 'weekly' && renderWeekly()}
        {viewType === 'monthly' && renderMonthly()}
      </View>

      {/* New event sheet */}
      <NewEventSheet
        visible={showModal}
        selectedDate={selectedDate}
        userId={userId}
        onClose={() => setShowModal(false)}
        onCreated={() => loadEvents()}
      />
    </SafeAreaView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background.primary },

  // header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border.primary,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerTitle: { fontSize: 16, fontWeight: '600', color: colors.text.primary },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },

  viewPill: {
    flexDirection: 'row',
    backgroundColor: colors.background.tertiary,
    borderRadius: 10,
    padding: 2,
    borderWidth: 0.5,
    borderColor: colors.border.primary,
  },
  viewPillTab: {
    width: 28,
    height: 26,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewPillTabActive: {
    backgroundColor: colors.modules.aly,
  },
  viewPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.text.tertiary,
  },
  viewPillTextActive: {
    color: '#fff',
  },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: colors.background.tertiary,
    borderWidth: 0.5,
    borderColor: colors.border.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // month nav
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingVertical: 10,
  },
  monthNavLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
    minWidth: 150,
    textAlign: 'center',
  },

  // day strip
  dayStrip: {
    paddingHorizontal: 12,
    paddingBottom: 8,
    gap: 8,
  },
  dayPill: {
    width: 52,
    height: 68,
    borderRadius: 16,
    backgroundColor: colors.background.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    borderWidth: 0.5,
    borderColor: colors.border.primary,
  },
  dayPillSelected: {
    backgroundColor: colors.modules.aly,
    borderColor: colors.modules.aly,
  },
  dayPillToday: {
    borderColor: colors.modules.aly + '60',
  },
  dayPillNum: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text.primary,
  },
  dayPillName: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.text.tertiary,
    letterSpacing: 0.5,
  },
  dayPillTextSel: {
    color: '#fff',
  },
  dayPillTextToday: {
    color: colors.modules.aly,
  },
  dayDot: {
    position: 'absolute',
    bottom: 6,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.modules.aly,
  },

  // content area
  content: { flex: 1, paddingHorizontal: 16, paddingTop: 4 },

  // daily agenda
  agendaHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  agendaDateLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
  },
  agendaCount: {
    fontSize: 11,
    color: colors.text.tertiary,
    fontWeight: '500',
  },
  eventList: { gap: 10, paddingBottom: 100 },

  // event card
  eventCard: {
    flexDirection: 'row',
    backgroundColor: colors.background.secondary,
    borderRadius: 14,
    padding: 14,
    borderWidth: 0.5,
    borderColor: colors.border.primary,
    gap: 12,
  },
  eventCardLeft: { justifyContent: 'flex-start', paddingTop: 2 },
  eventIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventCardBody: { flex: 1, gap: 4 },
  eventTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
    lineHeight: 19,
  },
  eventMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexWrap: 'wrap',
  },
  eventTime: { fontSize: 12, color: colors.text.tertiary, fontWeight: '500' },
  metaDot: { fontSize: 12, color: colors.text.tertiary },
  eventLocation: { fontSize: 12, color: colors.text.tertiary, flex: 1 },
  eventDesc: {
    fontSize: 12,
    color: colors.text.tertiary,
    lineHeight: 17,
    marginTop: 2,
  },
  deleteBtn: {
    padding: 4,
    alignSelf: 'flex-start',
  },

  // empty state
  emptyDay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 80,
    gap: 10,
  },
  emptyIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.background.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.5,
    borderColor: colors.border.primary,
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  emptyHint: {
    fontSize: 13,
    color: colors.text.tertiary,
    textAlign: 'center',
    lineHeight: 19,
    maxWidth: 260,
  },

  // weekly view
  weekList: { gap: 8, paddingBottom: 100 },
  weekRow: {
    flexDirection: 'row',
    backgroundColor: colors.background.secondary,
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: colors.border.primary,
    overflow: 'hidden',
    minHeight: 60,
  },
  weekRowSelected: {
    borderColor: colors.modules.aly + '50',
    backgroundColor: colors.modules.aly + '08',
  },
  weekDateCol: {
    width: 52,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRightWidth: 0.5,
    borderRightColor: colors.border.primary,
    gap: 2,
  },
  weekDateColToday: {},
  weekDayName: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.text.tertiary,
    letterSpacing: 0.5,
  },
  weekDayNum: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text.primary,
  },
  weekEventsCol: {
    flex: 1,
    padding: 10,
    gap: 5,
    justifyContent: 'center',
  },
  weekEventChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  weekEventDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    flexShrink: 0,
  },
  weekEventTitle: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    color: colors.text.primary,
  },
  weekEventTime: {
    fontSize: 11,
    color: colors.text.tertiary,
    fontWeight: '500',
  },
  weekEmpty: {
    fontSize: 14,
    color: colors.text.tertiary,
  },
  weekMore: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.modules.aly,
  },

  // monthly view
  monthGrid: {
    marginBottom: 12,
  },
  monthWeekRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  monthWeekLabel: {
    width: (width - 32) / 7,
    textAlign: 'center',
    fontSize: 10,
    fontWeight: '700',
    color: colors.text.tertiary,
    letterSpacing: 0.5,
  },
  monthCells: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  monthCell: {
    width: (width - 32) / 7,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  monthCellSelected: {
    backgroundColor: colors.modules.aly,
    borderRadius: 10,
  },
  monthCellText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.text.primary,
  },
  monthCellTextSel: {
    color: '#fff',
    fontWeight: '700',
  },
  monthDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.modules.aly,
  },
  monthAgenda: { flex: 1 },
  monthAgendaTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text.secondary,
    marginBottom: 10,
  },
  monthAgendaEmpty: {
    fontSize: 13,
    color: colors.text.tertiary,
    fontStyle: 'italic',
  },

  // new event sheet
  sheetOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheetBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sheetContent: {
    backgroundColor: colors.background.secondary,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    gap: 12,
    borderTopWidth: 0.5,
    borderColor: colors.border.primary,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border.primary,
    alignSelf: 'center',
    marginBottom: 4,
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 4,
  },
  input: {
    backgroundColor: colors.background.tertiary,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.text.primary,
    fontSize: 14,
    borderWidth: 0.5,
    borderColor: colors.border.primary,
  },
  inputArea: { height: 80, textAlignVertical: 'top' },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timeField: { flex: 1, gap: 4 },
  fieldLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.text.tertiary,
    letterSpacing: 1,
  },
  timeInput: {
    backgroundColor: colors.background.tertiary,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.text.primary,
    fontSize: 15,
    fontWeight: '600',
    borderWidth: 0.5,
    borderColor: colors.border.primary,
    textAlign: 'center',
  },
  timeArrow: {
    paddingTop: 18,
  },
  sheetActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: colors.background.tertiary,
    borderWidth: 0.5,
    borderColor: colors.border.primary,
  },
  cancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  createBtn: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: colors.modules.aly,
  },
  createBtnDisabled: { opacity: 0.45 },
  createText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.background.primary,
  },
  orDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 2,
  },
  orLine: { flex: 1, height: 0.5, backgroundColor: colors.border.primary },
  orText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.text.tertiary,
    letterSpacing: 1,
  },
  aiBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.modules.aly + '12',
    borderWidth: 0.5,
    borderColor: colors.modules.aly + '40',
    marginBottom: 8,
  },
  aiBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.modules.aly,
  },
});
