import React, { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native'
import { supabase } from '../../services/supabase'
import { colors } from '../../constants/colors'

export default function RegisterScreen({ navigation }) {
  const [fullName, setFullName] = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleRegister = async () => {
    if (!fullName || !username || !email || !password || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields')
      return
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match')
      return
    }

    if (password.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters')
      return
    }

    setLoading(true)

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          full_name: fullName.trim(),
          username: username.trim().toLowerCase(),
        },
      },
    })

    if (error) {
      setLoading(false)
      Alert.alert('Registration failed', error.message)
      return
    }

    // Create profile row
    if (data.user) {
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: data.user.id,
          full_name: fullName.trim(),
          username: username.trim().toLowerCase(),
        }, { onConflict: 'id' })

      if (profileError) {
        setLoading(false)
        Alert.alert('Error', profileError.message)
        return
      }
    }

    setLoading(false)
    Alert.alert(
      'Account created',
      'Check your email to confirm your account, then sign in.',
      [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
    )
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.inner}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Logo */}
        <View style={styles.logoWrap}>
          <Text style={styles.logo}>TAKDA</Text>
          <Text style={styles.logoSub}>Create your account</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <View style={styles.inputWrap}>
            <Text style={styles.label}>Full name</Text>
            <TextInput
              style={styles.input}
              value={fullName}
              onChangeText={setFullName}
              placeholder="John Patrick"
              placeholderTextColor={colors.text.tertiary}
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputWrap}>
            <Text style={styles.label}>Username</Text>
            <TextInput
              style={styles.input}
              value={username}
              onChangeText={setUsername}
              placeholder="jp"
              placeholderTextColor={colors.text.tertiary}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputWrap}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor={colors.text.tertiary}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputWrap}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="min. 8 characters"
              placeholderTextColor={colors.text.tertiary}
              secureTextEntry
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputWrap}>
            <Text style={styles.label}>Confirm password</Text>
            <TextInput
              style={styles.input}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="••••••••"
              placeholderTextColor={colors.text.tertiary}
              secureTextEntry
              autoCapitalize="none"
            />
          </View>

          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleRegister}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color={colors.text.primary} size="small" />
            ) : (
              <Text style={styles.btnText}>Create account</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={styles.footerLink}>Sign in</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  inner: {
    flexGrow: 1,
    paddingHorizontal: 28,
    paddingVertical: 60,
    justifyContent: 'center',
    gap: 40,
  },
  logoWrap: {
    alignItems: 'center',
    gap: 8,
  },
  logo: {
    fontSize: 36,
    fontWeight: '500',
    color: colors.text.primary,
    letterSpacing: 6,
  },
  logoSub: {
    fontSize: 13,
    color: colors.text.tertiary,
    letterSpacing: 1,
  },
  form: {
    gap: 20,
  },
  inputWrap: {
    gap: 8,
  },
  label: {
    fontSize: 12,
    color: colors.text.secondary,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: colors.background.secondary,
    borderWidth: 0.5,
    borderColor: colors.border.primary,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: colors.text.primary,
  },
  btn: {
    backgroundColor: colors.background.tertiary,
    borderWidth: 0.5,
    borderColor: colors.border.secondary,
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 8,
  },
  btnDisabled: {
    opacity: 0.5,
  },
  btnText: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.text.primary,
    letterSpacing: 0.5,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 13,
    color: colors.text.tertiary,
  },
  footerLink: {
    fontSize: 13,
    color: colors.text.secondary,
    textDecorationLine: 'underline',
  },
})