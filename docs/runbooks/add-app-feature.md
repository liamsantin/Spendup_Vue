# Runbook — nouvelle fonctionnalité `/app`

> Patterns : `patterns/app-tabs-shell.md`, `app-page-shell.md` · Relu : 2026-08-13

1. Créer `features/<domaine>/` :
    ```
    api/ ou api.ts · components/ · composables/ · stores/ · types.ts · index.ts
    ```
2. View fine `views/app/…/App<Name>Page.vue` (Tabs Shell ou Page Shell).
3. Route `AppRoutes.ts` + menu `sidebarItem.ts`.
4. SCSS miroir dans `src/scss/` si besoin.
5. Tests `__tests__/*.test.ts` pour la logique critique.
6. Doc : `docs/features/<domaine>/contract.md` (même PR).
7. `npm run validate`.
