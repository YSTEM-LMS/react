/**
 * LessonScreen.tsx
 * D2 — Lessons
 *
 * YSTEM Mobile App — Y STEM and Chess
 * Designed by Sandith Hewage (UI/UX Engineer)
 *
 * Features:
 * - Full-width chess board (aspectRatio: 1 enforced)
 * - Chess piece diagram overlay (current piece highlight)
 * - Instruction panel with step text + step counter
 * - Back / Next navigation controls
 * - Completion state with "Lesson Complete" banner
 * - Progress bar at top
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
  btnPrimaryStyle,
  btnPrimaryTextStyle,
  cardStyle,
  layout,
  chess,
  getLineHeight,
} from '../design-tokens.rn';

// ---------------------------------------------------------------------------
// Types + Data
// ---------------------------------------------------------------------------

interface LessonStep {
  id: string;
  instruction: string;
  highlight?: string; // Square to highlight e.g. 'e4'
  tip?: string;
}

interface LessonScreenProps {
  title?: string;
  pieceName?: string;
  pieceEmoji?: string;
  steps?: LessonStep[];
  onBack?: () => void;
  onComplete?: () => void;
  onNextLesson?: () => void;
}

const DEFAULT_STEPS: LessonStep[] = [
  {
    id: '1',
    instruction: 'The Knight is the only piece that can jump over other pieces. It moves in an "L" shape: two squares in one direction, then one square perpendicular.',
    highlight: 'g1',
    tip: 'Remember: Knights always land on a different color square than they started on!',
  },
  {
    id: '2',
    instruction: 'From e4, the Knight can jump to f6, g5, g3, f2, d2, c3, c5, or d6. That\'s up to 8 squares from the center!',
    highlight: 'e4',
    tip: 'Center Knights are more powerful — they control more squares.',
  },
  {
    id: '3',
    instruction: 'At the edge of the board, the Knight loses many options. A Knight on a1 can only reach b3 or c2 — just 2 squares!',
    highlight: 'a1',
    tip: 'Chess pros say: "A Knight on the rim is dim."',
  },
  {
    id: '4',
    instruction: 'Knights are excellent at creating "forks" — attacking two pieces at once. Because of their L-shape, opponents often miss the threat!',
    tip: 'Look for Knight forks against the King and Rook — a "royal fork".',
  },
];

// ---------------------------------------------------------------------------
// Chess Board (simplified representation)
// ---------------------------------------------------------------------------

function ChessBoardDisplay({ highlight }: { highlight?: string }) {
  const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  const ranks = [8, 7, 6, 5, 4, 3, 2, 1];

  return (
    <View style={boardStyles.board}>
      {ranks.map((rank) => (
        <View key={rank} style={boardStyles.rank}>
          {files.map((file, fileIdx) => {
            const isLight = (fileIdx + rank) % 2 === 0;
            const squareName = `${file}${rank}`;
            const isHighlighted = highlight === squareName;

            // Show knight on e4 or g1 depending on step
            const isKnightSquare = squareName === (highlight || 'g1');

            return (
              <View
                key={squareName}
                style={[
                  boardStyles.square,
                  isLight ? boardStyles.squareLight : boardStyles.squareDark,
                  isHighlighted && boardStyles.squareHighlighted,
                ]}
              >
                {isKnightSquare && (
                  <Text style={boardStyles.piece}>♞</Text>
                )}
              </View>
            );
          })}
        </View>
      ))}

      {/* File labels */}
      <View style={boardStyles.fileLabels}>
        {files.map((f) => (
          <Text key={f} style={boardStyles.fileLabel}>{f}</Text>
        ))}
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Main Screen
// ---------------------------------------------------------------------------

