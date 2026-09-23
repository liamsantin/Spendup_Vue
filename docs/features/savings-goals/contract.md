# Objectifs d’épargne — contrat front

> Code : `src/features/savings-goals/`  
> Statut : active · Relu : 2026-09-23  
> Voir aussi : `features/accounts/contract.md`, `architecture/realtime.md`, `patterns/app-page-shell.md`

## Boundaries

| Couche   | Détail                                                                                          |
| -------- | ----------------------------------------------------------------------------------------------- |
| Route    | `/app/planning/objectifs` → `AppSavingsGoalsPage` (Page Shell, `/:publicId?` ouvre le détail)   |
| Nav      | Sidebar **Planning** → **Objectifs**                                                            |
| Store    | `useSavingsGoalsStore` (state · crud · realtime · lifecycle)                                    |
| API      | `savingsGoalsApi` via **`fetchWrapper`**                                                        |
| Droits   | Ressource **personnelle**. Compte lié : owner + actif uniquement (partagé / archivé → 400).     |
| Realtime | `savingsGoalChanged` (acteur inclus, pas d’inbox)                                               |

Le montant déjà mis de côté est **saisi par l’utilisateur**. Il ne suit ni les transactions ni le solde du compte. Pas de foyer, pas de calendrier, pas de conversion, pas de quota V1.

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

`remainingAmount` = cible − courant (peut être **négatif**). `percentReached` n’est **pas** plafonné à 100 (barre UI bornée). `targetDate` / `accountPublicId` nullable. `isOverdue` seulement si `targetDate` passée (fuseau settings) **et** statut `active`.

## Création / mise à jour

- `name` obligatoire, trimé, max 150. Doublons de nom autorisés.
- `targetAmount` strictement positif, 2 décimales. `currentAmount` optionnel, défaut 0, jamais négatif.
- `targetDate` optionnel `yyyy-MM-dd` (une date passée est acceptée). `null` en PUT retire l’échéance.
- `accountPublicId` optionnel ; `null` en PUT détache. Compte actif dont l’utilisateur est propriétaire.
- `currency` optionnel à la création (`null` / omis = settings). Figée ensuite (changer → 400).
- Pas de `status` à la création : `atteint` si courant ≥ cible, sinon `active`.
- PUT état complet. `status` : `null` / omis → le serveur décide ; `"abandonne"` reste abandonné ; `"atteint"` sous la cible → ramène `active`.
- Versement : renvoyer le détail en ne changeant que `currentAmount`, `status: null`.

## Realtime

Événement `savingsGoalChanged` sur `/hubs/realtime`, groupe utilisateur, y compris la session qui écrit.

```json
{ "change": "savingsGoalCreated", "savingsGoalPublicId": "…" }
```

`change` : `savingsGoalCreated` \| `savingsGoalUpdated` \| `savingsGoalDeleted`. Payload **sans** l’objet. Au reçu : refetch liste / détail.

## Compte lié

Archiver ou supprimer un compte qui a encore un objectif vivant → 400 : *Impossible de supprimer ou d'archiver un compte lié à un objectif d'épargne. Déliez-le d'abord.*

Le front propose de détacher (`accountPublicId: null`) ou de supprimer l’objectif avant l’action (`AccountLinkedSavingsGoalsModal`).

## Bootstrap

`auth-guard` → `onAuthenticatedSession()` sans charger les listes. `reset()` au logout.

## Tests critiques

- `__tests__/payload.test.ts` · `__tests__/format.test.ts` · `__tests__/paths.test.ts`
- `stores/__tests__/savings-goals-store.test.ts`
