# Dashboard Overrides

The dashboard is Chamber’s financial cockpit and follows the approved mockup.

## Layout

1. Greeting, current month, and a single “Add expense” action
2. Large monthly-budget overview paired with three compact supporting KPIs
3. Interactive monthly trend, top categories, and recent expenses in a dense row
4. Optional portfolio, balance, forecast, and calendar widgets below

Use a maximum content width of 1680px. The primary grid is 2:1 on wide screens
and stacks naturally on smaller screens.

## Data rules

- Budget progress uses spending excluding investments throughout
- Overspend is `spent excluding investments - budget`
- Show both exact currency and a plain-language state
- Use tabular numerals and Indian currency grouping
- Charts need visible labels and a concise screen-reader summary
- Month controls update every month-scoped dashboard section
- Chart tooltips expose exact values on pointer and touch interaction

## Responsive priority

On mobile, show the greeting and action first, followed by the budget hero,
supporting KPIs, trend, categories, and recent activity. Optional widgets follow.
