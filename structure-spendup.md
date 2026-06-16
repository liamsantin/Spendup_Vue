# Structure du projet — Spend.Up Starterkit

> Projet : **Vue 3 + TypeScript + Vuetify 3** (template Modernize v6.2), personnalisé pour **Spend.Up**.
> Ce fichier décrit l'organisation du projet. Les règles et conventions sont séparées dans `rules-spendup.md`.

---

## Dossier `_template/` (référence)

À la **racine du projet** (à côté de `src/`), le dossier **`_template/`** contient le **projet de base Modernize v6.2** — version complète et non personnalisée de l'application (équivalent à `packages/main`).

```
starterkit/
├── _template/              # Référence — projet Modernize intact (lecture / copie)
│   └── src/
│       ├── views/          # Toutes les pages du thème (dashboard, auth, apps…)
│       ├── components/     # Composants admin, auth, apps, widgets…
│       ├── router/         # Routes d'origine
│       ├── scss/           # Styles du thème
│       ├── layouts/
│       └── …
├── src/                    # Projet Spend.Up actif — seul dossier à modifier
├── structure-spendup.md
└── rules-spendup.md
```

---

## Stack & commandes

| Élément   | Détail                                                                     |
| --------- | -------------------------------------------------------------------------- |
| Framework | Vue 3 (Composition API, `<script setup>`)                                  |
| UI        | Vuetify 3.7 — composants préfixés `v-` (`v-btn`, `v-card`, `v-container`…) |
| State     | Pinia — stores globaux dans `src/app/stores/`, stores métier dans `src/features/<domaine>/stores/` |
| Router    | Vue Router 4 — history mode, guard dans `src/app/guards/`                  |
| Styles    | SCSS (Sass)                                                                |
| Icônes    | `vue-tabler-icons` (front-pages, sidebar) + `@mdi/font` (Vuetify)          |
| Alias     | `@` → `src/`                                                               |
| Dev       | `npm run dev`                                                              |
| Build     | `npm run build` (vue-tsc + vite)                                           |

---

## Arborescence `src/`

```
src/
├── main.ts                 # Point d'entrée, plugins globaux, import SCSS global
├── App.vue
├── app/                    # Couche application (transverse, hors domaine métier)
│   ├── stores/             # Stores Pinia globaux uniquement
│   └── guards/             # Guards Vue Router
├── features/               # Logique métier par domaine fonctionnel
│   ├── dashboard/
│   ├── settings/
│   ├── users/
│   └── …                   # transactions, budgets, invoices… (à venir)
├── views/
│   ├── app/                # Pages fines zone /app — liées au routing
│   ├── front-pages/        # Pages publiques (coquilles de route)
│   └── authentication/     # Login, register, erreur…
├── components/
│   ├── app/                # Composants UI /app transverses (si non liés à une feature)
│   ├── frontpages/         # Composants site public
│   ├── auth/               # Formulaires authentification
│   └── shared/             # Composants réutilisables transverses
├── assets/images/          # Images statiques
├── data/                   # Données statiques (transition — à migrer vers features si métier)
│   ├── front-pages/
│   └── admin/
├── layouts/
│   ├── blank/              # Pages publiques & auth (sans sidebar)
│   └── full/               # Zone /app (sidebar, header, customizer)
├── plugins/vuetify.ts
├── entities/               # Entités métier — interfaces TypeScript (domaine)
├── models/                 # Modèles API — payloads JSON (POST, PUT, body requête)
├── router/                 # FrontPagesRoutes, AppRoutes, AuthRoutes
├── scss/                   # Tous les styles du projet
├── theme/                  # Couleurs Vuetify (LightTheme, DarkTheme)
├── types/                  # Types techniques / UI (hors domaine métier)
└── utils/                  # Helpers, i18n, fake-backend
```

---

## Couche `app/` — transverse

Regroupe tout ce qui est **global à l'application**, sans appartenir à un domaine métier.

```
app/
├── stores/
│   ├── auth-store.ts           # Session, login/logout, utilisateur courant
│   └── app-settings-store.ts # Thème, sidebar, layout admin (ex-customizer)
│   # À venir : user-session-store, workspace-store, permissions-store
└── guards/
    └── auth-guard.ts           # Protection routes meta.requiresAuth
```

