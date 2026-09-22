# Design System — Tokens & Color

**Status:** Proposed · **Version:** 0.1 · **Date:** 2026-06-18
**Owner:** Sandith Hewage

This document covers the token layer only: color, typography, spacing, radius, elevation, and
the Tailwind config changes that wire them up.

---

## Contents

1. [Background](#1-background)
2. [Current state](#2-current-state)
3. [What changes and why](#3-what-changes-and-why)
4. [Color](#4-color)
5. [Typography](#5-typography)
6. [Spacing & radius](#6-spacing--radius)
7. [Elevation](#7-elevation)
8. [Engineering handoff — tailwind.config.js]
9. [Migration notes](#9-migration-notes)

---

## 1. Background

A partial style guide exists in Figma: three brand colors, two fonts with identical scales, a
12-column grid, and a button set with many color variants but no states or usage rules.

The gaps causing real bugs today:

- No hover/active/disabled states on any button.
- White text on green and yellow backgrounds — both fail WCAG AA contrast by a large margin.
- "Free" lesson cards rendered with three different visual treatments in the same view.
- No documented neutral ramp; grays are guessed per-component.

This PR establishes a token vocabulary and updates `tailwind.config.js` so every future
component can reference names instead of raw hex values.

---

## 2. Current state

`tailwind.config.js` already defines a partial set of tokens. These are the **existing values**
that this PR builds on — none are removed without a noted reason.

### Existing color tokens

| Token | Hex | Role |
|---|---|---|
| `primary` | `#7FCC26` | Brand green — primary actions |
| `secondary` | `#BFD99E` | Soft sage — secondary fills |
| `soft` | `#E5F3D2` | Light cream — app background, scrollbars |
| `accent` | `#EAD94C` | Brand yellow — accent/promo actions |
| `dark` | `#1F1F1F` | Near-black — primary text (**see §3**) |
| `gray` | `#5C5C5C` | Mid gray — secondary text |
| `muted` | `#8A8A8A` | Muted text |
| `borderLight` | `#D6D6D6` | Borders, dividers |
| `light` | `#F9FAF7` | Off-white — button text, light surfaces |
| `red` | `#D64545` | Error red |
| `redLight` | `#F5E9E9` | Error background |

### Existing font

Lato (400 / 500 / 700) loaded from Google Fonts and set as the `sans` family in the config.
No heading font is assigned separately — one font family covers everything.

### Existing animations

`modal-in`, `fade-out`, and `shake` keyframes are defined and in use. These are not changed.

---

## 3. What changes and why

### 3.1 Color token naming

The existing names (`primary`, `dark`, `gray`) are flat. They work for small projects but
break down when you need hover/active states or semantic meaning. This PR adds a **ramp layer**
alongside the existing tokens and a **semantic alias layer** on top of both.

The existing tokens are kept as-is for backwards compatibility — no existing component breaks.
The ramps and aliases are additive.

### 3.2 The `dark` value

`dark` is currently `#1F1F1F`. Figma documents the brand near-black as `#231F20`. These are
close but not identical, and both appear in the codebase in different places.

**Resolution:** Keep `dark: "#1F1F1F"` as the active token (it has the most usage). Add
`ink: "#231F20"` to the config with a comment noting the Figma source, so it's available for
review. Audit which one matches the Figma master file and remove the other in PR 2.

### 3.3 Contrast failures (required fix)

Both brand colors fail WCAG AA when paired with white text. This is the most important
accessibility finding in the audit. The ramp supplies safe darker shades for text and states.

| Background | + White text | + Dark text (`#1F1F1F`) | Rule |
|---|---|---|---|
| `#7FCC26` (green-500) | ~2.0:1 — **fail** | ~9:1 — pass | Dark text only |
| `#EAD94C` (yellow-500) | ~1.5:1 — **fail** | ~13:1 — pass | Dark text only |
| `#548A14` (green-700) | ~3.9:1 | — | Large text / icons on white only |
| `#3D6610` (green-800) | ~6.0:1 | — | Body text on white |

> Verify ratios in [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
> before finalizing. Values above are approximate.

---

## 4. Color

### 4.1 Brand primitives (existing, unchanged)

| Token | Hex |
|---|---|
| `primary` | `#7FCC26` |
| `secondary` | `#BFD99E` |
| `soft` | `#E5F3D2` |
| `accent` | `#EAD94C` |

### 4.2 Green ramp (new)

Supplies safe hover/active states and text-safe shades of the brand green.

| Token | Hex | Use |
|---|---|---|
| `green.50` | `#F1F9E8` | Faint background wash |
| `green.100` | `#DEF0C4` | Light fills, subtle hover backgrounds |
| `green.300` | `#B5E07A` | Borders, secondary accents |
| `green.500` | `#7FCC26` | Same as `primary` — primary button fill |
| `green.600` | `#6BB01E` | Primary button hover |
| `green.700` | `#548A14` | Primary button active; large text/icons on white |
| `green.800` | `#3D6610` | Green text on white (passes AA for body text) |

### 4.3 Yellow ramp (new)

| Token | Hex | Use |
|---|---|---|
| `yellow.100` | `#FAF3C9` | Light highlight background |
| `yellow.500` | `#EAD94C` | Same as `accent` — accent button fill |
| `yellow.600` | `#DCC93A` | Accent button hover |
| `yellow.700` | `#B89B1E` | Accent button active; yellow text on white (sparingly) |

### 4.4 Neutral ramp (new)

Replaces the current flat `gray` / `muted` / `borderLight` with a full scale. Existing tokens
are kept; ramp entries fill the gaps.

| Token | Hex | Use |
|---|---|---|
| `white` | `#FFFFFF` | Card / modal backgrounds |
| `neutral.50` | `#FAFAFA` | Subtle page background alternative |
| `neutral.100` | `#F4F4F5` | Disabled fills |
| `neutral.200` | `#E4E4E7` | Stronger disabled fills |
| `neutral.300` | `#D4D4D8` | Borders, dividers (replaces `borderLight: #D6D6D6`) |
| `neutral.500` | `#71717A` | Muted / secondary text (replaces `muted: #8A8A8A`) |
| `neutral.700` | `#3F3F46` | Strong secondary text (replaces `gray: #5C5C5C`) |
| `ink` | `#231F20` | Figma brand near-black — audit vs `dark` in PR 2 |

### 4.5 Semantic colors (new)

| Token | Hex | Notes |
|---|---|---|
| `success` | `#2E7D32` | Deeper than brand green so it reads as text |
| `error` | `#DC2626` | Replaces `red: #D64545` — slightly deeper, same hue family |
| `errorLight` | `#FEF2F2` | Background for error states (replaces `redLight: #F5E9E9`) |
| `warning` | `#B45309` | Dark amber, readable on light backgrounds |
| `info` | TBD | Sample from mascot artwork SVGs and fill in before merging |

### 4.6 Semantic aliases (new)

Components should reference aliases, not primitives directly. A future rebrand means updating
the alias, not every component.

| Alias | Points at | Use |
|---|---|---|
| `action.primary` | `green.500` | Main CTA fills |
| `action.primaryHover` | `green.600` | Primary button hover |
| `action.primaryActive` | `green.700` | Primary button active |
| `action.accent` | `yellow.500` | Donate / promo fills |
| `action.accentHover` | `yellow.600` | Accent button hover |
| `text.primary` | `dark` | Default body text |
| `text.muted` | `neutral.500` | Secondary / helper text |
| `text.onBrand` | `dark` | Text on green or yellow — never white |
| `border.default` | `neutral.300` | Standard borders |
| `bg.app` | `soft` | App-level background |
| `bg.surface` | `white` | Card / panel backgrounds |

### 4.7 Rules

- Never put white text on `primary` or `accent` — both fail contrast.
- Use `green.800` when green itself must appear as text.
- Reference semantic aliases in components; use primitives only in the alias definitions.
- Do not introduce a one-off hex value — extend the ramp instead.

---

## 5. Typography

### 5.1 Current font

Lato is the active typeface, loaded in `src/index.css` and configured as the `sans` family.
No change is made here. The Figma audit found Work Sans and Poppins in design files; if a font
switch is decided, that is a separate PR with broader scope.

### 5.2 Type scale

Sizes as documented in Figma. Line heights and weights are additions to fill the gaps.

| Token | Size | Line height | Weight | Use |
|---|---|---|---|---|
| `text.heading` | 40px | 1.2 | 600 | Page titles (one per page) |
| `text.subheading` | 32px | 1.25 | 600 | Section titles |
| `text.body` | 24px | 1.5 | 400 | Default reading text |
| `text.button` | 20px | 1.0 | 600 | Button labels |
| `text.caption` | 16px | 1.4 | 400 | Captions, helper text |

> Note: 24px body text is intentionally large for the student audience. Do not reduce below
> 16px at any breakpoint.

### 5.3 Responsive scaling

| Breakpoint | Heading | Subheading |
|---|---|---|
| Default | 40px | 32px |
| `sm` (640px) | 30px | 24px |

Body text does not scale down.

---

## 6. Spacing & radius

### 6.1 Spacing scale (4px base)

| Token | px |
|---|---|
| `space.1` | 4 |
| `space.2` | 8 |
| `space.3` | 12 |
| `space.4` | 16 |
| `space.6` | 24 |
| `space.8` | 32 |
| `space.12` | 48 |
| `space.16` | 64 |

Use scale steps only. No arbitrary margin or padding values.

### 6.2 Radius

| Token | px | Use |
|---|---|---|
| `radius.sm` | 4 | Inputs, chips |
| `radius.md` | 8 | Buttons, cards |
| `radius.lg` | 16 | Modals, large cards |
| `radius.full` | 9999 | Pills, avatars |

---

## 7. Elevation

Keep shadows subtle — heavy shadows render poorly on low-end screens.

| Token | Value |
|---|---|
| `shadow.sm` | `0 1px 2px rgba(31, 31, 31, 0.08)` |
| `shadow.md` | `0 2px 8px rgba(31, 31, 31, 0.10)` |
| `shadow.lg` | `0 8px 24px rgba(31, 31, 31, 0.12)` |

Uses `#1F1F1F` (the `dark` token value) as the shadow base color, not pure black.

---

## 8. Engineering handoff — tailwind.config.js

Replace the `colors` block in `tailwind.config.js` with the following. All **existing tokens
are preserved** — nothing currently working will break. New entries are additive.

```js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // --- Existing brand tokens (unchanged) ---
        primary:   "#7FCC26",
        secondary: "#BFD99E",
        soft:      "#E5F3D2",
        accent:    "#EAD94C",

        // --- Existing neutral tokens (unchanged) ---
        dark:        "#1F1F1F",
        gray:        "#5C5C5C",
        muted:       "#8A8A8A",
        borderLight: "#D6D6D6",
        light:       "#F9FAF7",

        // --- Existing error tokens (unchanged) ---
        red:      "#D64545",
        redLight: "#F5E9E9",

        // --- Green ramp (new) ---
        green: {
          50:  "#F1F9E8",
          100: "#DEF0C4",
          300: "#B5E07A",
          500: "#7FCC26", // same as `primary`
          600: "#6BB01E",
          700: "#548A14",
          800: "#3D6610",
        },

        // --- Yellow ramp (new) ---
        yellow: {
          100: "#FAF3C9",
          500: "#EAD94C", // same as `accent`
          600: "#DCC93A",
          700: "#B89B1E",
        },

        // --- Neutral ramp (new) ---
        neutral: {
          50:  "#FAFAFA",
          100: "#F4F4F5",
          200: "#E4E4E7",
          300: "#D4D4D8",
          500: "#71717A",
          700: "#3F3F46",
        },

        // --- Figma near-black (audit vs `dark` in PR 2) ---
        ink: "#231F20",

        // --- Semantic colors (new) ---
        success:   "#2E7D32",
        error:     "#DC2626",
        errorLight: "#FEF2F2",
        warning:   "#B45309",
        info:      "TODO", // sample exact hex from mascot SVGs before merging

        // --- Semantic aliases (new) ---
        // Components should reference these, not raw primitives.
        action: {
          primary:       "#7FCC26",
          primaryHover:  "#6BB01E",
          primaryActive: "#548A14",
          accent:        "#EAD94C",
          accentHover:   "#DCC93A",
        },
        text: {
          primary:  "#1F1F1F",
          muted:    "#71717A",
          onBrand:  "#1F1F1F", // never white on green or yellow
        },
        border: {
          default: "#D4D4D8",
        },
        bg: {
          app:     "#E5F3D2", // same as `soft`
          surface: "#FFFFFF",
        },
      },

      // --- Spacing scale (new) ---
      spacing: {
        "space-1":  "4px",
        "space-2":  "8px",
        "space-3":  "12px",
        "space-4":  "16px",
        "space-6":  "24px",
        "space-8":  "32px",
        "space-12": "48px",
        "space-16": "64px",
      },

      // --- Border radius (new) ---
      borderRadius: {
        sm:   "4px",
        md:   "8px",
        lg:   "16px",
        full: "9999px",
      },

      fontFamily: {
        sans: ["Lato", "system-ui", "-apple-system", "BlinkMacSystemFont", "sans-serif"],
      },

      boxShadow: {
        // Existing
        "card-yellow": "1.25rem 1.25rem 0.063rem rgb(209, 230, 28)",
        "card-green":  "1.25rem 1.25rem 0.063rem rgb(115, 179, 19)",
        // New elevation scale
        sm: "0 1px 2px rgba(31, 31, 31, 0.08)",
        md: "0 2px 8px rgba(31, 31, 31, 0.10)",
        lg: "0 8px 24px rgba(31, 31, 31, 0.12)",
      },

      keyframes: {
        "modal-in": {
          "0%":   { opacity: "0", transform: "scale(0.95) translateY(8px)" },
          "100%": { opacity: "1", transform: "scale(1)   translateY(0)"    },
        },
        "fade-out": {
          to: { opacity: "0", transform: "translateY(-5px)" },
        },
        shake: {
          "0%, 100%": { transform: "translateX(0)" },
          "25%":      { transform: "translateX(-5px)" },
          "75%":      { transform: "translateX(5px)" },
        },
      },
      animation: {
        "modal-in": "modal-in 0.15s ease-out",
        "fade-out": "fade-out 0.4s ease 2.1s forwards",
        shake:      "shake 0.5s ease",
      },
    },
  },
  plugins: [],
};
```

---

## 9. Migration notes

### Before merging

- [ ] Resolve the `info` color — find the exact hex from the mascot SVGs in `src/assets/` and
  replace the `"TODO"` placeholder.
- [ ] Verify contrast ratios in §3.3 using WebAIM's checker.
- [ ] Audit `dark: "#1F1F1F"` vs `ink: "#231F20"` — check the Figma master file and decide
  which is canonical. Remove the other in PR 2.
