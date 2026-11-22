/**
 * PlaySetupScreen.tsx
 * D4 — Play vs Computer
 *
 * YSTEM Mobile App — Y STEM and Chess
 * Designed by Sandith Hewage (UI/UX Engineer)
 *
 * Features:
 * - Color picker: White (default) / Black cards with piece icons
 * - Difficulty grid: 5 levels (Beginner → Master) with emoji + description
 * - "Let's Go!" green CTA
 * - Clean scrollable layout with brand styling
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ScrollView,
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
  cardStyle,
  layout,
  getLineHeight,
} from '../design-tokens.rn';

// ---------------------------------------------------------------------------
// Types + Data
// ---------------------------------------------------------------------------

type PieceColor = 'white' | 'black';
type Difficulty = 'beginner' | 'easy' | 'medium' | 'hard' | 'master';

interface DifficultyOption {
  id: Difficulty;
  label: string;
  emoji: string;
  description: string;
  stockfishLevel: number; // 1–20
  color: string;
}

const DIFFICULTY_OPTIONS: DifficultyOption[] = [
  {
    id: 'beginner',
    label: 'Beginner',
    emoji: '🌱',
    description: 'Perfect for learning the basics',
    stockfishLevel: 1,
    color: colors.primary,
  },
  {
    id: 'easy',
    label: 'Easy',
    emoji: '😊',
    description: 'A gentle challenge',
    stockfishLevel: 4,
    color: colors.secondary,
  },
  {
    id: 'medium',
    label: 'Medium',
    emoji: '🤔',
    description: 'Requires real thinking',
    stockfishLevel: 8,
    color: colors.accent,
  },
  {
    id: 'hard',
    label: 'Hard',
    emoji: '😤',
    description: 'Strong tactical play',
    stockfishLevel: 14,
    color: '#FF8C42',
  },
  {
    id: 'master',
    label: 'Master',
    emoji: '👑',
    description: 'Near-perfect engine',
    stockfishLevel: 20,
    color: colors.red,
  },
];

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ColorOption({
  value,
  selected,
  onPress,
}: {
  value: PieceColor;
  selected: boolean;
  onPress: () => void;
}) {
  const isWhite = value === 'white';
  return (
    <TouchableOpacity
      style={[
        colorStyles.card,
        isWhite ? colorStyles.cardWhite : colorStyles.cardBlack,
        selected && colorStyles.cardSelected,
        selected && (isWhite ? colorStyles.cardWhiteSelected : colorStyles.cardBlackSelected),
      ]}
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityLabel={`Play as ${value}`}
      accessibilityState={{ selected }}
    >
      <Text style={colorStyles.pieceEmoji}>{isWhite ? '♔' : '♚'}</Text>
      <Text style={[colorStyles.label, !isWhite && colorStyles.labelLight]}>
        {isWhite ? 'White' : 'Black'}
      </Text>
      <Text style={[colorStyles.moveOrder, !isWhite && colorStyles.moveOrderLight]}>
        {isWhite ? 'Moves first' : 'Moves second'}
      </Text>
      {selected && (
        <View style={[colorStyles.checkBadge, isWhite ? colorStyles.checkBadgeDark : colorStyles.checkBadgeLight]}>
          <Text style={[colorStyles.checkText, isWhite ? colorStyles.checkTextLight : colorStyles.checkTextDark]}>✓</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

function DifficultyCard({
  option,
  selected,
  onPress,
}: {
  option: DifficultyOption;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[diffStyles.card, selected && diffStyles.cardSelected]}
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityLabel={`Difficulty: ${option.label}`}
      accessibilityState={{ selected }}
    >
      {/* Colored top accent */}
      <View style={[diffStyles.accentBar, { backgroundColor: option.color }]} />

      <Text style={diffStyles.emoji}>{option.emoji}</Text>
      <Text style={[diffStyles.label, selected && diffStyles.labelSelected]}>{option.label}</Text>
      <Text style={diffStyles.description}>{option.description}</Text>

      {/* Level indicator dots */}
      <View style={diffStyles.levelDots}>
        {Array.from({ length: 5 }).map((_, i) => (
          <View
            key={i}
            style={[
              diffStyles.dot,
              { backgroundColor: i < DIFFICULTY_OPTIONS.indexOf(option) + 1 ? option.color : colors.borderLight },
            ]}
          />
        ))}
      </View>
    </TouchableOpacity>
  );
}

