# Styles (SCSS)

> Convention : `conventions/scss.md` · Statut : active · Relu : 2026-08-13

## Principes

- Tout SCSS vit dans `src/scss/` — **pas** de `.scss`/`.css` dans `components/` ou `features/`.
- Entry : `scss/style.scss` importé dans `main.ts`.
- Kit verre `.su-*` : `assets/glass.css` (barrel) → `assets/glass/*.css`. Tokens layout : `layouts/shell/assets/tokens.css`.
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

assets/glass.css     # barrel kit verre (préfixe su-)
assets/glass/
├── page.css         # chrome page, hero, tabs, toolbar
├── controls.css     # search, orb, btn, chip, empty
├── content.css      # person, panel, card, grid
├── motion.css       # keyframes, reduced-motion
└── overlays.css     # modales, menus, overrides Vuetify
```

## Typographie & thème

- Police : **Plus Jakarta Sans** (`index.html` + `$body-font-family`).
- Tokens Vuetify : `color="primary"`, `rgb(var(--v-theme-primary))`, classes `.text-16`, `.su-*`, etc.
- Thèmes : `theme/LightTheme.ts`, `DarkTheme.ts` ; runtime via `useAppSettingsStore`.
