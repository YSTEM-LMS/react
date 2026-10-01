/**
 * LoginScreen.tsx
 * D1 — Auth + Navigation
 *
 * YSTEM Mobile App — Y STEM and Chess
 * Designed by Sandith Hewage (UI/UX Engineer)
 *
 * Features:
 * - Logo + brand wordmark hero
 * - Username + password inputs with focus states
 * - Enter (green CTA) + Forgot Password / Sign Up links
 * - KeyboardAvoidingView for input accessibility
 * - Full token coverage from design-tokens.rn.ts
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  colors,
  spacing,
  fontSize,
  fontFamily,
  fontWeight,
  radius,
  shadows,
  btnGreenStyle,
  btnGreenTextStyle,
  cardFormStyle,
  inputBaseStyle,
  errorTextStyle,
  layout,
  getLineHeight,
} from '../design-tokens.rn';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface LoginScreenProps {
  onLogin?: (username: string, password: string) => void;
  onForgotPassword?: () => void;
  onSignUp?: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function LoginScreen({
  onLogin,
  onForgotPassword,
  onSignUp,
}: LoginScreenProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [usernameFocused, setUsernameFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      setError('Please enter your username and password.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await onLogin?.(username.trim(), password);
    } catch {
      setError('Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.soft} />
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Logo / Hero ─────────────────────────────────── */}
          <View style={styles.heroSection}>
            {/* Logo placeholder — replace with actual asset */}
            <View style={styles.logoContainer}>
              <View style={styles.logoCircle}>
                <Text style={styles.logoLetter}>Y</Text>
              </View>
            </View>
            <Text style={styles.wordmark}>Y STEM and Chess</Text>
            <Text style={styles.tagline}>Learn. Play. Grow.</Text>
          </View>

          {/* ── Auth Card ───────────────────────────────────── */}
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Welcome back</Text>

            {/* Username */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Username</Text>
              <TextInput
                style={[
                  styles.input,
                  usernameFocused && styles.inputFocused,
                  error && !username && styles.inputError,
                ]}
                placeholder="Enter your username"
                placeholderTextColor={colors.muted}
                value={username}
                onChangeText={(t) => { setUsername(t); setError(''); }}
                onFocus={() => setUsernameFocused(true)}
                onBlur={() => setUsernameFocused(false)}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
                accessibilityLabel="Username input"
              />
            </View>

            {/* Password */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Password</Text>
              <TextInput
                style={[
                  styles.input,
                  passwordFocused && styles.inputFocused,
                  error && !password && styles.inputError,
                ]}
                placeholder="Enter your password"
                placeholderTextColor={colors.muted}
                value={password}
                onChangeText={(t) => { setPassword(t); setError(''); }}
                onFocus={() => setPasswordFocused(true)}
                onBlur={() => setPasswordFocused(false)}
                secureTextEntry
                returnKeyType="done"
                onSubmitEditing={handleLogin}
                accessibilityLabel="Password input"
              />
            </View>

            {/* Error message */}
            {!!error && <Text style={styles.errorText}>{error}</Text>}

            {/* Forgot password */}
            <TouchableOpacity
              onPress={onForgotPassword}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityLabel="Forgot password"
            >
              <Text style={styles.forgotText}>Forgot password?</Text>
            </TouchableOpacity>

            {/* Enter CTA */}
            <TouchableOpacity
              style={[styles.enterButton, loading && styles.buttonDisabled]}
              onPress={handleLogin}
              activeOpacity={0.8}
              disabled={loading}
              accessibilityLabel="Log in button"
              accessibilityRole="button"
            >
              <Text style={styles.enterButtonText}>
                {loading ? 'Logging in…' : 'Enter'}
              </Text>
            </TouchableOpacity>

            {/* Sign up link */}
            <View style={styles.signUpRow}>
              <Text style={styles.signUpPrompt}>Don't have an account? </Text>
              <TouchableOpacity
                onPress={onSignUp}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityLabel="Sign up"
              >
                <Text style={styles.signUpLink}>Sign up</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.soft,
  },

  keyboardView: {
    flex: 1,
  },

  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: layout.screenPaddingH,
    paddingTop: spacing[12],
    paddingBottom: spacing[10],
  },

  // ── Hero ────────────────────────────────────────────

  heroSection: {
    alignItems: 'center',
    marginBottom: spacing[10],
  },

  logoContainer: {
    marginBottom: spacing[4],
  },

  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: radius.full,
    backgroundColor: colors.dark,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.lg,
  },

  logoLetter: {
    fontSize: fontSize['4xl'],
    fontFamily: fontFamily.bold,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },

  wordmark: {
    fontSize: fontSize['2xl'],
    fontFamily: fontFamily.bold,
    fontWeight: fontWeight.bold,
    color: colors.dark,
    marginBottom: spacing[1],
    letterSpacing: 0.5,
  },

  tagline: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    color: colors.gray,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },

  // ── Form Card ───────────────────────────────────────

  formCard: {
    ...cardFormStyle,
    width: '100%',
    maxWidth: layout.maxFormWidth,
    gap: layout.formFieldGap,
  },

  formTitle: {
    fontSize: fontSize['2xl'],
    fontFamily: fontFamily.bold,
    fontWeight: fontWeight.bold,
    color: colors.dark,
    textAlign: 'center',
    marginBottom: spacing[2],
  },

  fieldGroup: {
    gap: layout.labelFieldGap,
  },

  fieldLabel: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.bold,
    fontWeight: fontWeight.bold,
    color: colors.dark,
    letterSpacing: 0.3,
  },

  input: {
    ...inputBaseStyle,
    height: 48,
  },

  inputFocused: {
    borderColor: colors.primary,
  },

  inputError: {
    borderColor: colors.red,
  },

  errorText: {
    ...errorTextStyle,
    textAlign: 'center',
  },

  forgotText: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.medium,
    fontWeight: fontWeight.medium,
    color: colors.primary,
    textAlign: 'right',
  },

  enterButton: {
    ...btnGreenStyle,
    height: 52,
    marginTop: spacing[2],
  },

  enterButtonText: {
    ...btnGreenTextStyle,
  },

  buttonDisabled: {
    opacity: 0.6,
  },

  signUpRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },

  signUpPrompt: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    color: colors.gray,
  },

  signUpLink: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.bold,
    fontWeight: fontWeight.bold,
    color: colors.primary,
    textDecorationLine: 'underline',
  },
});
