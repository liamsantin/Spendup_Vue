# Imports — contrat front

> Code : `src/features/imports/`  
> Statut : Live (V1) · Relu : 2026-10-05  
> Voir aussi : `features/transactions/contract.md`, `features/accounts/contract.md`, `features/recurring-payments/contract.md`, `features/notifications/contract.md`, `architecture/realtime.md`

## Boundaries

| Couche   | Détail                                                                                                                                                      |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Routes   | `/app/finances/imports` (historique) · `/app/finances/imports/modeles` (modèles) · `/app/finances/imports/:publicId` (écran d’un import)                    |
| Views    | `AppImportsPage` (Page Shell + onglets Historique / Modèles) · `AppImportDetailPage` (Page Shell, onglets de lignes dans le hero)                           |
| Nav      | Sidebar **Finances** → **Import**                                                                                                                           |
| Store    | `useImportsStore` (split `stores/internal/` : state · crud · lines · templates · realtime · lifecycle)                                                      |
| API      | `importsApi` / `importTemplatesApi` via **`fetchWrapper`** (`postForm` pour l’upload) — `/api/imports`, `/api/import-templates`                             |
| Realtime | SignalR `importChanged` (créateur, **session acteur incluse**) · `importTemplateChanged` · `accountChanged` `transactionsImported` / `transactionsReverted` |

Un import n’est visible **que par son créateur**, même sur un compte partagé. Upload, revue et reparse n’écrivent **aucune** transaction : seul le commit en crée.

## Parcours

```
Upload (compte + fichier + modèle optionnel)
  ├─ status erreur   → ImportMappingPanel (« Associe tes colonnes ») → POST /reparse { mapping }
  └─ status aValider → ImportReviewPanel (lignes) ─ Colonnes → mapping (⚠ reparse écrase les corrections)
                          └─ Valider l’import → ImportCommitModal (GET /preview) → POST /commit
valide  → ImportResultPanel (voir transactions · enregistrer comme modèle · revert · suggestions de récurrences)
annule  → ImportResultPanel (supprimer)
```

`ImportWorkspace` choisit le panneau d’après `import.status` et émet `layout` : `board` (revue plein écran sur `AppBoard`) ou `scroll` (mapping / résultat).

## HTTP

Enveloppe `{ success, message, result }` sauf `DELETE` (`204`). `400` = message métier **français, affiché tel quel**. `404` couvre « import d’un autre utilisateur ».