// ---------------------------------------------------------------------------
// Main Screen
// ---------------------------------------------------------------------------

interface PlaySetupScreenProps {
  onStartGame?: (color: PieceColor, difficulty: Difficulty) => void;
  onBack?: () => void;
}

export default function PlaySetupScreen({ onStartGame, onBack }: PlaySetupScreenProps) {
  const [selectedColor, setSelectedColor] = useState<PieceColor>('white');
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty>('beginner');

  const difficultyOption = DIFFICULTY_OPTIONS.find((d) => d.id === selectedDifficulty)!;

  const handleStart = () => {
    onStartGame?.(selectedColor, selectedDifficulty);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.soft} />

      {/* ── Top Bar ──────────────────────────────────────── */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={onBack}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel="Go back"
        >
          <Text style={styles.backArrow}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.heading}>Play vs Computer</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Color Picker ─────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Choose your color</Text>
          <View style={styles.colorRow}>
            <ColorOption
              value="white"
              selected={selectedColor === 'white'}
              onPress={() => setSelectedColor('white')}
            />
            <ColorOption
              value="black"
              selected={selectedColor === 'black'}
              onPress={() => setSelectedColor('black')}
            />
          </View>
        </View>

        {/* ── Difficulty Grid ───────────────────────────────── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionLabel}>Choose difficulty</Text>
            <View style={[styles.difficultyBadge, { backgroundColor: difficultyOption.color + '22' }]}>
              <Text style={[styles.difficultyBadgeText, { color: difficultyOption.color }]}>
                {difficultyOption.emoji} {difficultyOption.label}
              </Text>
            </View>
          </View>

          {/* 3 + 2 grid layout */}
          <View style={styles.difficultyGrid}>
            <View style={styles.difficultyRow}>
              {DIFFICULTY_OPTIONS.slice(0, 3).map((opt) => (
                <DifficultyCard
                  key={opt.id}
                  option={opt}
                  selected={selectedDifficulty === opt.id}
                  onPress={() => setSelectedDifficulty(opt.id)}
                />
              ))}
            </View>
            <View style={[styles.difficultyRow, styles.difficultyRowCentered]}>
              {DIFFICULTY_OPTIONS.slice(3).map((opt) => (
                <DifficultyCard
                  key={opt.id}
                  option={opt}
                  selected={selectedDifficulty === opt.id}
                  onPress={() => setSelectedDifficulty(opt.id)}
                />
              ))}
            </View>
          </View>
        </View>

        {/* ── Summary Card ─────────────────────────────────── */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Playing as</Text>
              <Text style={styles.summaryValue}>
                {selectedColor === 'white' ? '♔ White' : '♚ Black'}
              </Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Difficulty</Text>
              <Text style={styles.summaryValue}>
                {difficultyOption.emoji} {difficultyOption.label}
              </Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Engine</Text>
              <Text style={styles.summaryValue}>Lv {difficultyOption.stockfishLevel}</Text>
            </View>
          </View>
        </View>

        {/* Bottom spacer */}
        <View style={{ height: spacing[4] }} />
      </ScrollView>

      {/* ── Let's Go CTA ─────────────────────────────────── */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.startButton}
          onPress={handleStart}
          activeOpacity={0.8}
          accessibilityLabel="Start game"
          accessibilityRole="button"
        >
          <Text style={styles.startButtonText}>Let's Go! ♟</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Color option styles
// ---------------------------------------------------------------------------

const colorStyles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: radius['2xl'],
    borderWidth: 2,
    padding: spacing[6],
    alignItems: 'center',
    gap: spacing[2],
    ...shadows.sm,
  },

  cardWhite: {
    backgroundColor: '#FAFAFA',
    borderColor: colors.borderLight,
  },

  cardBlack: {
    backgroundColor: '#2A2A2A',
    borderColor: '#444',
  },

  cardSelected: {
    ...shadows.md,
  },

  cardWhiteSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryFaint,
  },

  cardBlackSelected: {
    borderColor: colors.primary,
  },

  pieceEmoji: {
    fontSize: 40,
  },

  label: {
    fontSize: fontSize.lg,
    fontFamily: fontFamily.bold,
    fontWeight: fontWeight.bold,
    color: colors.dark,
  },

  labelLight: {
    color: colors.light,
  },

  moveOrder: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.regular,
    color: colors.gray,
  },

  moveOrderLight: {
    color: colors.white60,
  },

  checkBadge: {
    position: 'absolute',
    top: spacing[2],
    right: spacing[2],
    width: 24,
    height: 24,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },

  checkBadgeDark: {
    backgroundColor: colors.dark,
  },

  checkBadgeLight: {
    backgroundColor: colors.light,
  },

  checkText: {
    fontSize: 12,
    fontFamily: fontFamily.bold,
    fontWeight: fontWeight.bold,
  },

  checkTextLight: {
    color: colors.primary,
  },

  checkTextDark: {
    color: colors.primary,
  },
});

