# Tags — contrat front

> Code : `src/features/tags/`  
> Statut : Live (V1) · Relu : 2026-09-23  
> Voir aussi : `features/categories/contract.md`, `features/transactions/contract.md`, `features/recurring-payments/contract.md`, `architecture/realtime.md`

## Boundaries

| Couche   | Détail                                                                           |
| -------- | -------------------------------------------------------------------------------- |
| Route    | `/app/gestion/tags` → `AppTagsPage` (Page Shell + AppBoard)                      |
| Nav      | Sidebar **Gestion** → sous-menu **Tags**                                         |
| Store    | `useTagsStore` (split `stores/internal/` : state · crud · realtime · lifecycle)  |
| API      | `tagsApi` via **`fetchWrapper`** — `/api/tags`                                   |
| Realtime | SignalR `tagChanged` (acteur inclus, groupe utilisateur, sans inbox)             |

Libellés **libres, plats, personnels**. Pas de type dépense/revenu, pas de hiérarchie, pas de foyer. Une écriture peut porter **0 à 10** tags (`tagPublicIds[]`), contrairement à la catégorie (0 ou 1).

## HTTP

Auth Bearer ou cookie `spendup_access`. JSON camelCase, enveloppe `{ success, message, result }` — **sauf** `DELETE` (`204` vide). Pas de query string, pas de pagination. Tri **nom** puis id. `totalCount` = `items.length`.

| Méthode | Endpoint              | Succès | Notes                                                                 |
| ------- | --------------------- | ------ | --------------------------------------------------------------------- |
| GET     | `/api/tags`           | 200    | `TagList`                                                             |
| GET     | `/api/tags/{publicId}`| 200    | `Tag`                                                                 |
| POST    | `/api/tags`           | 200    | `color` omis / `""` / `null` → `color: null`                          |
| PUT     | `/api/tags/{publicId}`| 200    | **État complet**. `color: null` vide la couleur (ne pas omettre)      |
| DELETE  | `/api/tags/{publicId}`| 204    | Toujours accepté. Détache les liens TX / charges, ne bloque pas       |

## Invariants

- `name` obligatoire après trim, max **100**. `"Urgent"` et `"urgent"` sont le même tag. Après delete, le nom redevient libre.
- `color` : `#RGB` ou `#RRGGBB` uniquement, stocké en minuscules. `"red"`, `rgb()`, `#ffff` → 400.
- Un tag n’a **pas** de type : il s’applique à dépense, revenu et transfert.
- 404 neutre (`Tag introuvable.`) si inconnu, d’un autre user, ou déjà supprimé. Jamais « accès refusé ».
- Compteurs `transactionCount` / `recurringExpenseCount` : confirmation delete si > 0, jamais un refus API.
- `onAuthenticatedSession()` : branche realtime **sans** charger la liste.

## Transactions / charges

- Réponse TX et charge : `tagPublicIds: string[]` (jamais `null`) — **tes** tags seulement, triés par nom.
- Create : `tagPublicIds?` max 10, doublons ignorés. Omis ou `[]` = aucun tag. GUID inconnu → 400 `Tag introuvable.`
- **PUT TX / charge = état complet** : omettre ou `[]` détache **tes** tags. Les tags d’un co-détenteur restent. Toujours renvoyer le tableau affiché.
- Filtre liste TX : `GET /api/transactions?tagPublicId=` (un seul tag, du caller). 404 → filtre retiré. URL front : `?tag=`.
- Compte partagé : lecture/écriture de tes libellés seulement. Sélecteur = `GET /api/tags` de la session. Viewer : pastilles, pas d’écriture.
- Charges : même champ. Confirm d’échéance : la TX `source=recurrence` **copie** les tags du template. Link d’une TX manuelle : tags inchangés.
- Revenus récurrents : **pas** de tags.

UI : `TagPicker` (multi-select 10 + création inline `POST /api/tags`) · `TagChips` (pastilles liste). Création à la volée dans le formulaire TX : POST tag puis ajout du `publicId` au tableau.

## Realtime

`tagChanged` (`tagCreated` \| `tagUpdated` \| `tagDeleted`, `tagPublicId`) via le store notifications (`subscribeToTagChanged`). Pas d’inbox, pas de badge.

| Change        | Réaction front                                                              |
| ------------- | --------------------------------------------------------------------------- |
| `tagCreated`  | refetch `GET /api/tags` (ou insert si le détail est connu)                  |
| `tagUpdated`  | refetch liste + remplacer nom/couleur partout où ce `publicId` est affiché  |
| `tagDeleted`  | retrait local, `subscribeToDeleted`, pastilles TX / charges déjà en cache   |

Les écritures TX / charges **ne** déclenchent **pas** `tagChanged`. Compteurs stale jusqu’au prochain `GET /api/tags` — `refreshTagCountersIfLoaded()` après attach/détach si la liste Gestion est déjà chargée.

## Tests critiques

- `__tests__/payload.test.ts`
- `__tests__/format.test.ts`
- `stores/__tests__/tags-store.test.ts`
