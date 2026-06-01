# Web UI Quality Scale

This scale is the working standard for Finance Tracker pages. Pages should aim for level 4 or 5 before they are considered part of the primary app experience.

## Level 1: Fragmented

- Page looks unrelated to the rest of the app.
- Competing palettes, gradients, shadows, radii, or typography.
- Main action is unclear or buried.
- Data is hard to scan, and the page adds more confusion than confidence.

## Level 2: Functional

- The workflow works, but the page feels like a tool bolted onto the app.
- Styling is mostly default or inconsistent.
- Cards, tables, forms, and buttons do not share a consistent rhythm.
- The page may duplicate another page without explaining why it exists.

## Level 3: Cohesive

- Uses the shared app shell, header, cards, controls, spacing, and slate-first palette.
- Has a clear page title, one primary job, and predictable actions.
- Dense data is grouped into readable sections.
- Empty, loading, and error states do not break the layout.

## Level 4: Polished

- The most important answer is visible in the first screen.
- Metrics, forms, and tables have a deliberate hierarchy.
- The page uses color only for meaning: good, warning, risk, category, or status.
- Navigation matches the consolidated information architecture.
- Mobile and desktop layouts stay readable without overlapping text or controls.

## Level 5: Command Center

- The page actively helps make a decision, not just display records.
- It connects related finance concepts such as checking alignment, budget capacity, cash, debt, investments, and upcoming bills.
- It removes or redirects redundant workflows.
- It gives a confident next action when something needs attention.
- It feels like one product: restrained, modern, fast to scan, and pleasant to return to.

## Application Rules

- Primary pages must use `PageShell` and `PageHeader`.
- Repeated containers use `FinanceCard`, `MetricCard`, or the shared `components/ui` primitives.
- Finance-critical pages include `BudgetAlignmentPanel` when checking or budget capacity affects interpretation.
- Avoid decorative gradients and oversized rounded cards.
- Avoid standalone pages for duplicate analysis; redirect or summarize them inside a stronger workspace.
- Keep action buttons literal and close to the thing they affect.
- Keep destructive, import/export, and setup tools in Settings or the relevant management page.
