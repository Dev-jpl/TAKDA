import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, ActivityIndicator, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../../services/supabase';
import { integrationsService } from '../../services/integrations';
import { colors } from '../../constants/colors';
import {
  CaretLeft, CaretRight, GoogleLogo, Lightning,
  Calendar, ArrowsClockwise, Trash, CheckCircle,
  Bell, ShieldCheck, SignOut, User, Lock,
} from 'phosphor-react-native';

// ── Section header ─────────────────────────────────────────────────────────
function SectionHeader({ label }) {
  return <Text style={styles.sectionHeader}>{label}</Text>;
}

// ── Menu row (arrow link) ──────────────────────────────────────────────────
function MenuRow({ icon: Icon, iconColor, label, sublabel, onPress, danger }) {
  return (
    <TouchableOpacity style={styles.menuRow} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.menuRowIcon, { backgroundColor: (iconColor || colors.text.tertiary) + '15' }]}>
        <Icon size={16} color={iconColor || colors.text.tertiary} weight="light" />
      </View>
      <View style={styles.menuRowText}>
        <Text style={[styles.menuRowLabel, danger && { color: colors.status.urgent }]}>{label}</Text>
        {sublabel ? <Text style={styles.menuRowSub}>{sublabel}</Text> : null}
      </View>
      <CaretRight size={14} color={colors.text.tertiary} weight="light" />
    </TouchableOpacity>
  );
}

