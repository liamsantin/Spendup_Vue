# Récurrences — contrat front

> Code : `src/features/recurring-payments/`  
> Statut : active · Relu : 2026-10-05  
> Voir aussi : `features/transactions/contract.md`, `architecture/realtime.md`, `patterns/app-tabs-shell.md`

## Boundaries

| Couche   | Détail                                                                                                                            |
| -------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Route    | `/app/finances/recurrences` → `AppRecurrencesPage` (Tabs Shell : Charges / Revenus / Échéances)                                   |
| Nav      | Sidebar **Finances** → **Récurrences**                                                                                            |
| Store    | `useRecurringPaymentsStore` (state · crud · realtime · lifecycle) · `useRecurringSuggestionsStore` (suggestions)                  |
| API      | `recurringExpensesApi` / `recurringIncomesApi` / `recurringSuggestionsApi` via **`fetchWrapper`**                                 |
| Droits   | Templates **personnels**. Create/update/confirm : editor+ sur le **compte cible actif**. Un ami editor ne voit pas tes templates. |
| Realtime | `recurringExpenseChanged` / `recurringIncomeChanged` (+ `accountChanged` TX pour rouverture de due)                               |

Deux ressources distinctes : **template** → **dues**. Rien n’écrit de TX tant que l’utilisateur ne **confirme** pas. Confirm → TX `source: "recurrence"`. Pas d’agenda global `/api/recurring-dues`.

## HTTP

Auth Bearer ou cookie `spendup_access`. Enveloppe `{ success, message, result }` sauf DELETE → **204**. Dates `yyyy-MM-dd`. Pagination `page` 1-based, `pageSize` défaut 50, max 200.

### Charges `/api/recurring-expenses`

GET liste (`isActive`, `accountPublicId`, `from`/`to` sur **`nextDueDate`**) · GET détail (`upcomingDues` + `files`) · POST · PUT **état complet** · DELETE 204 · GET `/{id}/dues` · POST confirm / skip / **link** · POST/DELETE files.

### Revenus `/api/recurring-incomes`

Même CRUD + dues/confirm/skip/**link**. **Pas** de `/files`. Skip → `annule`. Confirm → TX `type: "revenu"`, due `encaisse`. Link → rattache une TX manuelle existante (pas de nouvelle TX).

**Piège liste** : `GET` liste ne remplit **pas** `upcomingDues`. Calendrier : fetch les deux listes puis `/{id}/dues?from=&to=` si besoin de toutes les occurrences.

### Link due (V1+)

`POST …/dues/{duePublicId}/link` body `{ transactionPublicId }`. Due **ouverte**, TX **manuelle** du bon type sur le **même compte**, pas déjà liée. Effet : due `payee`/`encaisse`, TX `source: "recurrence"`, `actualAmount` / date = TX.

### Suggestions `/api/recurring-suggestions`

Séries régulières détectées dans l’historique d’un compte (commit / revert d’import, ou `scan`), pas encore suivies. **Personnelles**, visibles tant que l’utilisateur est editor du compte.

| Méthode | Route                                         | Rôle                                                                             |
| ------- | --------------------------------------------- | -------------------------------------------------------------------------------- |
| GET     | `?accountPublicId=&status=&importPublicId=`   | Liste (défaut `status=propose`), confiance décroissante, non paginée             |
| POST    | `/scan` `{ accountPublicId }`                 | Relance la détection, renvoie les `propose` du compte                            |
| POST    | `/{id}/accept` (corps optionnel : surcharges) | Crée la charge / le revenu → `{ suggestion, recurringExpense, recurringIncome }` |
| POST    | `/{id}/dismiss`                               | `ignore` : plus jamais reproposée                                                |

UI : `RecurringSuggestionsPanel` (liste + Créer / Ignorer, valeurs détectées — modifiables ensuite comme toute récurrence) dans `ImportResultPanel` (portée import) et `RecurringSuggestionsModal` (bouton « Suggestions » de `AppRecurrencesPage`, portée compte + « Analyser l’historique »). Pas de SignalR dédié : liste relue à l’ouverture ; accepter déclenche `recurring*Changed` et le store des récurrences est relu tout de suite.

## Enums (camelCase C#)

- Charge `expenseType` : `leasing` `assurance` `credit` `abonnement` `loyer` `impot` `service` `entretien` `other`
- Charge `frequency` : `quotidien` `hebdomadaire` `mensuel` `trimestriel` `semestriel` `annuel`
- Revenu `incomeType` : `salaire` `prime` `treiziemeSalaire` `freelance` `loyerEncaisse` `dividende` `interet` `rente` `pension` `allocation` `remboursement` `other`
- Revenu `frequency` : `hebdomadaire` `mensuelle` `trimestrielle` `semestrielle` `annuelle` (pas de quotidien)
- Due charge : `prevue` `generee` `payee` `enRetard` `canceled`
- Due revenu : `prevu` `pending` `encaisse` `partiel` `annule` `retard`
- Suggestion `type` : `depense` `revenu` · `frequency` : vocabulaire des revenus · `status` : `propose` `accepte` `ignore`

Confirmable : prévu / généré-pending / retard. Retard recalculé à la lecture si `scheduledAt` &lt; aujourd’hui (fuseau local).

## Invariants

- Pause (`isActive: false`) : plus de nouvelles dues ; les dues nées restent traitables.
- Soft-delete template : dues non payées + PDF template disparaissent ; TX déjà créées restent.
- Delete TX née d’une due : la due **revient** prévue/retard → UI ne doit pas rester « payée » orpheline.
- Compte figé après 1re due payée/encaissée : changer `accountPublicId` → 400.
- Compte archivé : lecture OK ; create/update cible et confirm → 400.
- PUT : envoyer **tout** l’état (y compris `isActive`). Omettre `isActive` n’est pas un no-op côté API.
- PDF charges : `POST /api/files` puis attach. Max **5**. Detach avant delete fichier. Revenus : pas de PJ V1.
- Catégorie : `depense`/`mixte` charge ; `revenu`/`mixte` revenu.
- Tags : `tagPublicIds` sur **charges** seulement (max 10, PUT état complet). Confirm d’échéance copie les tags du template sur la TX. Link d’une TX manuelle : tags inchangés. Revenus : pas de tags. Voir `features/tags/contract.md`.

## Realtime

Owner only, pas d’inbox. L’onglet acteur reçoit aussi.

| Event                     | Payload                                                                           |
| ------------------------- | --------------------------------------------------------------------------------- |
| `recurringExpenseChanged` | `{ change: recurringExpenseCreated\|Updated\|Deleted, recurringExpensePublicId }` |
| `recurringIncomeChanged`  | `{ change: recurringIncomeCreated\|Updated\|Deleted, recurringIncomePublicId }`   |

Confirm : aussi `accountChanged` / `transactionCreated`. Invalider templates **et** comptes / TX. Commit et revert d’import : `recurring*Updated` pour chaque modèle dont une échéance est réglée / rouverte.

## Bootstrap

`auth-guard` → `onAuthenticatedSession()` sans charger les listes. `reset()` au logout (les deux stores).

## Hors scope V1

Génération auto de TX, foyer, fréquence perso, transferts récurrents, fichiers revenus, notifs inbox, endpoint calendrier unique.
