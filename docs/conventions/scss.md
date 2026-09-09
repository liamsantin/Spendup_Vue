# Conventions — SCSS

> Voir : `architecture/styling.md` · Relu : 2026-08-13

- Tous les styles dans `src/scss/`, sauf le kit verre `assets/glass/` et les tokens `layouts/shell/assets/`.
- Miroir front-pages : `scss/frontpages/` ↔ `components/frontpages/`.
- Admin / Vuetify : `scss/layout/`, `components/`, `pages/`.
- Pas de `.scss`/`.css` dans `components/` ou `features/`.
- Extraire les `<style>` volumineux vers `scss/` (kit `.su-*` → `assets/glass/`).
- Préférer classes existantes (`.su-*`, Vuetify utilities) avant d’en créer.
