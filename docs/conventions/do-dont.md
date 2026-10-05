# À faire / À éviter

> Relu : 2026-08-13

## À faire

- Commencer par `_template/old-application/`, puis `modernize/`.
- Créer `features/<domaine>/` dès qu’il y a du code métier.
- Views fines + shells documentés.
- Stores Setup uniquement ; métier dans la feature, globaux dans `app/stores/`.
- SCSS dans `src/scss/` (miroir).
- `<script setup lang="ts">` + imports `@/…`.
- Barrel `index.ts` par feature.
- UI → store → API (pas d’appel HTTP depuis les formulaires).
- `npm run validate` après restructuration.

## À éviter

- Modifier `_template/**`.
- Logique métier dans `views/` ou racine `components/`.
- Stores Options API ; dossier `src/stores/`.
- MDP pending en `sessionStorage` / `localStorage`.
- Helpers hors convention de nommage.
- SCSS hors `src/scss/` ; styles inline volumineux.
- Casser les routes FR existantes.
- Grosses modifs structurelles sans confirmation.
- Features / docs features vides sans code.
- `v-alert` / `v-dialog` / `v-checkbox` bruts pour feedback / modales / cases à cocher.
