---
name: Modern Academic SaaS
colors:
  surface: '#faf8ff'
  surface-dim: '#d2d9f4'
  surface-bright: '#faf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f3ff'
  surface-container: '#eaedff'
  surface-container-high: '#e2e7ff'
  surface-container-highest: '#dae2fd'
  on-surface: '#131b2e'
  on-surface-variant: '#434655'
  inverse-surface: '#283044'
  inverse-on-surface: '#eef0ff'
  outline: '#737686'
  outline-variant: '#c3c6d7'
  surface-tint: '#0053db'
  primary: '#004ac6'
  on-primary: '#ffffff'
  primary-container: '#2563eb'
  on-primary-container: '#eeefff'
  inverse-primary: '#b4c5ff'
  secondary: '#006a61'
  on-secondary: '#ffffff'
  secondary-container: '#86f2e4'
  on-secondary-container: '#006f66'
  tertiary: '#006056'
  on-tertiary: '#ffffff'
  tertiary-container: '#007b6e'
  on-tertiary-container: '#b1fff1'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dbe1ff'
  primary-fixed-dim: '#b4c5ff'
  on-primary-fixed: '#00174b'
  on-primary-fixed-variant: '#003ea8'
  secondary-fixed: '#89f5e7'
  secondary-fixed-dim: '#6bd8cb'
  on-secondary-fixed: '#00201d'
  on-secondary-fixed-variant: '#005049'
  tertiary-fixed: '#71f8e4'
  tertiary-fixed-dim: '#4fdbc8'
  on-tertiary-fixed: '#00201c'
  on-tertiary-fixed-variant: '#005048'
  background: '#faf8ff'
  on-background: '#131b2e'
  surface-variant: '#dae2fd'
typography:
  display-hero:
    fontFamily: Plus Jakarta Sans
    fontSize: 3rem
    fontWeight: '700'
    lineHeight: 3.5rem
    letterSpacing: -0.025em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 2rem
    fontWeight: '600'
    lineHeight: 2.5rem
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 1.625rem
    fontWeight: '600'
    lineHeight: 2.125rem
    letterSpacing: -0.015em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 1.5rem
    fontWeight: '600'
    lineHeight: 2rem
    letterSpacing: -0.015em
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 1.125rem
    fontWeight: '600'
    lineHeight: 1.625rem
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 1rem
    fontWeight: '400'
    lineHeight: 1.5rem
  body-md:
    fontFamily: Inter
    fontSize: 0.875rem
    fontWeight: '400'
    lineHeight: 1.375rem
  body-sm:
    fontFamily: Inter
    fontSize: 0.75rem
    fontWeight: '400'
    lineHeight: 1.125rem
  label-md:
    fontFamily: Inter
    fontSize: 0.875rem
    fontWeight: '500'
    lineHeight: 1.25rem
    letterSpacing: 0.005em
  label-sm:
    fontFamily: Inter
    fontSize: 0.75rem
    fontWeight: '600'
    lineHeight: 1rem
    letterSpacing: 0.02em
  code-metric:
    fontFamily: Inter
    fontSize: 0.8125rem
    fontWeight: '500'
    lineHeight: 1rem
    letterSpacing: -0.01em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-desktop: 1.5rem
  margin: 1rem
  margin-desktop: 2rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
---

## Brand & Style

This design system establishes an ultra-refined, high-utility operational environment for educators, institutional administrators, and students. The interface communicates instantaneous clarity, verifiable trust, and effortless utility. The experience rejects extraneous embellishments in favor of crisp typographic hierarchy, micro-precise telemetry indicators, and calm, structured information dense spaces inspired by high-performance engineering tools.

The visual direction marries Modern SaaS minimalism with tactile institutional clarity:
- **Calm, High-Precision Workspaces:** High-contrast neutral canvases framed with crisp single-pixel delimiters.
- **Immediate State Legibility:** Instantaneous visual feedback via disciplined status pills and real-time geospatial/telemetry indicators.
- **Focused Accessibility:** Dense rosters, real-time geofence validations, and analytical records are rendered with zero visual debt, prioritizing legibility and spatial breathing room.

## Colors

The color architecture enforces strict functional semantics. The base layer uses `#F8FAFC` (Slate 50) to mitigate eye fatigue during prolonged administrative sessions, layered with `#FFFFFF` card surfaces and micro-structural boundaries in `#E2E8F0` (Slate 200).

### Primary & Accent Roles
- **Primary (`#2563EB`):** Reserved for direct call-to-actions, focused form states, active table selections, and confirmed check-in triggers.
- **Accent / Telemetry (`#0D9488` / `#14B8A6`):** Signals active geofences, live radar scans, Wi-Fi beacons, and valid spatial telemetry.

### Neutral Foundation
- **Canvas Base:** `#F8FAFC` (Slate 50)
- **Elevated Surface:** `#FFFFFF`
- **Subtle Surface / Hover:** `#F1F5F9` (Slate 100)
- **Structural Border:** `#E2E8F0` (Slate 200)
- **Primary Text:** `#0F172A` (Slate 900)
- **Muted Label / Secondary Text:** `#64748B` (Slate 500)

### Status & Verification Semantics
- **Success (`#16A34A`):** Verified present, confirmed in-radius, active session. Background tint: `#F0FDF4`.
- **Warning / Flagged (`#F59E0B` / `#B45309`):** Anomalous attendance, late arrivals, proximity threshold warnings. Soft background tint: `#FEF3C7` with `#B45309` foreground.
- **Danger / Error (`#DC2626`):** Absent, spoofed telemetry, outside geofence boundary, closed session. Background tint: `#FEF2F2`.

