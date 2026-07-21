# Structure du projet — Spend.Up Starterkit

> Projet : **Vue 3 + TypeScript + Vuetify 3** (template Modernize v6.2), personnalisé pour **Spend.Up**.
> Ce fichier décrit l'organisation du projet. Les règles et conventions sont séparées dans `rules-spendup.md`.

---

## Dossiers `_template/` (références)

À la **racine du projet** (à côté de `src/`), deux dossiers de référence **en lecture seule** :

```
Spendup_Vue/
├── _template/
│   ├── modernize/            # Modernize v6.2 complet (thème admin, apps, widgets, UI kit…)
│   │   └── views/, components/, scss/, layouts/, …
│   └── old-application/      # Application Spend.Up de référence (structure cible)
│       └── app/, features/, views/, components/frontpages/, router/, …
├── src/                      # Projet Spend.Up actif — seul dossier à modifier
└── docs/
    ├── structure-spendup.md
    └── rules-spendup.md
```

| Dossier                      | Rôle                                                                   | Quand l'utiliser                                                |
| ---------------------------- | ---------------------------------------------------------------------- | --------------------------------------------------------------- |
| `_template/modernize/`       | Thème **Modernize v6.2** intact (équivalent `packages/main`)           | Chercher un écran, widget ou composant admin du thème d'origine |
| `_template/old-application/` | **Spend.Up** déjà structuré (`app/`, `features/`, front-pages, `/app`) | Copier / adapter la structure et le code Spend.Up cible         |

**Ne pas modifier** ces deux dossiers — toute personnalisation se fait dans `src/`.

---

## Stack & commandes

| Élément   | Détail                                                                                             |
| --------- | -------------------------------------------------------------------------------------------------- |
| Framework | Vue 3 (Composition API, `<script setup>`)                                                          |
| UI        | Vuetify 3.7 — composants préfixés `v-` (`v-btn`, `v-card`, `v-container`…)                         |
| State     | Pinia — stores globaux dans `src/app/stores/`, stores métier dans `src/features/<domaine>/stores/` |
| Router    | Vue Router 4 — history mode, guard dans `src/app/guards/`                                          |
| Styles    | SCSS (Sass)                                                                                        |
| Icônes    | `vue-tabler-icons` (front-pages, sidebar) + `@mdi/font` (Vuetify)                                  |
| Alias     | `@` → `src/`                                                                                       |
| Dev       | `npm run dev`                                                                                      |
| Build     | `npm run build` (vue-tsc + vite)                                                                   |

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
│   ├── auth/
│   ├── dashboard/
│   └── …                   # transactions, budgets… (à créer avec du code réel)
├── views/
│   ├── app/                # Pages fines zone /app — liées au routing
│   ├── front-pages/        # Pages publiques (coquilles de route)
│   ├── authentication/     # Login, register, erreur…
│   └── dev/                # Showcase UI (`/components`) — VITE_APP_ENV=development uniquement
├── components/
│   ├── frontpages/         # Composants site public
│   ├── auth/               # Formulaires authentification (UI → store)
│   └── shared/             # Composants réutilisables transverses (AppAlert, …)
├── assets/images/          # Images statiques
├── data/                   # Données statiques (front-pages, header profil)
│   ├── front-pages/
│   └── admin/
├── layouts/
│   ├── blank/              # Pages publiques & auth (sans sidebar)
│   └── full/               # Zone /app (sidebar, header, customizer)
├── plugins/vuetify.ts
├── router/                 # FrontPagesRoutes, AppRoutes, AuthRoutes
├── scss/                   # Tous les styles du projet
├── theme/                  # Couleurs Vuetify (LightTheme, DarkTheme)
├── types/                  # Types techniques / UI (hors domaine métier)
└── utils/                  # i18n, helpers transverses
    ├── locales/            # Fichiers i18n (messages.ts, fr.json…)
    └── helpers/            # Helpers nommés <domaine>-helpers.ts
