/**
 * PuzzlesScreen.tsx
 * D3 — Puzzles
 *
 * YSTEM Mobile App — Y STEM and Chess
 * Designed by Sandith Hewage (UI/UX Engineer)
 *
 * Features:
 * - Full-width chess board (aspectRatio: 1)
 * - Puzzle info panel below: rating, themes, hint toggle
 * - Streak badge + puzzle number
 * - Hint reveal button (secondary)
 * - New Puzzle green CTA
 * - Result states: solving / correct / incorrect
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
  chess,
  getLineHeight,
} from '../design-tokens.rn';

// ---------------------------------------------------------------------------
// Types + Data
// ---------------------------------------------------------------------------

type PuzzleState = 'solving' | 'correct' | 'incorrect';

interface Puzzle {
  id: string;
  number: number;
  rating: number;
  themes: string[];
  hint: string;
  colorToMove: 'White' | 'Black';
  description: string;
}

const SAMPLE_PUZZLE: Puzzle = {
  id: 'pz001',
  number: 4821,
  rating: 1287,
  themes: ['Fork', 'Knight', 'Intermediate'],
  hint: 'Look for a Knight move that attacks two pieces at once.',
  colorToMove: 'White',
  description: 'White to move. Find the move that wins material.',
};

// ---------------------------------------------------------------------------
// Chess Board Display (same base as LessonScreen)
// ---------------------------------------------------------------------------

function PuzzleBoard({ state }: { state: PuzzleState }) {
  const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  const ranks = [8, 7, 6, 5, 4, 3, 2, 1];

  // Overlay tint based on result
  const overlayColor =
    state === 'correct' ? 'rgba(127,204,38,0.15)' :
    state === 'incorrect' ? 'rgba(214,69,69,0.15)' :
    'transparent';

  return (
    <View style={boardStyles.wrapper}>
      <View style={boardStyles.board}>
        {ranks.map((rank) => (
          <View key={rank} style={boardStyles.rank}>
            {files.map((file, fileIdx) => {
              const isLight = (fileIdx + rank) % 2 === 0;
              return (
                <View
                  key={`${file}${rank}`}
                  style={[boardStyles.square, isLight ? boardStyles.squareLight : boardStyles.squareDark]}
                />
              );
            })}
          </View>
        ))}
        {/* Result overlay */}
        {state !== 'solving' && (
          <View style={[boardStyles.resultOverlay, { backgroundColor: overlayColor }]}>
            <Text style={boardStyles.resultEmoji}>
              {state === 'correct' ? '✓' : '✗'}
            </Text>
          </View>
        )}
      </View>

      {/* Color-to-move indicator */}
      <View style={boardStyles.turnIndicator}>
        <View style={[boardStyles.turnDot, { backgroundColor: colors.light }]} />
        <Text style={boardStyles.turnText}>White to move</Text>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Main Screen
// ---------------------------------------------------------------------------

interface PuzzlesScreenProps {
  puzzle?: Puzzle;
  streak?: number;
  onNewPuzzle?: () => void;
  onHint?: () => void;
}

