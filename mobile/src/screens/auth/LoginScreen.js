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
} from 'react-native'
import { supabase } from '../../services/supabase'
import { colors } from '../../constants/colors'

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields')
      return
    }

    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })
    setLoading(false)

    if (error) Alert.alert('Login failed', error.message)
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.inner}>

        {/* Logo */}
        <View style={styles.logoWrap}>
          <Text style={styles.logo}>TAKDA</Text>
          <Text style={styles.logoSub}>
            Track · Annotate · Knowledge · Deliver · Automate
          </Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
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
              placeholder="••••••••"
              placeholderTextColor={colors.text.tertiary}
              secureTextEntry
              autoCapitalize="none"
            />
          </View>

          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color={colors.text.primary} size="small" />
            ) : (
              <Text style={styles.btnText}>Sign in</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Don't have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Register')}>
            <Text style={styles.footerLink}>Register</Text>
          </TouchableOpacity>
        </View>

      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  inner: {
    flex: 1,
    paddingHorizontal: 28,
    justifyContent: 'center',
    gap: 48,
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
    fontSize: 11,
    color: colors.text.tertiary,
    letterSpacing: 1,
    textAlign: 'center',
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