```

> **Types métier :** préférer `features/<domaine>/types.ts` (ex. auth). Les dossiers `entities/` / `models/` ne sont **pas** créés pour l’instant — éventuel partage cross-features plus tard seulement.

---

## Couche `app/` — transverse

Regroupe tout ce qui est **global à l'application**, sans appartenir à un domaine métier.

```
app/
├── stores/
│   └── app-settings-store.ts # Thème, sidebar, layout admin (ex-customizer)
│   # Stores métier → features/<domaine>/stores/ (ex. features/auth/stores/auth-store.ts)
└── guards/
    └── auth-guard.ts           # Protection routes meta.requiresAuth
```

| Fichier                 | Rôle                                                                |
| ----------------------- | ------------------------------------------------------------------- |
| `app-settings-store.ts` | Préférences shell admin (thème clair/sombre, sidebar, layout admin) |
| `auth-guard.ts`         | Guard `beforeEach` — routes protégées `/app`, redirection login     |

---

## Couche `features/` — domaines métier

Chaque domaine fonctionnel vit dans son propre dossier. **Toute logique métier** (stores, API, composables, composants propres au domaine) y est centralisée.

### Features en place

```
features/
├── auth/
│   ├── api.ts
│   ├── device.ts
│   ├── types.ts
│   ├── stores/
│   │   └── auth-store.ts   # Session JWT, login / logout / 2FA / `/me`
│   └── index.ts
├── dashboard/
│   ├── components/
│   │   └── DashboardContent.vue
│   ├── composables/
│   │   └── useDashboardModules.ts
│   └── index.ts
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

| Zone               | Views (pages fines)     | Logique métier                         | Composants UI                                            |
| ------------------ | ----------------------- | -------------------------------------- | -------------------------------------------------------- |
| Application `/app` | `views/app/<feature>/`  | `features/<feature>/`                  | `features/<feature>/components/` ou `components/shared/` |
| Site public        | `views/front-pages/`    | — (contenu dans composants)            | `components/frontpages/<feature>/`                       |
| Auth               | `views/authentication/` | `features/auth/` (store + API + types) | `components/auth/`                                       |
| Dev / showcase     | `views/dev/`            | —                                      | `components/shared/` (ex. AppAlert)                      |

**Auth :** store dans `features/auth/stores/auth-store.ts` ; client HTTP typé dans `features/auth/` ; formulaires UI dans `components/auth/` (dont `GoogleSignInButton`) ; styles dans `scss/pages/_authentication.scss` ; guard dans `app/guards/`. Feedback UI via **`AppAlert`** (pas `v-alert` brut) — doc : `docs/components/alert/alert-component.md`.

**Auth — flux inscription / confirmation (front) :**

| Étape                                 | Comportement                                                                                      |
| ------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Register avec e-mail                  | `setPendingEmail` + `router.replace` → `/auth/confirm-email?email=…`                              |
| Confirm e-mail                        | Pas de champ e-mail éditable : e-mail retenu (query / `pendingEmail`) ; saisie du code uniquement |
| Réinscription même e-mail non vérifié | Géré côté API (MAJ MDP + nouveau code) ; front redirige à nouveau vers confirm                    |
| Logo                                  | Voir section Logo ci-dessous                                                                      |

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
    ├── home/               # _home-content, _expansion-panels
    ├── about/              # _team-section, _project-notice
    ├── shared/             # _text-banner-card
    ├── layout/             # _toolbar, _header, _navigation
    ├── pages/              # pricing, terms, privacy
    └── _mobile.scss        # Overrides mobile uniquement (< 600px)
