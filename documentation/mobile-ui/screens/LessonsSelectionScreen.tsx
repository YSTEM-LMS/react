/**
 * LessonsSelectionScreen.tsx
 * D2 — Lessons
 *
 * YSTEM Mobile App — Y STEM and Chess
 * Designed by Sandith Hewage (UI/UX Engineer)
 *
 * Features:
 * - Section header with progress indicator
 * - Horizontal scroll of chess piece cards (King, Queen, Rook, Bishop, Knight, Pawn)
 * - Lesson list for the selected piece — locked/unlocked states
 * - Start Lesson green CTA that activates when a lesson is selected
 * - Safe area + scroll layout
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  FlatList,
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

type PieceId = 'king' | 'queen' | 'rook' | 'bishop' | 'knight' | 'pawn';

interface ChessPiece {
  id: PieceId;
  name: string;
  emoji: string;
  color: string;
  lessonsCount: number;
  completedCount: number;
}

interface Lesson {
  id: string;
  title: string;
  duration: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  completed: boolean;
  locked: boolean;
}

const CHESS_PIECES: ChessPiece[] = [
  { id: 'king',   name: 'King',   emoji: '♔', color: colors.accent,   lessonsCount: 3, completedCount: 3 },
  { id: 'queen',  name: 'Queen',  emoji: '♕', color: colors.primary,  lessonsCount: 4, completedCount: 2 },
  { id: 'rook',   name: 'Rook',   emoji: '♖', color: colors.secondary, lessonsCount: 3, completedCount: 0 },
  { id: 'bishop', name: 'Bishop', emoji: '♗', color: colors.primaryMid, lessonsCount: 3, completedCount: 0 },
  { id: 'knight', name: 'Knight', emoji: '♘', color: colors.accentFaint, lessonsCount: 4, completedCount: 0 },
  { id: 'pawn',   name: 'Pawn',   emoji: '♙', color: colors.soft,     lessonsCount: 5, completedCount: 0 },
];

const LESSONS_BY_PIECE: Record<PieceId, Lesson[]> = {
  king: [
    { id: 'k1', title: 'The Most Important Piece', duration: '5 min', difficulty: 'Beginner', completed: true, locked: false },
    { id: 'k2', title: 'King Safety & Castling', duration: '8 min', difficulty: 'Beginner', completed: true, locked: false },
    { id: 'k3', title: 'King in the Endgame', duration: '10 min', difficulty: 'Intermediate', completed: true, locked: false },
  ],
  queen: [
    { id: 'q1', title: 'How the Queen Moves', duration: '5 min', difficulty: 'Beginner', completed: true, locked: false },
    { id: 'q2', title: 'Queen Development', duration: '7 min', difficulty: 'Beginner', completed: true, locked: false },
    { id: 'q3', title: 'Queen vs Minor Pieces', duration: '10 min', difficulty: 'Intermediate', completed: false, locked: false },
    { id: 'q4', title: 'Queen Tactics & Forks', duration: '12 min', difficulty: 'Intermediate', completed: false, locked: true },
  ],
  rook: [
    { id: 'r1', title: 'How the Rook Moves', duration: '5 min', difficulty: 'Beginner', completed: false, locked: false },
    { id: 'r2', title: 'Open Files & Rooks', duration: '8 min', difficulty: 'Beginner', completed: false, locked: true },
    { id: 'r3', title: 'Rook Endgames', duration: '12 min', difficulty: 'Advanced', completed: false, locked: true },
  ],
  bishop: [
    { id: 'b1', title: 'How the Bishop Moves', duration: '5 min', difficulty: 'Beginner', completed: false, locked: false },
    { id: 'b2', title: 'Good and Bad Bishops', duration: '8 min', difficulty: 'Intermediate', completed: false, locked: true },
    { id: 'b3', title: 'Bishop Pairs', duration: '10 min', difficulty: 'Intermediate', completed: false, locked: true },
  ],
  knight: [
    { id: 'n1', title: 'The L-Shape Move', duration: '6 min', difficulty: 'Beginner', completed: false, locked: false },
    { id: 'n2', title: 'Knight Outposts', duration: '9 min', difficulty: 'Intermediate', completed: false, locked: true },
    { id: 'n3', title: 'Knight Forks', duration: '10 min', difficulty: 'Intermediate', completed: false, locked: true },
    { id: 'n4', title: 'Knight vs Bishop', duration: '12 min', difficulty: 'Advanced', completed: false, locked: true },
  ],
  pawn: [
    { id: 'p1', title: 'How Pawns Move', duration: '5 min', difficulty: 'Beginner', completed: false, locked: false },
    { id: 'p2', title: 'Pawn Captures & En Passant', duration: '8 min', difficulty: 'Beginner', completed: false, locked: true },
    { id: 'p3', title: 'Pawn Promotion', duration: '7 min', difficulty: 'Beginner', completed: false, locked: true },
    { id: 'p4', title: 'Pawn Structures', duration: '12 min', difficulty: 'Intermediate', completed: false, locked: true },
    { id: 'p5', title: 'Passed Pawns', duration: '10 min', difficulty: 'Advanced', completed: false, locked: true },
  ],
};

const DIFFICULTY_COLOR: Record<Lesson['difficulty'], string> = {
  Beginner:     colors.primary,
  Intermediate: colors.accent,
  Advanced:     colors.red,
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function PieceCard({
  piece,
  selected,
  onPress,
}: {
  piece: ChessPiece;
  selected: boolean;
  onPress: () => void;
}) {
  const progress = piece.lessonsCount > 0
    ? piece.completedCount / piece.lessonsCount
    : 0;

  return (
    <TouchableOpacity
      style={[pieceCardStyles.card, selected && pieceCardStyles.cardSelected]}
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityLabel={`Select ${piece.name} lessons`}
      accessibilityState={{ selected }}
    >
      <View style={[pieceCardStyles.emojiCircle, { backgroundColor: piece.color || colors.soft }]}>
        <Text style={pieceCardStyles.emoji}>{piece.emoji}</Text>
      </View>
      <Text style={[pieceCardStyles.name, selected && pieceCardStyles.nameSelected]}>
        {piece.name}
      </Text>
      {/* Progress bar */}
      <View style={pieceCardStyles.progressBar}>
        <View style={[pieceCardStyles.progressFill, { width: `${progress * 100}%` as any }]} />
      </View>
      <Text style={pieceCardStyles.progressLabel}>
        {piece.completedCount}/{piece.lessonsCount}
      </Text>
    </TouchableOpacity>
  );
}

