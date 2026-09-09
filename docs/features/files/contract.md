# Fichiers (PDF) — contrat front

> Code : `src/features/files/`  
> Statut : active · Relu : 2026-09-09  
> Voir aussi : `architecture/http.md`, `patterns/app-page-shell.md`

## Boundaries

| Couche | Détail                                                                                                                       |
| ------ | ---------------------------------------------------------------------------------------------------------------------------- |
| Route  | `/app/gestion/files` + `/app/gestion/files/:publicId` (aperçu **pleine page** dans le shell, pas de modale) → `AppFilesPage` |
| Nav    | Sidebar **Gestion** → sous-menu **Fichiers**                                                                                 |
| Store  | `useFilesStore` (state · crud · lifecycle ; pas de realtime V1)                                                              |
| API    | `filesApi` via **`fetchWrapper`** (JSON) + `postForm` / `getBlob`                                                            |
| Cloud  | Bucket Infomaniak **privé** — le front ne parle jamais au stockage, seulement à l’API                                        |

Owner only. Un autre user ou un `publicId` inconnu / soft-deleted → **404** (pas 403). Pas de corbeille / restore en V1.

Avatar : **contrat inchangé** (`PUT/POST/GET/DELETE /api/auth/me/avatar`, `GET /api/users/{id}/avatar`). `profilePicture` catalogue `/avatar/…` = asset local ; hash 64 hex = blob `GET …/avatar` ; `null` = placeholder. L’avatar **n’entre pas** dans le quota fichiers.

## HTTP `/api/files`

Auth identique au reste : `Authorization: Bearer` **ou** cookie `spendup_access`. JSON camelCase, enveloppe standard — **sauf** `GET …/content` (PDF brut) et `DELETE` (`204` vide).

| Méthode | Endpoint                        | Notes                                                                                                                                               |
| ------- | ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET     | `/api/files?page=&pageSize=`    | `page` ≥ 1 (défaut 1), `pageSize` 1–200 (défaut **50**)                                                                                             |
| GET     | `/api/files/usage`              | Quota blobs PDF **uniques** (hors avatar, hors soft-delete). Ne pas dériver de la liste paginée                                                     |
| GET     | `/api/files/{publicId}`         | Métadonnées                                                                                                                                         |
| GET     | `/api/files/{publicId}/content` | PDF brut, `Content-Type: application/pdf`. **Toujours** `fetch` → blob URL, affichée dans la page (visionneuse native du navigateur, pas de modale) |
| POST    | `/api/files`                    | `multipart/form-data`, champ **`file`**. Ne pas forcer `Content-Type`                                                                               |
| PATCH   | `/api/files/{publicId}`         | JSON partiel (`nameOriginal`, `description`, `documentDate`, `clearDocumentDate`)                                                                   |
| DELETE  | `/api/files/{publicId}`         | `204` sans body. Soft-delete                                                                                                                        |

Le même PDF uploadé deux fois = **deux lignes** (`publicId` différents, même `sha256Hash`). Un second blob identique **ne consomme pas** plus de quota (`fileCount` peut dépasser `uniqueBlobCount`). `publicId` = clé Vue / route. Ne pas utiliser `sha256Hash` comme id.

Pas d’URL S3 dans le JSON.

`GET /api/files/usage` → `FileUsage` : `usedBytes`, `quotaBytes`, `remainingBytes`, `isUnlimited`, `fileCount`, `uniqueBlobCount`. Plafond config `FileStorage:DefaultQuotaBytes` (**100 Mo** par défaut). `quotaBytes: 0` + `isUnlimited: true` = pas de plafond.

## Validation UI (avant envoi)

| Règle                                         | Message (400 API si contourné)                            |
| --------------------------------------------- | --------------------------------------------------------- |
| PDF uniquement (magic bytes `%PDF`)           | 400                                                       |
| Taille max **10 Mo** (`10485760`) par fichier | 400                                                       |
| Nouveau blob qui ferait dépasser le quota     | « Quota de stockage dépassé. »                            |
| Champ manquant / vide                         | « Fichier PDF requis. »                                   |
| Rate-limit 30 uploads / user / heure          | « Trop d'uploads de fichiers. Réessayez dans une heure. » |
| `nameOriginal` présent mais vide              | « Le nom du fichier est obligatoire. »                    |
| `description` `""` / whitespace               | envoyé `null` (efface)                                    |
| `clearDocumentDate: true`                     | gagne sur `documentDate`                                  |

Côté UI, si `file.size > remainingBytes` (et quota non illimité), on n’envoie pas : estimé sans hash client — un doublon peut encore être accepté par l’API. Le serveur reste la source de vérité.

Hors V1 : restore, PJ transactions / fiscalité, autres mime types.

## Store

- Une liste paginée + index `knownById`. TTL 30 s. `loadMore()` page suivante.
- `usage` chargé au montage de l’écran Fichiers via `GET /api/files/usage` — **jamais** en sommant `items[].sizeBytes`.
- Recherche UI (`?q=`) et tri (`?sort=`) **côté client** sur les pages chargées.
- Upload : `FormData` + progression optionnelle. Après succès **ou** 400 quota → refetch usage. PATCH métadonnées : pas de refetch usage.
- DELETE 204 → retrait de la ligne + refetch usage. 404 → message neutre + retrait local (pas de refetch usage).
- `reset()` au logout (`clearSession`).
