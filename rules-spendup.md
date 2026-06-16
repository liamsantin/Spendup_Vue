# Règles du projet — Spend.Up Starterkit

> Règles de développement pour le projet **Spend.Up Starterkit**.
> Structure détaillée du projet : voir `structure-spendup.md`.

---

## Règle obligatoire avant toute implémentation

Avant d'ajouter ou recréer une view, un composant, une route ou un style :

1. Chercher dans `_template/src/` si l'élément existe déjà (même nom, même domaine fonctionnel).
2. Comparer avec ce qui est déjà présent dans `src/`.
3. Réutiliser / adapter depuis `_template/` plutôt que réécrire from scratch.

| Besoin Spend.Up | Où chercher dans `_template/` |
| --------------- | ----------------------------- |
| Page login, register, 2FA | `_template/src/views/authentication/`, `_template/src/components/auth/` |
| Dashboard admin | `_template/src/views/dashboards/`, `_template/src/components/dashboard/` |
| Widgets, cartes, graphiques | `_template/src/views/widgets/`, `_template/src/components/` |
| Apps (email, chat, invoice…) | `_template/src/views/apps/`, `_template/src/components/apps/` |
| Styles admin / auth | `_template/src/scss/` |

**Ne pas modifier `_template/`** — c'est une référence figée. Toute personnalisation Spend.Up se fait dans `src/`.

---

## Confirmation utilisateur

Si l'IA n'est pas certaine, ou si la modification dépasse une petite correction locale, demander confirmation à l'utilisateur avant d'exécuter.

Demander validation notamment pour :

| Situation | Exemples |
| --------- | -------- |
| Changement de structure | Réorganisation de dossiers, renommage massif, fusion/split de features |
| Refactoring large | Migration de plusieurs composants, rewrite d'un module entier |
| Routing | Nouvelle zone de routes, modification d'URLs existantes, suppression de routes |
| Choix d'architecture | Où placer un composant, nommage d'une feature, découpage views/components |
| Suppression | Retirer des fichiers, routes, styles ou fonctionnalités existantes |
| Comportement métier ambigu | Auth, permissions, flux utilisateur non documentés |
| Impact transversal | Modification touchant front-pages et `/app`, ou les règles elles-mêmes |

Principe : en cas de doute, poser la question, proposer des options, attendre le feu vert. Les petites corrections ciblées peuvent être faites directement.

---

## Règles de structure

### Couches principales

| Couche | Rôle |
| ------ | ---- |
| `app/` | Transverse : stores globaux, guards, providers |
| `features/<domaine>/` | Logique métier par domaine fonctionnel |
| `views/` | Pages fines liées au routing uniquement |
| `components/` | UI transverse (`shared/`, `auth/`, `frontpages/`) — pas de logique métier |

### Règles générales

- Ne jamais créer un fichier métier directement à la racine de `views/` ou `components/`.
- **Toute logique métier** va dans `features/<domaine>/` (stores, API, composables, composants propres au domaine).
- Les `views/` restent des coquilles légères : breadcrumb, layout de page, import depuis `@/features/<domaine>`.
- Nommer les dossiers en **kebab-case** : `account-settings`, `dashboard`, `recurring-payments`.
- Les dossiers `shared/`, `layout/`, `auth/` dans `components/` restent des regroupements transverses.
- Ne pas créer de dossiers de features vides « pour plus tard » — créer une feature quand du code métier apparaît.
- Ne pas modifier `_template/`.

### Répartition par zone

| Zone | Views | Logique métier | Composants UI |
| ---- | ----- | -------------- | ------------- |
| Application `/app` | `views/app/<feature>/` | `features/<feature>/` | `features/<feature>/components/` |
| Site public | `views/front-pages/` | — | `components/frontpages/<feature>/` |
| Auth | `views/authentication/` | `app/stores/auth-store.ts` | `components/auth/` |

---

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

---

## Règles de nommage

### Dossiers

- **kebab-case** : `account-settings`, `recurring-payments`, `front-pages`.

### Composants Vue

- **PascalCase** : `DashboardContent.vue`, `TransactionTable.vue`.
- Préfixe `Spendup` pour le contenu métier front-pages public.

### Composables

- Fichier : `use<Nom>.ts` — ex. `useTransactions.ts`, `useDashboardModules.ts`.
- Emplacement : `features/<domaine>/composables/`.

### Entités

- Dossier : `entities/`.
- Fichier : `NomEntity.ts`.
- Format : PascalCase, suffixe `Entity`, singulier, anglais.
- Exemple : `export interface UserEntity { … }`.

### Modèles API

- Dossier : `models/` (ou `features/<domaine>/types/` pour les types propres au domaine).
- Fichier : `NomModel.ts`.
- Format : PascalCase, suffixe `Model`, singulier, anglais.
- Exemple : `export interface CreateTransactionModel { … }`.

### Stores Pinia

| Portée | Emplacement | Exemple |
| ------ | ----------- | ------- |
| Global | `app/stores/<nom>-store.ts` | `auth-store.ts`, `app-settings-store.ts` |
| Métier | `features/<domaine>/stores/<nom>-store.ts` | `transaction-store.ts`, `user-store.ts` |

- Composable : `use` + PascalCase — ex. `useAuthStore`, `useAppSettingsStore`, `useTransactionStore`.
- Import global : `@/app/stores/auth-store`.
- Import métier : `@/features/<domaine>` (barrel `index.ts`) ou chemin direct.

### Barrel `index.ts`

Chaque feature expose ses exports publics via `features/<domaine>/index.ts`.

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

- Toujours commencer par `_template/src/`.
- Créer `features/<domaine>/` dès qu'une fonctionnalité métier apparaît.
- Créer `views/app/<feature>/` (ou `views/front-pages/`) comme page fine de routing.
- Placer stores métier dans `features/<domaine>/stores/`, stores globaux dans `app/stores/`.
- Placer tout nouveau SCSS dans `src/scss/` au chemin miroir du composant.
- Utiliser `<script setup lang="ts">` et imports absolus `@/…`.
- Réutiliser les classes existantes (`.su-*`, `.text-16`, Vuetify utilities) avant d'en créer.
- Respecter le squelette page publique.
- Nommer les dossiers en minuscules kebab-case (`shared/`, pas `Shared/`).
- Placer les fichiers de données dans `data/<domaine>/`, jamais à la racine de `data/` (migration vers `features/` si données métier).
- Placer les entités dans `entities/<NomEntity>.ts`.
- Placer les modèles API dans `models/<NomModel>.ts` ou `features/<domaine>/types/`.
- Exporter les features via un `index.ts`.
- Vérifier `npm run build` après restructuration ou déplacement de fichiers.
- Demander confirmation avant toute modification importante ou incertaine.

---

## À éviter

- Modifier le dossier `_template/`.
- Recréer from scratch un écran déjà présent dans `_template/` sans l'avoir consulté.
- Placer de la logique métier dans `views/` ou à la racine de `components/`.
- Créer des stores dans un ancien dossier `src/stores/` (supprimé — utiliser `app/stores/` ou `features/`).
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

1. Chercher l'équivalent dans `_template/src/`.
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
