import React, { useEffect, useState } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Alert, ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { supabase } from '../../services/supabase'
import { spacesService } from '../../services/spaces'
import { hubsService } from '../../services/hubs'
import { colors } from '../../constants/colors'
import {
  CaretLeft, SignOut, User, EnvelopSimple,
  FolderOpen, AppWindow, CalendarBlank,
} from 'phosphor-react-native'

export default function ProfileScreen({ navigation }) {
  const [user,    setUser]    = useState(null)
  const [stats,   setStats]   = useState({ spaces: 0, hubs: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    const { data: { user: u } } = await supabase.auth.getUser()
    setUser(u)
    if (u) {
      try {
        const spaces = await spacesService.getSpaces(u.id)
        let hubCount = 0
        for (const s of spaces) {
          const hubs = await hubsService.getHubs(s.id)
          hubCount += hubs.length
        }
        setStats({ spaces: spaces.length, hubs: hubCount })
      } catch (e) {
        console.warn('Stats load error:', e)
      }
    }
    setLoading(false)
  }

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => supabase.auth.signOut() },
    ])
  }

  const fullName = user?.user_metadata?.full_name || ''
  const initials = fullName
    ? fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : (user?.email?.[0] ?? 'U').toUpperCase()

  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
    : null

  if (loading) {
    return (
      <View style={[s.container, s.centered]}>
        <ActivityIndicator color={colors.text.tertiary} />
      </View>
    )
  }

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={s.backBtn}
          hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
        >
          <CaretLeft color={colors.text.primary} size={22} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Profile</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Identity card */}
        <View style={s.identityCard}>
          <View style={s.avatar}>
            <Text style={s.avatarText}>{initials}</Text>
          </View>
          <View style={s.identityInfo}>
            <Text style={s.userName} numberOfLines={1}>
              {fullName || 'No name set'}
            </Text>
            <Text style={s.userEmail} numberOfLines={1}>{user?.email}</Text>
            {memberSince && (
              <View style={s.memberRow}>
                <CalendarBlank size={11} color={colors.text.tertiary} />
                <Text style={s.memberText}>Member since {memberSince}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Stats */}
        <View style={s.statsRow}>
          <View style={s.statCard}>
            <View style={[s.statIcon, { backgroundColor: colors.modules.track + '15' }]}>
              <FolderOpen size={16} color={colors.modules.track} />
            </View>
            <Text style={s.statValue}>{stats.spaces}</Text>
            <Text style={s.statLabel}>Spaces</Text>
          </View>
          <View style={s.statCard}>
            <View style={[s.statIcon, { backgroundColor: colors.modules.automate + '15' }]}>
              <AppWindow size={16} color={colors.modules.automate} />
            </View>
            <Text style={s.statValue}>{stats.hubs}</Text>
            <Text style={s.statLabel}>Hubs</Text>
          </View>
        </View>

        {/* Account info */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Account</Text>
          <View style={s.infoCard}>
            <InfoRow icon={User} label="Name" value={fullName || '—'} />
            <InfoRow icon={EnvelopSimple} label="Email" value={user?.email || '—'} last />
          </View>
        </View>

        {/* Sign out */}
        <TouchableOpacity style={s.signOutBtn} onPress={handleLogout} activeOpacity={0.75}>
          <SignOut size={18} color="#f87171" />
          <Text style={s.signOutText}>Sign Out</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  )
}

function InfoRow({ icon: Icon, label, value, last }) {
  return (
    <View style={[s.infoRow, !last && s.infoRowBorder]}>
      <Icon size={15} color={colors.text.tertiary} />
      <Text style={s.infoLabel}>{label}</Text>
      <Text style={s.infoValue} numberOfLines={1}>{value}</Text>
    </View>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background.primary },
  centered:  { alignItems: 'center', justifyContent: 'center' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border.primary,
  },
  backBtn: { width: 36, height: 36, justifyContent: 'center' },
  headerTitle: { fontSize: 15, fontWeight: '600', color: colors.text.primary },

  scroll: { padding: 16, gap: 12, paddingBottom: 60 },

  // Identity
  identityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.background.secondary,
    borderRadius: 18,
    borderWidth: 0.5,
    borderColor: colors.border.primary,
    padding: 16,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.modules.aly + '15',
    borderWidth: 1,
    borderColor: colors.modules.aly + '25',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarText: { fontSize: 20, fontWeight: '700', color: colors.modules.aly },
  identityInfo: { flex: 1, minWidth: 0, gap: 3 },
  userName:  { fontSize: 15, fontWeight: '600', color: colors.text.primary },
  userEmail: { fontSize: 13, color: colors.text.tertiary },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  memberText: { fontSize: 11, color: colors.text.tertiary },

  // Stats
  statsRow: { flexDirection: 'row', gap: 10 },
  statCard: {
    flex: 1,
    backgroundColor: colors.background.secondary,
    borderRadius: 16,
    borderWidth: 0.5,
    borderColor: colors.border.primary,
    padding: 14,
    alignItems: 'flex-start',
    gap: 8,
  },
  statIcon:  { width: 32, height: 32, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  statValue: { fontSize: 22, fontWeight: '700', color: colors.text.primary },
  statLabel: { fontSize: 11, color: colors.text.tertiary, marginTop: -4 },

  // Account section
  section: { gap: 8 },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginLeft: 4,
  },
  infoCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: 16,
    borderWidth: 0.5,
    borderColor: colors.border.primary,
    overflow: 'hidden',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  infoRowBorder: {
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border.primary + '80',
  },
  infoLabel: { fontSize: 13, color: colors.text.tertiary, width: 52 },
  infoValue: { flex: 1, fontSize: 13, color: colors.text.primary },

  // Sign out
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.background.secondary,
    borderRadius: 16,
    borderWidth: 0.5,
    borderColor: '#f87171' + '30',
    paddingHorizontal: 16,
    paddingVertical: 15,
    marginTop: 4,
  },
  signOutText: { fontSize: 14, fontWeight: '600', color: '#f87171' },
})