function LessonRow({
  lesson,
  selected,
  onPress,
}: {
  lesson: Lesson;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[lessonRowStyles.row, selected && lessonRowStyles.rowSelected, lesson.locked && lessonRowStyles.rowLocked]}
      onPress={lesson.locked ? undefined : onPress}
      activeOpacity={lesson.locked ? 1 : 0.8}
      accessibilityLabel={`${lesson.locked ? 'Locked: ' : ''}${lesson.title}`}
      accessibilityState={{ selected, disabled: lesson.locked }}
    >
      {/* Status icon */}
      <View style={[lessonRowStyles.statusIcon, lesson.completed && lessonRowStyles.statusIconDone]}>
        <Text style={lessonRowStyles.statusEmoji}>
          {lesson.locked ? '🔒' : lesson.completed ? '✓' : '○'}
        </Text>
      </View>

      {/* Info */}
      <View style={lessonRowStyles.info}>
        <Text style={[lessonRowStyles.title, lesson.locked && lessonRowStyles.titleLocked]}>
          {lesson.title}
        </Text>
        <View style={lessonRowStyles.meta}>
          <View style={[lessonRowStyles.diffBadge, { backgroundColor: DIFFICULTY_COLOR[lesson.difficulty] + '22' }]}>
            <Text style={[lessonRowStyles.diffText, { color: DIFFICULTY_COLOR[lesson.difficulty] }]}>
              {lesson.difficulty}
            </Text>
          </View>
          <Text style={lessonRowStyles.duration}>⏱ {lesson.duration}</Text>
        </View>
      </View>

      {/* Arrow */}
      {!lesson.locked && (
        <Text style={lessonRowStyles.arrow}>›</Text>
      )}
    </TouchableOpacity>
  );
}

