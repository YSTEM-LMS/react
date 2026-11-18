# Y STEM and Chess — design.md

> **For AI coding agents:** Load this file alongside `design-tokens.css` before generating any UI for the Y STEM and Chess platform. This document is the authoritative source of truth for visual language, component patterns, copywriting, and layout decisions. Do not invent design choices — use only what is documented here.

---

## 1. Brand Identity

**Organization:** Y STEM and Chess Inc. — a nonprofit in Boise, Idaho.
**Mission:** Empower socially and economically underserved children to pursue STEM careers through chess, math, computer science, and mentoring.
**Platform:** An educational web app where students learn, play chess, take lessons, solve puzzles, and track progress with a mentor.

### Tone
- **Encouraging and accessible** — students are often young and underserved; the platform should feel safe and welcoming
- **Warm but professional** — not childish, not corporate
- **Action-oriented** — verbs drive CTAs: Play, Learn, Empower, Join, Get Started, Donate
- **Inclusive** — "Everyone is included. Everyone is welcome." is a core brand phrase

### Three Core Words
`Play` · `Learn` · `Empower`

These appear in the footer and should be used as a lens when naming features or writing headings.

---

## 2. Color System

All colors are defined as Tailwind tokens in `tailwind.config.js`. **Never use raw hex values in JSX or TSX — always use Tailwind tokens or CSS variables from `design-tokens.css`.**

### Palette

| Token | Hex | Usage |
|---|---|---|
| `primary` | `#7FCC26` | Brand green. CTAs, active states, accents, toolbar backgrounds, progress indicators, timeline dots, focus rings |
| `secondary` | `#BFD99E` | Muted green. Hover states on SVG icons, inactive toolbar icons, supporting accent |
| `soft` | `#E5F3D2` | Light green. Page background (with chess piece SVG pattern), card backgrounds, icon containers, scrollbar track |
| `accent` | `#EAD94C` | Yellow. Active toolbar icon color, badge highlights, book card borders |
| `dark` | `#1F1F1F` | Near-black. Primary text, navbar border, footer border, card borders, button bg for `btn-primary` |
| `gray` | `#5C5C5C` | Secondary text. Body copy, nav link color (non-hover), dropdown items, timestamps, description text |
| `muted` | `#8A8A8A` | Placeholder text, disabled states, uppercase labels in footer contact section |
| `borderLight` | `#D6D6D6` | Borders, dividers, tab dividers, card borders in low-emphasis contexts |
| `light` | `#F9FAF7` | Off-white. Navbar background, footer background, form backgrounds, modal backgrounds, card surfaces, dropdown surfaces |
| `red` | `#D64545` | Errors, destructive actions, validation failure borders |
| `redLight` | `#F5E9E9` | Error state backgrounds (e.g., error modal icon container) |

### Color Rules

**Do:**
- Use `primary` for interactive elements that signal "do this" (buttons, links on hover, focus rings)
- Use `dark` on `light` for primary text — maximum contrast
- Use `gray` on `light` for secondary/descriptive text
- Use `soft` as the default page background (it includes a chess-piece SVG pattern)
- Use `accent` only for highlights and gamification elements — not for primary actions
- Use `primary/20` or `primary/30` (Tailwind opacity modifier) for subtle icon container tints

**Don't:**
- Use hardcoded hex values anywhere in JSX/TSX
- Use `primary` as a text color on `soft` backgrounds (insufficient contrast at small sizes)
- Use `accent` for error or destructive states — that's `red` / `redLight`
- Use `secondary` as a background for large areas — it's for hover states and icon tints
- Mix `gray` and `muted` arbitrarily — `gray` is for body content, `muted` is for metadata/labels

---

## 3. Typography

### Font

**Family:** `Lato`
**Fallbacks:** `system-ui, -apple-system, BlinkMacSystemFont, sans-serif`
**Loaded from:** Google Fonts (weights 400, 500, 700)

