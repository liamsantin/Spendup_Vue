# Passifs — contrat front

> Code : `src/features/liabilities/`  
> Statut : active · Relu : 2026-10-27  
> Voir aussi : `features/personal-loans/contract.md`, `features/tiers/contract.md`, `architecture/realtime.md`, `patterns/app-page-shell.md`

## Boundaries

| Couche   | Détail                                                                                                                                           |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Route    | `/app/patrimoine/dettes` → `AppDebtsPage`, onglet **Passifs** (`/:publicId` ouvre la modale d’édition). `prets` et `amis` ne sont jamais des ids |
| Nav      | Sidebar **Patrimoine** → **Dettes**                                                                                                              |
| Store    | `useLiabilitiesStore` (state · crud · realtime · lifecycle)                                                                                      |
| API      | `liabilitiesApi` via **`fetchWrapper`**                                                                                                          |
| Droits   | Ressource **personnelle**. Prêteur = tier possédé ; actif financé = actif possédé.                                                               |
| Realtime | `liabilityChanged` (acteur inclus)                                                                                                               |

`paths.ts` porte aussi les chemins de toute la page Dettes : `DEBTS_PATHS`, `debtsPathForTab`, `debtsTabFromPath`, `liabilityDetailPath` / `liabilityPublicIdFromPath`, `personalLoanDetailPath` / `personalLoanPublicIdFromPath`, `sharedDebtDetailPath` / `sharedDebtPublicIdFromPath`.

## HTTP

Auth JWT. JSON camelCase. Enveloppe `{ success, message, result }` sauf DELETE → **204** sans corps.

| Méthode | Route                                          | Résultat                             |
| ------- | ---------------------------------------------- | ------------------------------------ |
| GET     | `/api/liabilities?type=&status=`               | Liste `{ items, totalCount }`        |
| GET     | `/api/liabilities/{publicId}`                  | Détail                               |
| POST    | `/api/liabilities`                             | Création                             |
| PUT     | `/api/liabilities/{publicId}`                  | État complet                         |
| POST    | `/api/liabilities/{publicId}/remaining-amount` | `{ remainingAmount }` — geste rapide |
| DELETE  | `/api/liabilities/{publicId}`                  | Soft-delete                          |

Inconnu, d’un autre utilisateur ou supprimé : **404** neutre (`Passif introuvable.`) → retrait local + invalidation des listes. 400 : `message` affiché tel quel. Tri serveur : `active`, `rembourse`, `annule`, puis nom.

## Objet renvoyé

`publicId`, `name`, `type` (`credit` \| `hypotheque` \| `dettePersonnelle` \| `carteCredit` \| `other`), `lenderTierPublicId` / `lenderTierName`, `assetPublicId`, `initialAmount`, `remainingAmount`, `repaidAmount`, `percentRepaid` (jauge bornée 0–100 côté UI), `currency`, `interestRate`, `startDate`, `plannedEndDate`, `status`, dates. `normalizeLiability` sécurise nombres et nullables.

## Règles (payload.ts)

- `name` obligatoire, trimé, ≤ 150. `type` obligatoire.
- `initialAmount` > 0 ; `0 ≤ remainingAmount ≤ initialAmount`. Création : restant vide → `null` (= initial). PUT : restant obligatoire (vide → initial).
- `interestRate` optionnel, 0–100, trois décimales max (`parseInterestRate`).
- Dates `yyyy-MM-dd` ; `plannedEndDate ≥ startDate`.
- Devise optionnelle à la création (`null` = settings), figée ensuite : le PUT renvoie la devise stockée (`lockedCurrency`, sinon `currencyLocked`).
- Statut dérivé : `rembourse` à restant nul, sinon `active`. L’interrupteur « Annulé » envoie `status: "annule"`, qui colle (même via `remaining-amount`).
- Geste rapide `buildSetRemainingAmountPayload` : un seul champ, bornes 0–initial. Désactivé sur un passif annulé.
- Seuls les passifs `active` entrent dans le patrimoine net. Un tier prêteur d’un passif actif ne peut pas être supprimé (400 serveur).

## UI

- `LiabilitiesDirectory` (sans prop, `defineExpose({ openCreate })`) : lit `?status=` (défaut `active`, `all` lève le filtre), `?type=`, `?q=` (nom + prêteur, filtre client). Grille 3 / 2 / 1 colonnes de `LiabilityListItem`.
- `LiabilityListItem` props `liability`, `acting?`, `assetName?` ; emits `edit`, `remaining`, `delete`.
- `LiabilityFormModal` props `modelValue`, `liability?` ; emits `update:modelValue`, `saved`. Prêteur via `TierPicker`, actif via `useAssetsStore().allKnownItems()` (« nom · type »).
- `LiabilityRemainingAmountModal` props `modelValue`, `liability` ; emits `update:modelValue`, `saved`.

## Realtime

`liabilityChanged` `{ change: liabilityCreated | liabilityUpdated | liabilityDeleted, liabilityPublicId }`. Mutation locale mémorisée 2,5 s → événement ignoré. Sinon : invalidation, refetch du détail connu sur `Updated`, retrait local sur `Deleted`, refetch de la liste active (microtask).

## Bootstrap

`auth-guard` → `onAuthenticatedSession()` (realtime seul, sans charger). `bootstrap()` = realtime + liste. `reset()` au logout.

## Tests critiques

- `__tests__/payload.test.ts` · `__tests__/format.test.ts` · `__tests__/paths.test.ts`
- `stores/__tests__/liabilities-store.test.ts`
