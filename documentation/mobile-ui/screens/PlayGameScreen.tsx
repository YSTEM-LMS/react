/**
 * PlayGameScreen.tsx
 * D4 — Play vs Computer
 *
 * YSTEM Mobile App — Y STEM and Chess
 * Designed by Sandith Hewage (UI/UX Engineer)
 *
 * Features:
 * - Full-width chess board (aspectRatio: 1)
 * - Player/opponent headers with timers and captured pieces
 * - Tutor panel (collapsible): position evaluation + tip
 * - Move history (horizontal scroll of SAN notation)
 * - Controls footer: Undo, Resign, Flip Board, Offer Draw
 * - Game-over modal overlay
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ScrollView,
  Modal,
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
  avatarStyle,
  layout,
  chess,
  modalOverlayStyle,
  modalContentStyle,
  getLineHeight,
} from '../design-tokens.rn';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type GameResult = 'white' | 'black' | 'draw' | null;

interface MoveEntry {
  moveNumber: number;
  white: string;
  black?: string;
}

interface PlayGameScreenProps {
  playerColor?: 'white' | 'black';
  playerUsername?: string;
  difficulty?: string;
  onResign?: () => void;
  onUndo?: () => void;
  onNewGame?: () => void;
  onExit?: () => void;
}

// ---------------------------------------------------------------------------
// Sample move history
// ---------------------------------------------------------------------------

const SAMPLE_MOVES: MoveEntry[] = [
  { moveNumber: 1, white: 'e4', black: 'e5' },
  { moveNumber: 2, white: 'Nf3', black: 'Nc6' },
  { moveNumber: 3, white: 'Bb5', black: 'a6' },
  { moveNumber: 4, white: 'Ba4', black: 'Nf6' },
  { moveNumber: 5, white: 'O-O', black: 'Be7' },
  { moveNumber: 6, white: 'Re1', black: 'b5' },
  { moveNumber: 7, white: 'Bb3' },
];

// ---------------------------------------------------------------------------
// Chess Board
// ---------------------------------------------------------------------------

function GameBoard({ playerColor }: { playerColor: 'white' | 'black' }) {
  const files = playerColor === 'white'
    ? ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']
    : ['h', 'g', 'f', 'e', 'd', 'c', 'b', 'a'];
  const ranks = playerColor === 'white'
    ? [8, 7, 6, 5, 4, 3, 2, 1]
    : [1, 2, 3, 4, 5, 6, 7, 8];

  return (
    <View style={boardStyles.board}>
      {ranks.map((rank) => (
        <View key={rank} style={boardStyles.rank}>
          {/* Rank label */}
          <View style={boardStyles.rankLabel}>
            <Text style={boardStyles.labelText}>{rank}</Text>
          </View>
          {files.map((file, fileIdx) => {
            const isLight = (fileIdx + rank) % 2 === 0;
            // Highlight last move: e4 and e5
            const isHighlighted = (file === 'e' && rank === 4) || (file === 'e' && rank === 5);
            return (
              <View
                key={`${file}${rank}`}
                style={[
                  boardStyles.square,
                  isLight ? boardStyles.squareLight : boardStyles.squareDark,
                  isHighlighted && boardStyles.squareHighlighted,
                ]}
              />
            );
          })}
        </View>
      ))}
      {/* File labels */}
      <View style={boardStyles.fileLabelRow}>
        <View style={{ width: 16 }} />
        {files.map((f) => (
          <Text key={f} style={boardStyles.fileLabelText}>{f}</Text>
        ))}
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Player Header
// ---------------------------------------------------------------------------

