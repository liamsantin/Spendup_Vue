# Spend.Up — Starterkit

Application **Vue 3 + TypeScript + Vuetify 3** (base Modernize v6.2), structurée pour Spend.Up.

Stack : Vue 3 · Vite 8 · Pinia · Vue Router · vue-i18n · Vuetify 3

Documentation interne : `docs/structure-spendup.md`, `docs/rules-spendup.md`

## Démarrage

```bash
cp .env.example .env
npm install
npm run dev
```

Variables d’environnement (voir `.env.example`) :

| Variable            | Rôle                                      |
| ------------------- | ----------------------------------------- |
| `VITE_API_URL`      | Préfixe API (fake-backend en local)       |
| `VITE_PRICING_PAGE` | `true` / `1` pour afficher la page Tarifs |

## Dépendances

### Production

| Package                  | Version | Rôle                                |
| ------------------------ | ------- | ----------------------------------- |
| `vue`                    | 3.5.38  | Framework UI                        |
| `vuetify`                | 3.12.8  | Composants Material Design          |
| `vue-router`             | 4.6.4   | Routage                             |
| `pinia`                  | 3.0.4   | État global (stores)                |
| `vue-i18n`               | 9.14.5  | Internationalisation                |
| `vee-validate`           | 4.15.1  | Validation de formulaires           |
| `vue-tabler-icons`       | 2.21.0  | Icônes Tabler                       |
| `vue3-perfect-scrollbar` | 2.0.0   | Barres de défilement personnalisées |

### Développement

| Package                         | Version  | Rôle                                |
| ------------------------------- | -------- | ----------------------------------- |
| `vite`                          | 8.0.16   | Dev server + build                  |
| `@vitejs/plugin-vue`            | 6.0.7    | Support des SFC `.vue`              |
| `typescript`                    | 5.9.3    | Typage                              |
| `vue-tsc`                       | 2.2.12   | Typecheck des composants Vue        |
| `sass`                          | 1.85.1   | Styles SCSS                         |
| `@mdi/font`                     | 7.4.47   | Icônes Material Design (Vuetify)    |
| `eslint`                        | 10.5.0   | Lint                                |
| `eslint-plugin-vue`             | 10.9.2   | Règles ESLint Vue                   |
| `vue-eslint-parser`             | 10.4.1   | Parseur ESLint pour Vue             |
| `typescript-eslint`             | 8.61.1   | Règles ESLint TypeScript            |
| `@vue/eslint-config-typescript` | 14.8.0   | Config ESLint TS pour Vue           |
| `@vue/eslint-config-prettier`   | 10.2.0   | Compatibilité ESLint / Prettier     |
| `prettier`                      | 3.8.4    | Formatage                           |
| `husky`                         | 9.1.7    | Git hooks (pre-commit)              |
| `lint-staged`                   | 16.4.0   | Lint/format sur les fichiers stagés |
| `@vue/tsconfig`                 | 0.9.1    | Bases tsconfig Vue                  |
| `@tsconfig/node22`              | 22.0.2   | Bases tsconfig Node 22              |
| `@types/node`                   | 22.19.21 | Types Node                          |
| `esbuild`                       | 0.28.1   | Bundler sous-jacent (Vite)          |

## Commandes npm

| Commande               | Description                             |
| ---------------------- | --------------------------------------- |
| `npm install`          | Installe les dépendances                |
| `npm run dev`          | Serveur de développement Vite           |
| `npm run build`        | Typecheck puis build production         |
| `npm run preview`      | Prévisualise le build (port 5050)       |
| `npm run typecheck`    | Vérifie les types TypeScript            |
| `npm run lint`         | ESLint (mode check, pour CI)            |
| `npm run lint:fix`     | ESLint + corrections auto               |
| `npm run format`       | Formate le projet avec Prettier         |
| `npm run format:check` | Vérifie le formatage (CI)               |
| `npm run validate`     | typecheck + lint + format:check + build |

Au commit, **Husky** lance **lint-staged** (ESLint + Prettier sur les fichiers stagés).  
Sur chaque PR, la CI GitHub Actions exécute les mêmes contrôles (voir `.github/workflows/ci.yml`).