```html
<link href="https://fonts.googleapis.com/css2?family=Lato:wght@400;500;700&display=swap" rel="stylesheet">
```

The body always receives `font-family: Lato, ...` via the Tailwind `font-sans` extension. Do not apply a different font family to any element.

### Type Scale (observed in production)

| Role | Tailwind | Size | Weight | Color | Notes |
|---|---|---|---|---|---|
| Hero H1 | `text-3xl md:text-4xl font-bold` | 30–36px | 700 | `text-dark` | Left-aligned, `leading-relaxed` |
| Section H2 | `text-3xl md:text-4xl font-bold` | 30–36px | 700 | `text-dark` | Often centered |
| Card H3 | `text-xl md:text-2xl font-bold` | 20–24px | 700 | `text-dark` | |
| Nav links | `text-lg font-medium` | 18px | 500 | `text-dark` | Hover: `text-primary` |
| Body large | `text-xl md:text-2xl` | 20–24px | 400 | `text-gray` | Used in hero subtext |
| Body default | `text-base` | 16px | 400 | `text-dark` or `text-gray` | |
| Body small | `text-sm` | 14px | 400 | `text-gray` | Descriptions, timestamps |
| Caption / Label | `text-xs font-bold uppercase tracking-widest` | 12px | 700 | `text-muted` | Footer copyright, metadata labels |
| Dropdown section header | `text-base font-bold uppercase tracking-wide` | 16px | 700 | `text-dark` | |

### Typography Rules

- **Line height:** Use `leading-relaxed` (1.625) for body text blocks. Use `leading-normal` for default. Use `leading-tight` only for display/hero headings where line-height would cause too much space.
- **Bold usage:** `font-bold` (700) for headings and labels. `font-semibold` (600) for button text. `font-medium` (500) for nav links and interactive text. `font-normal` (400) for body copy.
- **Uppercase:** Only use for labels, metadata, section sub-labels, and the footer tagline. Never uppercase primary headings or CTA text.
- **Text colors on primary backgrounds:** Use `text-light` (`#F9FAF7`) for text placed on `bg-primary` green backgrounds.

---

## 4. Layout & Spacing

### Container Widths

| Context | Tailwind | Notes |
|---|---|---|
| Standard page sections | `max-w-7xl mx-auto px-6 md:px-8` | Hero, books, sponsors |
| Full-bleed dashboard | `max-w-screen-2xl mx-auto px-6` | Student profile, mentor dashboard |
| Narrow forms | `max-w-sm` | Login, signup — centered with `flex items-center justify-center` |
| Modal content | `max-w-sm` | Always centered in a full-screen overlay |
| Dropdown menus | `w-64` (About Us), `w-48` (Profile) | Absolute positioned |

### Page Structure

Every page follows this shell:
```
<NavBar />           ← sticky top-0 z-50, bg-light, border-b-2 border-dark, h-24
<main>               ← route-specific content
  <section>          ← content regions, vertically spaced with py-10 to py-16
</main>
<Footer />           ← bg-light, border-t-2 border-dark, pt-10 pb-8
```

The default `<body>` background is `bg-soft` (light green with chess-piece SVG pattern).

### Grid Patterns

| Pattern | Tailwind | Where used |
|---|---|---|
| Two-column hero | `flex flex-col md:flex-row gap-8` | Home hero, book items |
| Three-column footer | `grid grid-cols-1 lg:grid-cols-3 gap-12` | Footer |
| Dashboard sidebar | `grid grid-cols-1 lg:grid-cols-[280px_1fr]` | Student profile tabs |
| Card row | `flex flex-col md:flex-row items-stretch gap-12 md:gap-16 lg:gap-40 justify-center` | Free/Premium cards |
| Sponsor/partner logos | `flex flex-wrap justify-center items-center gap-12` | Logo grids |

### Spacing Conventions

