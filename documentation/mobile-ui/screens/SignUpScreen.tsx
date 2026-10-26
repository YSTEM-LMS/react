/**
 * SignUpScreen.tsx
 * D1 — Auth + Navigation
 *
 * YSTEM Mobile App — Y STEM and Chess
 * Designed by Sandith Hewage (UI/UX Engineer)
 *
 * Features:
 * - Username, password, confirm password fields
 * - Role selector: Student | Mentor (segmented control style)
 * - Create Account CTA + back-to-login link
 * - Real-time password match validation
 * - KeyboardAvoidingView for input accessibility
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
  btnPrimaryStyle,
  btnPrimaryTextStyle,
  cardFormStyle,
  inputBaseStyle,
  errorTextStyle,
  layout,
} from '../design-tokens.rn';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Role = 'student' | 'mentor';

interface SignUpScreenProps {
  onSignUp?: (username: string, password: string, role: Role) => void;
  onLogin?: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function SignUpScreen({ onSignUp, onLogin }: SignUpScreenProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<Role>('student');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  // Focus states
  const [usernameFocused, setUsernameFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [confirmFocused, setConfirmFocused] = useState(false);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!username.trim()) newErrors.username = 'Username is required.';
    else if (username.trim().length < 3) newErrors.username = 'At least 3 characters.';
    if (!password) newErrors.password = 'Password is required.';
    else if (password.length < 8) newErrors.password = 'At least 8 characters.';
    if (password !== confirmPassword) newErrors.confirm = 'Passwords do not match.';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignUp = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await onSignUp?.(username.trim(), password, role);
    } catch {
      setErrors({ general: 'Something went wrong. Please try again.' });
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
          {/* ── Header ──────────────────────────────────────── */}
          <View style={styles.header}>
            <View style={styles.logoCircle}>
              <Text style={styles.logoLetter}>Y</Text>
            </View>
            <Text style={styles.heading}>Create your account</Text>
            <Text style={styles.subheading}>Join Y STEM and Chess today</Text>
          </View>

          {/* ── Form Card ───────────────────────────────────── */}
          <View style={styles.formCard}>

            {/* General error */}
            {!!errors.general && (
              <View style={styles.errorBanner}>
                <Text style={styles.errorBannerText}>{errors.general}</Text>
              </View>
            )}

            {/* Username */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Username</Text>
              <TextInput
                style={[
                  styles.input,
                  usernameFocused && styles.inputFocused,
                  errors.username && styles.inputError,
                ]}
                placeholder="Choose a username"
                placeholderTextColor={colors.muted}
                value={username}
                onChangeText={(t) => { setUsername(t); setErrors((e) => ({ ...e, username: '' })); }}
                onFocus={() => setUsernameFocused(true)}
                onBlur={() => setUsernameFocused(false)}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
                accessibilityLabel="Username input"
              />
              {!!errors.username && <Text style={styles.fieldError}>{errors.username}</Text>}
            </View>

            {/* Password */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Password</Text>
              <TextInput
                style={[
                  styles.input,
                  passwordFocused && styles.inputFocused,
                  errors.password && styles.inputError,
                ]}
                placeholder="Create a password (min 8 chars)"
                placeholderTextColor={colors.muted}
                value={password}
                onChangeText={(t) => { setPassword(t); setErrors((e) => ({ ...e, password: '' })); }}
                onFocus={() => setPasswordFocused(true)}
                onBlur={() => setPasswordFocused(false)}
                secureTextEntry
                returnKeyType="next"
                accessibilityLabel="Password input"
              />
              {!!errors.password && <Text style={styles.fieldError}>{errors.password}</Text>}
            </View>

            {/* Confirm Password */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Confirm password</Text>
              <TextInput
                style={[
                  styles.input,
                  confirmFocused && styles.inputFocused,
                  errors.confirm && styles.inputError,
                ]}
                placeholder="Re-enter your password"
                placeholderTextColor={colors.muted}
                value={confirmPassword}
                onChangeText={(t) => { setConfirmPassword(t); setErrors((e) => ({ ...e, confirm: '' })); }}
                onFocus={() => setConfirmFocused(true)}
                onBlur={() => setConfirmFocused(false)}
                secureTextEntry
                returnKeyType="done"
                onSubmitEditing={handleSignUp}
                accessibilityLabel="Confirm password input"
              />
              {!!errors.confirm && <Text style={styles.fieldError}>{errors.confirm}</Text>}
            </View>

            {/* Role selector */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>I am a…</Text>
              <View style={styles.roleSelector}>
                {(['student', 'mentor'] as Role[]).map((r) => (
                  <TouchableOpacity
                    key={r}
                    style={[styles.roleOption, role === r && styles.roleOptionActive]}
                    onPress={() => setRole(r)}
                    activeOpacity={0.8}
                    accessibilityLabel={`Select role: ${r}`}
                    accessibilityState={{ selected: role === r }}
                  >
                    <Text style={[styles.roleOptionText, role === r && styles.roleOptionTextActive]}>
                      {r.charAt(0).toUpperCase() + r.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Create Account CTA */}
            <TouchableOpacity
              style={[styles.submitButton, loading && styles.buttonDisabled]}
              onPress={handleSignUp}
              activeOpacity={0.8}
              disabled={loading}
              accessibilityLabel="Create account button"
              accessibilityRole="button"
            >
              <Text style={styles.submitButtonText}>
                {loading ? 'Creating account…' : 'Create Account'}
              </Text>
            </TouchableOpacity>

            {/* Login link */}
            <View style={styles.loginRow}>
              <Text style={styles.loginPrompt}>Already have an account? </Text>
              <TouchableOpacity
                onPress={onLogin}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityLabel="Log in"
              >
                <Text style={styles.loginLink}>Log in</Text>
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
    paddingTop: spacing[10],
    paddingBottom: spacing[10],
  },

  // ── Header ──────────────────────────────────────────

  header: {
    alignItems: 'center',
    marginBottom: spacing[8],
  },

  logoCircle: {
    width: 64,
    height: 64,
    borderRadius: radius.full,
    backgroundColor: colors.dark,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[4],
    ...shadows.lg,
  },

  logoLetter: {
    fontSize: fontSize['3xl'],
    fontFamily: fontFamily.bold,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },

  heading: {
    fontSize: fontSize['2xl'],
    fontFamily: fontFamily.bold,
    fontWeight: fontWeight.bold,
    color: colors.dark,
    marginBottom: spacing[1],
  },

  subheading: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    color: colors.gray,
  },

  // ── Form Card ────────────────────────────────────────

  formCard: {
    ...cardFormStyle,
    width: '100%',
    maxWidth: layout.maxFormWidth,
    gap: layout.formFieldGap,
  },

  errorBanner: {
    backgroundColor: colors.redLight,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.red,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
  },

  errorBannerText: {
    ...errorTextStyle,
    textAlign: 'center',
  },

  fieldGroup: {
    gap: spacing[2],
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

  fieldError: {
    ...errorTextStyle,
    fontSize: fontSize.xs,
  },

  // ── Role Selector ────────────────────────────────────

  roleSelector: {
    flexDirection: 'row',
    borderRadius: radius.xl,
    borderWidth: 2,
    borderColor: colors.borderLight,
    overflow: 'hidden',
    backgroundColor: colors.light,
  },

  roleOption: {
    flex: 1,
    paddingVertical: spacing[3],
    alignItems: 'center',
    justifyContent: 'center',
  },

  roleOptionActive: {
    backgroundColor: colors.dark,
  },

  roleOptionText: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.bold,
    fontWeight: fontWeight.bold,
    color: colors.muted,
  },

  roleOptionTextActive: {
    color: colors.light,
  },

  // ── Submit ───────────────────────────────────────────

  submitButton: {
    ...btnPrimaryStyle,
    height: 52,
    marginTop: spacing[2],
  },

  submitButtonText: {
    ...btnPrimaryTextStyle,
  },

  buttonDisabled: {
    opacity: 0.6,
  },

  loginRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },

  loginPrompt: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    color: colors.gray,
  },

  loginLink: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.bold,
    fontWeight: fontWeight.bold,
    color: colors.primary,
    textDecorationLine: 'underline',
  },
});