```

> Les styles de la page fonctionnalités vivent surtout dans `_spendup-shared.scss` / composants ; pas de dossier `scss/frontpages/features/` pour l’instant.

---

## Routing

### Pages publiques (`BlankLayout`, `meta.requiresAuth: false`)

| Route                        | Vue                                    | Contenu principal                                                       |
| ---------------------------- | -------------------------------------- | ----------------------------------------------------------------------- |
| `/`                          | `views/front-pages/PublicHomePage.vue` | `home/SpendupHomeContent`                                               |
| `/fonctionnalites`           | `FeaturesPage.vue`                     | `features/SpendupFeaturesContent`                                       |
| `/a-propos`                  | `AboutPage.vue`                        | `about/SpendupTeamSection` + `SpendupAboutProjectNotice`                |
| `/tarifs`                    | `PricingPage.vue`                      | `pricing/Packages` — conditionnel (`VITE_PRICING_PAGE=true`)            |
| `/conditions-utilisation`    | `TermsOfUsePage.vue`                   | contenu légal inline                                                    |
| `/politique-confidentialite` | `PrivacyPolicyPage.vue`                | contenu légal inline                                                    |
| `/components`                | `views/dev/ComponentsShowcasePage.vue` | Showcase UI — **dev only** (`VITE_APP_ENV=development`), pas de lien UI |

### Auth & application authentifiée

| Route                        | Vue                                                      | Feature / layout                                   |
| ---------------------------- | -------------------------------------------------------- | -------------------------------------------------- |
| `/auth/login`                | `SideLogin` + `LoginForm` + `GoogleSignInButton`         | BlankLayout                                        |
| `/auth/register`             | `SideRegister` + `RegisterForm`                          | BlankLayout                                        |
| `/auth/forgot-password`      | `SideForgotPassword` + `ResetForm` / `ResetPasswordForm` | BlankLayout — `?token=` → nouveau mot de passe     |
| `/auth/reset-password`       | alias → même vue que forgot-password                     | BlankLayout (compat liens)                         |
| `/auth/two-step`             | `SideTwoStep` + `TwoStepForm`                            | BlankLayout                                        |
| `/auth/confirm-email`        | `SideConfirmEmail` + `ConfirmEmailForm`                  | BlankLayout                                        |
| `/auth/confirm-email-change` | `SideConfirmEmailChange` + `ConfirmEmailChangeForm`      | BlankLayout                                        |
| `/auth/404`                  | `Error`                                                  | BlankLayout                                        |
| `/auth/maintenance`          | `Maintenance`                                            | BlankLayout                                        |
| `/app`                       | `dashboard/AppDashboardView`                             | `features/dashboard` — FullLayout (`requiresAuth`) |
| `/:pathMatch(.*)*`           | `Error`                                                  | Catch-all 404 (`router/index.ts`)                  |

**Composants auth UI** (`components/auth/`) : `LoginForm`, `RegisterForm`, `ResetForm`, `ResetPasswordForm`, `TwoStepForm`, `ConfirmEmailForm`, `ConfirmEmailChangeForm`, `GoogleSignInButton`.

### Layouts

- `BlankLayout` — pages publiques + auth (pas de sidebar)
- `FullLayout` — zone `/app` après connexion (sidebar, header, customizer)

### Logo (`layouts/full/logo/Logo.vue`)

- Sous `/app` → lien vers `/app` (dashboard)
- Ailleurs → lien vers `/` (accueil), ou prop `homeTo` si fournie
- Icône : `/Spendup-icon-fusee.svg` (+ texte « Spend.Up »)
- Utilisé dans sidebar `/app`, header front, pages auth — **pas** de lien vers `/components`

### Guard d'authentification

Le guard est défini dans `app/guards/auth-guard.ts` et branché dans `router/index.ts` via `router.beforeEach(authGuard)`.

- `meta.requiresAuth` → session requise
- `meta.devOnly` → accessible seulement si `isDevAppEnv()` (`VITE_APP_ENV=development`), sinon redirect `/auth/404`

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
│   └── sections/   SpendupPlatformCentralSection, SpendupAccessibleSection, SpendupExpansionPanels
├── features/
│   ├── SpendupFeaturesContent.vue
│   └── sections/   SpendupDomainSection, SpendupDomainSectionCenter
├── about/        SpendupTeamSection, SpendupAboutProjectNotice
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
| `.su-`\*                          | Composants / sections Spendup (hero, domain, stats…) |
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
            <span class="text-uppercase text-primary text-13 font-weight-semibold"> <TextBannerCard caption="…" title="…" /></span>
        </p>
    </h2>
</h1>
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

| Fichier                                          | Contenu                                                                           |
| ------------------------------------------------ | --------------------------------------------------------------------------------- |
| `data/front-pages/front-pages-data.ts`           | Tarifs (`SpendupPricingPackages`), menus footer                                   |
| `data/front-pages/spendup-additional-domains.ts` | Sections domaines (page fonctionnalités)                                          |
| `data/admin/headerData.ts`                       | Liens profil header (`profileDD`)                                                 |
| `types/components/front-pages/index.ts`          | `PackageType`, `FooterType`                                                       |
| `types/HeaderTypes.ts`                           | Types menu / header admin (sidebar, profil…)                                      |
| `.env` / `.env.example`                          | `VITE_API_BASE_URL`, `VITE_GOOGLE_CLIENT_ID`, `VITE_PRICING_PAGE`, `VITE_APP_ENV` |
| `utils/helpers/pricing-helpers.ts`               | `isPricingPageEnabled()`                                                          |

> Les variables `VITE_*` sont **publiques** (injectées dans le bundle). Secrets → backend uniquement. `.env` local hors Git ; `.env.example` commité avec placeholders.

---

## Types & stores

### Types métier

**Règle actuelle :** types du domaine dans `features/<domaine>/types.ts` (référence : auth).

Les dossiers `entities/` et `models/` ne sont **pas** utilisés pour l’instant. Ne les créer que si plusieurs features partagent les mêmes contrats et qu’un extrait commun est clairement nécessaire.

### Stores Pinia — répartition

| Portée               | Emplacement                  | Exemples             |
| -------------------- | ---------------------------- | -------------------- |
| **Global** (app)     | `app/stores/`                | `app-settings-store` |
| **Métier** (domaine) | `features/<domaine>/stores/` | `auth-store`, …      |

| Store        | Fichier                              | Usage                                     |
| ------------ | ------------------------------------ | ----------------------------------------- |
| Auth         | `features/auth/stores/auth-store.ts` | Session JWT, login / logout / 2FA / `/me` |
| App settings | `app/stores/app-settings-store.ts`   | Thème, sidebar, layout admin              |

**Imports :** `@/features/auth`, `@/app/stores/app-settings-store`.

### Clients HTTP

| Client                        | Usage                                                                  |
| ----------------------------- | ---------------------------------------------------------------------- |
| `features/auth` → `authApi`   | Endpoints `/api/auth/*` (sans interceptor refresh — évite les boucles) |
| `utils/helpers/fetch-helpers` | Appels authentifiés domaine (`fetchWrapper`) + refresh sur 401         |

Les formulaires UI appellent le **store** (`useAuthStore`), pas `authApi` directement.

### Helpers (`utils/helpers/`)

| Fichier                   | Rôle                                                               |
| ------------------------- | ------------------------------------------------------------------ |
| `fetch-helpers.ts`        | Wrapper `fetch` avec Bearer + refresh sur 401 (`fetchWrapper`)     |
| `pricing-helpers.ts`      | `isPricingPageEnabled()` — flag `VITE_PRICING_PAGE`                |
| `env-helpers.ts`          | `isDevAppEnv()` — `VITE_APP_ENV === 'development'`                 |
| `fake-backend-helpers.ts` | Backend factice (legacy / démo — ne pas étendre pour l’API réelle) |

**Import :** `@/utils/helpers/fetch-helpers`, `@/utils/helpers/pricing-helpers`, `@/utils/helpers/env-helpers`.

---

## Assets

| Emplacement                      | Usage                                                   |
| -------------------------------- | ------------------------------------------------------- |
| `src/assets/images/front-pages/` | Images front (background, technology, payments)         |
| `src/assets/images/profile/`     | Avatars ContactBar                                      |
| `public/`                        | Fichiers servis tels quels (logos, images features SVG) |

| Fichier `public/`        | Usage                                    |
| ------------------------ | ---------------------------------------- |
| `Spendup-icon-fusee.svg` | Icône logo (`Logo.vue`, taille compacte) |
| `Spendup-logo-fusee.svg` | Logo complet (autres usages / marketing) |

Images features référencées via `/assets/images/front-pages/features/…` (dossier `public/`).

Convention de nommage : `home-*` (accueil), `feature-*` (page fonctionnalités), `domain-*` (domaines complémentaires).

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
    ├── horizontal-header/
    ├── logo/                   # Logo.vue — /app → dashboard, sinon accueil
    └── customizer/

views/app/                    # Pages fines — une par fonctionnalité
├── dashboard/
│   └── AppDashboardView.vue  # → importe DashboardContent depuis features/dashboard

views/dev/                    # Showcase composants (dev only)
└── ComponentsShowcasePage.vue

features/dashboard/           # Logique métier tableau de bord
features/auth/                # Store + API + device + types (barrel index.ts)
```