- **Section vertical padding:** `py-10` to `py-16` for major sections
- **Card internal padding:** `p-8` for prominent cards, `p-4 md:p-6` for content cards
- **Inline gaps in nav/lists:** `gap-4` to `gap-6`
- **Form field gaps:** `gap-6` between fields, `gap-1.5` between label and input
- **Button margin from content:** `mt-4` to `mt-auto` (push to bottom of card)

### Responsive Breakpoints

The platform is mobile-first. All layouts stack vertically on mobile and expand on `md:` (768px) and `lg:` (1024px).

| Breakpoint | Key changes |
|---|---|
| Default (mobile) | Single column, `flex-col`, hamburger nav visible |
| `md:` | Two columns activate, hamburger hidden, desktop nav visible |
| `lg:` | Three columns, wider gaps, larger font sizes on hero |

**Mobile nav:** Hidden desktop nav (`hidden md:flex`), visible hamburger button (`flex md:hidden`). Mobile menu renders as a vertical `flex-col` below the header bar.

---

## 5. Component Patterns

### Buttons

Three defined button variants. Always use these — do not create new button styles.

#### `.btn-primary`
Dark pill button. Used for primary CTAs on light backgrounds (home page hero, book cards, start CTA).

```html
<button class="btn-primary">Donate</button>
```

Specs:
- Background: `bg-dark` (`#1F1F1F`)
- Text: `text-light font-semibold`
- Padding: `py-3 px-8`
- Shape: `rounded-full`
- Border: `border-2 border-dark`
- Hover: `scale-105`, `bg-black`
- Active: `scale-95`
- Focus: `ring-2 ring-primary`

#### `.btn-green`
Green rounded button. Used inside forms (login submit), modals (confirm), and as a secondary CTA.

```html
<button class="btn-green">Enter</button>
```

Specs:
- Background: `bg-primary` (`#7FCC26`)
- Text: `text-light text-xl font-semibold`
- Padding: `py-3 px-8`
- Shape: `rounded-xl` (not full)
- Shadow: `shadow-md`
- Hover: `opacity-90`, `scale-105`
- Disabled: `opacity-50 cursor-not-allowed`
- Focus: `ring-2 ring-primary/50`

#### `.btn-toolbar`
Transparent icon button for the student profile toolbar bar. Contains an SVG icon as its only child.

```html
<button class="btn-toolbar" aria-label="Streak">
  <SvgIcon class="w-full h-20" />
</button>
```

Specs:
- Background: transparent
- Max width: `max-w-xs`
- Hover: `scale-105`, Active: `scale-95`
- Focus: `ring-2 ring-accent`

### Cards

#### Primary Brand Card (Free/Premium tier)
Large rounded card with offset shadow — the most visually distinctive card pattern.

```html
<!-- Free tier: green background -->
<div class="flex flex-col justify-center items-center w-full md:w-1/2 lg:w-1/4 bg-primary rounded-3xl shadow-card-yellow p-8 gap-4">

<!-- Premium tier: light background -->
<div class="flex flex-col justify-center items-center w-full md:w-1/2 lg:w-1/4 bg-light rounded-3xl shadow-card-green p-8 gap-4">
```

Shadow values:
- `shadow-card-yellow`: `1.25rem 1.25rem 0.063rem rgb(209, 230, 28)`
- `shadow-card-green`: `1.25rem 1.25rem 0.063rem rgb(115, 179, 19)`

#### Content Card (Activity Feed)
Subtle card for list items, activity entries, and timeline events.

```html
<article class="bg-light border border-borderLight p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow">
```

#### Form / Auth Card
Contained form panel on a clean background.

```html
<form class="w-full max-w-sm bg-light rounded-2xl border-2 border-dark shadow-md p-8 flex flex-col gap-6">
```

#### CTA Box
Full-width bordered call-to-action block.

```html
<div class="border-4 border-primary rounded-lg py-12 px-6 gap-6 flex flex-col items-center">
```

#### Book / Media Card
Two-column item card with accent border.

