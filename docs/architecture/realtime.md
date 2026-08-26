# Realtime (SignalR)

> Implémentation : `features/notifications/hub.ts` · Contrat : `features/notifications/contract.md`  
> Statut : active · Relu : 2026-08-13

## Hub

| Élément   | Valeur                                                  |
| --------- | ------------------------------------------------------- |
| URL       | `{VITE_API_BASE_URL}/hubs/realtime`                     |
| Auth      | `accessTokenFactory` + `withCredentials` en cookie-mode |
| Lifecycle | démarré par `notifications` store après session auth    |
| Reconnect | auto + retry après `refreshSession` si échec start      |

## Événements consommés (front)

| Event                  | Effet typique                                 |
| ---------------------- | --------------------------------------------- |
| `connected`            | handshake                                     |
| `notificationReceived` | upsert inbox / badge / chips                  |
| `friendshipChanged`    | fan-out → `friends` store (pas de badge)      |
| `accountChanged`       | fan-out → `accounts` store (archive/restore/visibility/updated/balanceSnapshot*) |
| `inboxCleared`         | reset liste                                   |
| `sessionEnded`         | `forceReLogin` (tous devices ou device ciblé) |

## Règles

- Un seul propriétaire du hub : **notifications**. Les autres features s’abonnent via le store notifications.
- Le hub reste up pour `sessionEnded` même si les push prefs désactivent les chips.
- Pas de second hub côté friends.
