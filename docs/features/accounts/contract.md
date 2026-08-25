# Accounts — contrat front

> Code : `src/features/accounts/`  
> Statut : active · Relu : 2026-08-23  
> Voir aussi : `features/friends/contract.md`, `features/notifications/contract.md`, `patterns/app-tabs-shell.md`

## Boundaries

| Couche    | Détail                                                                                     |
| --------- | ------------------------------------------------------------------------------------------ |
| Route     | `/app/finances/comptes` → `AppComptesPage` (Tabs : Accounts / Invitations)                 |
| Store     | `useAccountsStore`                                                                         |
| API       | `accountsApi` → **`fetchWrapper`**                                                         |
| Droits UI | `rights.ts` branché sur `myRole` / `isOwned` / `isPrimary`                                 |
| Realtime  | Notifs `accountShare*` + `friendshipChanged` (`removed`/`blocked`) via notifications store |
| Dashboard | Module Comptes actif → `/app/finances/comptes`                                             |

## HTTP

| Méthode | Endpoint                                                                                            |
| ------- | --------------------------------------------------------------------------------------------------- |
| GET     | `/api/accounts`, `/api/accounts/{id}`, `/api/accounts/{id}/shares`, `/api/accounts/shares/incoming` |
| POST    | `/api/accounts`, `…/primary`, `…/archive`, `…/restore`, `…/shares`, `…/shares/{id}/accept\|refuse`  |
| PUT     | `/api/accounts/{id}` (état **complet**), `/api/accounts/{id}/shares/{userPublicId}`                 |
| DELETE  | `/api/accounts/{id}`, `/api/accounts/{id}/shares/{userPublicId}` → **204**                          |
| GET/POST| `/api/accounts/{id}/balance-snapshots` — items incluent `createdByUserPublicId` / `createdByDisplayName` / `createdByPhotoUrl` (nullable) |
| DELETE  | `/api/accounts/{id}/balance-snapshots/{snapshotId}` → **204**                                        |

## Relevés — auteur

- L’API expose toujours l’auteur sur chaque relevé (null si inconnu / soft-deleted).
- UI : afficher l’auteur **uniquement** si le compte est partagé (`!isOwned` ou partage accepté côté owner).

## Invariants

- Liste = owned + partagés **acceptés** (pas les pending) ; UI sépare `isOwned` / `!isOwned`.
- Compte **primaire** : exactement un parmi les comptes `isOwned` ; promouvoir en démote l’ancien (`POST …/primary` ou create `isPrimary: true`). Pas d’archive ni delete. Le PUT n’envoie pas un bascule `isPrimary` (400 si on tente de retirer le statut sans en promouvoir un autre).
- Devise **immuable** après création (UI disabled + PUT renvoie la devise d’origine).
- Delete bloqué avec mouvements → message API + proposition d’archiver.
- Partage : invite via `listAllFriends()` (pagination complète), exclus déjà présents dans `shares`.
- `onAuthenticatedSession()` (guard) : branche realtime **sans** charger les listes ; `bootstrap(tab)` page charge **l’onglet actif** (TTL + idle prefetch incoming pour le chip).
- Deep-link query : `?tab=Accounts|Invitations`, `?account=`, `?share=` → scroll `[data-account-id]` / `[data-share-id]`.
- Hors scope : payment methods, transactions, foyer Family.

## Fetch / cache

Mémoire process via `createResourceCache` (`src/utils/helpers/resource-cache.ts`).

- `ensure` par défaut (TTL listes **60s**, détail **30s**) ; `force` seulement mutation qui a besoin du serveur, ou realtime (`refreshAll` interne — **pas** de bouton Actualiser sur la page).
- Un `force` n’ajoute pas à un inflight soft : il attend puis refetch (évite listes stale après accept / revoke).
- Orchestration unique : `AppComptesPage` → `bootstrap(tab)` / `openTab(tab)`. Les tabs ne chargent plus au `onMounted`.
- Mutations : patch local (`upsert` / filtre incoming) ; `acceptShare` recharge la liste comptes (le nouvel accès n’est pas dans le payload).
- Après `loadAccounts`, `syncSelectedWithList()` vide la sélection si le compte a disparu (revoke / amitié).
- `accountShareRevoked` (revoke manuel **ou** soft-delete owner) : `removeAccountLocal` immédiat via `metadata.accountPublicId`, puis sync liste en arrière-plan.

### Budget de requêtes

| Action                          | Requêtes                                            |
| ------------------------------- | --------------------------------------------------- |
| 1ère visite onglet actif        | 1 list (`GET /api/accounts` ou `…/shares/incoming`) |
| Switch onglet frais (TTL OK)    | 0                                                   |
| Open détail avec snapshot liste | 0–1 `GET /api/accounts/{id}` selon TTL 30s          |
| Create / setPrimary / refuse    | 1 mutation, 0 list                                  |
| Idle prefetch onglet inactif    | 1 list (hors tests)                                 |

## Persistence

Mémoire process. `reset()` désabonne les listeners (logout).

## Tests critiques

- `stores/__tests__/accounts-store.test.ts`
- `__tests__/rights.test.ts`
- `__tests__/format.test.ts`
- `__tests__/qa-checklist.test.ts` (checklist QA frontend, API mockée)
- `src/utils/helpers/__tests__/resource-cache.test.ts`
- `src/features/friends/__tests__/list-all.test.ts`