export default function LessonScreen({
  title = 'The L-Shape Move',
  pieceName = 'Knight',
  pieceEmoji = '♞',
  steps = DEFAULT_STEPS,
  onBack,
  onComplete,
  onNextLesson,
}: LessonScreenProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [completed, setCompleted] = useState(false);

  const step = steps[currentStep];
  const isFirst = currentStep === 0;
  const isLast = currentStep === steps.length - 1;
  const progress = (currentStep + 1) / steps.length;

  const handleNext = () => {
    if (isLast) {
      setCompleted(true);
      onComplete?.();
    } else {
      setCurrentStep((s) => s + 1);
    }
  };

  const handleBack = () => {
    if (isFirst) {
      onBack?.();
    } else {
      setCurrentStep((s) => s - 1);
    }
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

        <View style={styles.topCenter}>
          <Text style={styles.topTitle}>{pieceName} Lesson</Text>
          <Text style={styles.topSubtitle}>{title}</Text>
        </View>

        <View style={styles.stepCounter}>
          <Text style={styles.stepCounterText}>
            {currentStep + 1}/{steps.length}
          </Text>
        </View>
      </View>

      {/* ── Progress Bar ─────────────────────────────────── */}
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progress * 100}%` as any }]} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Chess Board ──────────────────────────────────── */}
        <View style={styles.boardContainer}>
          <ChessBoardDisplay highlight={step.highlight} />
        </View>

        {/* ── Instruction Panel ─────────────────────────────── */}
        {!completed ? (
          <View style={styles.instructionPanel}>
            {/* Piece badge */}
            <View style={styles.pieceBadge}>
              <Text style={styles.pieceBadgeEmoji}>{pieceEmoji}</Text>
              <Text style={styles.pieceBadgeName}>{pieceName}</Text>
            </View>

            {/* Instruction text */}
            <Text style={styles.instructionText}>{step.instruction}</Text>

            {/* Tip */}
            {step.tip && (
              <View style={styles.tipBox}>
                <Text style={styles.tipLabel}>💡 Tip</Text>
                <Text style={styles.tipText}>{step.tip}</Text>
              </View>
            )}
          </View>
        ) : (
          // ── Completion State ────────────────────────────────
          <View style={styles.completionPanel}>
            <Text style={styles.completionEmoji}>🏆</Text>
            <Text style={styles.completionTitle}>Lesson Complete!</Text>
            <Text style={styles.completionBody}>
              You've mastered the basics of the {pieceName}. Keep it up!
            </Text>
            <View style={styles.completionBadge}>
              <Text style={styles.completionBadgeText}>+50 XP</Text>
            </View>
          </View>
        )}

      </ScrollView>

      {/* ── Navigation Controls ───────────────────────────── */}
      <View style={styles.controlsFooter}>
        {!completed ? (
          <>
            <TouchableOpacity
              style={[styles.navButton, styles.navButtonBack]}
              onPress={handleBack}
              activeOpacity={0.8}
              accessibilityLabel={isFirst ? 'Exit lesson' : 'Previous step'}
            >
              <Text style={styles.navButtonBackText}>{isFirst ? 'Exit' : '‹ Back'}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.navButtonNext}
              onPress={handleNext}
              activeOpacity={0.8}
              accessibilityLabel={isLast ? 'Complete lesson' : 'Next step'}
            >
              <Text style={styles.navButtonNextText}>
                {isLast ? 'Finish ✓' : 'Next ›'}
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity
            style={styles.nextLessonButton}
            onPress={onNextLesson}
            activeOpacity={0.8}
            accessibilityLabel="Start next lesson"
            accessibilityRole="button"
          >
            <Text style={styles.nextLessonButtonText}>Next Lesson →</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Board Styles
// ---------------------------------------------------------------------------

const boardStyles = StyleSheet.create({
  board: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: chess.boardBg,
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
    alignItems: 'center',
    justifyContent: 'center',
  },

  squareLight: {
    backgroundColor: '#F0D9B5', // Classic light wood
  },

  squareDark: {
    backgroundColor: '#B58863', // Classic dark wood
  },

  squareHighlighted: {
    backgroundColor: chess.highlightSquare,
  },

  piece: {
    fontSize: 22,
  },

  fileLabels: {
    position: 'absolute',
    bottom: 2,
    left: 0,
    right: 0,
    flexDirection: 'row',
  },

  fileLabel: {
    flex: 1,
    fontSize: 8,
    fontFamily: fontFamily.bold,
    fontWeight: fontWeight.bold,
    color: colors.muted,
    textAlign: 'center',
    opacity: 0.6,
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
    paddingHorizontal: layout.screenPaddingH,
    paddingVertical: spacing[4],
    gap: spacing[3],
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

  topCenter: {
    flex: 1,
    alignItems: 'center',
  },

  topTitle: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.bold,
    fontWeight: fontWeight.bold,
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },

  topSubtitle: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.bold,
    fontWeight: fontWeight.bold,
    color: colors.dark,
  },

  stepCounter: {
    backgroundColor: colors.dark,
    paddingVertical: spacing[1],
    paddingHorizontal: spacing[3],
    borderRadius: radius.full,
  },

  stepCounterText: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.bold,
    fontWeight: fontWeight.bold,
    color: colors.light,
  },

  // ── Progress ──────────────────────────────────────────

  progressTrack: {
    height: 4,
    backgroundColor: colors.borderLight,
    marginHorizontal: layout.screenPaddingH,
    borderRadius: radius.full,
    overflow: 'hidden',
    marginBottom: spacing[4],
  },

  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: radius.full,
  },

  // ── Scroll ────────────────────────────────────────────

  scroll: {
    flex: 1,
  },

  scrollContent: {
    paddingHorizontal: layout.screenPaddingH,
    paddingBottom: spacing[4],
    gap: spacing[6],
  },

  boardContainer: {
    width: '100%',
  },

  // ── Instruction Panel ────────────────────────────────

  instructionPanel: {
    ...cardStyle,
    gap: spacing[4],
  },

  pieceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },

  pieceBadgeEmoji: {
    fontSize: 24,
  },

  pieceBadgeName: {
    fontSize: fontSize.lg,
    fontFamily: fontFamily.bold,
    fontWeight: fontWeight.bold,
    color: colors.dark,
  },

  instructionText: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.regular,
    color: colors.dark,
    lineHeight: getLineHeight(fontSize.base),
  },

  tipBox: {
    backgroundColor: colors.accentFaint,
    borderRadius: radius.lg,
    borderLeftWidth: 3,
    borderLeftColor: colors.accent,
    padding: spacing[4],
    gap: spacing[2],
  },

  tipLabel: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.bold,
    fontWeight: fontWeight.bold,
    color: colors.dark,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },

  tipText: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    color: colors.dark,
    lineHeight: getLineHeight(fontSize.sm),
  },

  // ── Completion Panel ──────────────────────────────────

  completionPanel: {
    ...cardStyle,
    alignItems: 'center',
    paddingVertical: spacing[10],
    gap: spacing[4],
  },

  completionEmoji: {
    fontSize: 64,
  },

  completionTitle: {
    fontSize: fontSize['2xl'],
    fontFamily: fontFamily.bold,
    fontWeight: fontWeight.bold,
    color: colors.dark,
  },

  completionBody: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.regular,
    color: colors.gray,
    textAlign: 'center',
    lineHeight: getLineHeight(fontSize.base),
  },

  completionBadge: {
    backgroundColor: colors.accent,
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[6],
    borderRadius: radius.full,
  },

  completionBadgeText: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.bold,
    fontWeight: fontWeight.bold,
    color: colors.dark,
  },

  // ── Footer Controls ───────────────────────────────────

  controlsFooter: {
    flexDirection: 'row',
    gap: spacing[3],
    paddingHorizontal: layout.screenPaddingH,
    paddingVertical: spacing[4],
    paddingBottom: spacing[6],
    backgroundColor: colors.soft,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },

  navButton: {
    flex: 1,
    height: 52,
    borderRadius: radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },

  navButtonBack: {
    backgroundColor: colors.light,
    borderWidth: 2,
    borderColor: colors.borderLight,
  },

  navButtonBackText: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.bold,
    fontWeight: fontWeight.bold,
    color: colors.dark,
  },

  navButtonNext: {
    flex: 2,
    ...btnGreenStyle,
    height: 52,
  },

  navButtonNextText: {
    ...btnGreenTextStyle,
  },

  nextLessonButton: {
    flex: 1,
    ...btnPrimaryStyle,
    height: 52,
  },

  nextLessonButtonText: {
    ...btnPrimaryTextStyle,
  },
});