export default function PuzzlesScreen({
  puzzle = SAMPLE_PUZZLE,
  streak = 5,
  onNewPuzzle,
  onHint,
}: PuzzlesScreenProps) {
  const [puzzleState, setPuzzleState] = useState<PuzzleState>('solving');
  const [hintShown, setHintShown] = useState(false);
  const [hintUsed, setHintUsed] = useState(false);

  const handleShowHint = () => {
    setHintShown(true);
    setHintUsed(true);
    onHint?.();
  };

  const handleNewPuzzle = () => {
    setPuzzleState('solving');
    setHintShown(false);
    setHintUsed(false);
    onNewPuzzle?.();
  };

  // Simulate result (wire to actual chess logic)
  const simulateCorrect = () => setPuzzleState('correct');
  const simulateIncorrect = () => setPuzzleState('incorrect');

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.soft} />

      {/* ── Top Bar ──────────────────────────────────────── */}
      <View style={styles.topBar}>
        <View style={styles.puzzleId}>
          <Text style={styles.puzzleIdLabel}>Puzzle</Text>
          <Text style={styles.puzzleIdValue}>#{puzzle.number}</Text>
        </View>

        <Text style={styles.heading}>Puzzles</Text>

        {/* Streak */}
        <View style={styles.streakBadge}>
          <Text style={styles.streakEmoji}>🔥</Text>
          <Text style={styles.streakCount}>{streak}</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Board ────────────────────────────────────────── */}
        <PuzzleBoard state={puzzleState} />

        {/* ── Result Banner ─────────────────────────────────── */}
        {puzzleState !== 'solving' && (
          <View style={[
            styles.resultBanner,
            puzzleState === 'correct' ? styles.resultBannerCorrect : styles.resultBannerIncorrect,
          ]}>
            <Text style={styles.resultBannerEmoji}>
              {puzzleState === 'correct' ? '🎉' : '😕'}
            </Text>
            <Text style={styles.resultBannerText}>
              {puzzleState === 'correct'
                ? `Brilliant!${hintUsed ? '' : ' +10 bonus (no hint)'}`
                : 'Not quite — try the next one!'}
            </Text>
          </View>
        )}

        {/* ── Puzzle Info Panel ─────────────────────────────── */}
        <View style={styles.infoCard}>
          {/* Header row */}
          <View style={styles.infoHeader}>
            <View style={styles.ratingBox}>
              <Text style={styles.ratingLabel}>Rating</Text>
              <Text style={styles.ratingValue}>{puzzle.rating}</Text>
            </View>
            <View style={styles.descBox}>
              <Text style={styles.descText}>{puzzle.description}</Text>
            </View>
          </View>

          {/* Themes */}
          <View style={styles.themesRow}>
            {puzzle.themes.map((theme) => (
              <View key={theme} style={styles.themeBadge}>
                <Text style={styles.themeText}>{theme}</Text>
              </View>
            ))}
          </View>

          {/* Hint toggle */}
          {!hintShown ? (
            <TouchableOpacity
              style={styles.hintButton}
              onPress={handleShowHint}
              activeOpacity={0.8}
              accessibilityLabel="Show hint"
            >
              <Text style={styles.hintButtonEmoji}>💡</Text>
              <Text style={styles.hintButtonText}>Show Hint</Text>
              <Text style={styles.hintButtonNote}>(−5 pts)</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.hintBox}>
              <Text style={styles.hintBoxLabel}>💡 Hint</Text>
              <Text style={styles.hintBoxText}>{puzzle.hint}</Text>
            </View>
          )}
        </View>

        {/* Dev simulate buttons — remove in production */}
        {puzzleState === 'solving' && (
          <View style={styles.devRow}>
            <TouchableOpacity style={styles.devBtn} onPress={simulateCorrect}>
              <Text style={styles.devBtnText}>✓ Correct</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.devBtn, styles.devBtnRed]} onPress={simulateIncorrect}>
              <Text style={styles.devBtnText}>✗ Wrong</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Bottom spacer */}
        <View style={{ height: spacing[4] }} />
      </ScrollView>

      {/* ── New Puzzle CTA ────────────────────────────────── */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.newPuzzleButton}
          onPress={handleNewPuzzle}
          activeOpacity={0.8}
          accessibilityLabel="Load new puzzle"
          accessibilityRole="button"
        >
          <Text style={styles.newPuzzleButtonText}>New Puzzle ›</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Board Styles
// ---------------------------------------------------------------------------

