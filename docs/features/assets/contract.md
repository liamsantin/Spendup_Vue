# Actifs patrimoniaux — contrat front

> Code : `src/features/assets/`  
> Statut : active · Relu : 2026-10-27  
> Voir aussi : `features/real-estate/contract.md`, `features/liabilities/contract.md`, `features/net-worth/contract.md`, `features/accounts/contract.md`, `architecture/realtime.md`, `patterns/app-page-shell.md`

## Boundaries

| Couche   | Détail                                                                                                                                                                    |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Route    | `/app/patrimoine/actifs` → `AppAssetsPage` (Page Shell ; `/:publicId?` ouvre la fiche à onglets). Query : `type`, `state=active\|sold` (défaut `active`), `q`, `create=1` |
| Nav      | Sidebar **Patrimoine** → **Actifs** (`ASSETS_PATHS.list`)                                                                                                                 |
| Store    | `useAssetsStore` (state · crud · valuations · vehicle · realtime · lifecycle)                                                                                             |
| API      | `assetsApi` via **`fetchWrapper`**                                                                                                                                        |
| Droits   | Ressource **personnelle**. Épargne adossée : compte actif dont l’utilisateur est propriétaire.                                                                            |
| Realtime | `assetChanged` (acteur inclus) + `accountChanged` (épargnes adossées)                                                                                                     |

L’immobilier est un actif (`type: immobilier`) mais a sa propre page (`features/real-estate`) : la vue « Tous » de la page Actifs l’exclut et le formulaire de création ne le propose que si `lockedType === 'immobilier'`. Les sous-ressources du bien (lots, charges, travaux, documents, baux) vivent dans `features/real-estate`.

## HTTP

Auth JWT. JSON camelCase. Enveloppe `{ success, message, result }` sauf DELETE → **204** sans corps. 400 → `message` affiché tel quel.

| Méthode | Route                                              | Résultat                                |
| ------- | -------------------------------------------------- | --------------------------------------- |
| GET     | `/api/assets?type=&active=`                        | Liste non paginée (actifs d’abord, nom) |
| GET     | `/api/assets/{publicId}`                           | Détail (`realEstate.summary` ici seul)  |
| POST    | `/api/assets`                                      | Création                                |
| PUT     | `/api/assets/{publicId}`                           | Remplacement complet                    |
| DELETE  | `/api/assets/{publicId}`                           | Soft-delete                             |
| GET     | `/api/assets/{id}/valuations?from=&to=`            | Historique, plus récent d’abord         |
| POST    | `/api/assets/{id}/valuations`                      | Ajoute / remplace la valorisation datée |
| DELETE  | `/api/assets/{id}/valuations/{yyyy-MM-dd}`         | Suppression définitive                  |
| GET     | `/api/assets/{id}/vehicle/mileages`                | Relevés                                 |
| POST    | `/api/assets/{id}/vehicle/mileages`                | Ajoute / remplace le relevé daté        |
| DELETE  | `/api/assets/{id}/vehicle/mileages/{yyyy-MM-dd}`   | Suppression                             |
| GET     | `/api/assets/{id}/vehicle/maintenances`            | Entretiens                              |
| POST    | `/api/assets/{id}/vehicle/maintenances`            | Création                                |
| PUT     | `/api/assets/{id}/vehicle/maintenances/{publicId}` | Remplacement complet                    |
| DELETE  | `/api/assets/{id}/vehicle/maintenances/{publicId}` | Suppression                             |

Inconnu, d’un autre utilisateur ou supprimé : **404** → message neutre `Actif introuvable.` (sous-ressource : `Élément introuvable.`), retrait local, invalidation des listes.

## Objet renvoyé

Racine + **exactement un** détail non nul selon `type` (`vehicle`, `crypto`, `valuableItem`, `savingsAccount`, `other`, `realEstate`). En réponse `realEstate = { details, summary }` (`summary` `null` en liste, conservé par le store quand une liste écrase un détail connu). `normalizeAsset` complète booléens / nombres et met `country` en majuscules.

## Règles (client)

- `name` obligatoire ≤ 150 ; `estimatedValue` ≥ 0 ; `acquisitionPrice` ≥ 0 ; `description` ≤ 500 ; `notes` ≤ 2000.
- `type` et `currency` **figés** après création (PUT : devise stockée renvoyée, `type` absent). Devise omise à la création = settings.
- Requête : seul le détail du type est envoyé. Détails obligatoires : véhicule (`brand`, `model`, `vehicleType`), crypto (`name`, `symbol` en majuscules, `quantity`), objet (`itemType`), épargne (`savingsType`), immobilier (`propertyType`, `country` 2 lettres).
- PUT état complet avec `isActive` (`false` = cédé : reste en liste `state=sold`, sort du patrimoine net).
- **Épargne adossée** (`savingsAccount.accountPublicId`) : comptes `isOwned && isActive && myRole === 'owner'`. La valeur est masquée dans le formulaire (elle suit le solde, `isValueFromAccount`), le PUT renvoie la valeur courante ; pas d’onglet Valorisations.
- Valorisations / relevés / entretiens : dates non futures (fuseau settings), valeurs ≥ 0, prochain entretien ≥ date. La dernière valorisation ne peut pas être supprimée (bouton désactivé, 400 sinon). Toute écriture refetch l’actif (`estimatedValue`, `lastValuationDate`, `currentMileage`) ; un entretien invalide les relevés.
- Entretien : garage via `TierPicker` (tier possédé) ; `transactionPublicId` **sans sélecteur** pour l’instant : conservé tel quel en édition, `null` en création.

Codes d’erreur client (`AssetPayloadErrorCode`) → libellés `assetsPage.form.errors.<code>`.

## UI

- `AssetsDirectory` : grille 3 colonnes (2 tablette, 1 mobile) d’`AssetListItem` ; `defineExpose({ openCreate })`.
- `AssetListItem` : carré 36 px teinté (`assetTypeTile`), nom, « type · détail court », valeur + devise, date de dernière valorisation, « cédé » ; menu Modifier / Supprimer.
- `AssetFormModal` (`modelValue`, `asset?`, `lockedType?`, `defaultType?` ; emits `update:modelValue`, `saved`) : création `AppModalBase`, fiche `AppModalTabs` : Détails · Valorisations (sauf `isValueFromAccount`) · Relevés + Entretiens (véhicule).
- `AssetValuationsPanel` (`asset`) exporté pour la fiche Immobilier.

## Realtime

`assetChanged` `{ change, assetPublicId }` (acteur inclus ; mutation locale ignorée 2,5 s) :

- `assetDeleted` → retrait local + `notifyDeleted` + refetch de la liste active ;
- `assetUpdated` / `assetRealEstateChanged` sur un actif connu → `fetchAsset(id, true)` (sous-listes invalidées) ; inconnu → refetch liste ;
- `assetCreated` → refetch liste.

`accountChanged` (toute valeur) → `fetchAsset` des actifs `isValueFromAccount` liés à ce compte.

## Bootstrap

`auth-guard` → `onAuthenticatedSession()` (temps réel seul, sans charger les listes). `bootstrap()` = temps réel + liste. `reset()` au logout.

## Tests critiques

- `__tests__/payload.test.ts` · `__tests__/format.test.ts` · `__tests__/paths.test.ts`
- `stores/__tests__/assets-store.test.ts`