```html
<div class="flex flex-col md:flex-row items-start border-2 border-accent p-4 md:p-6 rounded-md">
```

### Navigation

#### NavBar
```
Header: bg-light border-b-2 border-dark sticky top-0 z-50
Height: h-24
Logo: h-20 pl-4 (left-aligned)
Desktop nav: hidden md:flex items-center gap-6
Mobile trigger: flex md:hidden
Nav links: px-4 text-lg font-medium text-dark hover:text-primary
```

Dropdowns animate in with Framer Motion (`opacity: 0, translateY: -25` → `opacity: 1, translateY: 0`, duration 0.3s). They use `bg-light rounded-md shadow-lg p-4 z-20`. Section headers inside dropdowns are `text-base font-bold uppercase tracking-wide text-dark`. Links inside are `text-base text-gray hover:text-primary`.

#### Profile Dropdown
`bg-light rounded-lg shadow-lg p-3 w-48 z-20`, same motion entry as above.

### Forms & Inputs

Standard input pattern:

```tsx
const inputClass = (invalid: boolean) =>
  `w-full rounded-lg border-2 px-4 py-3 text-sm text-dark bg-white caret-dark
   focus:outline-none focus:shadow-none transition-colors ${
    invalid ? "border-red" : "border-borderLight focus:border-primary"
  }`;
```

- Default border: `border-borderLight`
- Focus border: `border-primary`
- Error border: `border-red`
- Error message: `text-red font-semibold` with `role="alert"`
- Labels: `text-sm font-bold text-dark`
- Field gap: `gap-1.5` between label and input

### Modal

The shared `Modal` component (success/error/loading):

```
Overlay: fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark/50
Content: bg-light w-full max-w-sm rounded-2xl shadow-xl p-8 flex flex-col items-center gap-5 animate-modal-in
Icon container (success): w-16 h-16 rounded-full bg-primary/20
Icon container (error): w-16 h-16 rounded-full bg-redLight
Loading spinner: w-16 h-16 rounded-full border-4 border-soft border-t-primary animate-spin
Title: text-xl font-bold text-dark text-center
Message: text-sm text-gray text-center leading-relaxed
Button: btn-green w-full mt-1
```

ESC key closes non-loading modals. Click-outside behavior is optional per modal implementation.

### Student Profile Toolbar
Full-width `bg-primary py-4` bar at top of student dashboard. Contains up to 4 `.btn-toolbar` buttons in a centered flex row (`gap-4`). Icons use SVG React components colored with Tailwind:
- Inactive: `text-secondary hover:text-accent`
- Active: `text-accent`

### Tab Navigation (Sidebar)
Dashboard sidebar: `bg-primary border-r border-borderLight`, `w-[280px]` on large screens.

Tab buttons:
```html
<!-- Active -->
<button class="w-full flex items-center gap-3 p-4 rounded-lg bg-light shadow-sm">

<!-- Inactive -->
<button class="w-full flex items-center gap-3 p-4 rounded-lg hover:bg-light">
```

Icons: `w-12 h-12 object-contain` — grayscale when inactive (`grayscale`), full color when active (`grayscale-0`).

### Activity Timeline
Infinite-scroll feed with a vertical dotted line on the left.

```
Container: max-h-[700px] overflow-y-auto pr-2 activity-scrollbar
Timeline track: absolute left-4 top-0 bottom-0, border-l-[3px] border-dotted border-gray
Items: pl-12 space-y-4
Dot: absolute -left-9 top-6 w-3 h-3 bg-primary rounded-full border-2 border-light shadow-sm
Item card: bg-light border border-borderLight p-4 rounded-lg shadow-sm hover:shadow-md
Clickable event name: text-primary underline cursor-pointer hover:text-secondary
```

### Progress / Stats Section
Inside student dashboard, beneath the chart:

