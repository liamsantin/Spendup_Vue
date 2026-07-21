# Règles du projet — Spend.Up Starterkit

> Règles de développement pour le projet **Spend.Up Starterkit**.
> Structure détaillée du projet : voir `structure-spendup.md`.

---

## Règle obligatoire avant toute implémentation

Avant d'ajouter ou recréer une view, un composant, une route ou un style :

1. Chercher dans `_template/old-application/` si l'élément Spend.Up existe déjà (structure cible).
2. Sinon, chercher dans `_template/modernize/` l'équivalent du thème Modernize (écran admin, widget, UI kit…).
3. Comparer avec ce qui est déjà présent dans `src/`.
4. Réutiliser / adapter depuis les templates plutôt que réécrire from scratch.

| Besoin Spend.Up               | Où chercher en priorité                           | Sinon (thème Modernize)                                                   |
| ----------------------------- | ------------------------------------------------- | ------------------------------------------------------------------------- |
| Front-pages, `/app`, features | `_template/old-application/`                      | —                                                                         |
| Page login, register, 2FA     | `_template/old-application/views/authentication/` | `_template/modernize/views/authentication/`                               |
| Dashboard admin               | `_template/old-application/features/dashboard/`   | `_template/modernize/views/dashboard/`                                    |
| Widgets, cartes, graphiques   | `_template/old-application/components/shared/`    | `_template/modernize/views/widgets/`, `_template/modernize/components/`   |
| Apps (email, chat, invoice…)  | —                                                 | `_template/modernize/views/apps/`, `_template/modernize/components/apps/` |
| Styles admin / auth / front   | `_template/old-application/scss/`                 | `_template/modernize/scss/`                                               |

**Ne pas modifier** `_template/modernize/` ni `_template/old-application/` — ce sont des références figées. Toute personnalisation Spend.Up se fait dans `src/`.

---

## Confirmation utilisateur

Si l'IA n'est pas certaine, ou si la modification dépasse une petite correction locale, demander confirmation à l'utilisateur avant d'exécuter.

Demander validation notamment pour :

| Situation                  | Exemples                                                                       |
| -------------------------- | ------------------------------------------------------------------------------ |
| Changement de structure    | Réorganisation de dossiers, renommage massif, fusion/split de features         |
| Refactoring large          | Migration de plusieurs composants, rewrite d'un module entier                  |
| Routing                    | Nouvelle zone de routes, modification d'URLs existantes, suppression de routes |
| Choix d'architecture       | Où placer un composant, nommage d'une feature, découpage views/components      |
| Suppression                | Retirer des fichiers, routes, styles ou fonctionnalités existantes             |
| Comportement métier ambigu | Auth, permissions, flux utilisateur non documentés                             |
| Impact transversal         | Modification touchant front-pages et `/app`, ou les règles elles-mêmes         |

Principe : en cas de doute, poser la question, proposer des options, attendre le feu vert. Les petites corrections ciblées peuvent être faites directement.

---

## Règles de structure

### Couches principales

| Couche                | Rôle                                                                      |
| --------------------- | ------------------------------------------------------------------------- |
| `app/`                | Transverse : stores globaux, guards, providers                            |
| `features/<domaine>/` | Logique métier par domaine fonctionnel                                    |
| `views/`              | Pages fines liées au routing uniquement                                   |
| `components/`         | UI transverse (`shared/`, `auth/`, `frontpages/`) — pas de logique métier |

### Règles générales

- Ne jamais créer un fichier métier directement à la racine de `views/` ou `components/`.
- **Toute logique métier** va dans `features/<domaine>/` (stores, API, composables, composants propres au domaine).
- Les `views/` restent des coquilles légères : breadcrumb, layout de page, import depuis `@/features/<domaine>`.
- Nommer les dossiers en **kebab-case** : `dashboard`, `recurring-payments`.
- Les dossiers `shared/`, `layout/`, `auth/` dans `components/` restent des regroupements transverses.
- Ne pas créer de dossiers de features vides « pour plus tard » — créer une feature quand du code métier apparaît.
- Ne pas modifier `_template/modernize/` ni `_template/old-application/`.

### Répartition par zone

| Zone               | Views                   | Logique métier                                        | Composants UI                      |
| ------------------ | ----------------------- | ----------------------------------------------------- | ---------------------------------- |
| Application `/app` | `views/app/<feature>/`  | `features/<feature>/`                                 | `features/<feature>/components/`   |
| Site public        | `views/front-pages/`    | —                                                     | `components/frontpages/<feature>/` |
| Auth               | `views/authentication/` | `features/auth/` (`stores/auth-store.ts`, API, types) | `components/auth/`                 |

**Auth — répartition :**

