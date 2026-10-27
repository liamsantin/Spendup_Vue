# Immobilier — contrat front

> Code : `src/features/real-estate/`  
> Statut : active · Relu : 2026-10-27  
> Voir aussi : `features/assets/contract.md`, `features/liabilities/contract.md`, `features/recurring-payments/contract.md`, `features/files/contract.md`, `architecture/realtime.md`, `patterns/app-page-shell.md`

## Boundaries

| Couche   | Détail                                                                                                                                                              |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Route    | `/app/patrimoine/immobilier` → `AppRealEstatePage` : liste (onglets Actifs · Cédés, query `state=sold`, recherche `q`) ; `/:publicId` = fiche du bien (query `tab`) |
| Nav      | Sidebar **Patrimoine** → **Immobilier** (`nav.items.realEstate`)                                                                                                    |
| Store    | `useRealEstateStore` (state · crud · realtime · lifecycle), état indexé par `assetPublicId`                                                                         |
| API      | `realEstateApi` via **`fetchWrapper`**                                                                                                                              |
| Bien     | Racine + `realEstate.details` / `summary` portés par **`@/features/assets`** (`useAssetsStore`, `AssetFormModal` avec `lockedType="immobilier"`)                    |
| Droits   | Ressource **personnelle** (propriétaire de l’actif).                                                                                                                |
| Realtime | `assetChanged` (`assetRealEstateChanged`, `assetUpdated`, `assetDeleted`)                                                                                           |

Le store immobilier ne détient **que** les sous-ressources (lots, charges, travaux, documents, baux). La liste des biens = `useAssetsStore().loadList({ type: 'immobilier', active })`, la synthèse = `fetchAsset(publicId, true)`.

## HTTP

Auth JWT. JSON camelCase. Enveloppe `{ success, message, result }` sauf DELETE → **204**. Base : `/api/assets/{assetPublicId}/real-estate`. Un actif d’un autre type → 400.

| Ressource | Routes                                                             | Corps POST / PUT                                                                                                                                                 |
| --------- | ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Lots      | `GET/POST …/units` · `GET/PUT/DELETE …/units/{id}`                 | `name`, `unitType`, `surfaceM2`, `rooms`, `floor`, `isRentable`, `notes`                                                                                         |
| Charges   | `GET/POST …/charges` · `GET/PUT/DELETE …/charges/{id}`             | `name`, `chargeType`, `amount`, `periodicity`, `startDate`, `endDate`, `unitPublicId`, `tierPublicId`, `transactionPublicId`                                     |
| Travaux   | `GET/POST …/maintenance` · `GET/PUT/DELETE …/maintenance/{id}`     | `maintenanceDate`, `maintenanceType`, `description`, `cost`, `nextMaintenanceDate`, `unitPublicId`, `providerTierPublicId`, `transactionPublicId`                |
| Documents | `GET/POST …/documents` · `GET/PUT/DELETE …/documents/{id}`         | POST : `filePublicId` + `documentType`, `name`, `documentDate`, `notes`, `unitPublicId` ; PUT : sans `filePublicId`                                              |
| Baux      | `GET …/rentals?status=` · `POST` · `GET/PUT/DELETE …/rentals/{id}` | `tenantTierPublicId`, `startDate`, `monthlyRent`, `endDate`, `monthlyCharges`, `deposit`, `unitPublicId`, `recurringIncomePublicId`, `notes` (+ `status` en PUT) |

Listes : `{ items, totalCount }` ou tableau nu (normalisé par `normalizeListResult`). Inconnu / autre utilisateur / supprimé : **404** neutre (`Lot introuvable.`, `Charge introuvable.`, `Travaux introuvables.`, `Document introuvable.`, `Bail introuvable.`, `Bien introuvable.`). 400 : `message` affiché tel quel.

## Objet renvoyé