```
Container: bg-light rounded-2xl overflow-hidden shadow-lg
Section header: bg-primary p-6, text: font-bold text-3xl text-light
Chart wrapper: h-72 w-full max-w-2xl
Stats list: list-none space-y-2, labels: text-dark font-medium, values: text-primary font-bold
```

### Mascot Characters (Stemette & Stemmy)
SVG mascots used in the Streak Modal and other gamification UIs. Rendered as inline SVG React components. They appear alongside speech bubbles with green/rounded styling. Do not use them in non-gamification contexts.

### Confetti
`<Confetti show={boolean} />` — full-screen animation component. Triggered on portrait click and learning tab switch. Do not add confetti to destructive or neutral interactions.

### Footer

Three-column grid (`grid-cols-1 lg:grid-cols-3 gap-12`) inside `bg-light border-t-2 border-dark pt-10 pb-8`:

1. **Branding:** `YSTEM<span class="text-primary">&CHESS</span>` — "Empowering Tomorrow's STEM Leaders"
2. **Contact:** Phone + email as anchor tags. Icon container: `w-10 h-10 bg-soft rounded-md border border-primary/20 group-hover:bg-primary group-hover:text-light`
3. **Socials:** Icon links with `hover:bg-soft rounded-lg p-2`

Bottom bar: copyright left, `Play · Learn · Empower` right in `text-xs font-bold text-primary uppercase`.

---

## 6. Motion & Animation

### Defined Animations (Tailwind keyframes)

| Class | Effect | Duration | Use |
|---|---|---|---|
| `animate-modal-in` | Scale `0.95` + `translateY(8px)` → `1` + `0`, fade in | 0.15s ease-out | All modal entry |
| `animate-fade-out` | Opacity + `translateY(-5px)` out | 0.4s ease, 2.1s delay, forwards | Toast/notification dismiss |
| `animate-shake` | `translateX` ±5px | 0.5s ease | Form validation error |
| `animate-spin` | Full rotation | 1s linear infinite | Loading spinners |

### Framer Motion Patterns

NavBar dropdowns and profile menus use Framer Motion with these shared variants:

```js
const navbarVariants = {
  parentInitial: { opacity: 0, translateY: -25 },
  parentAnimate: { opacity: 1, translateY: -10, transition: { duration: 0.3 } },
  childInitial: { opacity: 0, translateY: -25 },
  childAnimate: { opacity: 1, translateY: 0, transition: { duration: 0.3, staggerChildren: 0.125 } },
};
```

### Hover Transitions

| Pattern | Classes | Use |
|---|---|---|
| Scale up on hover | `transition-transform hover:scale-105 active:scale-95` | Buttons, cards, avatar |
| Color transition | `transition-colors duration-300` or `duration-500` | Links, icon containers |
| Shadow lift | `shadow-sm hover:shadow-md transition-shadow` | Activity cards |
| Translate right | `hover:translate-x-1 transition-transform` | Footer contact links |
| Opacity dim | `transition-opacity hover:opacity-80` | Sponsor logos |

### Rules
- All interactive elements should have a hover state — no bare unstyled hover interactions
- Scale transforms are preferred over shadow-only hover effects for primary CTAs
- Duration 200–300ms for fast micro-interactions, 500ms for button color transitions
- Use `duration-200` for toolbar/nav, `duration-300` for cards, `duration-500` for buttons

---

## 7. Imagery & Assets

### Logo
- **Full logo:** `full_logo.png` — used in NavBar (`h-20 pl-4`) and Programs page
- **Logo line break:** `LogoLineBreak.png` — full-width decorative divider between sections (`w-full mx-auto`, `role="presentation"`, empty `alt`)
- **Footer wordmark:** `YSTEM<span class="text-primary">&CHESS</span>` — CSS text, not an image

### Background Pattern
The `.bg-soft` CSS class applies the chess-piece SVG repeating background:
```css
background-image: url('./assets/images/chess-piece-pattern.svg');
background-repeat: repeat;
background-size: 100%;
```
This is the default page body background. Do not override it with a plain color on full-page layouts.

