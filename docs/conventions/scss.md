# Conventions — SCSS

> Voir : `architecture/styling.md` · Relu : 2026-08-13

- Tous les styles dans `src/scss/`.
- Miroir front-pages : `scss/frontpages/` ↔ `components/frontpages/`.
- Admin / Vuetify : `scss/layout/`, `components/`, `pages/`.
- Pas de `.scss`/`.css` dans `components/` ou `features/`.
- Extraire les `<style>` volumineux vers `scss/`.
- Préférer classes existantes (`.su-*`, Vuetify utilities) avant d’en créer.
