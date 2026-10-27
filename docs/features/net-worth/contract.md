# Patrimoine net — contrat front

> Code : `src/features/net-worth/`  
> Statut : active · Relu : 2026-10-27  
> Voir aussi : `features/accounts/contract.md`, `architecture/realtime.md`, `patterns/app-page-shell.md`

## Boundaries

| Couche   | Détail                                                                                                                   |
| -------- | ------------------------------------------------------------------------------------------------------------------------ |
| Route    | `/app/patrimoine` (`NET_WORTH_PATHS.overview`) → `AppWealthOverviewPage` (Page Shell + `NetWorthOverviewContent`)        |
| Nav      | Sidebar **Patrimoine** → **Vue d’ensemble**                                                                              |
| Store    | `useNetWorthStore` (state · load · realtime · lifecycle)                                                                 |
| API      | `netWorthApi` via **`fetchWrapper`**                                                                                     |
| Droits   | Ressource **personnelle**, lecture seule (sauf le `POST` de snapshot).                                                   |
| Realtime | Aucun événement dédié : `assetChanged`, `liabilityChanged`, `personalLoanChanged`, `sharedDebtChanged`, `accountChanged` |

`WEALTH_BASE` (`/app/patrimoine`) est la racine dont dérivent les `paths.ts` des features assets, real-estate, investments et liabilities.

## HTTP

Auth JWT. Enveloppe `{ success, message, result }` déjà dépaquetée par `fetchWrapper`.

| Méthode | Route                                | Résultat                                                                       |
| ------- | ------------------------------------ | ------------------------------------------------------------------------------ |
| GET     | `/api/net-worth`                     | Calcul du jour (`NetWorthOverview`)                                            |
| POST    | `/api/net-worth/snapshots`           | Écrit / réécrit le snapshot du mois courant ; 400 sans compte, actif ni passif |
| GET     | `/api/net-worth/snapshots?from=&to=` | Historique mensuel, 12 mois par défaut, 60 au plus, plus ancien d’abord        |

400 : `message` affiché tel quel (`store.error`).

## Objet renvoyé

- `netWorth = totalAccounts + totalAssets − totalLiabilities`, en devise de base. Totaux toujours positifs : l’UI affiche les passifs en négatif (vrai signe moins).
- `investments` = part titres des comptes `investissement` / `crypto`, **déjà incluse** dans `totalAccounts` (la barre de répartition l’isole pour ne pas compter deux fois). `investmentsWithoutQuote` = positions comptées au PRU.
- `accountsByType` / `assetsByType` / `liabilitiesByType` : `{ type, count, total }`. Types propres au calcul : `pretAccorde`, `dettePartagee` (actif ou passif), `compteCredit`, `emprunt` → libellés `netWorthPage.breakdown.*` ; sinon `assetsPage.types.*`, `liabilitiesPage.types.*`, `comptesPage.types.*`, repli sur le type brut (`breakdownLabel`).
- `excluded` : éléments dans une autre devise, comptés mais jamais sommés → `AppAlert` warning. Lignes vides filtrées par `normalizeOverview`.
- `lastSnapshot` : `{ periode, netWorth, delta }` ou `null` ; `delta = calcul courant − snapshot`.
- Snapshot : `periode` = 1er du mois, `savingsRate` en % ou `null` sans revenu. L’historique accepte un tableau nu ou `{ items }` (`normalizeSnapshotsResult`).

## Règles UI

- En-tête : patrimoine net en `su-hero-num` (signe U+2212), delta depuis le dernier snapshot (bleu `+` / noir `−`), `su-figs` Comptes · Actifs · Passifs · Placements (+ note positions sans cours).
- Répartition : barre empilée carrée (comptes hors placements bleu, actifs violet, placements bleu pâle, passifs noir) + légende alignée ; trois colonnes par type avec liens `su-link` vers actifs, immobilier, passifs, comptes (`/app/finances/comptes`), placements.
- Entre amis : `friendsBalance.receivable` / `payable`, lien vers `DEBTS_PATHS.shared`.
- Évolution : `evolutionSeries` = snapshots + point courant (`asOf`), qui remplace le snapshot du mois en cours ; courbe SVG 2 px (`NetWorthEvolutionChart`). Bouton « Photographier maintenant » → `takeSnapshot()` puis recharge calcul + historique.
- Dernier snapshot : revenus, dépenses, taux d’épargne du dernier point de l’historique.

## Realtime

Pas d’événement « patrimoine net ». Tout événement actif / passif / prêt / dette partagée / compte invalide le cache et programme **un** `load(true)` débouncé (`NET_WORTH_REFETCH_DEBOUNCE_MS` = 800 ms), seulement si la page a déjà été chargée (`initialized`). Pas de mutation locale à ignorer : la feature n’écrit que le snapshot, qui ne déclenche aucun événement.

## Bootstrap

- `onAuthenticatedSession()` : branche les cinq abonnements, **sans** charger (appelé par le guard d’auth).
- `bootstrap()` : branche le temps réel puis charge calcul + historique (montage de la page). Cache 30 s (`NET_WORTH_MAX_AGE_MS`).
- `refresh()` : recharge forcée (bouton « Actualiser », retour d’onglet visible).
- `reset()` : annule les chargements et le refetch en attente, désabonne, vide l’état (logout).

## Tests critiques

- `__tests__/format.test.ts` : normalisation, chiffre héros, delta signé, série d’évolution, projection SVG, parts empilées, libellés de répartition.
- `stores/__tests__/net-worth-store.test.ts` : cache 30 s, historique (tableau nu / `{ items }`), snapshot + recharge, 400 affiché tel quel, abonnements sans chargement, refetch débouncé unique, pas de refetch avant chargement, `reset`.