// ---------------------------------------------------------------------------
// Main Screen
// ---------------------------------------------------------------------------

interface LessonsSelectionScreenProps {
  onStartLesson?: (lessonId: string, pieceId: PieceId) => void;
}

export default function LessonsSelectionScreen({ onStartLesson }: LessonsSelectionScreenProps) {
  const [selectedPiece, setSelectedPiece] = useState<PieceId>('king');
  const [selectedLesson, setSelectedLesson] = useState<string | null>(null);

  const lessons = LESSONS_BY_PIECE[selectedPiece];
  const piece = CHESS_PIECES.find((p) => p.id === selectedPiece)!;
  const totalCompleted = CHESS_PIECES.reduce((sum, p) => sum + p.completedCount, 0);
  const totalLessons = CHESS_PIECES.reduce((sum, p) => sum + p.lessonsCount, 0);

  const handleStart = () => {
    if (selectedLesson) {
      onStartLesson?.(selectedLesson, selectedPiece);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.soft} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ──────────────────────────────────────── */}
        <View style={styles.header}>
          <Text style={styles.heading}>Lessons</Text>
          <View style={styles.progressSummary}>
            <View style={styles.progressBarFull}>
              <View style={[styles.progressBarFill, { width: `${(totalCompleted / totalLessons) * 100}%` as any }]} />
            </View>
            <Text style={styles.progressText}>{totalCompleted}/{totalLessons} lessons complete</Text>
          </View>
        </View>

        {/* ── Piece Cards (horizontal scroll) ─────────────── */}
        <View style={styles.piecesSection}>
          <Text style={styles.sectionLabel}>Select a piece</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.piecesScroll}
          >
            {CHESS_PIECES.map((p) => (
              <PieceCard
                key={p.id}
                piece={p}
                selected={selectedPiece === p.id}
                onPress={() => {
                  setSelectedPiece(p.id);
                  setSelectedLesson(null);
                }}
              />
            ))}
          </ScrollView>
        </View>

        {/* ── Lesson List ───────────────────────────────────── */}
        <View style={styles.lessonsSection}>
          <View style={styles.lessonsSectionHeader}>
            <Text style={styles.sectionLabel}>
              {piece.name} Lessons
            </Text>
            <Text style={styles.completedBadge}>
              {piece.completedCount}/{piece.lessonsCount} done
            </Text>
          </View>

          <View style={styles.lessonsList}>
            {lessons.map((lesson) => (
              <LessonRow
                key={lesson.id}
                lesson={lesson}
                selected={selectedLesson === lesson.id}
                onPress={() => setSelectedLesson(lesson.id)}
              />
            ))}
          </View>
        </View>

        {/* Spacer for sticky button */}
        <View style={styles.buttonSpacer} />
      </ScrollView>

      {/* ── Sticky Start Button ───────────────────────────── */}
      <View style={styles.stickyFooter}>
        <TouchableOpacity
          style={[styles.startButton, !selectedLesson && styles.startButtonDisabled]}
          onPress={handleStart}
          activeOpacity={0.8}
          disabled={!selectedLesson}
          accessibilityLabel="Start selected lesson"
          accessibilityRole="button"
        >
          <Text style={styles.startButtonText}>
            {selectedLesson ? 'Start Lesson →' : 'Select a lesson'}
          </Text>
        </TouchableOpacity>
      </View>
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

  scroll: {
    flex: 1,
  },

  scrollContent: {
    paddingTop: spacing[8],
    paddingBottom: spacing[4],
  },

  // ── Header ──────────────────────────────────────────

  header: {
    paddingHorizontal: layout.screenPaddingH,
    gap: spacing[4],
    marginBottom: spacing[6],
  },

  heading: {
    fontSize: fontSize['3xl'],
    fontFamily: fontFamily.bold,
    fontWeight: fontWeight.bold,
    color: colors.dark,
  },

  progressSummary: {
    gap: spacing[2],
  },

  progressBarFull: {
    height: 8,
    backgroundColor: colors.borderLight,
    borderRadius: radius.full,
    overflow: 'hidden',
  },

  progressBarFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: radius.full,
  },

  progressText: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    color: colors.gray,
  },

  // ── Pieces ───────────────────────────────────────────

  piecesSection: {
    gap: spacing[3],
    marginBottom: spacing[6],
  },

  sectionLabel: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.bold,
    fontWeight: fontWeight.bold,
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    paddingHorizontal: layout.screenPaddingH,
  },

  piecesScroll: {
    paddingHorizontal: layout.screenPaddingH,
    gap: spacing[3],
  },

  // ── Lessons ──────────────────────────────────────────

  lessonsSection: {
    paddingHorizontal: layout.screenPaddingH,
    gap: spacing[4],
  },

  lessonsSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  completedBadge: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.bold,
    fontWeight: fontWeight.bold,
    color: colors.primary,
    backgroundColor: colors.primaryFaint,
    paddingVertical: spacing[1],
    paddingHorizontal: spacing[3],
    borderRadius: radius.full,
  },

  lessonsList: {
    gap: spacing[3],
  },

  buttonSpacer: {
    height: 100,
  },

  // ── Sticky footer ────────────────────────────────────

  stickyFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: layout.screenPaddingH,
    paddingBottom: spacing[8],
    paddingTop: spacing[4],
    backgroundColor: colors.soft,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },

  startButton: {
    ...btnGreenStyle,
    height: 56,
  },

  startButtonDisabled: {
    backgroundColor: colors.borderLight,
    ...shadows.sm,
  },

  startButtonText: {
    ...btnGreenTextStyle,
  },
});