| Fichier | Rôle |
| ------- | ---- |
| `auth-store.ts` | Authentification, `TEST_USER`, redirection post-login |
| `app-settings-store.ts` | Préférences shell admin (thème clair/sombre, sidebar, layout horizontal) |
| `auth-guard.ts` | Guard `beforeEach` — routes protégées `/app`, redirection login |

---

## Couche `features/` — domaines métier

Chaque domaine fonctionnel vit dans son propre dossier. **Toute logique métier** (stores, API, composables, composants propres au domaine) y est centralisée.

### Features en place

```
features/
├── dashboard/
│   ├── components/
│   │   └── DashboardContent.vue
│   ├── composables/
│   │   └── useDashboardModules.ts
│   └── index.ts
├── settings/
│   ├── components/
│   │   └── AccountProfileCard.vue
│   └── index.ts
└── users/
    ├── stores/
    │   └── user-store.ts
    └── index.ts
```

### Features prévues (plateforme financière)

`accounts`, `transactions`, `budgets`, `categories`, `recurring-payments`, `invoices`, `expenses`, `income`, `cashflow`, `reports`, `alerts`, `teams` — à créer au fil de l'implémentation, pas en squelettes vides.

### Exemple cible — fonctionnalité `transactions`

```
views/app/transactions/
└── AppTransactionsView.vue          # Page fine — routing uniquement

features/transactions/
├── api/
│   └── transactions-api.ts
├── components/
│   ├── TransactionTable.vue
│   ├── TransactionForm.vue
│   └── TransactionFilters.vue
├── composables/
│   └── useTransactions.ts
├── stores/
│   └── transaction-store.ts
├── types/
│   └── transaction.types.ts
└── index.ts
```

---

## Découpage par zone fonctionnelle

| Zone | Views (pages fines) | Logique métier | Composants UI |
| ---- | ------------------- | -------------- | ------------- |
| Application `/app` | `views/app/<feature>/` | `features/<feature>/` | `features/<feature>/components/` ou `components/shared/` |
| Site public | `views/front-pages/` | — (contenu dans composants) | `components/frontpages/<feature>/` |
| Auth | `views/authentication/` | `app/stores/auth-store.ts` | `components/auth/` |

**Principe :** les `views/` restent des coquilles légères ; elles importent depuis `@/features/<domaine>`.

---

## Structure SCSS

```
scss/
├── style.scss              # Entry point
├── _variables.scss         # Police, typo Vuetify, border-radius, shadows
├── _override.scss
├── layout/                 # Shell admin (sidebar, topbar, dark, rtl…)
├── components/             # Overrides Vuetify (_VCard, _VBtn…)
├── pages/                  # Pages spécifiques (_authentication.scss)
├── theme/_themeColors.scss
└── frontpages/
    ├── _general.scss       # Utilitaires globaux front (.front-wraper, .package, .space-p-96…)
    ├── _spendup-shared.scss # Classes Spendup partagées (.su-*, .lh-lg…)
    ├── home/               # Styles sections accueil
    ├── features/
    ├── about/
    ├── shared/
    ├── layout/             # _toolbar.scss (header global), _header.scss, _navigation.scss
    ├── pages/              # pricing, terms, privacy
    └── _mobile.scss        # Overrides mobile uniquement (< 600px)
```

---

## Routing

### Pages publiques (`BlankLayout`, `meta.requiresAuth: false`)

| Route                        | Vue                                    | Contenu principal                                                |
| ---------------------------- | -------------------------------------- | ---------------------------------------------------------------- |
| `/`                          | `views/front-pages/PublicHomePage.vue` | `home/SpendupHomeContent`                                        |
| `/fonctionnalites`           | `FeaturesPage.vue`                     | `features/SpendupFeaturesContent`                                |
| `/a-propos`                  | `AboutPage.vue`                        | `about/SpendupTeamSection` + `SpendupAboutProjectNotice`         |
| `/tarifs`                    | `PricingPage.vue`                      | `pricing/Packages` — conditionnel (`VITE_PRICING_PAGE=true`)     |
| `/conditions-utilisation`    | `TermsOfUsePage.vue`                   | contenu légal inline                                             |
| `/politique-confidentialite` | `PrivacyPolicyPage.vue`                | contenu légal inline                                             |

### Auth & application authentifiée

