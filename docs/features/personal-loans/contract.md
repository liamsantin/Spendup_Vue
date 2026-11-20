# Prêts entre personnes — contrat front

> Code : `src/features/personal-loans/`  
> Statut : active · Relu : 2026-10-27  
> Voir aussi : `features/liabilities/contract.md` (chemins de la page Dettes), `features/tiers/contract.md`, `architecture/realtime.md`

## Boundaries

| Couche   | Détail                                                                                                 |
| -------- | ------------------------------------------------------------------------------------------------------ |
| Route    | `/app/patrimoine/dettes/prets` → `AppDebtsPage`, onglet **Prêts** (`/prets/:publicId` ouvre l’édition) |
| Nav      | Sidebar **Patrimoine** → **Dettes**                                                                    |
| Store    | `usePersonalLoansStore` (state · crud · realtime · lifecycle)                                          |
| API      | `personalLoansApi` via **`fetchWrapper`**                                                              |
| Droits   | Ressource **personnelle**. Contrepartie = tier possédé (quelqu’un hors Spend.Up).                      |
| Realtime | `personalLoanChanged` (acteur inclus)                                                                  |

Pour un ami Spend.Up, utiliser les dettes partagées (onglet **Entre amis**). Chemins : `personalLoanDetailPath` / `personalLoanPublicIdFromPath` dans `@/features/liabilities/paths` (réexportés par le barrel).

## HTTP

Auth JWT. JSON camelCase. Enveloppe `{ success, message, result }` sauf DELETE → **204** sans corps.

| Méthode | Route                                    | Résultat       |
| ------- | ---------------------------------------- | -------------- |
| GET     | `/api/personal-loans?status=&direction=` | Liste + totaux |
| GET     | `/api/personal-loans/{publicId}`         | Détail         |
| POST    | `/api/personal-loans`                    | Création       |
| PUT     | `/api/personal-loans/{publicId}`         | État complet   |
| DELETE  | `/api/personal-loans/{publicId}`         | Soft-delete    |

Liste : `{ items, totalCount, totalLent, totalBorrowed, currency }` — totaux des prêts **actifs** en devise de base. 404 neutre (`Prêt introuvable.`) → retrait local + invalidation. 400 : `message` tel quel.

## Objet renvoyé

`publicId`, `direction` (`pret` = je prête, créance \| `emprunt` = j’emprunte, passif), `counterpartTierPublicId`, `counterpartName`, `label`, `initialAmount`, `remainingAmount`, `repaidAmount`, `percentRepaid`, `currency`, `startDate`, `plannedEndDate`, `status` (`active` \| `rembourse` \| `annule`), `isOverdue` (actif et échéance dépassée), `notes`, dates.

## Règles (payload.ts)

- `direction` et contrepartie obligatoires ; **modifiables seulement si le prêt stocké est `active`** (`directionLocked` / `counterpartLocked` côté client, 400 serveur).
- `label` optionnel, ≤ 150. `notes` optionnelles (borne UI 2000).
- `initialAmount` > 0 ; `0 ≤ remainingAmount ≤ initialAmount`. Création : restant vide → `null` (= initial). PUT : restant obligatoire (vide → initial).
- `startDate` obligatoire ; `plannedEndDate ≥ startDate`.
- Devise optionnelle à la création, figée ensuite (`context.current.currency`).
- Statuts comme les passifs : dérivé du restant, `annule` via l’interrupteur et collant. Pas de taux ni de journal de remboursements : on édite le restant.
- Le tier reçoit le rôle `emprunteur` ou `preteur` ; le supprimer tant que le prêt vit → 400.

## Store

`items`, `totalCount`, `totalLent`, `totalBorrowed`, `totalsCurrency`, `loading`, `acting`, `initialized`, `error`, `hasItems`, `activeQuery`, `allKnownItems`, `findByPublicId`, `subscribeToDeleted`, `clearError`, `loadList({ status?, direction?, force? })`, `refetchActive`, `fetchPersonalLoan`, `createPersonalLoan`, `updatePersonalLoan(publicId, fields, { current? })`, `deletePersonalLoan`, `onAuthenticatedSession`, `bootstrap`, `reset`, `toAppError`. Après chaque mutation locale, la liste active est refetchée pour recalculer les totaux (devise de base, calcul serveur).

## UI

- `PersonalLoansDirectory` (sans prop, `defineExpose({ openCreate })`) : chiffres clés `su-figs` « Je prête » (bleu) / « J’emprunte », query `?status=` (défaut `active`, `all` lève le filtre), `?direction=`, `?q=` (contrepartie, libellé, notes).
- `PersonalLoanListItem` props `loan`, `acting?` ; emits `edit`, `delete`. Contrepartie 700, jauge, restant / initial, échéance, « en retard » violet si `isOverdue`.
- `PersonalLoanFormModal` props `modelValue`, `loan?`, `defaultDirection?` ; emits `update:modelValue`, `saved`. Contrepartie via `TierPicker`.

## Realtime

`personalLoanChanged` `{ change: personalLoanCreated | personalLoanUpdated | personalLoanDeleted, personalLoanPublicId }`. Mutation locale (2,5 s) ignorée ; sinon invalidation, refetch du détail connu sur `Updated`, retrait local sur `Deleted`, refetch de la liste active.

## Bootstrap

`auth-guard` → `onAuthenticatedSession()` (realtime seul). `reset()` au logout.

## Tests critiques

- `__tests__/payload.test.ts` · `__tests__/format.test.ts`
- `stores/__tests__/personal-loans-store.test.ts`
