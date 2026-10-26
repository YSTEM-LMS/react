/**
 * HomeScreen.tsx
 * D1 — Home
 *
 * YSTEM Mobile App — Y STEM and Chess
 * Designed by Sandith Hewage (UI/UX Engineer)
 *
 * Features:
 * - Welcome hero with user greeting + avatar
 * - Quick stats row: web time, lesson time, puzzles solved
 * - Recent activity feed with timeline dots
 * - Donate CTA card (brand dark pill button)
 * - Safe area + scrollable layout
 */

import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
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
  cardStyle,
  avatarStyle,
  timelineDotStyle,
  layout,
  getLineHeight,
} from '../design-tokens.rn';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface StatItem {
  label: string;
  value: string;
  unit: string;
  emoji: string;
}

interface ActivityItem {
  id: string;
  description: string;
  time: string;
  type: 'lesson' | 'puzzle' | 'game' | 'badge';
}

interface HomeScreenProps {
  username?: string;
  stats?: StatItem[];
  recentActivity?: ActivityItem[];
  onDonate?: () => void;
  onStartLesson?: () => void;
  onPlayPuzzle?: () => void;
}

// ---------------------------------------------------------------------------
// Default data
// ---------------------------------------------------------------------------

const DEFAULT_STATS: StatItem[] = [
  { label: 'Web Time', value: '2.5', unit: 'hrs', emoji: '🌐' },
  { label: 'Lesson Time', value: '45', unit: 'min', emoji: '📚' },
  { label: 'Puzzles', value: '12', unit: 'solved', emoji: '🧩' },
];

const DEFAULT_ACTIVITY: ActivityItem[] = [
  { id: '1', description: 'Completed "How the Knight Moves"', time: '2h ago', type: 'lesson' },
  { id: '2', description: 'Solved puzzle #4821 — Mate in 2', time: '3h ago', type: 'puzzle' },
  { id: '3', description: 'Earned "Quick Learner" badge', time: 'Yesterday', type: 'badge' },
  { id: '4', description: 'Played 3 games vs Computer (Easy)', time: 'Yesterday', type: 'game' },
  { id: '5', description: 'Started "Pawn Structures" lesson', time: '2 days ago', type: 'lesson' },
];