// ── Integration card: connected ────────────────────────────────────────────
function ConnectedCard({ name, email, syncing, onSync, onDisconnect }) {
  return (
    <View style={styles.connectedCard}>
      <View style={styles.connectedCardTop}>
        <View style={styles.connectedDot} />
        <View style={styles.connectedInfo}>
          <Text style={styles.connectedName}>{name}</Text>
          {email ? <Text style={styles.connectedEmail}>{email}</Text> : null}
        </View>
        <TouchableOpacity onPress={onDisconnect} style={styles.disconnectBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Trash size={15} color={colors.text.tertiary} weight="light" />
        </TouchableOpacity>
      </View>
      <TouchableOpacity style={styles.syncBtn} onPress={onSync} disabled={syncing} activeOpacity={0.75}>
        {syncing
          ? <ActivityIndicator size="small" color={colors.modules.knowledge} />
          : <ArrowsClockwise size={14} color={colors.modules.knowledge} weight="regular" />}
        <Text style={styles.syncBtnText}>{syncing ? 'Syncing…' : 'Sync now'}</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── Integration card: not connected ───────────────────────────────────────
function ConnectCard({ name, description, accentColor, onConnect, comingSoon }) {
  return (
    <TouchableOpacity
      style={[styles.connectCard, comingSoon && styles.connectCardDimmed]}
      onPress={comingSoon ? undefined : onConnect}
      activeOpacity={comingSoon ? 1 : 0.75}
    >
      <View style={styles.connectCardLeft}>
        <Text style={[styles.connectCardName, { color: accentColor }]}>{name}</Text>
        <Text style={styles.connectCardDesc}>{description}</Text>
      </View>
      {comingSoon
        ? <View style={styles.soonBadge}><Text style={styles.soonText}>SOON</Text></View>
        : (
          <View style={[styles.connectBtn, { borderColor: accentColor + '60', backgroundColor: accentColor + '10' }]}>
            <Text style={[styles.connectBtnText, { color: accentColor }]}>Connect</Text>
          </View>
        )
      }
    </TouchableOpacity>
  );
}

// ── Main screen ─────────────────────────────────────────────────────────────
export default function SettingsScreen({ navigation }) {
  const [user, setUser] = useState(null);
  const [integrations, setIntegrations] = useState([]);
  const [syncing, setSyncing] = useState(false);
  const [stravaSyncing, setStravaSyncing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      const load = async () => {
        const { data: { user: u } } = await supabase.auth.getUser();
        if (!active) return;
        setUser(u);
        const data = await integrationsService.getIntegrations();
        if (active) setIntegrations(data);
      };
      load();
      return () => { active = false; };
    }, [])
  );

  const googleIntegration = integrations.find(i => i.provider === 'google');
  const stravaIntegration = integrations.find(i => i.provider === 'strava');

  // ── Google Calendar ────────────────────────────────────────────────────
  const handleConnectGoogle = async () => {
    if (!user) return;
    try {
      const url = await integrationsService.getGoogleAuthUrl(user.id);
      if (url) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Error', 'Could not get Google sign-in URL.');
      }
    } catch (e) {
      Alert.alert('Error', 'Could not open Google sign-in. Check your connection.');
    }
  };

  const handleSync = async () => {
    if (!user) return;
    setSyncing(true);
    try {
      const result = await integrationsService.syncGoogleCalendar(user.id);
      const count = result?.synced_count ?? 0;
      Alert.alert('Synced', `${count} event${count !== 1 ? 's' : ''} synced from Google Calendar.`);
    } catch (e) {
      Alert.alert('Sync failed', 'Could not sync calendar. Please try again.');
    } finally {
      setSyncing(false);
    }
  };

  const handleDisconnect = () => {
    if (!googleIntegration) return;
    Alert.alert(
      'Disconnect Google',
      'Your calendar events already synced will stay, but no new events will sync.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect', style: 'destructive',
          onPress: async () => {
            await integrationsService.removeIntegration(googleIntegration.id);
            setIntegrations(prev => prev.filter(i => i.id !== googleIntegration.id));
          },
        },
      ]
    );
  };

  // ── Strava ────────────────────────────────────────────────────────────
  const handleConnectStrava = async () => {
    if (!user) return;
    try {
      const url = await integrationsService.getStravaAuthUrl(user.id);
      if (url) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Error', 'Could not get Strava sign-in URL.');
      }
    } catch (e) {
      Alert.alert('Error', 'Could not open Strava sign-in. Check your connection.');
    }
  };

  const handleStravaSync = async () => {
    if (!user) return;
    setStravaSyncing(true);
    try {
      const result = await integrationsService.syncStrava(user.id);
      const count = result?.synced_count ?? 0;
      Alert.alert('Synced', `${count} activit${count !== 1 ? 'ies' : 'y'} synced from Strava.`);
    } catch (e) {
      Alert.alert('Sync failed', 'Could not sync Strava activities. Please try again.');
    } finally {
      setStravaSyncing(false);
    }
  };

  const handleDisconnectStrava = () => {
    if (!stravaIntegration) return;
    Alert.alert(
      'Disconnect Strava',
      'Your synced activities will stay in TAKDA, but no new ones will sync.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect', style: 'destructive',
          onPress: async () => {
            await integrationsService.removeIntegration(stravaIntegration.id);
            setIntegrations(prev => prev.filter(i => i.id !== stravaIntegration.id));
          },
        },
      ]
    );
  };

  // ── Sign out ───────────────────────────────────────────────────────────
  const handleSignOut = () => {
    Alert.alert('Sign out', 'You will be signed out of TAKDA on this device.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => supabase.auth.signOut() },
    ]);
  };

  const initials = user?.user_metadata?.full_name
    ?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
        >
          <CaretLeft size={22} color={colors.text.secondary} weight="light" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile card */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>
              {user?.user_metadata?.full_name || 'TAKDA User'}
            </Text>
            <Text style={styles.profileEmail}>{user?.email || '—'}</Text>
          </View>
          <TouchableOpacity style={styles.editBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Text style={styles.editBtnText}>Edit</Text>
          </TouchableOpacity>
        </View>

        {/* Connections */}
        <SectionHeader label="Connections" />

        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Calendar size={15} color={colors.modules.knowledge} weight="light" />
            <Text style={styles.cardTitle}>Google Calendar</Text>
          </View>
          {googleIntegration ? (
            <ConnectedCard
              name="Google Calendar"
              email={googleIntegration.metadata?.email}
              syncing={syncing}
              onSync={handleSync}
              onDisconnect={handleDisconnect}
            />
          ) : (
            <ConnectCard
              name="Google Calendar"
              description="Sync your events and see them inside TAKDA."
              accentColor={colors.modules.knowledge}
              onConnect={handleConnectGoogle}
            />
          )}
        </View>

        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Lightning size={15} color="#FC5200" weight="light" />
            <Text style={styles.cardTitle}>Strava</Text>
          </View>
          {stravaIntegration ? (
            <ConnectedCard
              name={
                stravaIntegration.metadata?.firstname
                  ? `${stravaIntegration.metadata.firstname} ${stravaIntegration.metadata.lastname || ''}`.trim()
                  : 'Strava'
              }
              email={stravaIntegration.metadata?.username ? `@${stravaIntegration.metadata.username}` : null}
              syncing={stravaSyncing}
              onSync={handleStravaSync}
              onDisconnect={handleDisconnectStrava}
            />
          ) : (
            <ConnectCard
              name="Strava"
              description="Sync your runs, rides, and workouts into TAKDA."
              accentColor="#FC5200"
              onConnect={handleConnectStrava}
            />
          )}
        </View>

        {/* Account */}
        <SectionHeader label="Account" />
        <View style={styles.menuCard}>
          <MenuRow
            icon={User}
            iconColor={colors.modules.track}
            label="Edit Profile"
            sublabel="Name, photo, preferences"
          />
          <View style={styles.menuDivider} />
          <MenuRow
            icon={Lock}
            iconColor={colors.text.secondary}
            label="Password & Security"
            sublabel="Change password, 2FA"
          />
          <View style={styles.menuDivider} />
          <MenuRow
            icon={Bell}
            iconColor={colors.status.high}
            label="Notifications"
            sublabel="Push, reminders, digests"
          />
          <View style={styles.menuDivider} />
          <MenuRow
            icon={ShieldCheck}
            iconColor={colors.modules.annotate}
            label="Privacy & Data"
            sublabel="What TAKDA stores about you"
          />
        </View>

        {/* Sign out */}
        <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut} activeOpacity={0.8}>
          <SignOut size={18} color={colors.status.urgent} weight="light" />
          <Text style={styles.signOutText}>Sign out</Text>
        </TouchableOpacity>

        <Text style={styles.version}>TAKDA v1.0</Text>
        <View style={{ height: 60 }} />
      </ScrollView>
    </SafeAreaView>
  );
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
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border.primary,
  },
  backBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
  },

  scroll: {
    padding: 20,
    gap: 8,
  },

  // ── Profile ──────────────────────────────────────────────────────────
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
    borderRadius: 16,
    borderWidth: 0.5,
    borderColor: colors.border.primary,
    padding: 16,
    gap: 14,
    marginBottom: 20,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.modules.track + '20',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.modules.track + '30',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.modules.track,
  },
  profileInfo: {
    flex: 1,
    gap: 3,
  },
  profileName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text.primary,
  },
  profileEmail: {
    fontSize: 12,
    color: colors.text.tertiary,
  },
  editBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 0.5,
    borderColor: colors.border.primary,
    backgroundColor: colors.background.tertiary,
  },
  editBtnText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.text.secondary,
  },

  // ── Section header ───────────────────────────────────────────────────
  sectionHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.text.tertiary,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginLeft: 4,
    marginTop: 16,
    marginBottom: 8,
  },

  // ── Integration cards ────────────────────────────────────────────────
  card: {
    backgroundColor: colors.background.secondary,
    borderRadius: 16,
    borderWidth: 0.5,
    borderColor: colors.border.primary,
    padding: 16,
    marginBottom: 10,
    gap: 12,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text.secondary,
    letterSpacing: 0.3,
  },

  // connected state
  connectedCard: {
    gap: 10,
  },
  connectedCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  connectedDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.status.success,
  },
  connectedInfo: {
    flex: 1,
    gap: 2,
  },
  connectedName: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text.primary,
  },
  connectedEmail: {
    fontSize: 12,
    color: colors.text.tertiary,
  },
  disconnectBtn: {
    padding: 6,
  },
  syncBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    backgroundColor: colors.modules.knowledge + '12',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 0.5,
    borderColor: colors.modules.knowledge + '40',
  },
  syncBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.modules.knowledge,
  },

  // not connected state
  connectCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  connectCardDimmed: {
    opacity: 0.5,
  },
  connectCardLeft: {
    flex: 1,
    gap: 3,
  },
  connectCardName: {
    fontSize: 14,
    fontWeight: '500',
  },
  connectCardDesc: {
    fontSize: 12,
    color: colors.text.tertiary,
    lineHeight: 17,
  },
  connectBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
  },
  connectBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  soonBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: colors.background.tertiary,
    borderWidth: 0.5,
    borderColor: colors.border.primary,
  },
  soonText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.text.tertiary,
    letterSpacing: 1,
  },

  // ── Menu card ────────────────────────────────────────────────────────
  menuCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: 16,
    borderWidth: 0.5,
    borderColor: colors.border.primary,
    overflow: 'hidden',
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  menuRowIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuRowText: {
    flex: 1,
    gap: 2,
  },
  menuRowLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text.primary,
  },
  menuRowSub: {
    fontSize: 12,
    color: colors.text.tertiary,
  },
  menuDivider: {
    height: 0.5,
    backgroundColor: colors.border.secondary,
    marginLeft: 60,
  },

  // ── Sign out ─────────────────────────────────────────────────────────
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 20,
    backgroundColor: colors.background.secondary,
    borderRadius: 16,
    borderWidth: 0.5,
    borderColor: colors.status.urgent + '30',
    padding: 18,
  },
  signOutText: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.status.urgent,
  },

  version: {
    textAlign: 'center',
    fontSize: 11,
    color: colors.text.tertiary,
    marginTop: 24,
    letterSpacing: 0.5,
  },
});