| Route                    | Vue                                       | Feature / layout              |
| ------------------------ | ----------------------------------------- | ----------------------------- |
| `/auth/login`            | `SideLogin` + `LoginForm`                 | BlankLayout                   |
| `/auth/login2`           | `BoxedLogin`                              | BlankLayout                   |
| `/auth/register`         | `SideRegister` + `RegisterForm`           | BlankLayout                   |
| `/auth/register2`        | `BoxedRegister`                           | BlankLayout                   |
| `/auth/forgot-password`  | `SideForgotPassword` + `ResetForm`        | BlankLayout                   |
| `/auth/forgot-password2` | `BoxedForgotPassword`                     | BlankLayout                   |
| `/auth/two-step`         | `SideTwoStep` + `TwoStepForm`             | BlankLayout                   |
| `/auth/two-step2`        | `BoxedTwoStep`                            | BlankLayout                   |
| `/auth/404`              | `Error`                                   | BlankLayout                   |
| `/auth/maintenance`      | `Maintenance`                             | BlankLayout                   |
| `/app`                   | `dashboard/AppDashboardView`              | `features/dashboard` — FullLayout (`requiresAuth`) |
| `/app/account-settings`  | `account-settings/AppAccountSettingsPage` | `features/settings` — FullLayout |

### Layouts

- `BlankLayout` — pages publiques + auth (pas de sidebar)
- `FullLayout` — zone `/app` après connexion (sidebar, header, customizer)

### Guard d'authentification

Le guard est défini dans `app/guards/auth-guard.ts` et branché dans `router/index.ts` via `router.beforeEach(authGuard)`.

### Squelette page publique

```vue
<div class="front-wraper">
  <AnnounceBar />
  <Header />
  <!-- contenu page -->
  <ContactBar />
  <Footer />
</div>
```

---

## Composants front-pages

```
components/frontpages/
├── layout/       AnnounceBar, Header, Navigation, Footer
├── shared/       TextBannerCard, ContactBar
├── home/
│   ├── SpendupHomeContent.vue
│   └── sections/   PlatformCentral, Accessible, ExpansionPanels
├── features/
│   ├── SpendupFeaturesContent.vue
│   └── sections/   DomainSection, DomainSectionCenter
├── about/        TeamSection, AboutProjectNotice
└── pricing/      Packages
```