const ACTIVITY_EMOJI: Record<ActivityItem['type'], string> = {
  lesson: '📖',
  puzzle: '🧩',
  game: '♟',
  badge: '🏅',
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatCard({ item }: { item: StatItem }) {
  return (
    <View style={statStyles.card}>
      <Text style={statStyles.emoji}>{item.emoji}</Text>
      <Text style={statStyles.value}>{item.value}</Text>
      <Text style={statStyles.unit}>{item.unit}</Text>
      <Text style={statStyles.label}>{item.label}</Text>
    </View>
  );
}

function ActivityRow({ item, isLast }: { item: ActivityItem; isLast: boolean }) {
  return (
    <View style={activityStyles.row}>
      {/* Timeline */}
      <View style={activityStyles.timeline}>
        <View style={activityStyles.dot} />
        {!isLast && <View style={activityStyles.line} />}
      </View>

      {/* Content */}
      <View style={activityStyles.content}>
        <View style={activityStyles.emojiContainer}>
          <Text style={activityStyles.typeEmoji}>{ACTIVITY_EMOJI[item.type]}</Text>
        </View>
        <View style={activityStyles.textGroup}>
          <Text style={activityStyles.description}>{item.description}</Text>
          <Text style={activityStyles.time}>{item.time}</Text>
        </View>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Main Screen
// ---------------------------------------------------------------------------

export default function HomeScreen({
  username = 'Student',
  stats = DEFAULT_STATS,
  recentActivity = DEFAULT_ACTIVITY,
  onDonate,
  onStartLesson,
  onPlayPuzzle,
}: HomeScreenProps) {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.soft} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero / Welcome ──────────────────────────────── */}
        <View style={styles.hero}>
          <View style={styles.heroLeft}>
            <Text style={styles.greeting}>{greeting},</Text>
            <Text style={styles.username}>{username}! 👋</Text>
            <Text style={styles.heroSub}>Ready to learn something new?</Text>
          </View>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarInitial}>{username.charAt(0).toUpperCase()}</Text>
            </View>
          </View>
        </View>

        {/* ── Quick Action Buttons ─────────────────────────── */}
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.quickActionBtn}
            onPress={onStartLesson}
            activeOpacity={0.8}
            accessibilityLabel="Start a lesson"
          >
            <Text style={styles.quickActionEmoji}>📚</Text>
            <Text style={styles.quickActionText}>Start Lesson</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.quickActionBtn, styles.quickActionBtnAccent]}
            onPress={onPlayPuzzle}
            activeOpacity={0.8}
            accessibilityLabel="Solve a puzzle"
          >
            <Text style={styles.quickActionEmoji}>🧩</Text>
            <Text style={styles.quickActionText}>Daily Puzzle</Text>
          </TouchableOpacity>
        </View>

        {/* ── Stats Row ────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Progress</Text>
          <View style={styles.statsRow}>
            {stats.map((s) => (
              <StatCard key={s.label} item={s} />
            ))}
          </View>
        </View>

        {/* ── Recent Activity ───────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          <View style={styles.activityCard}>
            {recentActivity.map((item, index) => (
              <ActivityRow
                key={item.id}
                item={item}
                isLast={index === recentActivity.length - 1}
              />
            ))}
          </View>
        </View>

        {/* ── Donate CTA ────────────────────────────────────── */}
        <View style={styles.donateCard}>
          <View style={styles.donateTextGroup}>
            <Text style={styles.donateTitle}>Support our mission</Text>
            <Text style={styles.donateBody}>
              Help us bring chess and STEM education to underserved students everywhere.
            </Text>
          </View>
          <TouchableOpacity
            style={styles.donateButton}
            onPress={onDonate}
            activeOpacity={0.8}
            accessibilityLabel="Donate to Y STEM and Chess"
            accessibilityRole="button"
          >
            <Text style={styles.donateButtonText}>Donate</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
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
    paddingHorizontal: layout.screenPaddingH,
    paddingTop: spacing[8],
    paddingBottom: spacing[12],
    gap: layout.sectionSpacing,
  },

  // ── Hero ────────────────────────────────────────────

  hero: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },

  heroLeft: {
    flex: 1,
    gap: spacing[1],
  },

  greeting: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.regular,
    color: colors.gray,
  },

  username: {
    fontSize: fontSize['3xl'],
    fontFamily: fontFamily.bold,
    fontWeight: fontWeight.bold,
    color: colors.dark,
    lineHeight: getLineHeight(fontSize['3xl'], 1.2),
  },

  heroSub: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    color: colors.gray,
    marginTop: spacing[1],
  },

  avatarContainer: {
    marginLeft: spacing[4],
  },

  avatar: {
    ...avatarStyle,
    width: 60,
    height: 60,
    backgroundColor: colors.primaryFaint,
  },

  avatarInitial: {
    fontSize: fontSize['2xl'],
    fontFamily: fontFamily.bold,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },

  // ── Quick Actions ────────────────────────────────────

  quickActions: {
    flexDirection: 'row',
    gap: spacing[4],
    marginTop: -spacing[4], // Pull up slightly
  },

  quickActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    paddingVertical: spacing[4],
    backgroundColor: colors.dark,
    borderRadius: radius.xl,
    ...shadows.md,
  },

  quickActionBtnAccent: {
    backgroundColor: colors.primary,
  },

  quickActionEmoji: {
    fontSize: 18,
  },

  quickActionText: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.bold,
    fontWeight: fontWeight.bold,
    color: colors.light,
  },

  // ── Sections ─────────────────────────────────────────

  section: {
    gap: spacing[4],
  },

  sectionTitle: {
    fontSize: fontSize.lg,
    fontFamily: fontFamily.bold,
    fontWeight: fontWeight.bold,
    color: colors.dark,
  },

  // ── Stats ─────────────────────────────────────────────

  statsRow: {
    flexDirection: 'row',
    gap: spacing[3],
  },

  // ── Activity ──────────────────────────────────────────

  activityCard: {
    ...cardStyle,
    gap: 0,
    paddingVertical: spacing[2],
  },

  // ── Donate Card ───────────────────────────────────────

  donateCard: {
    backgroundColor: colors.dark,
    borderRadius: radius['2xl'],
    padding: spacing[6],
    gap: spacing[4],
    ...shadows.lg,
  },

  donateTextGroup: {
    gap: spacing[2],
  },

  donateTitle: {
    fontSize: fontSize.xl,
    fontFamily: fontFamily.bold,
    fontWeight: fontWeight.bold,
    color: colors.light,
  },

  donateBody: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    color: colors.white60,
    lineHeight: getLineHeight(fontSize.sm),
  },

  donateButton: {
    ...btnPrimaryStyle,
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    alignSelf: 'flex-start',
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[8],
  },

  donateButtonText: {
    ...btnPrimaryTextStyle,
    color: colors.dark,
  },
});

// ── Stat card styles ─────────────────────────────────

const statStyles = StyleSheet.create({
  card: {
    flex: 1,
    ...cardStyle,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[4],
    gap: spacing[1],
  },

  emoji: {
    fontSize: 22,
    marginBottom: spacing[1],
  },

  value: {
    fontSize: fontSize['2xl'],
    fontFamily: fontFamily.bold,
    fontWeight: fontWeight.bold,
    color: colors.dark,
  },

  unit: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.regular,
    color: colors.muted,
  },

  label: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.bold,
    fontWeight: fontWeight.bold,
    color: colors.gray,
    textAlign: 'center',
  },
});

// ── Activity row styles ──────────────────────────────

const activityStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    paddingVertical: spacing[3],
  },

  timeline: {
    width: 24,
    alignItems: 'center',
    paddingTop: 4,
  },

  dot: {
    ...timelineDotStyle,
  },

  line: {
    width: 2,
    flex: 1,
    backgroundColor: colors.borderLight,
    marginTop: spacing[1],
  },

  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[3],
    paddingLeft: spacing[3],
  },

  emojiContainer: {
    width: 32,
    height: 32,
    borderRadius: radius.lg,
    backgroundColor: colors.soft,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },

  typeEmoji: {
    fontSize: 15,
  },

  textGroup: {
    flex: 1,
    gap: spacing[1],
  },

  description: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    color: colors.dark,
    lineHeight: getLineHeight(fontSize.sm),
  },

  time: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.regular,
    color: colors.muted,
  },
});
