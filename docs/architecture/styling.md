# Styles (SCSS)

> Convention : `conventions/scss.md` · Statut : active · Relu : 2026-10-23

## Principes

- Tout SCSS vit dans `src/scss/` — **pas** de `.scss`/`.css` dans `components/` ou `features/`.
- Entry : `scss/style.scss` importé dans `main.ts`.
- Kit Swiss `.su-*` (D.A. « Minimal × Swiss Helvetica » : pas de carte, filets 2 px / 1 px, tout carré) : `assets/glass.css` (barrel) → `assets/glass/*.css`. Tokens : `layouts/shell/assets/tokens.css`. Brief complet : `.claude/swiss-brief.md`.
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

assets/glass.css     # barrel kit Swiss (préfixe su-, nom historique)
assets/glass/
├── page.css         # chrome page, hero, tabs, toolbar
├── controls.css     # search, orb, btn, chip, empty
├── content.css      # person, panel, card, grid
├── motion.css       # keyframes, reduced-motion
└── overlays.css     # modales, menus, overrides Vuetify
```

## Typographie & thème

- Police : **Helvetica Neue / Helvetica**, repli **Inter Tight** (Google Fonts dans `index.html`) puis Arial ; deux graisses seulement (400 / 700), chiffres tabulaires.
- Couleurs de marque : bleu `--blue` / `--blue-ink` / `--blue-btn` (donnée clé, action, positif) et violet `--violet` (épargne, dépassement) ; le reste noir / gris / blanc. Sombre = anthracite `#1d1f25`.
- Tokens Vuetify : `color="primary"`, `rgb(var(--v-theme-primary))`, classes `.text-16`, `.su-*`, etc.
- Thèmes : `theme/LightTheme.ts`, `DarkTheme.ts` ; runtime via `useAppSettingsStore`.
