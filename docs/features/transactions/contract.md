# Transactions — contrat front

> Code : `src/features/transactions/`  
> Statut : active · Relu : 2026-09-09  
> Voir aussi : `features/files/contract.md`, `architecture/realtime.md`, `patterns/app-page-shell.md`

## Boundaries

| Couche   | Détail                                                                                    |
| -------- | ----------------------------------------------------------------------------------------- |
| Route    | `/app/finances/transactions` → `AppTransactionsPage` (Page Shell)                         |
| Nav      | Sidebar **Finances** → **Transactions**                                                   |
| Store    | `useTransactionsStore` (state · crud · realtime · lifecycle)                              |
| API      | `transactionsApi` via **`fetchWrapper`**                                                  |
| Droits   | Lecture viewer+ ; écriture editor+ sur **tous** les comptes touchés, comptes **actifs**   |
| Realtime | Hub `accountChanged` : `transactionCreated` / `transactionUpdated` / `transactionDeleted` |

Identifiant UI = `publicId` (GUID). Jamais d’id SQL, jamais de `sha256Hash` comme clé d’écran.

## HTTP

Auth : Bearer JWT **ou** cookie `spendup_access`. JSON camelCase, enveloppe `{ success, message, result }` — **sauf** `DELETE` (`204` vide).

| Méthode | Endpoint                                              | Rôle    | Notes                                                                        |
| ------- | ----------------------------------------------------- | ------- | ---------------------------------------------------------------------------- |
| GET     | `/api/transactions`                                   | viewer+ | Liste paginée. `files[]` hydraté (éventuellement `[]`)                       |
| GET     | `/api/transactions/{txPublicId}`                      | viewer+ | Détail. `files[]` toujours présent                                           |
| POST    | `/api/transactions`                                   | editor+ | Création. `filePublicIds?: string[]` optionnel (PDF **déjà** uploadés)       |
| PUT     | `/api/transactions/{txPublicId}`                      | editor+ | Libellé / montant / dates / PM / catégorie / tier. **Ne touche pas** `files` |
| DELETE  | `/api/transactions/{txPublicId}`                      | editor+ | `204`. Les liens PJ disparaissent, les PDF **restent**                       |
| POST    | `/api/transactions/{txPublicId}/files`                | editor+ | Body `{ filePublicId }`. `200` + TX à jour                                   |
| DELETE  | `/api/transactions/{txPublicId}/files/{filePublicId}` | editor+ | Détache, `204`. Le PDF reste dans Fichiers                                   |

Filtres liste : `accountPublicId`, `categoryPublicId`, `tierPublicId`, `recurringExpensePublicId`, `recurringIncomePublicId`, `from`, `to`, `page`, `pageSize` (défaut 50, max 200).

`source` : `manuelle` (saisie) ou `recurrence` (due confirmée). Ne **pas** envoyer `source` au POST TX. Sur une TX récurrente : `recurringExpensePublicId` / `recurringIncomePublicId` / `duePublicId`.

`PUT` : ne **pas** renvoyer `files` / `filePublicIds`. Pas de multipart sur `POST /api/transactions`.

## Justificatifs PDF

Flux : **uploader** via `/api/files` → **lier** le `publicId` à la TX → **ouvrir** via `GET /api/files/{publicId}/content` (auth obligatoire, blob URL, pas d’iframe sans token).

| Règle                  | Détail                                                                                              |
| ---------------------- | --------------------------------------------------------------------------------------------------- |
| Max                    | **5** fichiers par TX (UI désactive « Ajouter »)                                                    |
| Mime / taille          | PDF only, **10 Mo** / fichier — validation UI avant upload                                          |
| Propriété              | Attacher = posséder le PDF (`POST /api/files` avec **ton** compte)                                  |
| Viewer                 | Peut lire `files[]` et ouvrir le contenu d’une TX liée ; attacher → **404** (pas 403)               |
| Compte archivé         | Lecture OK ; attache / détache 400                                                                  |
| Détacher               | ≠ supprimer le PDF. Re-lier possible. Delete TX : liens tombent, PDF restent                        |
| Quota                  | `GET /api/files/usage` après upload. Ne pas sommer `sizeBytes`                                      |
| Bibliothèque vs pièces | `GET /api/files` = PDFs **du user**. Pièces d’une TX = `transaction.files` (y compris co-détenteur) |

`TransactionFile` : `{ publicId, nameOriginal, sizeBytes, mimeType }`.

Erreurs 400 typiques (lire `message`) : `Fichier déjà lié.` · `Une transaction accepte au plus 5 fichiers.` · `Quota de stockage dépassé.` · PDF invalide / trop gros.

Delete Fichiers d’un PDF encore lié → 400 « Impossible de supprimer un fichier lié à des transactions. Déliez-le d'abord. »

## Invariants

- Types : `depense` \| `revenu` \| `transfert`. Type et comptes **immuables** après création.
- Transfert : deux comptes actifs, editor+, **même devise**.
- `categoryPublicId` / `tierPublicId` personnels (PUT `null` = détacher). Sur un compte partagé, un co-détenteur peut voir `null`.
- Montant masqué (`null`) → placeholder `—`, jamais `0`.
- 404 → message neutre + retrait local. Viewer qui tente une écriture côté store → 403 UI (l’API attache répond 404).
- `onAuthenticatedSession()` : branche realtime **sans** charger la liste.

## UI

- Modale `AppModalTabs` : **Opération** (type, comptes, libellé, montant, dates) · **Classification** (moyen de paiement, catégorie, contrepartie) · **Justificatifs** (PDF). Erreur de champ → focus de l’onglet concerné. Catégorie / moyen de paiement / contrepartie : recherche + création rapide depuis le sélecteur.
- Liste : trombone + compteur si `files.length > 0`. Recherche client inclut `files[].nameOriginal`.
- Modale create : upload / picker → `publicId` en local → `POST` avec `filePublicIds`.
- Modale edit : attache / détache immédiat ; PUT du formulaire **sans** les pièces.
- Aperçu : `FilePreview` (blob authentifié), pas d’URL publique.

## Realtime

`accountChanged` :

- create TX (y compris pièces à la création) → `transactionCreated`
- attache / détache → `transactionUpdated` → refetch liste / détail pour rafraîchir `files`
- delete TX → `transactionDeleted`

## Tests critiques

- `__tests__/payload.test.ts` — PUT sans `files` / `filePublicIds`
- `__tests__/format.test.ts` — `files[]`, dédup max 5
- `stores/__tests__/transactions-store.test.ts` — create + attach / detach
