# UI Page Audit

Audit date: 2026-04-21

Scale source: [`docs/ui-quality-scale.md`](./ui-quality-scale.md)

## Route Scores

| Route | Score | Disposition |
| --- | ---: | --- |
| `/` | 5 | Command center dashboard. |
| `/dashboard` | 5 | Redirect-equivalent dashboard entry. |
| `/cashflow` | 5 | Primary reconciliation workspace. |
| `/budget` | 4 | Budget analysis and category management with checking alignment. |
| `/accounts` | 4 | Consolidated account workspace with asset, fund, card, and savings links. |
| `/assets` | 5 | Consolidated redirect to `/accounts`. |
| `/fund-accounts` | 5 | Consolidated redirect to `/accounts`. |
| `/credit-cards` | 4 | Reworked into shared finance cards and debt metrics. |
| `/investments` | 5 | Consolidated redirect to `/accounts`. |
| `/investments/new` | 4 | Reworked into shared shell and panel layout. |
| `/investments/edit/[id]` | 4 | Reworked into shared shell and panel layout. |
| `/transactions` | 4 | Transaction management, paste import, and budget link in one workspace. |
| `/transactions/new` | 5 | Consolidated redirect to `/transactions` instead of a dead route. |
| `/pending-transactions` | 5 | Consolidated redirect to `/cashflow`. |
| `/recurring-transactions` | 5 | Consolidated redirect to `/cashflow`. |
| `/recurring-categories` | 5 | Consolidated redirect to `/cashflow`. |
| `/pay-settings` | 5 | Consolidated redirect to `/cashflow`. |
| `/income` | 5 | Hidden for now; redirects to `/settings`. |
| `/savings-plan` | 5 | Consolidated redirect to `/accounts`. |
| `/snapshot` | 5 | Consolidated redirect to dashboard. |
| `/reports` | 5 | Hidden for now; redirects to `/budget`. |
| `/overspending-analysis` | 5 | Consolidated redirect to `/budget`. |
| `/big-purchases` | 5 | Consolidated redirect to `/budget`. |
| `/stocks` | 5 | Consolidated redirect to `/accounts`. |
| `/stock-demo` | 5 | Consolidated redirect to `/accounts`. |
| `/api-test` | 5 | Hidden for now; redirects to `/settings`. |
| `/settings` | 4 | Settings, setup, import, and export in shared shell. |
| `/onboarding` | 5 | Hidden for now; redirects to `/settings`. |
| `/plan` | 5 | Consolidated redirect to `/cashflow`. |

## Follow-Up Candidates

- Current visible app surface is intentionally reduced to Dashboard, Cashflow, Budget, Transactions, Accounts, and Settings.