// ---------------------------------------------------------------------------
// Difficulty card styles
// ---------------------------------------------------------------------------

const diffStyles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.light,
    borderRadius: radius['2xl'],
    borderWidth: 2,
    borderColor: colors.borderLight,
    padding: spacing[3],
    alignItems: 'center',
    gap: spacing[1],
    overflow: 'hidden',
    ...shadows.sm,
  },

  cardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryFaint,
    ...shadows.md,
  },

  accentBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    borderTopLeftRadius: radius['2xl'],
    borderTopRightRadius: radius['2xl'],
  },

  emoji: {
    fontSize: 24,
    marginTop: spacing[3],
  },

  label: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.bold,
    fontWeight: fontWeight.bold,
    color: colors.dark,
  },

  labelSelected: {
    color: colors.primary,
  },

  description: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.regular,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: getLineHeight(fontSize.xs),
  },

  levelDots: {
    flexDirection: 'row',
    gap: 3,
    marginTop: spacing[1],
  },

  dot: {
    width: 6,
    height: 6,
    borderRadius: radius.full,
  },
});

// ---------------------------------------------------------------------------
// Screen Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.soft,
  },

  // ── Top Bar ─────────────────────────────────────────

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: layout.screenPaddingH,
    paddingVertical: spacing[4],
  },

  backButton: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: colors.light,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },

  backArrow: {
    fontSize: fontSize['2xl'],
    color: colors.dark,
    marginTop: -2,
  },

  heading: {
    fontSize: fontSize['2xl'],
    fontFamily: fontFamily.bold,
    fontWeight: fontWeight.bold,
    color: colors.dark,
  },

  // ── Scroll ────────────────────────────────────────────

  scroll: {
    flex: 1,
  },

  scrollContent: {
    paddingHorizontal: layout.screenPaddingH,
    paddingBottom: spacing[4],
    gap: layout.sectionSpacing,
  },

  // ── Sections ─────────────────────────────────────────

  section: {
    gap: spacing[4],
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  sectionLabel: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.bold,
    fontWeight: fontWeight.bold,
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },

  difficultyBadge: {
    paddingVertical: spacing[1],
    paddingHorizontal: spacing[3],
    borderRadius: radius.full,
  },

  difficultyBadgeText: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.bold,
    fontWeight: fontWeight.bold,
  },

  // ── Color row ─────────────────────────────────────────

  colorRow: {
    flexDirection: 'row',
    gap: spacing[4],
  },

  // ── Difficulty grid ───────────────────────────────────

  difficultyGrid: {
    gap: spacing[3],
  },

  difficultyRow: {
    flexDirection: 'row',
    gap: spacing[3],
  },

  difficultyRowCentered: {
    justifyContent: 'center',
  },

  // ── Summary ───────────────────────────────────────────

  summaryCard: {
    ...cardStyle,
  },

  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  summaryItem: {
    flex: 1,
    alignItems: 'center',
    gap: spacing[1],
  },

  summaryDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.borderLight,
  },

  summaryLabel: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.bold,
    fontWeight: fontWeight.bold,
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },

  summaryValue: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.bold,
    fontWeight: fontWeight.bold,
    color: colors.dark,
  },

  // ── Footer ────────────────────────────────────────────

  footer: {
    paddingHorizontal: layout.screenPaddingH,
    paddingVertical: spacing[4],
    paddingBottom: spacing[6],
    backgroundColor: colors.soft,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },

  startButton: {
    ...btnGreenStyle,
    height: 56,
  },

  startButtonText: {
    ...btnGreenTextStyle,
  },
});
