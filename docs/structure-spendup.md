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
    ├── rules-spendup.md
    ├── structure/page.md              # App Tabs Shell
    ├── features/auth/authentication-rules.md
    └── components/                    # AppAlert, AppModalBase, …
```

| Dossier                      | Rôle                                                                   | Quand l'utiliser                                                |
| ---------------------------- | ---------------------------------------------------------------------- | --------------------------------------------------------------- |
| `_template/modernize/`       | Thème **Modernize v6.2** intact (équivalent `packages/main`)           | Chercher un écran, widget ou composant admin du thème d'origine |
| `_template/old-application/` | **Spend.Up** déjà structuré (`app/`, `features/`, front-pages, `/app`) | Copier / adapter la structure et le code Spend.Up cible         |

**Ne pas modifier** ces deux dossiers — toute personnalisation se fait dans `src/`.

---

## Stack & commandes

| Élément   | Détail                                                                                          |
| --------- | ----------------------------------------------------------------------------------------------- |
| Framework | Vue 3 (Composition API, `<script setup>`)                                                       |
| UI        | Vuetify 3 — composants préfixés `v-` (`v-btn`, `v-card`, `v-container`…)                        |
| State     | Pinia — **Setup Store uniquement** (`app/stores/` globaux, `features/<domaine>/stores/` métier) |
| Router    | Vue Router 4 — history mode, guard dans `src/app/guards/`                                       |
| Styles    | SCSS (Sass)                                                                                     |
| Tests     | Vitest + Vue Test Utils + jsdom (`__tests__/*.test.ts`, setup dans `src/test/`)                 |
| Icônes    | `vue-tabler-icons` (imports individuels / tree-shake) + Vuetify `mdi-svg` (pas de webfont MDI)  |
| Alias     | `@` → `src/`                                                                                    |
| Dev       | `npm run dev`                                                                                   |
| Test      | `npm test` (CI) / `npm run test:watch`                                                          |
| Build     | `npm run build` (vue-tsc + vite)                                                                |
| Validate  | `npm run validate` = typecheck + lint + format:check + **test** + build                         |

---

## Arborescence `src/`

```
src/
├── main.ts                 # Point d'entrée, plugins globaux, import SCSS global
├── App.vue
├── app/                    # Couche application (transverse, hors domaine métier)
│   ├── stores/             # Stores Pinia globaux uniquement
│   └── guards/             # Guards Vue Router (+ __tests__/)
├── features/               # Logique métier par domaine fonctionnel
│   ├── auth/
│   ├── countries/
│   ├── notifications/      # Inbox REST + hub SignalR (badge header)
│   ├── user-settings/      # Profil / Préférences / Notifications / Sécurité
│   ├── dashboard/
│   └── …                   # transactions, budgets… (à créer avec du code réel)
├── views/
│   ├── app/                # Pages fines zone /app — liées au routing
│   │   ├── dashboard/
│   │   ├── notifications/  # Inbox notifications (App Tabs Shell)
│   │   └── parametres/
│   │       └── accounts/       # App Tabs Shell — Mon compte
│   ├── front-pages/        # Pages publiques (coquilles de route)
│   ├── authentication/     # Login, register, erreur…
│   └── dev/                # Showcase UI (`/components`) — VITE_APP_ENV=development uniquement
├── components/
│   ├── frontpages/         # Composants site public
│   ├── auth/               # Formulaires authentification (UI → store)
│   └── shared/             # Composants réutilisables transverses (AppAlert, AppModalBase, …)
├── assets/images/          # Images statiques (dont profile/avatar catalogue)
├── data/                   # Données statiques (front-pages, header profil)
│   ├── front-pages/
│   └── admin/
├── layouts/
│   ├── blank/              # Pages publiques & auth (sans sidebar)
│   └── full/               # Zone /app (sidebar, header, customizer)
├── plugins/vuetify.ts
├── router/                 # FrontPagesRoutes, AppRoutes, AuthRoutes
├── scss/                   # Tous les styles du projet
├── test/                   # Setup Vitest partagé (setup.ts, pinia.ts)
├── theme/                  # Couleurs Vuetify (LightTheme, DarkTheme)
├── types/                  # Types techniques / UI (hors domaine métier)
└── utils/                  # i18n, helpers transverses
    ├── locales/            # Fichiers i18n (messages.ts, fr.json…)
    └── helpers/            # Helpers nommés <domaine>-helpers.ts (+ __tests__/)
```

> **Types métier :** préférer `features/<domaine>/types.ts` (ex. auth). Les dossiers `entities/` / `models/` ne sont **pas** créés pour l’instant — éventuel partage cross-features plus tard seulement.

---

## Couche `app/` — transverse

Regroupe tout ce qui est **global à l'application**, sans appartenir à un domaine métier.

```
app/
├── stores/
│   └── app-settings-store.ts # Thème, sidebar, layout admin (ex-customizer) — persistés localStorage
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
│   ├── api.ts                      # authHttp / authApi (+ avatar multipart)
│   ├── device.ts
│   ├── types.ts                    # Me, tokens, username helpers…
│   ├── profilePicture.ts           # Catalogue /avatar/user-1…30, hash upload
│   ├── normalizeDevices.ts
│   ├── composables/
│   │   └── useProfileAvatarUrl.ts  # URL avatar partagée (header / sidebar)
│   ├── stores/
│   │   └── auth-store.ts           # Session JWT, refresh mutex, expiresAt, `/me`
│   └── index.ts
├── countries/
│   ├── api.ts                      # GET /api/countries via fetchWrapper
│   ├── types.ts
│   ├── stores/
│   │   └── countries-store.ts      # Cache + ensureLoaded (promise partagée)
│   └── index.ts
├── user-settings/                  # Page Mon compte (+ API /api/settings)
│   ├── api.ts / types.ts / mappers.ts / themeColorOptions.ts
│   ├── stores/
│   │   └── user-settings-store.ts
│   ├── components/
│   │   ├── AccountTab.vue + account/
│   │   ├── PreferencesTab.vue + preferences/
│   │   ├── NotificationsTab.vue + notifications/
│   │   └── SecurityTab.vue + security/   # 2FA, appareils, dialogs
│   └── index.ts
├── dashboard/
│   ├── components/
│   │   └── DashboardContent.vue
│   ├── composables/
│   │   └── useDashboardModules.ts
│   └── index.ts
```

Les tests unitaires sont dans un dossier `__tests__/` sibling du module : ex. `stores/__tests__/auth-store.test.ts`, `helpers/__tests__/fetch-helpers.test.ts`.

### Features prévues (plateforme financière)

`accounts`, `transactions`, `budgets`, `categories`, `recurring-payments`, `invoices`, `expenses`, `income`, `cashflow`, `reports`, `alerts`, `teams` — à créer au fil de l'implémentation, pas en squelettes vides.

### Exemple cible — fonctionnalité `transactions`

```
views/app/finances/transactions/
└── AppTransactionsPage.vue          # Page fine — routing uniquement

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
├── types.ts
└── index.ts
```

---

## Découpage par zone fonctionnelle

| Zone               | Views (pages fines)     | Logique métier                         | Composants UI                                            |
| ------------------ | ----------------------- | -------------------------------------- | -------------------------------------------------------- |
| Application `/app` | `views/app/<header>/…`  | `features/<domaine>/`                  | `features/<domaine>/components/` ou `components/shared/` |
| Site public        | `views/front-pages/`    | — (contenu dans composants)            | `components/frontpages/<feature>/`                       |
| Auth               | `views/authentication/` | `features/auth/` (store + API + types) | `components/auth/`                                       |
| Dev / showcase     | `views/dev/`            | —                                      | `components/shared/` (ex. AppAlert)                      |

**Auth :** store dans `features/auth/stores/auth-store.ts` ; client HTTP typé dans `features/auth/` ; formulaires UI dans `components/auth/` (dont `GoogleSignInButton`, `OtpDigitsInput`) ; styles dans `scss/pages/_authentication.scss` ; guard dans `app/guards/`. Feedback UI via **`AppAlert`** (pas `v-alert` brut) — doc : `docs/components/alert/alert-component.md`. Modales métier via **`AppModalBase`** — `docs/components/modal/modalbase-component.md`. Règles API détaillées : `docs/features/auth/authentication-rules.md`.

**Auth — flux inscription / confirmation (front) :**

| Étape                                 | Comportement                                                                                                                      |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Register avec e-mail                  | `setPendingEmail` + MDP en **mémoire seule** (`setPendingPassword`) + `router.replace` → `/auth/confirm-email?email=…`            |
| Confirm e-mail                        | Pas de champ e-mail éditable : e-mail retenu (query / `pendingEmail`) ; login auto si MDP encore en mémoire, sinon redirect login |
| Réinscription même e-mail non vérifié | Géré côté API (MAJ MDP + nouveau code) ; front redirige à nouveau vers confirm                                                    |
| Notice login                          | `sessionStorage` clé `spendup_login_notice` (pas de `?notice=` dans l’URL) — `consumeLoginNotice()`                               |
| Logo                                  | Voir section Logo ci-dessous                                                                                                      |

**Paramètres `/app` — App Tabs Shell** (doc : `docs/structure/page.md`) :

| Route                | View                   | Feature         | Onglets                                      |
| -------------------- | ---------------------- | --------------- | -------------------------------------------- |
| `/app/comptes`       | `AppAccountsPage`      | `user-settings` | Profil, Préférences, Notifications, Sécurité |
| `/app/notifications` | `AppNotificationsPage` | `notifications` | Inbox — App Page Shell                       |

(`/app/applications` redirige vers `/app/comptes` — feature `applications` supprimée.)

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
| `/app/comptes`               | `parametres/accounts/AppAccountsPage`                    | `features/user-settings` — App Tabs Shell          |
| `/app/notifications`         | `notifications/AppNotificationsPage`                     | `features/notifications` — App Page Shell          |
| `/app/applications`          | redirect → `/app/comptes`                                | legacy                                             |
| `/:pathMatch(.*)*`           | `Error`                                                  | Catch-all 404 (`router/index.ts`)                  |

**Composants auth UI** (`components/auth/`) : `LoginForm`, `RegisterForm`, `ResetForm`, `ResetPasswordForm`, `TwoStepForm`, `ConfirmEmailForm`, `ConfirmEmailChangeForm`, `GoogleSignInButton`, `OtpDigitsInput`.

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
- Sur route protégée : si `fetchMe()` renvoie `null` / session morte → redirect login

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

| Fichier                                | Rôle                                                                                                    |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `src/theme/LightTheme.ts`              | Thèmes clairs : `BLUE_THEME`, `AQUA_THEME`, `PURPLE_THEME`, `GREEN_THEME`, `CYAN_THEME`, `ORANGE_THEME` |
| `src/theme/DarkTheme.ts`               | Variantes dark (`DARK_*_THEME`)                                                                         |
| `src/plugins/vuetify.ts`               | Enregistrement de **tous** les thèmes, defaults composants                                              |
| `src/scss/theme/_themeColors.scss`     | Overrides CSS variables pour variantes non-blue                                                         |
| `src/app/stores/app-settings-store.ts` | `actTheme` + layout — **persistés** en `localStorage` (`spendup_app_settings`)                          |

**Couleurs clés (BLUE_THEME light) :**

- `primary` : `#5D87FF`
- `secondary` : `#49BEFF`
- `textPrimary` : `#2A3547`
- `lightprimary` : `#ECF2FF`

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

| Store        | Fichier                                        | Usage                                                                          |
| ------------ | ---------------------------------------------- | ------------------------------------------------------------------------------ |
| Auth         | `features/auth/stores/auth-store.ts`           | Session JWT, refresh mutex, `expiresAt`, login / logout / 2FA / `/me`, avatars |
| App settings | `app/stores/app-settings-store.ts`             | Thème, sidebar, layout — persistés `localStorage`                              |
| Countries    | `features/countries/stores/countries-store.ts` | Liste pays (`GET /api/countries`)                                              |

**Style :** Setup Store uniquement (`defineStore('id', () => { … return {…} })`) — voir `docs/rules-spendup.md` § Stores Pinia. Pas d’Options API.

**Imports :** `@/features/auth`, `@/features/countries`, `@/app/stores/app-settings-store`.

### Clients HTTP

| Client                        | Usage                                                                  |
| ----------------------------- | ---------------------------------------------------------------------- |
| `features/auth` → `authApi`   | Endpoints `/api/auth/*` (sans interceptor refresh — évite les boucles) |
| `utils/helpers/fetch-helpers` | Appels authentifiés domaine (`fetchWrapper`) + refresh sur 401         |

Les formulaires UI appellent le **store** (`useAuthStore`), pas `authApi` directement.

### Helpers (`utils/helpers/`)

| Fichier                | Rôle                                                                 |
| ---------------------- | -------------------------------------------------------------------- |
| `fetch-helpers.ts`     | `fetchWrapper` Axios domaine + Bearer + refresh 401 + `forceReLogin` |
| `axios-helpers.ts`     | `getApiBaseUrl`, `createApiAxios`, `authAxios`                       |
| `pricing-helpers.ts`   | `isPricingPageEnabled()` — flag `VITE_PRICING_PAGE`                  |
| `env-helpers.ts`       | `isDevAppEnv()` — `VITE_APP_ENV === 'development'`                   |
| `scrollbar-helpers.ts` | `PERFECT_SCROLLBAR_OPTIONS` (pages shell, customizer)                |

**Import :** `@/utils/helpers/fetch-helpers`, `@/utils/helpers/axios-helpers`, etc.

---

## Assets

| Emplacement                                 | Usage                                                 |
| ------------------------------------------- | ----------------------------------------------------- |
| `src/assets/images/backgrounds/`            | Auth (`login-bg`, `errorimg`, `maintenance`)          |
| `src/assets/images/breadcrumb/`             | `ChatBc.png` (BaseBreadcrumb)                         |
| `src/assets/images/front-pages/background/` | Ellipses, Scene, design-collection.webp, announce bar |
| `src/assets/images/logos/`                  | `logoIcon.svg` (footer)                               |
| `src/assets/images/profile/avatar/`         | Catalogue `user-1` … `user-30` (AccountTab, UI)       |
| `src/assets/images/svgs/`                   | `icon-account.svg` (menu profil)                      |
| `public/`                                   | Logos fusée, images features SVG, marketing           |

| Fichier `public/`        | Usage                                    |
| ------------------------ | ---------------------------------------- |
| `Spendup-icon-fusee.svg` | Icône logo (`Logo.vue`, taille compacte) |
| `Spendup-logo-fusee.svg` | Logo complet (autres usages / marketing) |

Images features référencées via `/assets/images/front-pages/features/…` (dossier `public/`).

Convention de nommage : `home-*` (accueil), `feature-*` (page fonctionnalités), `domain-*` (domaines complémentaires).

**Avatars catalogue :** chemins API `/avatar/user-1` … `/avatar/user-30` — mapping front dans `features/auth/profilePicture.ts`. Upload utilisateur = hash SHA-256 (64 hex) via `POST /api/auth/me/avatar`.

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

views/app/                    # Pages fines — une par entrée menu
├── dashboard/
│   └── AppDashboardView.vue
├── notifications/
│   └── AppNotificationsPage.vue
└── parametres/
    └── accounts/
        └── AppAccountsPage.vue       # → features/user-settings (*Tab)

views/dev/                    # Showcase composants (dev only)
└── ComponentsShowcasePage.vue

features/dashboard/           # Logique métier tableau de bord
features/auth/                # Store + API + device + avatars + types (barrel index.ts)
features/countries/           # Liste pays
features/user-settings/       # Profil / Préférences / Notifications / Sécurité (+ API settings)
features/applications/        # Thème & mise en page
```

---

## Tests

| Élément             | Détail                                                                                                |
| ------------------- | ----------------------------------------------------------------------------------------------------- |
| Runner              | Vitest (`vite.config.ts` → `test.environment: 'jsdom'`)                                               |
| Setup               | `src/test/setup.ts` (clear storage / mocks), `src/test/pinia.ts`                                      |
| Emplacement         | `__tests__/*.test.ts` sibling du code testé                                                           |
| Scripts             | `npm test`, `npm run test:watch` — inclus dans `npm run validate`                                     |
| Couverture actuelle | Auth store (expiresAt, mutex, pending MDP), guard, fetchWrapper, countries, username / avatar helpers |
