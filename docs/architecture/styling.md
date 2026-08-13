# Styles (SCSS)

> Convention : `conventions/scss.md` · Statut : active · Relu : 2026-08-13

## Principes

- Tout SCSS vit dans `src/scss/` — **pas** de `.scss`/`.css` dans `components/` ou `features/`.
- Entry : `scss/style.scss` importé dans `main.ts`.
- Dans les `.vue` : `@use '@/scss/…'` en `<style scoped lang="scss">` ; éviter les styles inline volumineux.

## Carte

```
scss/
├── style.scss
├── _variables.scss · _override.scss
├── layout/          # shell admin
├── components/      # overrides Vuetify
├── pages/           # ex. _authentication.scss
├── theme/
└── frontpages/      # miroir components/frontpages
```

## Typographie & thème

- Police : **Plus Jakarta Sans** (`index.html` + `$body-font-family`).
- Tokens Vuetify : `color="primary"`, `rgb(var(--v-theme-primary))`, classes `.text-16`, `.su-*`, etc.
- Thèmes : `theme/LightTheme.ts`, `DarkTheme.ts` ; runtime via `useAppSettingsStore`.
