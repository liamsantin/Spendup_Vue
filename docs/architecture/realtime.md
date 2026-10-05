# Realtime (SignalR)

> Implémentation : `features/notifications/hub.ts` · Contrat : `features/notifications/contract.md`  
> Statut : active · Relu : 2026-08-13

## Hub

| Élément   | Valeur                                                  |
| --------- | ------------------------------------------------------- |
| URL       | `{VITE_API_BASE_URL}/hubs/realtime`                     |
| Auth      | `accessTokenFactory` (Bearer header / `?access_token=`) |
| Lifecycle | démarré par `notifications` store après session auth    |
| Reconnect | auto + retry après `refreshSession` si échec start      |

## Événements consommés (front)

| Event                     | Effet typique                                                                                                                              |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `connected`               | handshake                                                                                                                                  |
| `notificationReceived`    | upsert inbox / badge / chips                                                                                                               |
| `friendshipChanged`       | fan-out → `friends` store (pas de badge)                                                                                                   |
| `accountChanged`          | fan-out → `accounts` / payment-methods / transactions / **savings-goals** (transaction\*, `transactionsImported` / `transactionsReverted`) |
| `categoryChanged`         | fan-out → `categories` store (acteur inclus, pas d’inbox)                                                                                  |
| `tagChanged`              | fan-out → `tags` store (acteur inclus, pas d’inbox)                                                                                        |
| `tierChanged`             | fan-out → `tiers` store (acteur inclus, pas d’inbox)                                                                                       |
| `recurringExpenseChanged` | fan-out → `recurring-payments` store (acteur inclus, pas d’inbox)                                                                          |
| `recurringIncomeChanged`  | fan-out → `recurring-payments` store (acteur inclus, pas d’inbox)                                                                          |
| `budgetChanged`           | fan-out → `budgets` store (acteur inclus, pas d’inbox)                                                                                     |
| `savingsGoalChanged`      | fan-out → `savings-goals` store (acteur inclus, pas d’inbox)                                                                               |
| `importChanged`           | fan-out → `imports` store (créateur, session acteur incluse)                                                                               |
| `importTemplateChanged`   | fan-out → `imports` store (modèles perso, acteur inclus)                                                                                   |
| `inboxCleared`            | reset liste                                                                                                                                |
| `sessionEnded`            | `forceReLogin` (tous devices ou device ciblé)                                                                                              |

## Règles

- Un seul propriétaire du hub : **notifications**. Les autres features s’abonnent via le store notifications.
- Le hub reste up pour `sessionEnded` même si les push prefs désactivent les chips.
- Pas de second hub côté friends.
- `accountChanged` n’atteint pas l’acteur : une feature qui écrit en masse (imports) rejoue l’événement via `notifications.dispatchLocalAccountChanged` pour réutiliser le même fan-out.