| Méthode | Endpoint                                          | Notes                                                                                                                                                                                  |
| ------- | ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| POST    | `/api/imports`                                    | Multipart `file`, `accountPublicId`, `mapping` (JSON string) **ou** `importTemplatePublicId`, `paymentMethodPublicId?` (moyen par défaut, du compte cible)                             |
| GET     | `/api/imports`                                    | `status`, `accountPublicId`, `page`, `pageSize` (20, max 100) — récents d’abord                                                                                                        |
| GET     | `/api/imports/{id}`                               | `Import` (compteurs, analyse)                                                                                                                                                          |
| GET     | `/api/imports/{id}/lines`                         | `status`, `q` (≤ 100), `sort` (`lineNumber` · `date` · `amount` · `status`, `-` = desc), 50 / 200                                                                                      |
| GET     | `/api/imports/{id}/lines/{lineId}/recurring-dues` | Échéances ouvertes rapprochables (même sens, compte cible), les plus probables d’abord                                                                                                 |
| PATCH   | `/api/imports/{id}/lines/{lineId}`                | Champ **absent** = inchangé ; présent (y compris `null`) = appliqué. Aussi `paymentMethodPublicId`, `recurringDue` (`{ recurringPublicId, scheduledAt }` ou `null`), `status`, `reset` |
| PATCH   | `/api/imports/{id}/lines`                         | Action groupée : `validate` · `ignore` · `setCategory` · `setTier` · `setPaymentMethod` ; sélection `linePublicIds` \| `sameLabelAs` \| `status`                                       |
| POST    | `/api/imports/{id}/reparse`                       | `{ mapping }` \| `{ importTemplatePublicId }` \| `{}` — **remplace toutes les lignes**. `paymentMethodPublicId` absent = défaut conservé, `null` = retiré                              |
| GET     | `/api/imports/{id}/preview`                       | Totaux, solde avant / après, `balanceCheck`                                                                                                                                            |
| POST    | `/api/imports/{id}/commit`                        | Body **toujours** JSON : `{}` ou `{ ignoreUnresolved: true }` — tout ou rien. Réponse : `createdTransactions`, `createdTiers`, `createdPaymentMethods`, `detectedRecurrences`          |
| POST    | `/api/imports/{id}/cancel`                        | `erreur` / `aValider` → `annule`                                                                                                                                                       |
| POST    | `/api/imports/{id}/revert`                        | Supprime les TX créées (y compris retouchées)                                                                                                                                          |
| DELETE  | `/api/imports/{id}`                               | Refusé si `valide` (revert d’abord)                                                                                                                                                    |
| POST    | `/api/imports/{id}/save-as-template`              | `{ name, bankTierPublicId? }`                                                                                                                                                          |
| GET     | `/api/import-templates`                           | Perso (actifs **et** inactifs) puis système ; filtre `sourceType` (`csv` · `excel`)                                                                                                    |
| GET     | `/api/import-templates/{id}`                      | Détail                                                                                                                                                                                 |
| POST    | `/api/import-templates`                           | `{ name, sourceType, mapping, bankTierPublicId?, isActive? }`                                                                                                                          |
| PUT     | `/api/import-templates/{id}`                      | **État complet** : le store renvoie le `mapping` existant tel quel                                                                                                                     |
| DELETE  | `/api/import-templates/{id}`                      | `204` ; système → `400`                                                                                                                                                                |

## Statuts

| Import     | Écran                  | Actions front                                                     |
| ---------- | ---------------------- | ----------------------------------------------------------------- |
| `erreur`   | mapping (pas un échec) | reparse, abandonner, supprimer                                    |
| `aValider` | revue                  | corriger, groupé, remapper, commit, modèle, abandonner, supprimer |
| `valide`   | résultat               | revert, modèle                                                    |
| `annule`   | résultat               | supprimer                                                         |

Lignes : `validee` (écrite au commit) · `aValider` (doute : doublon, catégorie inconnue) · `erreur` (voir `issues`) · `ignoree`. Onglets du hero = `import.counts` (`?status=` dans l’URL).

## Invariants

