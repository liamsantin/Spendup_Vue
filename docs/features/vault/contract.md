# Coffre (chiffrement dans le navigateur) — contrat front

> Code : `src/features/vault/`  
> Statut : active (étapes 5b et 5c) · Relu : 2026-11-09  
> Voir aussi : `features/auth/contract.md`, `features/user-settings/contract.md`, `features/accounts/contract.md`, `features/tiers/contract.md`, `features/assets/contract.md`, `features/files/contract.md` · côté API : `Spendup_Api/Docs/Features/security/feature-vault.md`, `Docs/security/cartographie-chiffrement.md`

## Boundaries

| Couche    | Détail                                                                                                                                      |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Store     | `useVaultStore` : clés d’usage (mémoire + IndexedDB), état serveur, chiffrement / déchiffrement, migration, secours, désactivation          |
| Crypto    | `crypto.ts` (WebCrypto seulement), `file-content.ts` (PDF), `recovery-code.ts`, `base64url.ts`                                              |
| Catalogue | `catalog.ts` : **seule** liste des tables / colonnes chiffrables et de leur périmètre, alignée sur `Application/Vault/VaultCatalog.cs`      |
| API       | `vaultApi` (`/api/vault*`), `authApi.resetPasswordVaultParams`, champs `vault` / `vaultWrap` des routes auth                                |
| UI        | `components/VaultHost.vue` monté dans `FullLayout` (bandeaux et dialogues), carte **Coffre** de Sécurité, formulaire de réinitialisation    |
| Écrans    | `accounts/vault-fields.ts`, `assets/vault-fields.ts`, `tiers/vault-fields.ts`, `files/vault-fields.ts` : nomment les colonnes, rien d’autre |

Le serveur ne fait aucune cryptographie. Le front chiffre des champs listés au catalogue et des PDF ; tout le reste part en clair comme avant.

## Modèle cryptographique

| Élément              | Choix                                                                                                                         |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| DEK                  | AES-256-GCM, 32 octets aléatoires, importée **non extractible**, gardée dans IndexedDB (`spendup-vault`) par utilisateur      |
| KEK                  | PBKDF2-SHA-256, 600 000 itérations, sel 16 octets ; secret = mot de passe **ou** phrase de Coffre **ou** code de récupération |
| Emballage DEK        | AES-GCM, `base64url(iv[12] ‖ chiffré ‖ tag[16])`                                                                              |
| Champ                | `enc:v1:<base64url(iv ‖ chiffré ‖ tag)>`, AAD `table:colonne:publicId` (`vaultAad`)                                           |
| Empreinte IBAN       | HMAC-SHA-256 avec clé HKDF(DEK, info `blind-index`), `h:` + 43 base64url, envoyée dans `ibanFingerprint`                      |
| Contenu PDF          | octets bruts `iv ‖ chiffré ‖ tag` (pas de préfixe), AAD **`file:content`** (voir §PDF), `encrypted=true` au POST              |
| Code de récupération | 8 × 4 caractères (alphabet sans 0/O/1/I/L), 130 bits, montré une fois ; normalisé (majuscules, sans tirets) avant PBKDF2      |

Les octets de la DEK ne sont en mémoire que le temps d’un (dé)ballage, puis mis à zéro. Une DEK non extractible ne peut pas être ré-emballée depuis l’appareil : tout ré-emballage part d’un emballage serveur et d’un secret saisi.

## Catalogue (`catalog.ts`)

| Table                 | Socle (`core`)                         | Étendu (`extended`)                                      | Champs Vue                                                      |
| --------------------- | -------------------------------------- | -------------------------------------------------------- | --------------------------------------------------------------- |
| `account`             | `iban` (+ empreinte), `account_number` |                                                          | `Account.iban`, `accountNumber`                                 |
| `vehicle_asset`       | `immatriculation`, `chassis_number`    |                                                          | `Asset.vehicle.plate` (châssis : pas encore de champ Vue)       |
| `crypto_asset`        | `wallet_address`                       |                                                          | pas encore de champ Vue                                         |
| `valuable_item_asset` | `serial_number`                        | `storage_location`                                       | pas encore de champ Vue                                         |
| `real_estate_asset`   |                                        | `address_line1`, `address_line2`, `postal_code`, `ville` | `Asset.realEstate.details.addressLine1/2`, `postalCode`, `city` |
| `asset`               |                                        | `notes`                                                  | `Asset.notes`                                                   |
| `tier`                |                                        | `email`, `phone`, `website`, `notes`                     | `Tier.email`, `phone`, `website`, `notes`                       |
| `tier_person`         |                                        | `first_name`, `name`                                     | `Tier.person.firstName`, `lastName`                             |
| `tier_company`        |                                        | `vat_number`, `company_registration_number`              | `Tier.company.vatNumber`, `companyRegistrationNumber`           |
| `file`                |                                        | `name_original`, `description` (+ contenu)               | `FileDto.nameOriginal`, `description`, `encrypted`              |
| `attachment`          |                                        | `name_fichier`                                           | migration seulement (pas d’écran)                               |