function PlayerHeader({
  username,
  isOpponent,
  timeLeft,
  capturedPieces,
  isActive,
}: {
  username: string;
  isOpponent: boolean;
  timeLeft: string;
  capturedPieces: string;
  isActive: boolean;
}) {
  return (
    <View style={[playerStyles.row, isActive && playerStyles.rowActive]}>
      <View style={playerStyles.avatar}>
        <Text style={playerStyles.avatarText}>{isOpponent ? '🤖' : username.charAt(0).toUpperCase()}</Text>
      </View>
      <View style={playerStyles.info}>
        <Text style={playerStyles.username}>{username}</Text>
        {!!capturedPieces && (
          <Text style={playerStyles.captured}>{capturedPieces}</Text>
        )}
      </View>
      <View style={[playerStyles.timerBox, isActive && playerStyles.timerBoxActive]}>
        <Text style={[playerStyles.timerText, isActive && playerStyles.timerTextActive]}>
          {timeLeft}
        </Text>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Tutor Panel
// ---------------------------------------------------------------------------

function TutorPanel({ evaluation, tip, collapsed, onToggle }: {
  evaluation: string;
  tip: string;
  collapsed: boolean;
  onToggle: () => void;
}) {
  return (
    <View style={tutorStyles.panel}>
      <TouchableOpacity
        style={tutorStyles.header}
        onPress={onToggle}
        activeOpacity={0.8}
        accessibilityLabel={collapsed ? 'Expand tutor panel' : 'Collapse tutor panel'}
      >
        <View style={tutorStyles.headerLeft}>
          <Text style={tutorStyles.headerEmoji}>🎓</Text>
          <Text style={tutorStyles.headerTitle}>Tutor</Text>
          <View style={[tutorStyles.evalBadge, {
            backgroundColor: evaluation.startsWith('+') ? colors.primaryFaint : colors.redLight,
          }]}>
            <Text style={[tutorStyles.evalText, {
              color: evaluation.startsWith('+') ? colors.primary : colors.red,
            }]}>
              {evaluation}
            </Text>
          </View>
        </View>
        <Text style={tutorStyles.chevron}>{collapsed ? '›' : '‹'}</Text>
      </TouchableOpacity>

      {!collapsed && (
        <View style={tutorStyles.body}>
          <Text style={tutorStyles.tipText}>{tip}</Text>
        </View>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Move History
// ---------------------------------------------------------------------------

function MoveHistory({ moves }: { moves: MoveEntry[] }) {
  return (
    <View style={moveStyles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={moveStyles.scroll}
      >
        {moves.map((m) => (
          <View key={m.moveNumber} style={moveStyles.moveGroup}>
            <Text style={moveStyles.moveNumber}>{m.moveNumber}.</Text>
            <View style={moveStyles.moveToken}>
              <Text style={moveStyles.moveText}>{m.white}</Text>
            </View>
            {m.black && (
              <View style={[moveStyles.moveToken, moveStyles.moveTokenBlack]}>
                <Text style={moveStyles.moveText}>{m.black}</Text>
              </View>
            )}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Game Over Modal
// ---------------------------------------------------------------------------

function GameOverModal({
  result,
  playerColor,
  onNewGame,
  onExit,
}: {
  result: GameResult;
  playerColor: 'white' | 'black';
  onNewGame?: () => void;
  onExit?: () => void;
}) {
  const playerWon = result === playerColor;
  const isDraw = result === 'draw';

  return (
    <Modal visible={result !== null} transparent animationType="fade">
      <View style={modalStyles.overlay}>
        <View style={modalStyles.content}>
          <Text style={modalStyles.emoji}>
            {isDraw ? '🤝' : playerWon ? '🏆' : '😓'}
          </Text>
          <Text style={modalStyles.title}>
            {isDraw ? 'Draw!' : playerWon ? 'You Win!' : 'You Lose'}
          </Text>
          <Text style={modalStyles.body}>
            {isDraw
              ? 'The game ended in a draw. Good fight!'
              : playerWon
              ? 'Excellent play! You defeated the computer!'
              : 'Don\'t give up — every loss is a lesson!'}
          </Text>
          <View style={modalStyles.actions}>
            <TouchableOpacity
              style={modalStyles.newGameButton}
              onPress={onNewGame}
              activeOpacity={0.8}
              accessibilityLabel="Play again"
            >
              <Text style={modalStyles.newGameText}>Play Again</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={modalStyles.exitButton}
              onPress={onExit}
              activeOpacity={0.8}
              accessibilityLabel="Exit to setup"
            >
              <Text style={modalStyles.exitText}>Exit</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Main Screen
// ---------------------------------------------------------------------------

export default function PlayGameScreen({
  playerColor = 'white',
  playerUsername = 'You',
  difficulty = 'Beginner',
  onResign,
  onUndo,
  onNewGame,
  onExit,
}: PlayGameScreenProps) {
  const [tutorCollapsed, setTutorCollapsed] = useState(false);
  const [gameResult, setGameResult] = useState<GameResult>(null);
  const [moves] = useState<MoveEntry[]>(SAMPLE_MOVES);

  const opponentUsername = `Computer (${difficulty})`;
  const isPlayerTurn = true; // Wire to game state

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.dark} />

      {/* ── Top Bar ──────────────────────────────────────── */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.topBackButton}
          onPress={onExit}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel="Exit game"
        >
          <Text style={styles.topBackArrow}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.topTitle}>vs Computer</Text>
        <View style={styles.diffBadge}>
          <Text style={styles.diffBadgeText}>{difficulty}</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Opponent Header ───────────────────────────────── */}
        <PlayerHeader
          username={opponentUsername}
          isOpponent
          timeLeft="10:00"
          capturedPieces=""
          isActive={!isPlayerTurn}
        />

        {/* ── Chess Board ──────────────────────────────────── */}
        <GameBoard playerColor={playerColor} />

        {/* ── Player Header ─────────────────────────────────── */}
        <PlayerHeader
          username={playerUsername}
          isOpponent={false}
          timeLeft="9:42"
          capturedPieces="♙ ♙"
          isActive={isPlayerTurn}
        />

        {/* ── Tutor Panel ───────────────────────────────────── */}
        <TutorPanel
          evaluation="+0.3"
          tip="The Ruy Lopez opening. Consider castling to protect your king before attacking."
          collapsed={tutorCollapsed}
          onToggle={() => setTutorCollapsed((v) => !v)}
        />

        {/* ── Move History ──────────────────────────────────── */}
        <View style={styles.moveHistorySection}>
          <Text style={styles.moveHistoryLabel}>Move History</Text>
          <MoveHistory moves={moves} />
        </View>

        {/* Bottom spacer */}
        <View style={{ height: spacing[4] }} />
      </ScrollView>

      {/* ── Controls Footer ───────────────────────────────── */}
      <View style={styles.controlsFooter}>
        <TouchableOpacity
          style={styles.controlButton}
          onPress={onUndo}
          activeOpacity={0.8}
          accessibilityLabel="Undo last move"
        >
          <Text style={styles.controlIcon}>↩</Text>
          <Text style={styles.controlLabel}>Undo</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.controlButton}
          activeOpacity={0.8}
          accessibilityLabel="Flip board"
        >
          <Text style={styles.controlIcon}>⇅</Text>
          <Text style={styles.controlLabel}>Flip</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.controlButton}
          activeOpacity={0.8}
          accessibilityLabel="Offer draw"
        >
          <Text style={styles.controlIcon}>🤝</Text>
          <Text style={styles.controlLabel}>Draw</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlButton, styles.resignButton]}
          onPress={() => { onResign?.(); setGameResult('black'); }}
          activeOpacity={0.8}
          accessibilityLabel="Resign game"
        >
          <Text style={styles.controlIcon}>🏳</Text>
          <Text style={[styles.controlLabel, styles.resignLabel]}>Resign</Text>
        </TouchableOpacity>
      </View>

      {/* ── Game Over Modal ───────────────────────────────── */}
      <GameOverModal
        result={gameResult}
        playerColor={playerColor}
        onNewGame={() => { setGameResult(null); onNewGame?.(); }}
        onExit={() => { setGameResult(null); onExit?.(); }}
      />
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
    alignItems: 'stretch',
  },

  rankLabel: {
    width: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },

  labelText: {
    fontSize: 8,
    fontFamily: fontFamily.bold,
    fontWeight: fontWeight.bold,
    color: colors.muted,
    opacity: 0.6,
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

  squareHighlighted: {
    backgroundColor: chess.highlightSquare,
  },

  fileLabelRow: {
    flexDirection: 'row',
    paddingBottom: 2,
  },

  fileLabelText: {
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
// Player header styles
// ---------------------------------------------------------------------------

const playerStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[2],
    borderRadius: radius.xl,
    backgroundColor: 'transparent',
  },

  rowActive: {
    backgroundColor: colors.primaryFaint,
  },

  avatar: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: colors.soft,
    borderWidth: 2,
    borderColor: colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  avatarText: {
    fontSize: 20,
  },

  info: {
    flex: 1,
    gap: 2,
  },

  username: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.bold,
    fontWeight: fontWeight.bold,
    color: colors.dark,
  },

  captured: {
    fontSize: fontSize.xs,
    color: colors.muted,
    letterSpacing: 2,
  },

  timerBox: {
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
    backgroundColor: colors.dark,
    borderRadius: radius.lg,
    minWidth: 64,
    alignItems: 'center',
  },

  timerBoxActive: {
    backgroundColor: colors.primary,
  },

  timerText: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.bold,
    fontWeight: fontWeight.bold,
    color: colors.white60,
    letterSpacing: 1,
  },

  timerTextActive: {
    color: colors.dark,
  },
});

// ---------------------------------------------------------------------------
// Tutor panel styles
// ---------------------------------------------------------------------------

const tutorStyles = StyleSheet.create({
  panel: {
    ...cardStyle,
    padding: 0,
    overflow: 'hidden',
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing[4],
    backgroundColor: colors.accentFaint,
  },

  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },

  headerEmoji: {
    fontSize: 18,
  },

  headerTitle: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.bold,
    fontWeight: fontWeight.bold,
    color: colors.dark,
  },

  evalBadge: {
    paddingVertical: 2,
    paddingHorizontal: spacing[2],
    borderRadius: radius.full,
  },

  evalText: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.bold,
    fontWeight: fontWeight.bold,
  },

  chevron: {
    fontSize: fontSize.xl,
    color: colors.muted,
  },

  body: {
    padding: spacing[4],
  },

  tipText: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    color: colors.dark,
    lineHeight: getLineHeight(fontSize.sm),
  },
});