- **Store métier** (tokens, login/logout, refresh, `/me`, redirections) → `features/auth/stores/auth-store.ts`.
- **Client API & types** (`/api/auth/*`, device id) → `features/auth/` (export via `index.ts`).
- **UI** (formulaires) → `components/auth/` : présentation + appels au **store** uniquement ; pas d’appels `authApi` directs ; pas de logique métier dans les `views/`.
- **Styles** auth → `scss/pages/_authentication.scss` (pas de `<style>` volumineux dans les `.vue`).
- **Guards** (transverse) → `app/guards/auth-guard.ts` (consomme `useAuthStore` depuis `@/features/auth`).

### Clients HTTP

| Client                                         | Quand                                                   |
| ---------------------------------------------- | ------------------------------------------------------- |
| `authApi` (`features/auth`)                    | Bootstrap auth `/api/auth/*` (sans refresh interceptor) |
| `fetchWrapper` (`utils/helpers/fetch-helpers`) | API domaine authentifiée + refresh 401                  |

Les composants UI passent par le store de la feature, pas par le client HTTP.

## Règles SCSS

- Tous les styles du projet doivent être placés dans `src/scss/`.
- `src/scss/style.scss` est le point d'entrée global, importé dans `main.ts`.
- Les styles front-pages doivent suivre le miroir des composants dans `src/scss/frontpages/`.
- Les styles admin / Vuetify vont dans `src/scss/layout/`, `src/scss/components/`, `src/scss/pages/`.
- Dans les `.vue`, utiliser `@use '@/scss/frontpages/...'` dans `<style scoped lang="scss">`.
- **Ne pas** créer de `.scss` ou `.css` dans `components/` ni dans `features/`.
- Éviter les styles inline volumineux dans `<style>` ; extraire vers `scss/`.

---

## Règles de routing

- Ne pas casser les routes françaises existantes : `/fonctionnalites`, `/a-propos`, etc.
- Les pages publiques utilisent `BlankLayout` avec `meta.requiresAuth: false`.
- La zone `/app` utilise `FullLayout` avec authentification.
- Le guard d'auth est dans `app/guards/auth-guard.ts` — ne pas dupliquer la logique dans les views.
- Chaque page publique doit respecter le squelette : `AnnounceBar` → `Header` → contenu → `ContactBar` → `Footer`.
- Pour une nouvelle page publique, enregistrer la route dans `router/FrontPagesRoutes.ts`.
- Pour une nouvelle fonctionnalité `/app`, enregistrer la route dans `router/AppRoutes.ts` et le menu dans `sidebarItem.ts`.
- Le logo (`layouts/full/logo/Logo.vue`) : sous `/app` → dashboard (`/app`) ; ailleurs → accueil (`/` ou `homeTo`).
- Catch-all `/:pathMatch(.*)*` → `Error.vue` (déjà dans `router/index.ts`).
- Page `/components` (showcase UI) : `meta.devOnly` + enregistrée seulement si `VITE_APP_ENV=development` — **aucun lien** dans l’UI, accès URL manuelle uniquement.

---

## Règles de nommage

### Dossiers

- **kebab-case** : `recurring-payments`, `front-pages`.

### Composants Vue

- **PascalCase** : `DashboardContent.vue`, `TransactionTable.vue`.
- Préfixe `Spendup` pour le contenu métier front-pages public.

### Composables

- Fichier : `use<Nom>.ts` — ex. `useTransactions.ts`, `useDashboardModules.ts`.
- Emplacement : `features/<domaine>/composables/`.

### Types métier

- Emplacement par défaut : `features/<domaine>/types.ts` (ex. auth).
- Ne pas créer `entities/` / `models/` tant qu’il n’y a pas de besoin de partage cross-features clair.

### Stores Pinia

| Portée | Emplacement                                | Exemple                                    |
| ------ | ------------------------------------------ | ------------------------------------------ |
| Global | `app/stores/<nom>-store.ts`                | `app-settings-store.ts`                    |
| Métier | `features/<domaine>/stores/<nom>-store.ts` | `auth-store.ts`, `transaction-store.ts`, … |

- Composable : `use` + PascalCase — ex. `useAuthStore`, `useAppSettingsStore`, `useTransactionStore`.
- Import métier : `@/features/<domaine>` (barrel `index.ts`) ou chemin direct.
- Import global : `@/app/stores/app-settings-store`.

### Barrel `index.ts`

Chaque feature expose ses exports publics via `features/<domaine>/index.ts`.

### Helpers

- Dossier : `utils/helpers/`.
- Fichier : `<domaine>-helpers.ts` — **kebab-case**, suffixe `-helpers`, singulier ou composé selon le domaine.
- Même convention de nommage que les stores (`auth-store.ts` → `auth-helpers.ts`, `user-store.ts` → `user-helpers.ts`).
- Un fichier par domaine transverse ; pas de noms génériques (`utils.ts`, `helpers.ts`, `fetch-wrapper.ts`).