Règle unique, dans le store : `encrypt(table, colonne, publicId, valeur)` chiffre si le Coffre est ouvert, si la colonne est au catalogue et si `allowedScope` couvre son périmètre ; sinon la valeur part en clair. Le **socle** ne dépend que des clés (un état serveur indisponible ne remet jamais un IBAN en clair) ; l’**étendu** exige `GET /api/vault` (`allowedScope: extended`, offre `plus`). `decrypt` relit tout `enc:v1:` ; un échec renvoie `{ ok: false }` et l’écran affiche « Illisible » (`vault.unreadable`), sans jamais montrer le chiffré. Les colonnes sans champ Vue (châssis, portefeuille, série, lieu de stockage) sont couvertes par la migration mais pas par les formulaires : à faire quand les écrans existeront.

## Cycle de vie côté Vue

| Moment                                         | Ce que fait le front                                                                                                                                                                                                                                                          |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Inscription (mot de passe)                     | `prepareRegistration` → `vault` dans `POST /api/auth/register` → `commitRegistration` garde les clés sur l’appareil                                                                                                                                                           |
| Connexion mot de passe                         | `unlockWithPassword` : clés de l’appareil, sinon `GET /api/vault` + déballage ; après 2FA, le mot de passe est gardé en mémoire le temps du code                                                                                                                              |
| Connexion Google                               | clés de l’appareil ; sinon `requestPhraseUnlock` → `VaultHost` ouvre **« Ouvrir le Coffre »** (phrase) si un Coffre existe ; « Plus tard » = app en clair                                                                                                                     |
| Compte Google sans Coffre                      | proposition discrète, **une fois** (`localStorage spendup.vault.setupHint.<userId>`), et bouton **Définir une phrase de Coffre** dans Sécurité → `createWithSecret` → `POST /api/vault` (step-up via dialogue existant)                                                       |
| Compte ancien sans Coffre                      | Sécurité → **Activer le Coffre** (mot de passe) → `POST /api/vault`                                                                                                                                                                                                           |
| Migration                                      | `runVaultMigration` : lots `GET/POST /api/vault/migrate`, **toutes tables**, `encrypt` et `decrypt`, 409 → relecture du lot, `complete` quand plus rien ; aussi au changement d’offre (vers le bas : les champs étendus reviennent en clair par les mêmes lots)               |
| Changement de mot de passe                     | `rewrapForPassword(secret actuel, nouveau)` → `vaultWrap` ; secret = mot de passe, ou **phrase de Coffre** pour un compte Google qui pose son premier mot de passe (champ dédié du modal) ; sans Coffre : `vault` (création silencieuse)                                      |
| Mot de passe oublié                            | `ResetPasswordForm` : `GET /api/auth/reset-password/vault?token=` ; code saisi → `rewrapWithRecoveryCode` → `vaultWrap` ; sans code → avertissement + case à cocher obligatoire, envoi sans `vaultWrap`                                                                       |
| Coffre verrouillé (`dekWrappedPassword: null`) | `unlockWithPassword` → `lost` ; bandeau `VaultHost` + carte Sécurité : **Restaurer avec le code** (`restoreWithRecoveryCode` → `PUT /api/vault/password-wrap`, même sel) ou **Remettre à zéro** (`resetVault` → `POST /api/vault/reset`, Coffre neuf)                         |
| Désactivation                                  | `disableVault` : `POST /api/vault/disable` → lots `decrypt` jusqu’à `pendingCount = 0` → `DELETE /api/vault` ; une valeur illisible bloque avant le DELETE (`VAULT_PENDING`), l’erreur de l’API est affichée telle quelle ; reprise possible (« Reprendre la désactivation ») |
| Déconnexion / inactivité / 401                 | `lock()` : clés effacées (mémoire + IndexedDB), état oublié                                                                                                                                                                                                                   |

