# Dashboard — contrat front

> Code : `src/features/dashboard/`  
> Statut : active · Relu : 2026-09-09

## Boundaries

| Élément    | Détail                                                                     |
| ---------- | -------------------------------------------------------------------------- |
| Route      | `/app` → `AppDashboardView` → `DashboardContent`                           |
| API        | **aucune** — agrège les stores déjà live                                   |
| Composable | `useDashboardOverview` (données) · `useDashboardModules` (raccourcis live) |

## Données

Lecture seule : comptes, transactions, fichiers (`usage`), amis, notifications, catégories, tiers, moyens de paiement.

- Soldes : somme des comptes **possédés actifs**, hors `hiddenFields.balance`, groupée par devise. Respecte `showBalanceOnDashboard` et `hideSensitiveAmounts`.
- Transactions récentes : 6 premières de la liste store (pageSize par défaut — ne pas charger une page de 6, ça polluerait le cache).
- Quota fichiers : `GET /api/files/usage`, jamais la somme de `GET /api/files`.

## Invariants

- Raccourcis de la colonne droite = modules **live**. `budgets` / `goals` restent dans `soon` (`disabled: true`).
- `defaultDashboardView` reste dans **user-settings** (vue overview unique pour l’instant).
- Pas d’écriture métier depuis le dashboard.

## Tests

`src/features/dashboard/__tests__/format.test.ts` — totaux par devise, salut, compte principal.
