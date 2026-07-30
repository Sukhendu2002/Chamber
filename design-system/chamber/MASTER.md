# Chamber Design System

This file documents the visual system used across Chamber. Page-specific files
may refine layout, but they must keep these tokens and interaction rules.

## Product direction

- Pattern: compact financial cockpit with a restrained grid
- Tone: direct, precise, trustworthy
- Hierarchy: one dominant story per page with dense supporting information
- Density: compact spacing and grouped metrics without decorative card clutter

## Core palette

| Role | Reference | Usage |
|---|---|---|
| Canvas | white / near-black | App and marketing backgrounds |
| Surface | white / dark grey | Cards, dialogs, inputs, menus |
| Ink | black / near-white | Primary copy and financial values |
| Primary | black / light grey | Navigation, links, primary actions, chart emphasis |
| Positive | green | Healthy balances and on-track states |
| Risk | red | Overspend, debt, destructive actions |
| Muted | neutral grey | Secondary surfaces and supporting copy |

The implementation uses semantic OKLCH variables in `app/globals.css`. Components
must consume semantic Tailwind tokens instead of embedding palette hex values.

## Typography

- Family: JetBrains Mono throughout the product
- Financial values use `tabular-nums`
- Page title: 24–30px, semibold, tight tracking
- Card title: 15px, semibold
- Body: 12–14px with readable line height
- Labels: 11–12px, medium or semibold
- Avoid monospaced body copy and decorative display fonts

## Shape, spacing, and elevation

- Spacing follows a 4/8px rhythm
- Main page gutters: 16px mobile, 20px tablet, 24px desktop
- Control radius: 4px
- Card radius: 4px
- Dialog radius: 4px
- Borders are thin and neutral; shadows are minimal
- Hover states change color or border without lifting the layout

## Components

- Buttons are compact while retaining visible focus and clear labels
- Inputs use persistent labels and visible focus rings
- Cards use neutral surfaces, thin borders, small radii, and little elevation
- Tabs use a compact segmented surface with a clear selected state
- Tables use muted headers, dense cell padding, and row hover feedback
- Dialogs and sheets use a 45% scrim and purposeful background blur
- Icons use the Tabler outline family with consistent 1.8–2px strokes

## Accessibility and behavior

- Normal text contrast must meet 4.5:1
- Color never carries status alone; pair it with labels or icons
- Interactive targets remain keyboard reachable with visible focus
- Motion lasts 150–300ms and respects `prefers-reduced-motion`
- Layouts must work at 375, 768, 1024, and 1440px without horizontal scrolling
- Do not use emoji as structural interface icons
- Use one primary action per screen

## Anti-patterns

- Five or more detached KPI cards with equal visual weight
- Heavy gradients, glassmorphism, neon, or exaggerated shadows
- Tiny controls, hidden focus states, or hover-only affordances
- Red for decoration; reserve it for actionable risk
- Large radii, excessive padding, arbitrary icon families, or spacing values