### Icon Libraries

Two icon libraries are in use — use them consistently, do not import from other libraries:

| Library | Import | Use |
|---|---|---|
| `lucide-react` | `import { IconName } from 'lucide-react'` | General UI icons (preferred for new work) |
| `@tabler/icons-react` | `import { IconName } from '@tabler/icons-react'` | General UI icons |
| `react-icons/fa6` | `import { FaLinkedin } from 'react-icons/fa6'` | Social media icons (footer only) |
| `@fortawesome/react-fontawesome` | FontAwesome | Caret icons in NavBar dropdowns |

For new components, prefer `lucide-react`. Match the style already in use in the target area.

### Student Dashboard Icons
SVG icons for tabs and toolbar buttons live in `src/assets/images/StudentInventoryIcons/` and `src/assets/images/student/`. They are imported as React SVG components or as `src` strings for `<img>` tags.

### Images
- Student photos: in `src/assets/images/student/` — real photography, not illustrations
- Sponsor/partner logos: `src/assets/images/sponsors/` and `src/assets/images/partners/`
- Mascot characters: SVG React components (`Stemette`, `Stemmy`, `StreakIcon`, etc.)
- Books: Cover images from `src/assets/images/`

Always include meaningful `alt` text. Use `alt=""` and `role="presentation"` for purely decorative images (logo line breaks, background flourishes).

---

## 8. Copywriting Principles

### Voice
- Direct and action-oriented: "Join Now", "Get Started", "Donate", "Apply Now"
- Warm and inclusive: never elitist, never condescending
- Honest about access: "For students who qualify for free and reduced lunch" — plainspoken, not euphemistic

### Headings
- Use sentence case for most headings: "Everyone is included. Everyone is welcome."
- Capitalize proper nouns and brand names: "Y STEM and Chess", "Devin Nakano"
- Avoid question headings in primary CTAs — prefer declarative statements

### CTAs
- Primary: Short imperative verbs — "Donate", "Join Now!", "Get Started!", "Apply Now!", "Buy Now!"
- Secondary navigation: descriptive — "Create a new account", "Forgot password?"
- Exclamation marks are acceptable on primary student-facing CTAs ("Join Now!")
- Never use generic "Click Here" or "Learn More" without context

### Error Messages
- Be specific: "The username or password is incorrect." not "An error occurred."
- Validation: "Invalid username or password" — direct, not alarming
- Never blame the user: avoid "You entered the wrong..." — prefer "The username or password is incorrect."

### Empty States
- Acknowledge absence and direct to action: "Head to the Mentor tab to play chess with the AI tutor!"
- Use encouraging language for gamification empty states

### Loading States
- Be patient and informative: "Loading more activities...", "Loading lessons page..."
- Use a spinner (`.animate-spin`) paired with a short message

### Accessibility Language
- All interactive elements must have `aria-label` when the visible text is insufficient
- Use `role="alert"` for dynamic error messages
- Use `aria-expanded` on dropdown triggers

---

## 9. Anti-Patterns — What NOT to Do

The following patterns are explicitly forbidden. Agents must not produce these.

### Visual Anti-Patterns

| Anti-pattern | Why | Correct approach |
|---|---|---|
| Hardcoded hex values in JSX | Breaks token system, hard to update | Use Tailwind tokens (`text-primary`, `bg-soft`) or CSS vars |
| Creating a new button style | Fragment existing variants | Use `.btn-primary`, `.btn-green`, or `.btn-toolbar` |
| Using `bg-primary` as a large section background without `text-light` | Text becomes illegible | Always pair `bg-primary` with `text-light` or `text-dark` carefully |
| `rounded-full` on non-pill buttons | Inconsistent with `btn-green` which is `rounded-xl` | Match the correct variant |
| New font families | Off-brand | Lato only |
| Inline style `style={{}}` for colors or spacing | Bypasses token system | Tailwind utilities only |
| `text-accent` for body text | Accent yellow has poor contrast on white | Reserve for badges/highlights only |
| Shadow values not in the shadow scale | Visually inconsistent | Use `shadow-sm`, `shadow-md`, `shadow-lg`, `shadow-xl`, `shadow-card-yellow`, `shadow-card-green` |

