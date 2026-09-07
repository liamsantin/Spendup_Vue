# Categories — contrat front

> Code : `src/features/categories/`  
> Statut : active · Relu : 2026-09-07  
> Voir aussi : `architecture/realtime.md`, `patterns/app-page-shell.md`

## Boundaries

| Couche   | Détail                                                             |
| -------- | ------------------------------------------------------------------ |
| Route    | `/app/gestion/categories` → `AppCategoriesPage` (Page Shell)       |
| Nav      | Sidebar **Gestion** → sous-menu **Catégories**                     |
| Store    | `useCategoriesStore`                                               |
| API      | `categoriesApi` via **`fetchWrapper`**                             |
| Realtime | SignalR `categoryChanged` (acteur inclus, propriétaire uniquement) |

Taxonomie **personnelle** : pas de partage, pas de catalogue système. Un nouvel utilisateur démarre avec un arbre vide.

## HTTP

| Méthode | Endpoint                     | Notes                                   |
| ------- | ---------------------------- | --------------------------------------- |
| GET     | `/api/categories`            | Arbre non paginé (racines + `children`) |
| GET     | `/api/categories?type=`      | Filtre sélecteur ; conserve `mixte`     |
| GET     | `/api/categories/{publicId}` | Fiche + enfants                         |
| POST    | `/api/categories`            | `200` (pas `201`)                       |
| PUT     | `/api/categories/{publicId}` | Remplacement **complet**                |
| DELETE  | `/api/categories/{publicId}` | `204` sans corps                        |

## Invariants

- Deux niveaux max : racine + tableau plat `children`. Une sous-catégorie ne peut pas devenir parent.
- Types : `depense` \| `revenu` \| `transfert` \| `mixte`. Un parent `mixte` accepte tout enfant ; sinon types identiques.
- Unicité : `name + type + parent` (casse ignorée).
- Couleur renvoyée en minuscules ; le formulaire prend la réponse comme source de vérité.
- `GET ?type=` peut aplatir une sous-catégorie (`parentPublicId: null`) si le parent est filtré — **ne pas** s’en servir pour l’écran Gestion.
- Erreurs 400 : message FR affichable tel quel, formulaire laissé ouvert. 404 : refetch de l’arbre. `code` reste `null`.
- `onAuthenticatedSession()` (guard) : branche realtime **sans** charger l’arbre.

## Transactions

- `categoryPublicId` optionnel sur create/update (PUT `null` = détacher).
- Sélecteur : `GET /api/categories?type={typeTransaction}` ; rechargé et vidé si le type change.
- Filtre liste : `GET /api/transactions?categoryPublicId=`.
- Compte partagé : la catégorie est **personnelle**. Un co-détenteur peut voir `null` ; le libellé UI est « ma catégorie ».

## Realtime

Événement dédié `categoryChanged` (`categoryCreated` \| `categoryUpdated` \| `categoryDeleted`) — pas de ligne inbox.  
L’émetteur reçoit aussi l’événement : le store ignore le refetch s’il vient de muter le même `publicId`.

## Tests critiques

- `__tests__/payload.test.ts`
- `__tests__/format.test.ts`
- `stores/__tests__/categories-store.test.ts`
