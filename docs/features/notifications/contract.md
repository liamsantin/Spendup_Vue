# Notifications — contrat front

> Code : `src/features/notifications/`  
> Statut : active · Relu : 2026-08-13  
> Voir aussi : `architecture/realtime.md`, `architecture/http.md`, `patterns/app-page-shell.md`

## Boundaries

| Couche | Détail                                                         |
| ------ | -------------------------------------------------------------- |
| Route  | `/app/notifications` → `AppNotificationsPage` (App Page Shell) |
| Store  | `useNotificationsStore` — inbox, badge, hub, chips             |
| API    | `notificationsApi` via **`fetchWrapper`** uniquement           |
| Hub    | `hub.ts` — **non exporté** ; propriétaire unique du SignalR    |
| UI     | `InboxTab`, `FriendLiveChips` (+ dropdown header / sidebars)   |

Exports publics : voir `index.ts` (`notificationsApi`, store, normalize/link/chip helpers, composants).

## HTTP

| Méthode | Endpoint                                      |
| ------- | --------------------------------------------- |
| GET     | `/api/notifications?page&pageSize&unreadOnly` |
| GET     | `/api/notifications/unread-count`             |
| POST    | `/api/notifications/{id}/read`                |
| POST    | `/api/notifications/read-all`                 |
| DELETE  | `/api/notifications`                          |

Réponses list/read : passer par `normalize*` (metadata JSON string → objet).

## Realtime

Hub `{apiBase}/hubs/realtime` — détails `architecture/realtime.md`.

| Event                  | Effet                                        |
| ---------------------- | -------------------------------------------- |
| `notificationReceived` | upsert inbox / badge / chips                 |
| `friendshipChanged`    | listeners only — **pas** de badge            |
| `inboxCleared`         | reset liste                                  |
| `sessionEnded`         | `forceReLogin` (all devices ou device match) |

## Invariants

- Types inbox produit (amis) : `friendRequest`, `friendAccepted` ; anciens types friend encore deep-linkables.
- Prefs push (`pushNotifications` + sous-flags) : gate les **chips live** uniquement — **pas** inbox, badge, ni refresh friends. Hub toujours up pour `sessionEnded`.
- Upsert par `id` ; prepend sur insert realtime.
- Deep-links : `/security*` → `/app/comptes` ; friend → `/app/friends?tab=&friendship=`.

## Bootstrap

`auth-guard` → `onAuthenticatedSession()` après session valide.  
`reset()` au logout : clear state + stop hub.

## Tests critiques

- `stores/__tests__/notifications-store.test.ts`
- `__tests__/link.test.ts`