## Typography

The type system balances structure and efficiency. **Plus Jakarta Sans** brings clean geometric warmth to structural headers, operational statistics, and card titles. **Inter** powers data tables, rosters, forms, and system telemetry with unmatched legibility at micro sizes.

Tabular figures (`font-feature-settings: 'tnum' on, 'cv05' on`) must be enabled on all numerical outputs, timestamps, distance measurements, and status percentage indicators to prevent jitter during live updates.

## Layout & Spacing

The layout is built on a responsive 12-column grid for desktop views (switching to 4 columns on mobile and 8 columns on tablet), using an 8pt spatial baseline cadence.

- **Desktop Breakpoint (1024px+):** Fixed collapsible administrative sidebar (260px expanded, 68px collapsed), fluid main workspace constrained to a maximum content width of 1440px, `2rem` outer page margins, and `1.5rem` grid gutters.
- **Tablet Breakpoint (768px - 1023px):** Fluid margins of `1.5rem`, collapsed sidebar or sheet navigation, responsive dual-column arrangement for metrics and roster summaries.
- **Mobile Breakpoint (<768px):** Single-column stacked cards, `1rem` outer canvas margin, `1rem` vertical component stacking gap, and persistent bottom-docked quick-action bars for check-in actions.

## Elevation & Depth

Visual hierarchy avoids heavy drop shadows, leaning on crisp 1px borders paired with ultra-diffused, ambient micro-shadows.

- **Flat Border Tier:** Primary cards, metric containers, and table layouts use an explicit `1px solid #E2E8F0` on `#FFFFFF` with no shadow or `box-shadow: 0 1px 2px 0 rgba(15, 23, 42, 0.04)`.
- **Raised Interactive Tier (Hover / Menus):** Tooltips, dropdown menus, and hovered action cards elevate using `box-shadow: 0 4px 6px -1px rgba(15, 23, 42, 0.07), 0 2px 4px -2px rgba(15, 23, 42, 0.05)` coupled with border `#CBD5E1`.
- **Floating Overlays & Modals:** Slide-over attendance logs and verification dialogs use `box-shadow: 0 20px 25px -5px rgba(15, 23, 42, 0.08), 0 8px 10px -6px rgba(15, 23, 42, 0.04)` over a backdrop blur overlay (`rgba(15, 23, 42, 0.4)` with `backdrop-filter: blur(4px)`).

## Shapes

The interface implements a dual-radius philosophy that balances architectural discipline with friendly modern touchpoints:

- **Outer Shells & Cards (`rounded-xl` / 12px):** Primary modules, telemetry containers, geofence map panels, and dialog sheets.
- **Inner Controls (`rounded-lg` / 8px):** Buttons, text fields, search bars, selectable table rows, and tooltips.
- **Status Pills (`rounded-full` / 9999px):** All categorical tags, telemetry signals, student status badges, and geofence indicators.

## Components

### Buttons
- **Primary:** Background `#2563EB`, text `#FFFFFF`, 8px border radius, font `label-md`. Subtle hover transition to `#1D4ED8`. Active state scales to `0.98`. Focus outline: `2px solid #2563EB` with `2px` white offset.
- **Secondary / Outline:** Background `#FFFFFF`, 1px border `#E2E8F0`, text `#0F172A`. Hover: background `#F1F5F9`, border `#CBD5E1`.
- **Tertiary / Ghost:** Background transparent, text `#64748B`. Hover: background `#F1F5F9`, text `#0F172A`.

### Status Badges & Pills
- Rendered in height `24px`, horizontal padding `8px`, radius `9999px`, font `label-sm`.
- **Active / Open:** `#F0FDF4` background, `#16A34A` text, with a pulsing 6px `#16A34A` dot.
- **Draft / Scheduled:** `#F1F5F9` background, `#64748B` text.
- **Closed:** `#F8FAFC` background, `#94A3B8` text, border `1px solid #E2E8F0`.
- **In-Radius:** `#CCFBF1` background, `#0D9488` text.
- **Flagged / Out-of-Range:** `#FEF3C7` background, `#B45309` text, warning triangle glyph prefix.

### Roster Tables & Data Lists
- Encased in 12px rounded cards with `1px solid #E2E8F0`.
- Header row: `#F8FAFC`, uppercase `label-sm`, text `#64748B`, height `40px`.
- Body rows: Height `52px`, alternating hover background `#F8FAFC`, bottom border `1px solid #F1F5F9`.
- Multi-row selection: 4px active indicator on the far-left border in `#2563EB`.

### Form Controls
- Input fields: Height `40px`, horizontal padding `12px`, border `1px solid #E2E8F0`, radius `8px`. Placeholder text `#94A3B8`. Active focus triggers border `#2563EB` with `0 0 0 3px rgba(37, 99, 235, 0.12)`.
- Checkboxes: 18x18px, 4px border radius, `#E2E8F0` border, transitions to `#2563EB` checkmark fill when checked.

### Telemetry Gauges & Location Widgets
- **Geofence Radar Container:** Integrated interactive map card featuring a 50% opacity teal circle (`#14B8A6` fill at 15% opacity, stroke `2px solid #0D9488`) representing the active session radius.
- **Real-Time Student Proximity Gauge:** Concentric pulse ring indicator demonstrating accuracy within +/- 5m.

### Empty States
- Centered container with a 48x48px circle background `#F1F5F9`, containing a `#64748B` line icon. Accompanied by a `headline-sm` title, a max-w-sm `body-md` muted description, and a single primary action button.
