# YSTEM Mobile App — UI/UX Screen Library

Designed by Sandith Hewage (UI/UX Engineer, Y STEM and Chess)
For the Cal Poly CSS team building the React Native + Expo mobile app.

---

## Overview

This directory contains all screen components for the YSTEM mobile app across 5 SOW deliverables:

| Deliverable | Screens |
|---|---|
| D1 — Auth + Navigation | `LoginScreen`, `SignUpScreen`, `TabNavigator`, `HomeScreen` |
| D2 — Lessons | `LessonsSelectionScreen`, `LessonScreen` |
| D3 — Puzzles | `PuzzlesScreen` |
| D4 — Play vs Computer | `PlaySetupScreen`, `PlayGameScreen` |

---

## File Structure

```
mobile-ui/
├── screens/
│   ├── LoginScreen.tsx           # D1 — Email/password login
│   ├── SignUpScreen.tsx          # D1 — Registration with role selector
│   ├── HomeScreen.tsx            # D1 — Welcome hero, stats, activity feed
│   ├── LessonsSelectionScreen.tsx # D2 — Piece cards + lesson list
│   ├── LessonScreen.tsx          # D2 — Board + instruction walkthrough
│   ├── PuzzlesScreen.tsx         # D3 — Full-width board + puzzle info
│   ├── PlaySetupScreen.tsx       # D4 — Color picker + difficulty grid
│   └── PlayGameScreen.tsx        # D4 — Live game board + tutor panel
├── navigation/
│   └── TabNavigator.tsx          # D1 — Bottom tab bar
└── README.md
```

---

## Setup

### 1. Install dependencies

```bash
npx expo install @expo-google-fonts/lato expo-font expo-linear-gradient
npx expo install react-native-safe-area-context @react-navigation/native @react-navigation/bottom-tabs
```

### 2. Copy design tokens

Copy `design-tokens.rn.ts` (one level up: `documentation/design-tokens.rn.ts`) into your project src:

```bash
cp documentation/design-tokens.rn.ts src/design-tokens.rn.ts
```

### 3. Update token imports

Each screen imports from `'../design-tokens.rn'` — adjust the relative path to match your project structure.

### 4. Load fonts in App.tsx

```tsx
import { useFonts, Lato_400Regular, Lato_700Bold } from '@expo-google-fonts/lato';

export default function App() {
  const [fontsLoaded] = useFonts({ Lato_400Regular, Lato_700Bold });
  if (!fontsLoaded) return null;
  // ...
}
```

---

## Design Principles

- **All colors, spacing, radius, and shadows** come from `design-tokens.rn.ts` — no hardcoded hex values
- **Screen background:** `colors.soft` (#E5F3D2)
- **Card surfaces:** `colors.light` (#F9FAF7)
- **Primary CTA:** `btnPrimaryStyle` (dark pill)
- **Green CTA:** `btnGreenStyle` (brand green rounded)
- **Min tap target:** 44pt for all interactive elements
- **Chess board:** `aspectRatio: 1` + `width: '100%'` for square constraint
- **Safe area:** All screens wrap content in `SafeAreaView` or add `paddingBottom` for home indicator

---

## Brand Colors Quick Reference

| Token | Hex | Use |
|---|---|---|
| `primary` | `#7FCC26` | CTAs, active states, progress |
| `secondary` | `#BFD99E` | Inactive tabs, muted accents |
| `soft` | `#E5F3D2` | Screen backgrounds |
| `accent` | `#EAD94C` | Streaks, badges, highlights |
| `dark` | `#1F1F1F` | Text, btn-primary background |
| `light` | `#F9FAF7` | Card surfaces, form fields |
