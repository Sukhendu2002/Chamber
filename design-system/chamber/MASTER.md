# Chamber Design System

This file documents the visual system used across Chamber. Page-specific files
may refine layout, but they must keep these tokens and interaction rules.

## Product direction

- Pattern: editorial financial cockpit with bento-grid composition
- Tone: calm, precise, trustworthy, contemporary
- Hierarchy: one dominant story per page, compact supporting metrics, clear detail cards
- Density: information-rich without cramped controls or repeated equal-weight cards

## Core palette

| Role | Reference | Usage |
|---|---|---|
| Canvas | warm off-white | App and marketing backgrounds |
| Surface | paper white | Cards, dialogs, inputs, menus |
| Ink | charcoal | Primary copy and financial values |
| Primary | electric violet | Navigation, links, primary actions, chart emphasis |
| Positive | muted mint | Healthy balances and on-track states |
| Risk | muted coral | Overspend, debt, destructive actions |
| Muted | warm grey | Secondary surfaces and supporting copy |

The implementation uses semantic OKLCH variables in `app/globals.css`. Components
must consume semantic Tailwind tokens instead of embedding palette hex values.

## Typography

- Family: Geist for headings and body; Geist Mono only where code requires it
- Financial values: proportional Geist with `tabular-nums`
- Page title: 24–30px, semibold, tight tracking
- Card title: 15px, semibold
- Body: 14–16px with generous line height
- Labels: 11–12px, medium or semibold
- Avoid monospaced body copy and decorative display fonts

## Shape, spacing, and elevation

- Spacing follows a 4/8px rhythm
- Main page gutters: 16px mobile, 24px tablet, 32px desktop
- Control radius: 12px
- Card radius: 20px
- Dialog radius: 24px
- Borders are thin and warm; shadows are soft and low contrast
- Hover motion may lift interactive cards by at most 2px

## Components

- Buttons are at least 40px high; primary form and page actions use 44px
- Inputs are 44px high with persistent labels and visible focus rings
- Cards use white surfaces, thin borders, and subtle elevation
- Tabs use a soft segmented surface with a clear selected state
- Tables use muted headers, comfortable cell padding, and row hover feedback
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

- Five or more identical KPI cards with equal visual weight
- Pure white full-page backgrounds
- Heavy gradients, glassmorphism, neon, or exaggerated shadows
- Tiny controls, hidden focus states, or hover-only affordances
- Red for decoration; reserve it for actionable risk
- Arbitrary radii, icon families, or spacing values
