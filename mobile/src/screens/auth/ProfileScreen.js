import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { supabase } from '../../services/supabase'
import { spacesService } from '../../services/spaces'
import { hubsService } from '../../services/hubs'
import { colors } from '../../constants/colors'
import { 
  User, SignOut, CaretLeft, Bell, 
  ShieldCheck, Database, Key, IdentificationCard 
} from 'phosphor-react-native'

export default function ProfileScreen({ navigation }) {
  const [user, setUser] = useState(null)
  const [stats, setStats] = useState({ spaces: 0, hubs: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    setUser(user)
    
    if (user) {
      try {
        const spaces = await spacesService.getSpaces(user.id)
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

  const handleLogout = async () => {
    Alert.alert('Logout', 'Are you sure you want to sign out? Your local state will be cleared.', [
      { text: 'Cancel', style: 'cancel' },
      { 
        text: 'Logout', 
        style: 'destructive', 
        onPress: async () => {
          await supabase.auth.signOut()
        } 
      },
    ])
  }

  const initials = user?.user_metadata?.full_name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator color={colors.modules.track} size="large" />
      </View>
    )
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()} 
          style={styles.backBtn}
          hitSlop={{ top: 25, bottom: 25, left: 25, right: 25 }}
        >
          <CaretLeft color={colors.text.primary} size={24} weight="regular" />
        </TouchableOpacity>
        <Text style={styles.title}>IDENTITY</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Profile Identity Card */}
        <View style={styles.identitySection}>
          <View style={styles.largeAvatar}>
            <Text style={styles.largeAvatarText}>{initials}</Text>
          </View>
          <Text style={styles.userName}>{user?.user_metadata?.full_name || 'TAKDA User'}</Text>
          <Text style={styles.userEmail}>{user?.email}</Text>
          <View style={styles.verifiedBadge}>
            <ShieldCheck color={colors.modules.track} size={14} weight="fill" />
            <Text style={styles.verifiedText}>SECURED CORE</Text>
          </View>
        </View>

        {/* Quick Stats Dashboard */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{stats.spaces}</Text>
            <Text style={styles.statLabel}>SPACES</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{stats.hubs}</Text>
            <Text style={styles.statLabel}>HUBS</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statValue}>1.0</Text>
            <Text style={styles.statLabel}>VERSION</Text>
          </View>
        </View>

        {/* Account Control Center */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Control</Text>
          <View style={styles.menu}>
            <MenuLink icon={IdentificationCard} label="Edit Profile" />
            <MenuLink icon={Key} label="Login & Security" />
            <MenuLink icon={Bell} label="Notification Center" />
          </View>
        </View>

        {/* Data & Privacy */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Privacy & Data</Text>
          <View style={styles.menu}>
            <MenuLink icon={ShieldCheck} label="Privacy Management" />
            <MenuLink icon={Database} label="Backup & Export" />
          </View>
        </View>

        {/* Danger Zone */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Operations</Text>
          <TouchableOpacity 
            style={styles.logoutBtn} 
            onPress={handleLogout}
            activeOpacity={0.8}
          >
            <SignOut color={colors.status.high} size={20} weight="regular" />
            <Text style={styles.logoutText}>Terminate Session</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.trademark}>TAKDA — SYSTEM OPERATIONAL</Text>
        <View style={{ height: 60 }} />
      </ScrollView>
    </SafeAreaView>
  )
}

function MenuLink({ icon: Icon, label }) {
  return (
    <TouchableOpacity style={styles.menuItem}>
      <View style={styles.menuLeft}>
        <Icon color={colors.text.secondary} size={20} weight="light" />
        <Text style={styles.menuLabel}>{label}</Text>
      </View>
      <Text style={styles.arrow}>›</Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background.primary },
  centered: { alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border.primary,
  },
  backBtn: { width: 44, height: 44, justifyContent: 'center' },
  title: { 
    fontSize: 12, 
    fontWeight: '700', 
    color: colors.text.tertiary, 
    letterSpacing: 2, 
    textTransform: 'uppercase' 
  },
  scroll: { padding: 20, gap: 32 },
  identitySection: {
    alignItems: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  largeAvatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.modules.track + '15',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.modules.track + '30',
    marginBottom: 12,
  },
  largeAvatarText: {
    fontSize: 32,
    fontWeight: '600',
    color: colors.modules.track,
  },
  userName: {
    fontSize: 22,
    fontWeight: '600',
    color: colors.text.primary,
  },
  userEmail: {
    fontSize: 14,
    color: colors.text.tertiary,
    marginBottom: 8,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.background.secondary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 0.5,
    borderColor: colors.border.primary,
  },
  verifiedText: {
    fontSize: 10,
    color: colors.text.tertiary,
    fontWeight: '700',
    letterSpacing: 1,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: colors.background.secondary,
    borderRadius: 16,
    borderWidth: 0.5,
    borderColor: colors.border.primary,
    padding: 20,
    alignItems: 'center',
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text.primary,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.text.tertiary,
    letterSpacing: 1,
    marginTop: 4,
  },
  statDivider: {
    width: 0.5,
    height: 24,
    backgroundColor: colors.border.primary,
  },
  section: { gap: 12 },
  sectionTitle: { 
    fontSize: 11, 
    fontWeight: '700', 
    color: colors.text.tertiary, 
    letterSpacing: 1, 
    textTransform: 'uppercase',
    marginLeft: 4,
  },
  menu: { 
    backgroundColor: colors.background.secondary, 
    borderRadius: 16, 
    borderWidth: 0.5, 
    borderColor: colors.border.primary,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 18,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border.primary,
  },
  menuLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  menuLabel: { fontSize: 15, color: colors.text.primary, fontWeight: '500' },
  arrow: { fontSize: 20, color: colors.text.tertiary },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
    padding: 20,
    borderRadius: 16,
    borderWidth: 0.5,
    borderColor: colors.status.high + '30',
    gap: 12,
  },
  logoutText: { fontSize: 15, fontWeight: '600', color: colors.status.high },
  trademark: { 
    textAlign: 'center', 
    fontSize: 10, 
    color: colors.text.tertiary, 
    marginTop: 40, 
    letterSpacing: 1 
  },
})
