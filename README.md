# Modernize Starterkit

Template Vue 3 + Vuetify 3 — version **6.2.0**

## Dépendances

### Production

| Package                        | Version | Rôle                                                          |
| ------------------------------ | ------- | ------------------------------------------------------------- |
| `@fullcalendar/core`           | 6.1.21  | Moteur principal du composant calendrier interactif.          |
| `@fullcalendar/daygrid`        | 6.1.21  | Vue calendrier en grille par jour.                            |
| `@fullcalendar/interaction`    | 6.1.21  | Gestion du glisser-déposer et des clics sur le calendrier.    |
| `@fullcalendar/timegrid`       | 6.1.21  | Vue calendrier avec créneaux horaires.                        |
| `@fullcalendar/vue3`           | 6.1.21  | Intégration de FullCalendar dans Vue 3.                       |
| `@tiptap/extension-text-style` | 2.27.2  | Extension TipTap pour styliser le texte dans l'éditeur riche. |
| `@tiptap/pm`                   | 2.27.2  | Couche ProseMirror utilisée par TipTap.                       |
| `@tiptap/starter-kit`          | 2.27.2  | Ensemble d'extensions de base pour l'éditeur TipTap.          |
| `@tiptap/vue-3`                | 2.27.2  | Composants Vue 3 pour l'éditeur TipTap.                       |
| `@types/aos`                   | 3.0.8   | Définitions TypeScript pour la bibliothèque AOS.              |
| `aos`                          | 2.3.4   | Animations au défilement de la page (Animate On Scroll).      |
| `apexcharts`                   | 3.54.1  | Bibliothèque de graphiques interactifs.                       |
| `date-fns`                     | 3.6.0   | Utilitaires de manipulation et de formatage des dates.        |
| `lodash`                       | 4.18.1  | Fonctions utilitaires pour tableaux, objets et chaînes.       |
| `maska`                        | 1.5.2   | Masques de saisie pour les champs de formulaire.              |
| `pinia`                        | 3.0.4   | Gestion d'état global pour Vue 3.                             |
| `remixicon`                    | 4.9.1   | Jeu d'icônes open source.                                     |
| `vee-validate`                 | 4.15.1  | Validation de formulaires pour Vue 3.                         |
| `vite-plugin-vuetify`          | 2.1.3   | Intégration et tree-shaking de Vuetify avec Vite.             |
| `vue`                          | 3.5.38  | Framework JavaScript réactif pour l'interface utilisateur.    |
| `vue-clipboard3`               | 2.0.0   | Copie de texte dans le presse-papiers depuis Vue 3.           |
| `vue-draggable-next`           | 2.3.0   | Glisser-déposer de composants Vue 3.                          |
| `vue-easy-lightbox`            | 1.19.0  | Visionneuse d'images en lightbox.                             |
| `vue-i18n`                     | 9.14.5  | Internationalisation et traduction de l'application.          |
| `vue-router`                   | 4.6.4   | Routage et navigation entre les pages.                        |
| `vue-scrollto`                 | 2.20.0  | Défilement animé vers une section de la page.                 |
| `vue-tabler-icons`             | 2.21.0  | Icônes Tabler pour Vue 3.                                     |
| `vue3-apexcharts`              | 1.11.1  | Wrapper Vue 3 pour les graphiques ApexCharts.                 |
| `vue3-carousel`                | 0.17.0  | Composant carrousel pour Vue 3.                               |
| `vue3-perfect-scrollbar`       | 2.0.0   | Barres de défilement personnalisées dans Vue 3.               |
| `vue3-print-nb`                | 0.1.4   | Impression de contenu depuis Vue 3.                           |
| `vuedraggable`                 | 2.24.3  | Listes réordonnables par glisser-déposer.                     |
| `vuetify`                      | 3.12.8  | Bibliothèque de composants Material Design pour Vue 3.        |
| `yup`                          | 1.7.1   | Schémas de validation de données pour les formulaires.        |

### Développement

| Package                                | Version  | Rôle                                                           |
| -------------------------------------- | -------- | -------------------------------------------------------------- |
| `@mdi/font`                            | 7.4.47   | Icônes Material Design utilisées par Vuetify.                  |
| `@rushstack/eslint-patch`              | 1.7.2    | Correctifs ESLint pour la compatibilité des configs.           |
| `@tsconfig/node22`                     | 22.0.5   | Configuration TypeScript de base pour Node.js 22.              |
| `@types/lodash`                        | 4.17.24  | Définitions TypeScript pour Lodash.                            |
| `@types/node`                          | 22.19.21 | Définitions TypeScript pour l'API Node.js.                     |
| `@typescript-eslint/eslint-plugin`     | 8.61.1   | Règles ESLint pour TypeScript.                                 |
| `@typescript-eslint/parser`            | 8.61.1   | Analyseur ESLint pour le code TypeScript.                      |
| `@typescript-eslint/typescript-estree` | 8.61.1   | Arbre syntaxique TypeScript pour ESLint.                       |
| `@typescript-eslint/utils`             | 8.61.1   | Utilitaires partagés pour typescript-eslint.                   |
| `@vitejs/plugin-vue`                   | 6.0.7    | Prise en charge des fichiers `.vue` dans Vite.                 |
| `@vue/eslint-config-prettier`          | 10.2.0   | Intégration ESLint et Prettier pour Vue.                       |
| `@vue/eslint-config-typescript`        | 14.8.0   | Configuration ESLint TypeScript recommandée pour Vue.          |
| `@vue/tsconfig`                        | 0.9.1    | Configuration TypeScript de référence pour Vue 3.              |
| `esbuild`                              | 0.28.1   | Compilateur JavaScript ultra-rapide pour le bundling.          |
| `eslint`                               | 10.5.0   | Analyse statique et détection d'erreurs dans le code.          |
| `eslint-plugin-vue`                    | 10.9.2   | Règles ESLint spécifiques aux fichiers Vue.                    |
| `prettier`                             | 3.8.4    | Formatage automatique du code source.                          |
| `sass`                                 | 1.101.0  | Préprocesseur CSS pour les styles SCSS.                        |
| `sass-loader`                          | 16.0.8   | Chargement des fichiers Sass dans les outils de build.         |
| `typescript`                           | 5.9.3    | Langage typé compilé en JavaScript.                            |
| `typescript-eslint`                    | 8.61.1   | Outils ESLint unifiés pour TypeScript.                         |
| `vite`                                 | 8.0.16   | Outil de build et serveur de développement.                    |
| `vue-cli-plugin-vuetify`               | 2.5.8    | Plugin Vue CLI pour configurer Vuetify (héritage du template). |
| `vue-tsc`                              | 2.2.12   | Vérification de types TypeScript pour les composants Vue.      |
| `vuetify-loader`                       | 1.9.2    | Chargement optimisé des composants Vuetify (héritage Webpack). |

## Commandes npm

| Commande            | Description                                                  |
| ------------------- | ------------------------------------------------------------ |
| `npm install`       | Installe les dépendances du projet                           |
| `npm run dev`       | Lance le serveur de développement Vite                       |
| `npm run build`     | Vérifie les types TypeScript puis compile pour la production |
| `npm run preview`   | Prévisualise le build de production (port 5050)              |
| `npm run typecheck` | Vérifie les types TypeScript sans compiler                   |
| `npm run lint`      | Analyse et corrige le code avec ESLint                       |
| `npm run format`    | Formate le code source avec Prettier                         |
