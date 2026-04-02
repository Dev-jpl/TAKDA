import React from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TouchableWithoutFeedback,
  ScrollView,
  Alert,
} from 'react-native'
import { colors } from '../../constants/colors'
import { supabase } from '../../services/supabase'
import { 
  User, Key, Bell, ShieldCheck, 
  Database, IdentificationCard, SignOut 
} from 'phosphor-react-native'

export default function ProfileQuickModal({ visible, onClose, navigation, user }) {
  const handleLogout = async () => {
    Alert.alert('Logout', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { 
        text: 'Logout', 
        style: 'destructive', 
        onPress: async () => {
          onClose()
          await supabase.auth.signOut()
        } 
      },
    ])
  }

  const navigateTo = (screen) => {
    onClose()
    navigation.closeDrawer()
    navigation.navigate(screen)
  }

  const initials = user?.user_metadata?.full_name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'

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

              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Header */}
                <View style={styles.header}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{initials}</Text>
                  </View>
                  <View style={styles.userInfo}>
                    <Text style={styles.userName}>{user?.user_metadata?.full_name || 'User'}</Text>
                    <Text style={styles.userEmail}>{user?.email}</Text>
                  </View>
                </View>

                {/* Section 1 */}
                <View style={styles.section}>
                  <MenuButton 
                    icon={User} 
                    label="Profile" 
                    onPress={() => navigateTo('Profile')} 
                  />
                  <MenuButton 
                    icon={Key} 
                    label="Settings" 
                    onPress={() => {}} 
                  />
                  <MenuButton 
                    icon={Bell} 
                    label="Notifications" 
                    onPress={() => {}} 
                  />
                </View>

                <View style={styles.divider} />

                {/* Section 2 */}
                <View style={styles.section}>
                  <MenuButton 
                    icon={ShieldCheck} 
                    label="Privacy" 
                    onPress={() => {}} 
                  />
                  <MenuButton 
                    icon={Database} 
                    label="Data & Storage" 
                    onPress={() => {}} 
                  />
                  <MenuButton 
                    icon={IdentificationCard} 
                    label="Support" 
                    onPress={() => {}} 
                  />
                </View>

                <View style={styles.divider} />

                {/* Section 3 */}
                <TouchableOpacity 
                  style={styles.logoutBtn}
                  onPress={handleLogout}
                >
                  <SignOut color={colors.status.high} size={20} weight="regular" />
                  <Text style={styles.logoutText}>Sign Out</Text>
                </TouchableOpacity>
                
                <View style={{ height: 40 }} />
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  )
}

function MenuButton({ icon: Icon, label, onPress }) {
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress}>
      <View style={styles.menuLeft}>
        <Icon color={colors.text.secondary} size={20} weight="light" />
        <Text style={styles.menuLabel}>{label}</Text>
      </View>
      <Text style={styles.arrow}>›</Text>
    </TouchableOpacity>
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
    paddingBottom: 20,
    borderWidth: 0.5,
    borderColor: colors.border.primary,
    maxHeight: '80%',
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border.primary,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 24,
    gap: 16,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.modules.track + '20',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.modules.track + '40',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.modules.track,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
  },
  userEmail: {
    fontSize: 13,
    color: colors.text.tertiary,
    marginTop: 2,
  },
  section: {
    paddingHorizontal: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuLabel: {
    fontSize: 15,
    color: colors.text.primary,
    fontWeight: '500',
  },
  arrow: {
    fontSize: 20,
    color: colors.text.tertiary,
  },
  divider: {
    height: 0.5,
    backgroundColor: colors.border.primary,
    marginHorizontal: 24,
    marginVertical: 12,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 16,
    gap: 12,
  },
  logoutText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.status.high,
  },
})
