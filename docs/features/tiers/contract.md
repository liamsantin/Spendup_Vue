# Tiers (contreparties) — contrat front

> Code : `src/features/tiers/`  
> Statut : active · Relu : 2026-09-08  
> Voir aussi : `architecture/realtime.md`, `patterns/app-page-shell.md`, `features/categories/contract.md`

## Boundaries

| Couche   | Détail                                                                           |
| -------- | -------------------------------------------------------------------------------- |
| Route    | `/app/gestion/tiers` → `AppTiersPage` (Page Shell)                               |
| Nav      | Sidebar **Gestion** → sous-menu **Tiers**                                        |
| Store    | `useTiersStore` (split `stores/internal/` : state · crud · realtime · lifecycle) |
| API      | `tiersApi` via **`fetchWrapper`**                                                |
| Realtime | SignalR `tierChanged` (acteur inclus, groupe utilisateur, sans inbox)            |

Annuaire **personnel** : pas de partage, aucune dépendance à un compte. Un tier s’attache à une transaction via `tierPublicId`.

## Modèle

| Notion   | Valeurs                                                                                                                                          | Cardinalité   |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ------------- |
| `nature` | `person` · `company` · `organization` · `administration` · `unknown`                                                                             | exactement 1  |
| volet    | `person` / `company` / `organization` (objet), selon la nature                                                                                   | 0 ou 1        |
| `roles`  | `contactPersonnel` `banque` `assurance` `employeur` `bailleur` `service` `fournisseur` `administration` `medecin` `preteur` `emprunteur` `other` | 0..N, uniques |

Les rôles sont indépendants de la nature. En réponse, le volet de la nature est **toujours un objet** (champs `null` possibles) ; les deux autres sont `null`. `administration` / `unknown` : les trois volets sont `null`.

## HTTP

| Méthode | Endpoint                | Notes                                                                                                                           |
| ------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| GET     | `/api/tiers`            | Paginé (`page`, `pageSize` ≤ 200), tri nom puis id. Filtres `nature`, `role`, `search` (contient, casse ignorée, tronqué à 100) |
| GET     | `/api/tiers/{publicId}` | `404` si inconnu, supprimé ou d’un autre utilisateur (jamais `403`)                                                             |
| POST    | `/api/tiers`            | `200` avec le `TierResponse` complet (`website` normalisé `https://…`)                                                          |
| PUT     | `/api/tiers/{publicId}` | **État complet** : `null` vide un champ, `roles` remplace tout, changer `nature` recrée le volet                                |
| DELETE  | `/api/tiers/{publicId}` | `204`. Soft-delete. `400` + message affichable si une transaction vivante référence le tier                                     |

## Validation client (`payload.ts`)

| Champ              | Règle                                                                             |
| ------------------ | --------------------------------------------------------------------------------- |
| `name`             | obligatoire, trimé, max 200, unique par utilisateur (casse ignorée, toute nature) |
| `nature`           | une des 5 valeurs                                                                 |
| `email`            | max 180, `local@domaine.tld`, envoyé en minuscules                                |
| `phone`            | max 50, chiffres + espaces + `+ - . ( )`, ≥ 3 chiffres                            |
| `website`          | http(s) ; hôte nu préfixé `https://` ; `ftp://`, `localhost` refusés              |
| `notes`            | max 4000                                                                          |
| `roles`            | énumération, sans doublon (casse ignorée), renvoyés dans l’ordre de l’énumération |
| volet              | seul le volet de `nature` est envoyé, les autres à `null`                         |
| `person.birthDate` | `yyyy-MM-dd`, jamais dans le futur (UTC)                                          |

Le formulaire n’affiche qu’un volet, selon la nature. À la création, le type se choisit d’abord (menu Ajouter ou première étape) ; les rôles ne sont pas demandés et restent vides. En édition, nature et rôles restent modifiables. Les codes `TierPayloadErrorCode` sont traduits dans `tiersPage.form.errors.*`.

## Store

- Listes paginées par clé `list:{nature}:{role}:{search}` + index `knownById` (tous les tiers vus, y compris via `searchForPicker` et `fetchTier`).
- `loadMore()` page suivante ; `searchForPicker(search)` alimente un sélecteur (`pageSize` 200) sans toucher la liste active.
- Mutations locales mémorisées 2,5 s (`rememberLocalMutation`) pour ignorer l’écho SignalR de l’émetteur.
- `subscribeToDeleted(listener)` : notifié sur suppression locale **ou** realtime — le formulaire transaction vide son sélecteur.
- Erreurs : 400 → message serveur tel quel (`error`), formulaire laissé ouvert ; 404 → message neutre + retrait local.

## Realtime

`tierChanged` (`tierCreated` \| `tierUpdated` \| `tierDeleted`, `tierPublicId`) via le store notifications (`subscribeToTierChanged`).

| Change        | Réaction                                                                    |
| ------------- | --------------------------------------------------------------------------- |
| `tierCreated` | invalider les listes, refetch de la liste active si initialisée             |
| `tierUpdated` | idem + `GET /api/tiers/{id}` si le tier est connu (rafraîchit les libellés) |
| `tierDeleted` | retrait local, notification `subscribeToDeleted`, refetch                   |

## Transactions

- `Transaction.tierPublicId: string | null` ; `tierPublicId?` sur create ; **état complet** sur PUT (`null` détache).
- Sélecteur `TierPicker` : recherche serveur (`search`), création rapide via `TierFormModal` (POST) puis sélection.
- Filtre liste : `GET /api/transactions?tierPublicId=` (`?tier=` dans l’URL). `404` → filtre retiré.
- Badge « Ma contrepartie : {name} » dans `TransactionListItem`.
- Compte partagé : la contrepartie est personnelle. `null` reçu d’un co-détenteur ≠ « sans contrepartie » ; on ne peut pas poser le tier d’un autre.

## Parcours couverts

1. Gestion → Tiers : liste paginée, recherche par nom (debounce), filtres nature / rôle (URL `?q&nature&role`), création, édition, suppression (400 affiché tel quel + lien « Voir les transactions »).
2. Formulaire tier : nature qui commute le volet, rôles multi-sélection, contact.
3. Formulaire transaction : sélecteur de contrepartie avec recherche et création rapide.
4. Liste transactions : badge contrepartie, filtre par tier.

## Tests critiques

- `__tests__/format.test.ts`
- `__tests__/payload.test.ts`
- `stores/__tests__/tiers-store.test.ts`