### CSS / Class Anti-Patterns

| Anti-pattern | Why | Correct approach |
|---|---|---|
| String interpolation of Tailwind classes: `` `text-${color}` `` | Tailwind can't purge dynamic classes | Use `cn()` with full class names: `cn({ 'text-primary': isActive })` |
| Not using `cn()` for conditional classes | Produces messy or broken class merging | Always use `import { cn } from 'src/core/utils/cn'` |
| Importing SCSS for layout/spacing | SCSS is for complex component-specific overrides only | Use Tailwind for all layout, spacing, and color |
| Adding `!important` | Signals a specificity war | Fix the cascade instead |
| Global button override in SCSS | `Student.scss` already has an erroneous `button { background-color: #0046fd }` — do not replicate this pattern | Use class-scoped styles only |

### Layout Anti-Patterns

| Anti-pattern | Why | Correct approach |
|---|---|---|
| Fixed pixel widths | Breaks responsiveness | Use `max-w-*`, percentages, or `flex-1` |
| Desktop-first responsive design | Platform is mobile-first | Write mobile styles first, add `md:` and `lg:` overrides |
| Missing `aria-label` on icon-only buttons | Inaccessible | Always add `aria-label` to buttons without visible text |
| Using `<div>` for nav menus | Inaccessible | Use `<nav>`, `<ul>`, `<li>` for navigation |
| Not using `max-w-7xl mx-auto` for page sections | Content spans full width, breaking readability on large screens | Always constrain content with a max-width container |

### Content Anti-Patterns

| Anti-pattern | Correct approach |
|---|---|
| Generic CTAs: "Click Here", "Learn More" | Use specific action verbs |
| Missing alt text | Always add meaningful `alt` |
| Decorative images with alt text describing decoration | Use `alt=""` + `role="presentation"` |
| Blame-the-user error messages | Neutral, helpful phrasing |

---

## 10. CSS Primitives Reference

The companion file `design-tokens.css` (in the same `documentation/` directory) is a standalone, build-step-free stylesheet with all tokens as CSS custom properties and all reusable component classes in plain CSS. Any agent or environment without access to the Tailwind build can use it directly.

### Available CSS variables (from `design-tokens.css`)

```css
/* Colors */
--color-primary, --color-secondary, --color-soft, --color-accent,
--color-dark, --color-gray, --color-muted, --color-border-light,
--color-light, --color-red, --color-red-light

/* Typography */
--font-family-base, --font-weight-normal, --font-weight-medium, --font-weight-bold

/* Spacing (4px base scale) */
--space-1 through --space-24

/* Shadows */
--shadow-sm, --shadow-md, --shadow-lg, --shadow-xl,
--shadow-card-yellow, --shadow-card-green

/* Border radius */
--radius-sm, --radius-md, --radius-lg, --radius-xl, --radius-2xl, --radius-3xl, --radius-full

/* Animation */
--duration-fast, --duration-base, --duration-slow
--easing-default, --easing-out
```

### Available utility classes (from `design-tokens.css`)

- `.btn-primary` — dark pill button
- `.btn-green` — green rounded button
- `.btn-toolbar` — transparent icon button
- `.activity-scrollbar` — green custom scrollbar
- `.modal-overlay` — full-screen dark backdrop
- `.modal-content` — centered white modal panel
- `.input-base` — standard text input
- `.input-error` — error state input
- `.card` — subtle content card
- `.card-brand-green` — primary brand card (green bg, yellow shadow)
- `.card-brand-light` — primary brand card (light bg, green shadow)