| Dossier                                    | Rôle                                                       |
| ------------------------------------------ | ---------------------------------------------------------- |
| `layout/`                                  | Chrome partagé (header fixe, nav, footer, barre d'annonce) |
| `shared/`                                  | Blocs réutilisés entre plusieurs pages                     |
| `home/`, `features/`, `about/`, `pricing/` | Contenu spécifique à une page                              |
| `sections/`                                | Sous-composants d'une page, pas importés ailleurs          |

### Composants Vuetify fréquents (front-pages)

- Layout : `v-container`, `v-row`, `v-col`
- Contenu : `v-card`, `v-alert`, `v-expansion-panels`, `v-btn`
- Navigation : `v-app-bar`, `v-navigation-drawer`, `v-toolbar`

### Classes utilitaires front-pages

| Préfixe / classe                  | Usage                                                |
| --------------------------------- | ---------------------------------------------------- |
| `.front-wraper`                   | Wrapper racine de chaque page publique               |
| `.max-width-1218`                 | Conteneur centré (largeur max ~1218px)               |
| `.space-p-96`                     | Padding section footer                               |
| `.su-`*                           | Composants / sections Spendup (hero, domain, stats…) |
| `.textPrimary` / `.textSecondary` | Couleurs texte thème                                 |
| `.text-medium-emphasis`           | Texte secondaire Vuetify                             |
| `.lh-lg` / `.lh-md`               | Line-height custom                                   |
| `.bg-lightprimary`                | Fond bleu très clair (bannières)                     |

---

## Typographie

### Police principale

- **Plus Jakarta Sans** (Google Fonts)
- Chargée dans `index.html`
- Variable SCSS : `$body-font-family` dans `src/scss/_variables.scss`

### Échelle typographique — 3 niveaux

| Niveau       | Où                       | Exemples                                                                  |
| ------------ | ------------------------ | ------------------------------------------------------------------------- |
| **Vuetify**  | Typo système             | `text-h1`…`text-h6`, `text-body-1`, `text-subtitle-1`                     |
| **Template** | `scss/layout/_text.scss` | `.text-13`, `.text-16`, `.text-18`, `.text-20`, `.display-1`…`.display-3` |
| **Spendup**  | `scss/frontpages/`       | `.su-hero-title`, `.text-banner-card__title` (clamp responsive)           |

### Patterns courants (front-pages)

```html
<h1 class="su-hero-title textPrimary font-weight-bold">
<h2 class="display-2 font-weight-bold textPrimary">
<p class="text-18 text-medium-emphasis lh-lg">
<span class="text-uppercase text-primary text-13 font-weight-semibold">
<TextBannerCard caption="…" title="…" />
```

---

## Couleurs & thème

| Fichier                            | Rôle                                                                |
| ---------------------------------- | ------------------------------------------------------------------- |
| `src/theme/LightTheme.ts`          | Thème clair par défaut (`BLUE_THEME`) — couleurs primaires Spend.Up |
| `src/theme/DarkTheme.ts`           | Variantes dark                                                      |
| `src/plugins/vuetify.ts`           | Thème actif, defaults composants                                    |
| `src/scss/theme/_themeColors.scss` | Utilitaires couleur SCSS                                            |

**Couleurs clés (light) :**

- `primary` : `#5D87FF`
- `secondary` : `#49BEFF`
- `textPrimary` : `#2A3547`
- `lightprimary` : `#F2F6FF`

---

## Données & config

| Fichier                                          | Contenu                                         |
| ------------------------------------------------ | ----------------------------------------------- |
| `data/front-pages/front-pages-data.ts`           | Tarifs (`SpendupPricingPackages`), menus footer |
| `data/front-pages/spendup-additional-domains.ts` | Sections domaines (page fonctionnalités)        |
| `data/admin/headerData.ts`                       | Dropdowns header admin                          |
| `types/components/front-pages/index.ts`          | `PackageType`, `FooterType`                     |
| `.env`                                           | `VITE_PRICING_PAGE` (active `/tarifs`)          |

---

## Entités, modèles & stores

### `entities/` — interfaces TypeScript (domaine)

Représente les **entités métier** du domaine Spend.Up (forme des objets côté app / API en lecture).

Exemples : `UserEntity.ts`, `TransactionEntity.ts`.

### `models/` — payloads API (écriture)

Représente les **modèles de requête** envoyés à l'API (body JSON des `POST`, `PUT`, `PATCH`…).

Exemples : `UserModel.ts`, `CreateTransactionModel.ts`.

### Stores Pinia — répartition

| Portée | Emplacement | Exemples |
| ------ | ----------- | -------- |
| **Global** (app) | `app/stores/` | `auth-store`, `app-settings-store` |
| **Métier** (domaine) | `features/<domaine>/stores/` | `user-store`, `transaction-store` |

| Store | Fichier | Usage |
| ----- | ------- | ----- |
| Auth | `app/stores/auth-store.ts` | Session utilisateur, login/logout |
| App settings | `app/stores/app-settings-store.ts` | Thème, sidebar, layout admin |
| Users | `features/users/stores/user-store.ts` | Liste / gestion utilisateurs (API) |

**Imports :** `@/app/stores/auth-store`, `@/features/users` (barrel `index.ts`).

---

## Assets

| Emplacement                      | Usage                                                                      |
| -------------------------------- | -------------------------------------------------------------------------- |
| `src/assets/images/front-pages/` | Images front (background, technology, payments)                            |
| `src/assets/images/profile/`     | Avatars ContactBar                                                         |
| `public/`                        | Fichiers servis tels quels (`Spendup-logo-fusee.svg`, images features SVG) |

Images features référencées via `/assets/images/landingpage/features/…` (dossier `public/`).

---

## Layout application (`/app`)

```
layouts/
├── blank/BlankLayout.vue     # Public + auth (sans chrome admin)
└── full/
    ├── FullLayout.vue
    ├── vertical-sidebar/       # sidebarItem.ts → routes /app
    ├── vertical-header/
    ├── horizontal-sidebar/
    ├── logo/
    └── customizer/

views/app/                    # Pages fines — une par fonctionnalité
├── dashboard/
│   └── AppDashboardView.vue  # → importe DashboardContent depuis features/dashboard
└── account-settings/
    └── AppAccountSettingsPage.vue  # → importe AccountProfileCard depuis features/settings

features/dashboard/           # Logique métier tableau de bord
features/settings/            # Logique métier réglages compte
```
