# Dettes entre amis — contrat front

> Code : `src/features/shared-debts/`  
> Statut : active · Relu : 2026-10-27  
> Voir aussi : `features/friends/contract.md`, `features/transactions/contract.md`, `features/notifications/contract.md`, `architecture/realtime.md`

## Boundaries

| Couche   | Détail                                                                                                                                                         |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Route    | `/app/patrimoine/dettes/amis` (onglet « amis » de la page Dettes) ; `/app/patrimoine/dettes/amis/:publicId` ouvre la fiche. Query `role`, `status`, `q`.       |
| Nav      | Sidebar **Patrimoine** → **Dettes** → onglet de module « amis »                                                                                                |
| UI       | `SharedDebtsPanel` (pas de view propre) rendu par la page Dettes, qui appelle `openCreate()` (`defineExpose`)                                                  |
| Store    | `useSharedDebtsStore` (state · crud · realtime · lifecycle)                                                                                                    |
| API      | `sharedDebtsApi` via **`fetchWrapper`** ; dépenses candidates via `transactionsApi.list` (dans le store)                                                       |
| Droits   | Le **créancier** crée et mute ; le **débiteur** lit seulement (aucun bouton d’action côté débiteur). Débiteur = ami **accepté**, non bloqué, différent de soi. |
| Realtime | `sharedDebtChanged` (créancier **et** débiteur, acteur inclus)                                                                                                 |

« J’ai payé pour deux » : le créancier crée une dette vers un ami, éventuellement rattachée à une de ses **dépenses**. Chemins : `sharedDebtDetailPath` / `sharedDebtPublicIdFromPath` dans `@/features/liabilities/paths`.

## HTTP

Auth JWT. JSON camelCase. Enveloppe `{ success, message, result }` sauf DELETE → **204**.

| Méthode | Route                                 | Qui       | Résultat                                                    |
| ------- | ------------------------------------- | --------- | ----------------------------------------------------------- |
| GET     | `/api/shared-debts?role=&status=`     | les deux  | `{ items, totalCount, totalOwedToMe, totalIOwe, currency }` |
| GET     | `/api/shared-debts/{publicId}`        | les deux  | Détail                                                      |
| POST    | `/api/shared-debts`                   | créancier | Création                                                    |
| PUT     | `/api/shared-debts/{publicId}`        | créancier | Libellé, montant, échéance                                  |
| POST    | `/api/shared-debts/{publicId}/settle` | créancier | `{ amount?, date? }`                                        |
| POST    | `/api/shared-debts/{publicId}/cancel` | créancier | Annulation                                                  |
| DELETE  | `/api/shared-debts/{publicId}`        | créancier | Soft-delete (disparaît pour les deux)                       |

404 → message neutre `Dette introuvable.` + retrait local + invalidation. 400 → `message` affiché tel quel (ex. « Seul le créancier peut modifier cette dette. »).

## Objet renvoyé

`role` = point de vue de l’appelant, `counterpart` = l’autre partie (`publicId`, `username`, `firstName`, `name`, `profilePicture`). `remainingAmount` = `amount` − `repaidAmount`. Statut dérivé : `aRembourser` → `partiellementRemboursee` → `remboursee` ; `canceled` via `/cancel`. `settledAt` posé à la clôture. Côté débiteur, `transactionPublicId` est toujours `null`. `normalizeSharedDebt` sécurise les nombres et nullables.

Totaux de liste (`totalOwedToMe`, `totalIOwe`, `currency`) : jamais recalculés localement ; toute mutation invalide les listes et refetch la liste active en arrière-plan.

## Règles (front)

- Création : ami obligatoire, montant > 0, libellé obligatoire **sans** transaction (max 150), échéance `yyyy-MM-dd` optionnelle. Avec transaction : devise = celle de la transaction, libellé vide → libellé de la transaction. Devise vide → `null` (settings).
- Édition (`canEditSharedDebt`) : créancier, dette ouverte, `repaidAmount === 0`. Seuls libellé, montant, échéance.
- Remboursement (`canSettleSharedDebt`) : montant ∈ ]0, restant] (vide = tout le restant), date ≤ aujourd’hui (fuseau settings).
- Annulation (`canCancelSharedDebt`) : dette ouverte, avec confirmation. Suppression (`canDeleteSharedDebt`) : créancier, toujours, avec confirmation.
- Échéance dépassée (`isSharedDebtOverdue`) : dette ouverte et `dueDate` < aujourd’hui → statut en violet (`su-over`).
- Plafond « cumul des dettes ≤ montant de la dépense » : contrôlé par l’API (400).

## UI

- `su-figs` : « On me doit » (`+X`, bleu) · « Je dois » (`−X`, noir).
- Sous-onglets `su-tabs` « Je suis créancier » · « Je suis débiteur » (query `role`, défaut `creditor` ; changer d’onglet retire `status`).
- Lignes `SharedDebtListItem` (`su-person`) : avatar, nom (surnom ami prioritaire), libellé · date · échéance, statut, restant signé. Menu (créancier seulement) : Rembourser, Modifier, Annuler, Supprimer.
- Clic sur une ligne → `SharedDebtDetailModal` + chemin `/amis/:publicId` ; fermer → retour à `/amis` (query conservée).
- Recherche `q` locale (libellé, nom, username).

## Realtime

```json
{ "change": "sharedDebtSettled", "sharedDebtPublicId": "…" }
```

`change` : `sharedDebtCreated` \| `sharedDebtUpdated` \| `sharedDebtSettled` \| `sharedDebtCanceled` \| `sharedDebtDeleted`. Mutation locale mémorisée 2,5 s → ignorée. `sharedDebtDeleted` → retrait local + `subscribeToDeleted` + refetch. Autres → invalidation, refetch du détail si connu, refetch de la liste active (microtask).

## Notification inbox

Au débiteur (flag `pushFinancialAlerts`) : `sharedDebtCreated`, `sharedDebtSettled`, `sharedDebtCanceled`, lien `/shared-debts`, métadonnées `{ sharedDebtPublicId }` (résolution du lien : feature notifications).

## Bootstrap

`auth-guard` → `onAuthenticatedSession()` (branche le realtime sans charger). `bootstrap()` charge la liste par défaut. `reset()` au logout.

## Tests critiques

- `__tests__/payload.test.ts` · `__tests__/format.test.ts`
- `stores/__tests__/shared-debts-store.test.ts` (liste + totaux, CRUD + settle / cancel, 404 neutre, 400 tel quel, mutation locale ignorée, refetch sur événement externe, suppression distante, dépenses candidates, reset)
