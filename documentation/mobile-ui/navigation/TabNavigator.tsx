/**
 * TabNavigator.tsx
 * D1 — Auth + Navigation
 *
 * YSTEM Mobile App — Y STEM and Chess
 * Designed by Sandith Hewage (UI/UX Engineer)
 *
 * Bottom tab bar: Home | Lessons | Puzzles | Play | Profile
 *
 * Requires:
 *   @react-navigation/native
 *   @react-navigation/bottom-tabs
 *   react-native-safe-area-context
 */

import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import {
  colors,
  spacing,
  fontSize,
  fontFamily,
  fontWeight,
  radius,
  shadows,
} from '../design-tokens.rn';

// ---------------------------------------------------------------------------
// Tab Param List
// ---------------------------------------------------------------------------

export type TabParamList = {
  Home: undefined;
  Lessons: undefined;
  Puzzles: undefined;
  Play: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<TabParamList>();

// ---------------------------------------------------------------------------
// Icon components (SVG-free placeholders — swap for lucide-react-native icons)
// ---------------------------------------------------------------------------

interface TabIconProps {
  label: string;
  focused: boolean;
  emoji: string;
}

function TabIcon({ label, focused, emoji }: TabIconProps) {
  return (
    <View style={[styles.iconWrapper, focused && styles.iconWrapperActive]}>
      <Text style={[styles.iconEmoji, focused && styles.iconEmojiActive]}>{emoji}</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Screen placeholders (replace with actual screen imports)
// ---------------------------------------------------------------------------

// Import your screens here:
// import HomeScreen from '../screens/HomeScreen';
// import LessonsSelectionScreen from '../screens/LessonsSelectionScreen';
// import PuzzlesScreen from '../screens/PuzzlesScreen';
// import PlaySetupScreen from '../screens/PlaySetupScreen';
// import ProfileScreen from '../screens/ProfileScreen';

// Placeholder components for development
const Placeholder = ({ name }: { name: string }) => (
  <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.soft }}>
    <Text style={{ fontFamily: fontFamily.bold, fontSize: fontSize.xl, color: colors.dark }}>{name}</Text>
  </View>
);

// ---------------------------------------------------------------------------
// Navigator
// ---------------------------------------------------------------------------

export default function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.secondary,
        tabBarLabelStyle: styles.tabLabel,
        tabBarItemStyle: styles.tabItem,
        tabBarHideOnKeyboard: true,
      }}
    >
      <Tab.Screen
        name="Home"
        component={() => <Placeholder name="Home" />}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ focused }) => (
            <TabIcon label="Home" focused={focused} emoji="🏠" />
          ),
        }}
      />

      <Tab.Screen
        name="Lessons"
        component={() => <Placeholder name="Lessons" />}
        options={{
          tabBarLabel: 'Lessons',
          tabBarIcon: ({ focused }) => (
            <TabIcon label="Lessons" focused={focused} emoji="📚" />
          ),
        }}
      />

      {/* Center Play tab — visually elevated */}
      <Tab.Screen
        name="Play"
        component={() => <Placeholder name="Play" />}
        options={{
          tabBarLabel: 'Play',
          tabBarIcon: ({ focused }) => (
            <View style={styles.centerTabContainer}>
              <View style={[styles.centerTabButton, focused && styles.centerTabButtonActive]}>
                <Text style={styles.centerTabEmoji}>♟</Text>
              </View>
            </View>
          ),
          tabBarLabelStyle: { ...styles.tabLabel, marginTop: 28 },
        }}
      />

      <Tab.Screen
        name="Puzzles"
        component={() => <Placeholder name="Puzzles" />}
        options={{
          tabBarLabel: 'Puzzles',
          tabBarIcon: ({ focused }) => (
            <TabIcon label="Puzzles" focused={focused} emoji="🧩" />
          ),
        }}
      />

      <Tab.Screen
        name="Profile"
        component={() => <Placeholder name="Profile" />}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ focused }) => (
            <TabIcon label="Profile" focused={focused} emoji="👤" />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.light,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    height: Platform.OS === 'ios' ? 88 : 68,
    paddingBottom: Platform.OS === 'ios' ? 28 : 8,
    paddingTop: spacing[2],
    ...shadows.md,
  },

  tabItem: {
    paddingTop: spacing[1],
  },

  tabLabel: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.bold,
    fontWeight: fontWeight.bold,
    letterSpacing: 0.3,
    marginTop: 2,
  },

  // ── Regular tab icon ─────────────────────────────────

  iconWrapper: {
    width: 32,
    height: 32,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },

  iconWrapperActive: {
    backgroundColor: colors.primaryFaint,
  },

  iconEmoji: {
    fontSize: 18,
    opacity: 0.5,
  },

  iconEmojiActive: {
    opacity: 1,
  },

  // ── Center Play tab ───────────────────────────────────

  centerTabContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -20, // Lifts the button above the tab bar
  },

  centerTabButton: {
    width: 56,
    height: 56,
    borderRadius: radius.full,
    backgroundColor: colors.dark,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.light,
    ...shadows.lg,
  },

  centerTabButtonActive: {
    backgroundColor: colors.primary,
  },

  centerTabEmoji: {
    fontSize: 24,
  },
});