| Fichier                   | Exemples d'exports       |
| ------------------------- | ------------------------ |
| `fetch-helpers.ts`        | `fetchWrapper`           |
| `pricing-helpers.ts`      | `isPricingPageEnabled()` |
| `env-helpers.ts`          | `isDevAppEnv()`          |
| `fake-backend-helpers.ts` | Backend factice (legacy) |

- Import : `@/utils/helpers/<domaine>-helpers`.
- Les helpers **métier** propres à une feature vont dans `features/<domaine>/helpers/` (même convention `<domaine>-helpers.ts` ou sous-domaine : `transaction-format-helpers.ts`).

---

## Règles typographie / thème

- Police principale : **Plus Jakarta Sans**.
- Pour changer la police : modifier le `<link>` Google Fonts dans `index.html`, puis `$body-font-family` et `$heading-font-family` dans `src/scss/_variables.scss`.
- Utiliser les classes Vuetify et existantes avant d'en créer de nouvelles.
- Utiliser les tokens Vuetify : `color="primary"`, `bg-lightprimary`, `text-primary`, `rgb(var(--v-theme-primary))` en SCSS.
- Pour le responsive, combiner les classes Vuetify (`text-md-h3`, `pt-sm-12`, etc.).
- Préférences thème / layout admin : `useAppSettingsStore` (`app/stores/app-settings-store.ts`).

---

## À faire

- Toujours commencer par `_template/old-application/`, puis `_template/modernize/` si besoin.
- Créer `features/<domaine>/` dès qu'une fonctionnalité métier apparaît.
- Créer `views/app/<feature>/` (ou `views/front-pages/`) comme page fine de routing.
- Placer stores métier dans `features/<domaine>/stores/`, stores globaux dans `app/stores/`.
- Placer tout nouveau SCSS dans `src/scss/` au chemin miroir du composant.
- Utiliser `<script setup lang="ts">` et imports absolus `@/…`.
- Réutiliser les classes existantes (`.su-*`, `.text-16`, Vuetify utilities) avant d'en créer.
- Respecter le squelette page publique.
- Nommer les dossiers en minuscules kebab-case (`shared/`, pas `Shared/`).
- Placer les fichiers de données dans `data/<domaine>/`, jamais à la racine de `data/` (migration vers `features/` si données métier).
- Placer les types métier dans `features/<domaine>/types.ts` (pas de `entities/`/`models/` tant que non nécessaires).
- Placer les helpers transverses dans `utils/helpers/<domaine>-helpers.ts`.
- Exporter les features via un `index.ts`.
- Vérifier `npm run build` après restructuration ou déplacement de fichiers.
- Les formulaires UI appellent le store de la feature, pas le client API directement.

---

## À éviter

- Modifier les dossiers `_template/modernize/` ou `_template/old-application/`.
- Recréer from scratch un écran déjà présent dans les templates sans les avoir consultés.
- Placer de la logique métier dans `views/` ou à la racine de `components/`.
- Créer des stores dans un ancien dossier `src/stores/` (supprimé — utiliser `app/stores/` ou `features/<domaine>/stores/`).
- Nommer des helpers hors convention (`fetch-wrapper.ts`, `local-auth.ts`, `utils.ts`) — utiliser `<domaine>-helpers.ts` dans `utils/helpers/`.
- Créer des fichiers `.scss` ou `.css` dans `components/` ou `features/`.
- Ajouter des styles inline volumineux dans `<style>`.
- Modifier `node_modules/` ou la config git.
- Casser les routes françaises existantes.
- Lancer une grosse modification structurelle sans confirmation utilisateur.
- Créer des dossiers de features vides sans code associé.

---

## Procédure — ajout d'une nouvelle page publique

1. Créer `views/front-pages/MaPage.vue` (coquille + `front-wraper`).
2. Créer le sous-dossier `components/frontpages/<feature>/` et y placer les composants de la page.
3. Créer les styles dans `scss/frontpages/<feature>/`.
4. Enregistrer la route dans `router/FrontPagesRoutes.ts`.
5. Ajouter le lien dans `layout/Navigation.vue` et `layout/Footer.vue` si besoin.

---

## Procédure — ajout d'une nouvelle fonctionnalité `/app`

1. Chercher l'équivalent dans `_template/old-application/`, puis `_template/modernize/`.
2. Créer `features/<domaine>/` avec la structure :
    ```
    features/<domaine>/
    ├── api/              # si appels API
    ├── components/       # composants propres au domaine
    ├── composables/      # use<Domaine>.ts
    ├── stores/           # si state métier
    ├── types/            # types propres au domaine
    └── index.ts          # exports publics
    ```
3. Créer `views/app/<feature>/App<Feature>View.vue` — page fine qui importe depuis `@/features/<domaine>`.
4. Enregistrer la route dans `router/AppRoutes.ts` et le menu dans `sidebarItem.ts`.
5. Placer les styles éventuels dans `src/scss/` au chemin miroir.
6. Mettre à jour les imports et vérifier `npm run build`.
