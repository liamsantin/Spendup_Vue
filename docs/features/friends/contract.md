# Friends — contrat front

> Code : `src/features/friends/`  
> Statut : active · Relu : 2026-08-13  
> Voir aussi : `features/notifications/contract.md`, `patterns/app-tabs-shell.md`

## Boundaries

| Couche      | Détail                                                                               |
| ----------- | ------------------------------------------------------------------------------------ |
| Route       | `/app/friends` → `AppFriendsPage` (Tabs : Friends / Requests / Discover / Blocked)   |
| Store       | `useFriendsStore`                                                                    |
| API graphe  | `friendsApi` → **`fetchWrapper`**                                                    |
| Avatar blob | `authAxios` → `GET /api/users/{publicId}/avatar` (hash upload ; catalogue → 404 API) |
| Realtime    | Pas de hub propre — abonnements via notifications store                              |

## HTTP

| Méthode | Endpoint                                                                                          |
| ------- | ------------------------------------------------------------------------------------------------- |
| GET     | `/api/friends`, `/requests/incoming`, `/requests/outgoing`, `/blocked`, `/search?q&page&pageSize` |
| POST    | `/api/friends/requests`, `…/accept\|refuse\|cancel`, `/{userPublicId}/block`                      |
| DELETE  | `/api/friends/{friendshipPublicId}`, `/{userPublicId}/block`                                      |

## Invariants

- Search : minimum **2** caractères (`canSearch`) ; sinon clear results.
- `onAuthenticatedSession()` (guard) : branche realtime **sans** charger les listes ; `bootstrap()` page charge les listes.
- Realtime : notifs `friendRequest` / `friendAccepted` ; `friendshipChanged` (`refused|canceled|blocked|removed`) via **queue de refresh sérialisée** (dédupe).
- Deep-link query : `?tab=Friends|Requests|Discover|Blocked`, `?friendship=` → scroll `[data-friendship-id]`.
- QR : `spendup:user:{7×[0-9A-Z]}` ou public id nu (`qr.ts`).

## Persistence

Mémoire process. `reset()` désabonne les listeners.

## Tests critiques

- `stores/__tests__/friends-store.test.ts`
- `__tests__/qr.test.ts`, `__tests__/profilePicture.test.ts`