const boardStyles = StyleSheet.create({
  wrapper: {
    gap: spacing[2],
  },

  board: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: radius.lg,
    overflow: 'hidden',
    ...shadows.md,
  },

  rank: {
    flex: 1,
    flexDirection: 'row',
  },

  square: {
    flex: 1,
  },

  squareLight: {
    backgroundColor: '#F0D9B5',
  },

  squareDark: {
    backgroundColor: '#B58863',
  },

  resultOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },

  resultEmoji: {
    fontSize: 80,
    opacity: 0.7,
  },

  turnIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: spacing[2],
  },

  turnDot: {
    width: 12,
    height: 12,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },

  turnText: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.bold,
    fontWeight: fontWeight.bold,
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 1,
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

  puzzleId: {
    alignItems: 'flex-start',
  },

  puzzleIdLabel: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.bold,
    fontWeight: fontWeight.bold,
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  puzzleIdValue: {
    fontSize: fontSize.lg,
    fontFamily: fontFamily.bold,
    fontWeight: fontWeight.bold,
    color: colors.dark,
  },

  heading: {
    fontSize: fontSize['2xl'],
    fontFamily: fontFamily.bold,
    fontWeight: fontWeight.bold,
    color: colors.dark,
  },

  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    backgroundColor: colors.accentFaint,
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.accent,
  },

  streakEmoji: {
    fontSize: 16,
  },

  streakCount: {
    fontSize: fontSize.base,
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
    gap: spacing[4],
  },

  // ── Result Banner ────────────────────────────────────

  resultBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    borderRadius: radius.xl,
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[5],
    ...shadows.sm,
  },

  resultBannerCorrect: {
    backgroundColor: colors.primaryFaint,
    borderWidth: 1,
    borderColor: colors.primary,
  },

  resultBannerIncorrect: {
    backgroundColor: colors.redLight,
    borderWidth: 1,
    borderColor: colors.red,
  },

  resultBannerEmoji: {
    fontSize: 24,
  },

  resultBannerText: {
    flex: 1,
    fontSize: fontSize.base,
    fontFamily: fontFamily.bold,
    fontWeight: fontWeight.bold,
    color: colors.dark,
  },

  // ── Info Card ─────────────────────────────────────────

  infoCard: {
    ...cardStyle,
    gap: spacing[4],
  },

  infoHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[4],
  },

  ratingBox: {
    backgroundColor: colors.soft,
    borderRadius: radius.lg,
    padding: spacing[4],
    alignItems: 'center',
    minWidth: 64,
    gap: spacing[1],
  },

  ratingLabel: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.bold,
    fontWeight: fontWeight.bold,
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },

  ratingValue: {
    fontSize: fontSize['2xl'],
    fontFamily: fontFamily.bold,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },

  descBox: {
    flex: 1,
    justifyContent: 'center',
  },

  descText: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.regular,
    color: colors.dark,
    lineHeight: getLineHeight(fontSize.base),
  },

  // ── Themes ───────────────────────────────────────────

  themesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },

  themeBadge: {
    backgroundColor: colors.primaryFaint,
    paddingVertical: spacing[1],
    paddingHorizontal: spacing[3],
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.primary + '40',
  },

  themeText: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.bold,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },

  // ── Hint ─────────────────────────────────────────────

  hintButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
    backgroundColor: colors.accentFaint,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.accent,
    alignSelf: 'flex-start',
  },

  hintButtonEmoji: {
    fontSize: 16,
  },

  hintButtonText: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.bold,
    fontWeight: fontWeight.bold,
    color: colors.dark,
  },

  hintButtonNote: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.regular,
    color: colors.muted,
  },

  hintBox: {
    backgroundColor: colors.accentFaint,
    borderRadius: radius.lg,
    borderLeftWidth: 3,
    borderLeftColor: colors.accent,
    padding: spacing[4],
    gap: spacing[2],
  },

  hintBoxLabel: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.bold,
    fontWeight: fontWeight.bold,
    color: colors.dark,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  hintBoxText: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    color: colors.dark,
    lineHeight: getLineHeight(fontSize.sm),
  },

  // ── Dev simulate row ──────────────────────────────────

  devRow: {
    flexDirection: 'row',
    gap: spacing[3],
    opacity: 0.6,
  },

  devBtn: {
    flex: 1,
    paddingVertical: spacing[3],
    backgroundColor: colors.primaryFaint,
    borderRadius: radius.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.primary,
  },

  devBtnRed: {
    backgroundColor: colors.redLight,
    borderColor: colors.red,
  },

  devBtnText: {
    fontSize: fontSize.sm,
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

  newPuzzleButton: {
    ...btnGreenStyle,
    height: 56,
  },

  newPuzzleButtonText: {
    ...btnGreenTextStyle,
  },
});