- Lot : `isOccupied` dérivé (un bail effectif actif couvre le lot) → les lots sont rechargés après toute écriture de bail.
- Charge : `currency` (= bien), `monthlyEquivalent` (ponctuelle 0, mensuelle ×1, trimestrielle /3, semestrielle /6, annuelle /12), `isCurrent`, `tierName`. Tri serveur : en cours d’abord (reproduit localement par `sortCharges`).
- Travaux : `currency`, `providerTierName`. Tri : plus récent d’abord.
- Document : `name` (défaut nom du fichier), `documentDate` (défaut date du fichier), `file { publicId, nameOriginal, sizeBytes, mimeType }`.
- Bail : `status` **effectif** (`active` · `aVenir` · `suspendue` · `terminee`), `storedStatus`, `tenantName`, `currency`. Tri : actifs, à venir, suspendus, terminés puis début décroissant (`sortRentals`).
- Synthèse (`realEstate.summary`, GET détail d’actif seulement) : hypothèque restante (passifs liés dans la devise du bien, `mortgageExcludedCount` pour les autres devises), fonds propres, loyer et charges locatives si loué, charges mensuelles, total travaux, compteurs par sous-liste (onglets).

## Règles (validation client dans `payload.ts`, le reste délégué à l’API)

- Noms ≤ 150, description ≤ 500, notes ≤ 2000. Montants ≥ 0 (`parseAccountAmount`). Dates `yyyy-MM-dd`, fin ≥ début.
- Travaux : date obligatoire, **non future** (fuseau des settings), échéance ≥ date.
- Lot facultatif partout (`''` = bien entier) ; un lot inconnu est refusé quand la liste des lots est chargée. Bail : lot **louable** (le lot déjà lié reste accepté en édition).
- Bail : locataire obligatoire (tier via `TierPicker`, rôle `locataire` ajouté par le serveur), début obligatoire. En édition le statut **stocké** est pré-rempli et renvoyé ; `''` → `null` (le serveur décide) ; `aVenir` jamais envoyé. `terminee` sans fin → fin = aujourd’hui (serveur). Chevauchement de même portée → 400 affiché tel quel.
- `recurringIncomePublicId` : choisi parmi `recurringIncomesApi.list({ pageSize: 200 })` ; pas de création automatique (à créer dans Récurrences).
- `transactionPublicId` (charges, travaux) : **non saisi** dans l’UI, laissé `null` à la création et conservé tel quel en édition.
- Documents : PDF choisi dans `useFilesStore().items` ou téléversé (`validatePdfFile` puis `uploadFile`). Le fichier ne change pas en édition. `deleteDocument` **délie** seulement ; supprimer sur `/api/files` un fichier lié à un document vivant → 400 (`isFileLinkedToDocumentError`).
- Après chaque écriture : `useAssetsStore().fetchAsset(assetPublicId, true)` (synthèse, compteurs) ; écriture de bail → refetch des baux (filtre en place) et des lots chargés.

## Realtime

`assetChanged` (acteur inclus) :

- `assetRealEstateChanged` / `assetUpdated` d’un bien dont le store a un état → refetch (forcé, regroupé par microtask) des sous-listes **déjà chargées**. L’événement qui suit une mutation locale (2,5 s) est ignoré.
- `assetDeleted` → `forget(assetPublicId)` (purge de l’état et du cache).
- Biens jamais ouverts : ignorés. La synthèse est rafraîchie par `@/features/assets`.

La fiche recharge aussi le bien et ses listes chargées au retour de visibilité de l’onglet, et passe en « Bien introuvable » sur `subscribeToDeleted` d’`useAssetsStore`.

## Bootstrap

`auth-guard` → `onAuthenticatedSession()` (branche le realtime, aucun chargement). `bootstrap()` idem. `reset()` au logout (caches, seaux, revenus récurrents, realtime). `forget(assetPublicId)` purge un bien.

## Tests critiques

- `__tests__/payload.test.ts` · `__tests__/format.test.ts` (dont chemins)
- `stores/__tests__/real-estate-store.test.ts` : chargement + cache, CRUD + refetch de l’actif, payload invalide sans appel API, 404 neutres, filtre des baux, mutation locale ignorée, refetch sur événement externe, purge sur `assetDeleted`, revenus récurrents, `reset`.