// ---------------------------------------------------------------------------
// Move history styles
// ---------------------------------------------------------------------------

const moveStyles = StyleSheet.create({
  container: {
    ...cardStyle,
    padding: 0,
    overflow: 'hidden',
  },

  scroll: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    gap: spacing[2],
    alignItems: 'center',
  },

  moveGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
  },

  moveNumber: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.regular,
    color: colors.muted,
    minWidth: 20,
  },

  moveToken: {
    paddingVertical: spacing[1],
    paddingHorizontal: spacing[2],
    backgroundColor: colors.soft,
    borderRadius: radius.md,
  },

  moveTokenBlack: {
    backgroundColor: colors.dark,
  },

  moveText: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.bold,
    fontWeight: fontWeight.bold,
    color: colors.dark,
  },
});

// ---------------------------------------------------------------------------
// Modal styles
// ---------------------------------------------------------------------------

const modalStyles = StyleSheet.create({
  overlay: {
    ...modalOverlayStyle,
  },

  content: {
    ...modalContentStyle,
    gap: spacing[4],
  },

  emoji: {
    fontSize: 56,
  },

  title: {
    fontSize: fontSize['2xl'],
    fontFamily: fontFamily.bold,
    fontWeight: fontWeight.bold,
    color: colors.dark,
    textAlign: 'center',
  },

  body: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.regular,
    color: colors.gray,
    textAlign: 'center',
    lineHeight: getLineHeight(fontSize.base),
  },

  actions: {
    width: '100%',
    gap: spacing[3],
  },

  newGameButton: {
    ...btnGreenStyle,
    height: 52,
  },

  newGameText: {
    ...btnGreenTextStyle,
  },

  exitButton: {
    height: 48,
    borderRadius: radius.xl,
    borderWidth: 2,
    borderColor: colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  exitText: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.bold,
    fontWeight: fontWeight.bold,
    color: colors.gray,
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
    paddingVertical: spacing[3],
    backgroundColor: colors.dark,
  },

  topBackButton: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: colors.white10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  topBackArrow: {
    fontSize: fontSize['2xl'],
    color: colors.light,
    marginTop: -2,
  },

  topTitle: {
    fontSize: fontSize.lg,
    fontFamily: fontFamily.bold,
    fontWeight: fontWeight.bold,
    color: colors.light,
  },

  diffBadge: {
    paddingVertical: spacing[1],
    paddingHorizontal: spacing[3],
    backgroundColor: colors.primaryFaint,
    borderRadius: radius.full,
  },

  diffBadgeText: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.bold,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },

  // ── Scroll ────────────────────────────────────────────

  scroll: {
    flex: 1,
  },

  scrollContent: {
    paddingHorizontal: layout.screenPaddingH,
    paddingTop: spacing[4],
    paddingBottom: spacing[4],
    gap: spacing[4],
  },

  // ── Move history section ──────────────────────────────

  moveHistorySection: {
    gap: spacing[3],
  },

  moveHistoryLabel: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.bold,
    fontWeight: fontWeight.bold,
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },

  // ── Controls Footer ───────────────────────────────────

  controlsFooter: {
    flexDirection: 'row',
    paddingHorizontal: layout.screenPaddingH,
    paddingVertical: spacing[4],
    paddingBottom: spacing[6],
    backgroundColor: colors.dark,
    gap: spacing[2],
  },

  controlButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[1],
    paddingVertical: spacing[3],
    backgroundColor: colors.white10,
    borderRadius: radius.xl,
    minHeight: 56,
  },

  resignButton: {
    backgroundColor: 'rgba(214,69,69,0.15)',
  },

  controlIcon: {
    fontSize: 20,
  },

  controlLabel: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.bold,
    fontWeight: fontWeight.bold,
    color: colors.white60,
  },

  resignLabel: {
    color: colors.red,
  },
});
