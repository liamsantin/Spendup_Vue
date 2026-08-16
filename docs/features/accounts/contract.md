# Accounts — contrat front

> Code : `src/features/accounts/`  
> Statut : active · Relu : 2026-08-16  
> Voir aussi : `features/friends/contract.md`, `features/notifications/contract.md`, `patterns/app-tabs-shell.md`

## Boundaries

| Couche    | Détail                                                                                     |
| --------- | ------------------------------------------------------------------------------------------ |
| Route     | `/app/finances/comptes` → `AppComptesPage` (Tabs : Accounts / Invitations)                 |
| Store     | `useAccountsStore`                                                                         |
| API       | `accountsApi` → **`fetchWrapper`**                                                         |
| Droits UI | `rights.ts` branché sur `myRole` / `isOwned` / `isPrimary`                                 |
| Realtime  | Notifs `accountShare*` + `friendshipChanged` (`removed`/`blocked`) via notifications store |

## HTTP

| Méthode | Endpoint                                                                                            |
| ------- | --------------------------------------------------------------------------------------------------- |
| GET     | `/api/accounts`, `/api/accounts/{id}`, `/api/accounts/{id}/shares`, `/api/accounts/shares/incoming` |
| POST    | `/api/accounts`, `…/primary`, `…/archive`, `…/restore`, `…/shares`, `…/shares/{id}/accept\|refuse`  |
| PUT     | `/api/accounts/{id}` (état **complet**), `/api/accounts/{id}/shares/{userPublicId}`                 |
| DELETE  | `/api/accounts/{id}`, `/api/accounts/{id}/shares/{userPublicId}` → **204**                          |

## Invariants

- Liste = owned + partagés **acceptés** (pas les pending) ; UI sépare `isOwned` / `!isOwned`.
- Compte **primaire** : pas d’archive ni delete (boutons désactivés + hint).
- Delete bloqué avec mouvements → message API + proposition d’archiver.
- Partage : invite uniquement des amis acceptés (`friendsApi.list`), exclus déjà présents dans `shares`.
- `onAuthenticatedSession()` (guard) : branche realtime **sans** charger les listes ; `bootstrap()` page charge.
- Deep-link query : `?tab=Accounts|Invitations`, `?account=`, `?share=` → scroll `[data-account-id]` / `[data-share-id]`.
- Hors scope : payment methods, transactions, foyer Family.

## Persistence

Mémoire process. `reset()` désabonne les listeners (logout).

## Tests critiques

- `stores/__tests__/accounts-store.test.ts`
- `__tests__/rights.test.ts`
