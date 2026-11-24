# Couches applicatives

> Code : `src/` · Voir aussi : `boundaries.md`, `conventions/structure.md`  
> Statut : active · Relu : 2026-08-13

## Stack

| Élément   | Détail                                              |
| --------- | --------------------------------------------------- |
| Framework | Vue 3 — Composition API, `<script setup lang="ts">` |
| UI        | Vuetify 3                                           |
| State     | Pinia — **Setup Store uniquement**                  |
| Router    | Vue Router 4 — history mode                         |
| Styles    | SCSS (`src/scss/`)                                  |
| Tests     | Vitest + Vue Test Utils + jsdom                     |
| Alias     | `@` → `src/`                                        |

## Couches

| Couche                | Rôle                                                                      |
| --------------------- | ------------------------------------------------------------------------- |
| `app/`                | Transverse : stores globaux, guards                                       |
| `features/<domaine>/` | Logique métier (api, stores, composables, composants domaine)             |
| `views/`              | Pages fines liées au routing                                              |
| `components/`         | UI transverse (`shared/`, `auth/`, `frontpages/`) — pas de logique métier |
| `layouts/`            | Blank (public/auth) · Full (`/app`)                                       |
| `utils/helpers/`      | Helpers transverses (`<domaine>-helpers.ts`)                              |
| `types/`              | Types techniques / UI hors domaine                                        |
| `scss/`               | Tous les styles                                                           |

## Arborescence cible `src/`

```
src/
├── main.ts
├── App.vue
├── app/stores/ · app/guards/
├── features/<domaine>/   # api · stores · components · composables · types · index.ts
├── views/app/ · front-pages/ · authentication/ · dev/
├── components/shared/ · auth/ · frontpages/
├── layouts/blank/ · full/
├── plugins/ · router/ · scss/ · theme/ · test/ · types/ · utils/
└── data/ · assets/
```