- **Montants signés** : négatif = dépense. Saisie `ImportLineEditModal` signée (`sanitizeSignedAmountInput`). Catégorie compatible avec le signe (`depense` ↔ `depense` / `mixte`) filtrée localement, le serveur tranche.
- PATCH : `buildImportLinePayload` n’envoie **que** les champs modifiés et ne valide qu’eux (une ligne peut rester en erreur sur un autre champ). `categoryPublicId: null` (« Laisser sans catégorie ») solde le doute « catégorie inconnue ».
- Bouton principal : `aValider` → « Valider quand même » (`status: validee`), `ignoree` → « Réintégrer », sinon « Enregistrer ». Une ligne toujours en `erreur` après correction garde la modale ouverte.
- `CURRENCY_MISMATCH` / `INVALID_CURRENCY` : devise non éditable → seule issue « Ignorer ».
- Après chaque PATCH : `GET /imports/{id}` pour les compteurs ; `preview` invalidé.
- Reparse sur un import `aValider` avec lignes : **confirmation** (`reparseLosesReviewWork`). Changer feuille / encodage / séparateur / ligne d’en-tête → colonnes **omises** (clé absente = redétection serveur).
- Mapping : `buildImportMapping` envoie toutes les colonnes, `null` explicite pour « aucune » ; référence = nom d’en-tête unique, sinon `#n`. Jamais `amount` avec `debit` / `credit`.
- Commit : `unresolved > 0` → modale « N lignes seront ignorées », puis `ignoreUnresolved: true`. `balanceCheck: mismatch` **ne bloque pas**.
- Commit : `detectedRecurrences` affiché dans le résultat ; `ImportResultPanel` liste les suggestions `propose` de l’import (`RecurringSuggestionsPanel`, `GET /api/recurring-suggestions?importPublicId=`) — créer la récurrence ou ignorer. Voir `features/recurring-payments/contract.md`.
- Échéance récurrente : rapprochée à l’analyse (`line.recurringDue`) ; la modale de ligne liste les candidates (`…/recurring-dues`) et envoie `recurringDue` (`null` = détacher). Réglée au commit.
- Moyen de paiement : défaut choisi à l’upload (moyens du compte cible) ; valeur du fichier non reconnue → `unmatchedPaymentMethodName`, créée au commit sauf retrait explicite (`PATCH … paymentMethodPublicId: null`). Idem tiers (`unmatchedTierName`).
- Alias tiers / moyens (`features/aliases`, `AliasManager`, `/api/tiers|payment-methods/{id}/aliases`) : pris en compte à la prochaine analyse. Regex : validation locale permissive (`isPlausibleDotNetRegex`), l’API (.NET) tranche.
- « Date future » : jugée dans le **fuseau des réglages utilisateur** (`todayYmdInTimeZone`), comme l’API. Montant nul et date de valeur antérieure bloquent le PATCH alors que l’API passerait seulement la ligne en `erreur` : choix d’UX assumé.
- Revert : confirmation avec le nombre (`counts.validated`), mention des TX retouchées.
- Upload : `.csv` ≤ 2 Mo, `.xlsx` ≤ 5 Mo, `.xls` / `.xlsm` / OFX / CAMT refusés côté client (`validateImportFile`), revalidés serveur. Comptes proposés : `canWriteTransactions` (owner / editor, actif). Modèles : actifs du `sourceType` du fichier.
- Données brutes purgées 90 jours après clôture : `original` / `analysis.sample` peuvent être `null` / vides (`normalizeImport`).
- Expiration 30 jours sans événement : relecture à l’ouverture de l’écran et au `visibilitychange`.

## Realtime

| Événement                                            | Réaction front                                                                                                                                                       |
| ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `importChanged`                                      | Écho de nos mutations ignoré (`rememberLocalMutation`) ; sinon refetch historique + détail / lignes si ouvert. `importDeleted` → retrait, écran « plus disponible »  |
| `importTemplateChanged`                              | Refetch des modèles si chargés ; `importTemplateDeleted` → retrait local                                                                                             |
| `accountChanged`                                     | `transactionsImported` / `transactionsReverted` traités comme les `transaction*` (soldes, journal, budgets, objectifs, récurrences) via `isTransactionAccountChange` |
| `recurringExpenseChanged` / `recurringIncomeChanged` | Poussés à l’importeur au commit **et** au revert pour chaque modèle dont une échéance est réglée / rouverte → `useRecurringPaymentsStore` relit                      |

`accountChanged` n’est envoyé qu’aux **autres** co-détenteurs : après commit / revert, le store rejoue l’événement localement (`notifications.dispatchLocalAccountChanged`) pour la session acteur.

Les transactions créées ont `source: "import"` (pastille « Importée » dans le journal).

## Limites V1

- Pas de sélection multiple de lignes (`linePublicIds`) dans l’UI : actions groupées par statut et « même libellé » depuis la modale d’une ligne.
- Le mapping d’un modèle n’est pas éditable (nom, banque, actif seulement) : il vient de l’import d’origine.

## Tests critiques

- `__tests__/mapping.test.ts` — pré-remplissage, références, `null` explicites, redétection
- `__tests__/payload.test.ts` — PATCH partiel, signe, dates, catégorie
- `__tests__/format.test.ts` — contrôle fichier, tri, statuts
- `__tests__/paths.test.ts`
- `stores/__tests__/imports-store.test.ts` — ouverture, correction, commit / revert (rejeu `accountChanged`), écho SignalR
