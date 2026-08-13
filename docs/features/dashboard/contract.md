# Dashboard — contrat front

> Code : `src/features/dashboard/`  
> Statut : active · Relu : 2026-08-13

## Boundaries

| Élément     | Détail                                            |
| ----------- | ------------------------------------------------- |
| Route       | `/app` → `AppDashboardView` → `DashboardContent`  |
| API / store | **aucun**                                         |
| Composable  | `useDashboardModules` — liste statique de modules |

## Invariants

- Modules (transactions, accounts, budgets, goals) : `disabled: true`, `to: '/app'`, UI « coming soon ».
- Préférence `defaultDashboardView` vit dans **user-settings**, pas ici.
- Présentation + i18n uniquement.

## Tests

Aucun sous `features/dashboard` à ce jour.