// ── Piece card styles ────────────────────────────────

const pieceCardStyles = StyleSheet.create({
  card: {
    width: 88,
    backgroundColor: colors.light,
    borderRadius: radius['2xl'],
    borderWidth: 2,
    borderColor: colors.borderLight,
    padding: spacing[4],
    alignItems: 'center',
    gap: spacing[2],
    ...shadows.sm,
  },

  cardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryFaint,
    ...shadows.md,
  },

  emojiCircle: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },

  emoji: {
    fontSize: 22,
  },

  name: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.bold,
    fontWeight: fontWeight.bold,
    color: colors.gray,
    textAlign: 'center',
  },

  nameSelected: {
    color: colors.primary,
  },

  progressBar: {
    width: '100%',
    height: 4,
    backgroundColor: colors.borderLight,
    borderRadius: radius.full,
    overflow: 'hidden',
  },

  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: radius.full,
  },

  progressLabel: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.regular,
    color: colors.muted,
  },
});

// ── Lesson row styles ────────────────────────────────

const lessonRowStyles = StyleSheet.create({
  row: {
    ...cardStyle,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },

  rowSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryFaint,
  },

  rowLocked: {
    opacity: 0.5,
  },

  statusIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    backgroundColor: colors.soft,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },

  statusIconDone: {
    backgroundColor: colors.primaryFaint,
  },

  statusEmoji: {
    fontSize: 14,
  },

  info: {
    flex: 1,
    gap: spacing[1],
  },

  title: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.bold,
    fontWeight: fontWeight.bold,
    color: colors.dark,
    lineHeight: getLineHeight(fontSize.base),
  },

  titleLocked: {
    color: colors.muted,
  },

  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },

  diffBadge: {
    paddingVertical: 2,
    paddingHorizontal: spacing[2],
    borderRadius: radius.full,
  },

  diffText: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.bold,
    fontWeight: fontWeight.bold,
  },

  duration: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.regular,
    color: colors.muted,
  },

  arrow: {
    fontSize: fontSize.xl,
    color: colors.muted,
  },
});
