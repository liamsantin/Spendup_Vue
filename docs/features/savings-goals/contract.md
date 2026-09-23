# Objectifs d’épargne — contrat front

> Code : `src/features/savings-goals/`  
> Statut : active · Relu : 2026-09-23  
> Voir aussi : `features/accounts/contract.md`, `features/transactions/contract.md`, `architecture/realtime.md`, `patterns/app-page-shell.md`

## Boundaries

| Couche   | Détail                                                                                          |
| -------- | ----------------------------------------------------------------------------------------------- |
| Route    | `/app/planning/objectifs` → `AppSavingsGoalsPage` (Page Shell, `/:publicId?` ouvre le détail à onglets : Détails · Transactions liées) |
| Nav      | Sidebar **Planning** → **Objectifs**                                                            |
| Store    | `useSavingsGoalsStore` (state · crud · realtime · lifecycle)                                    |
| API      | `savingsGoalsApi` via **`fetchWrapper`**                                                        |
| Droits   | Ressource **personnelle**. Compte lié : owner + actif uniquement (partagé / archivé → 400).     |
| Realtime | `savingsGoalChanged` (acteur inclus, pas d’inbox) + `accountChanged` `transaction*`             |

`currentAmount` = `openingAmount` + `contributedAmount`. Seule l’ouverture est saisie par le client. Les contributions viennent des transactions **explicitement** liées. Le solde du compte ne compte pas. Pas de foyer, pas de plusieurs objectifs sur une même TX, pas de conversion, pas de prise en compte automatique de toutes les écritures du compte.

## HTTP

Auth JWT. JSON camelCase. Enveloppe `{ success, message, result }` sauf DELETE → **204** sans corps.

| Méthode | Route                                                 | Résultat     |
| ------- | ----------------------------------------------------- | ------------ |
| GET     | `/api/savings-goals?status=&accountPublicId=`         | Liste        |
| GET     | `/api/savings-goals/{publicId}`                       | Détail       |
| POST    | `/api/savings-goals`                                  | Création     |
| PUT     | `/api/savings-goals/{publicId}`                       | Remplacement |
| DELETE  | `/api/savings-goals/{publicId}`                       | Soft-delete  |

Inconnu, d’un autre utilisateur ou déjà supprimé : **404** message neutre (`Objectif introuvable.`).

Liste non paginée. `totalCount` = `items.length`. Tri serveur : `active`, puis `atteint`, puis `abandonne`, puis nom. Statut query inconnu → 400 (le front n’envoie que `active` \| `atteint` \| `abandonne`).

## Objet renvoyé

`remainingAmount` = cible − courant (peut être **négatif**). `percentReached` n’est **pas** plafonné à 100 (barre UI bornée). `targetDate` / `accountPublicId` / `projectedDate` nullable. `isOverdue` seulement si `targetDate` passée (fuseau settings) **et** statut `active`.

`contributions` : détail = 20 dernières, plus récentes d’abord ; liste = `[]` (refetch le détail pour les lignes). `amount` d’une contribution est **signé** (positif = versement, négatif = retrait).

`projectedDate` : moyenne nette des contributions des 3 derniers mois. `null` si le rythme est nul ou négatif, ou si la cible est déjà couverte.

## Création / mise à jour

- `name` obligatoire, trimé, max 150. Doublons de nom autorisés.
- `targetAmount` strictement positif, 2 décimales. `openingAmount` optionnel, défaut 0, jamais négatif. Il **s’ajoute** aux contributions, il ne les remplace pas.
- `targetDate` optionnel `yyyy-MM-dd` (une date passée est acceptée). `null` en PUT retire l’échéance.
- `accountPublicId` optionnel ; `null` en PUT détache **et retire toutes les TX liées**. Changer de compte détache celles qui ne touchent pas le nouveau compte. Compte actif dont l’utilisateur est propriétaire.
- `currency` optionnel à la création (`null` / omis = settings). Figée ensuite (changer → 400).
- Pas de `status` à la création : `atteint` si l’ouverture couvre déjà la cible, sinon `active`.
- PUT état complet. Renvoyer la devise déjà stockée. `status` : `null` / omis → le serveur décide ; `"abandonne"` reste abandonné (pas de notification) ; `"atteint"` sous la cible → ramène `active`.

## Lier une transaction

Champ optionnel `savingsGoalPublicId` sur POST / PUT transaction, et en lecture sur `TransactionResponse`.

- `null` détache. Le PUT transaction est un **état complet** : omettre le champ l’envoie à `null` et détache.
- Refus `400` si l’objectif n’a pas de compte, si la devise diffère, ou si aucun mouvement ne touche ce compte. Cas typique : un transfert vers le compte d’épargne de l’objectif.
- Une TX compte si : `savingsGoalPublicId` présent, statut `validee` ou `rapprochee`, même devise, mouvement sur le compte rattaché. Crédit augmente, débit diminue. Une TX n’alimente qu’un seul objectif.
- `savingsGoalPublicId` n’est renvoyé qu’au **propriétaire** de l’objectif. Un ami sur un compte partagé reçoit `null`.
- Après create / update / delete d’une TX liée : refetch l’objectif (`contributedAmount`, `status`, `projectedDate`).
- Supprimer l’objectif détache ses TX sans les effacer.

## Realtime

Événement `savingsGoalChanged` sur `/hubs/realtime`, groupe utilisateur, y compris la session qui écrit.

```json
{ "change": "savingsGoalCreated", "savingsGoalPublicId": "…" }
```

`change` : `savingsGoalCreated` \| `savingsGoalUpdated` \| `savingsGoalDeleted`. Payload **sans** l’objet. Au reçu : refetch liste / détail.

`accountChanged` `transactionCreated` / `Updated` / `Deleted` : refetch les objectifs du compte touché.

## Notification inbox

Au franchissement de la cible, une notification `savingsGoalReached` part **une fois**, si `pushFinancialAlerts` est activé. Elle revient si le montant redescend puis refranchit. `link` : `/savings-goals/{publicId}` → `/app/planning/objectifs/{publicId}`. Pas de notif si le statut est `abandonne`.

## Compte lié

Archiver ou supprimer un compte qui a encore un objectif vivant → 400 : *Impossible de supprimer ou d'archiver un compte lié à un objectif d'épargne. Déliez-le d'abord.*

Le front propose de détacher (`accountPublicId: null`) ou de supprimer l’objectif avant l’action (`AccountLinkedSavingsGoalsModal`).

## Bootstrap

`auth-guard` → `onAuthenticatedSession()` sans charger les listes. `reset()` au logout.

## Tests critiques

- `__tests__/payload.test.ts` · `__tests__/format.test.ts` · `__tests__/paths.test.ts` · `__tests__/link-transactions.test.ts`
- `stores/__tests__/savings-goals-store.test.ts`