Step-up : les dialogues envoient le mot de passe comme preuve quand c’est lui le secret ; pour une phrase (Google), `withStepUpRetry` ouvre le dialogue step-up existant (OTP / jeton Google).

## Écriture d’une entité : POST puis PUT

L’AAD a besoin du `publicId`, attribué par le serveur. Création d’un compte, d’un actif ou d’un tiers avec un champ chiffrable en clair et un Coffre ouvert : `POST` **sans** ces champs, puis `PUT` état complet avec les champs chiffrés ; si le `PUT` échoue, la ligne créée est supprimée. `needs*VaultWrite` évite le double appel quand rien ne serait chiffré (offre `free` et champs étendus seulement). Évolution API souhaitable : accepter un `publicId` fourni par le client (ou les champs chiffrés directement au `POST`).

## PDF (périmètre étendu)

- Upload (`files-crud.uploadWithVault`) : `vault.encryptPdf(file)` → `POST /api/files` avec `encrypted=true`, **nom neutre `document.pdf`**, type `application/octet-stream` ; puis `PATCH` avec `nameOriginal` chiffré (AAD `file:name_original:<publicId>`). Si le PATCH échoue, le fichier est supprimé.
- Pourquoi l’AAD du contenu est `file:content` sans `publicId` : le contenu est chiffré avant le `POST`, donc avant que l’identifiant existe. Lier le contenu au `publicId` demanderait un second upload ; le nom et la description, eux, y sont liés. Un déplacement de blob entre lignes du même utilisateur ne change pas la clé : risque accepté, documenté.
- Lecture : `loadReadablePdf(publicId)` télécharge, détecte `%PDF` (clair) sinon déchiffre avec la DEK ; blob URL `blob:` créée par `useFileContentUrl`, révoquée au `reset` / unmount ; Coffre fermé → `FileContentLockedError` affichée dans l’aperçu.
- Déduplication serveur désactivée pour un fichier chiffré (deux chiffrements d’un même PDF diffèrent) ; quota inchangé.

## Exports

CSV des tiers et des fichiers : valeurs déchiffrées quand le Coffre est ouvert ; un `enc:v1:` résiduel sort marqué **« Chiffré »** (`sensitiveExportValue`, `vault.encrypted`), jamais tel quel. Les autres exports (transactions, récurrences, moyens de paiement, échéances) ne portent aucun champ du catalogue.

## Affichage

`Illisible` (`vault.unreadable`) pour un chiffré qu’on n’ouvre pas (clé absente, autre ligne), `Chiffré par le propriétaire` (`vault.foreign`) pour un compte partagé. Appliqué : listes de comptes, tiers (tableau et ligne mobile), fichiers (tableau, ligne), détail d’actif (plaque, notes), détail de bien (adresse), pièces jointes des transactions / récurrences / biens.

## Tests

`src/features/vault/__tests__/` : `crypto`, `recovery-code`, `recovery-rewrap` (dérivation par code, ré-emballage), `catalog` (AAD, périmètres), `migration` et `migration-tables` (multi-tables, changement d’offre, désactivation, 409), `file-content`, `vault-store`, `vault-store-lifecycle` (phrase, secours, remise à zéro, désactivation). Par écran : `accounts`, `tiers`, `files` `__tests__/vault-fields.test.ts`.

## Limites connues (5c)

- Le flux « mot de passe oublié » n’a pas pu être exercé de bout en bout en local (l’API de dev n’envoie pas d’e-mail) : la dérivation et le ré-emballage sont couverts par les tests unitaires ; le formulaire a été vérifié sans Coffre (jeton invalide → aucun bloc Coffre).
- Les noms de fichiers lus hors du store `files` (pièces jointes d’une transaction, documents d’un bien, récurrences) ne sont pas déchiffrés : ils s’affichent « Illisible » tant que la lecture passe par ces endpoints ; un déchiffrement à la normalisation de ces réponses reste à faire.
- `useAccountUsernameChange` (nom d’utilisateur + premier mot de passe en une fois) ne demande pas la phrase de Coffre : un compte Google **avec** phrase passant par là reçoit le 400 de l’API (« ré-emballé avec le nouveau mot de passe ») ; passer par le modal **Définir un mot de passe**, qui la demande.
- Champs du catalogue sans écran Vue : `chassis_number`, `wallet_address`, `serial_number`, `storage_location`, `attachment.name_fichier`.
