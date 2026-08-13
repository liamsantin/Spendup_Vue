# Runbook — nouvelle fonctionnalité `/app`

> Patterns : `patterns/app-tabs-shell.md`, `app-page-shell.md` · Relu : 2026-08-13

1. Chercher dans `_template/old-application/`, puis `_template/modernize/`.
2. Créer `features/<domaine>/` :
    ```
    api/ ou api.ts · components/ · composables/ · stores/ · types.ts · index.ts
    ```
3. View fine `views/app/…/App<Name>Page.vue` (Tabs Shell ou Page Shell).
4. Route `AppRoutes.ts` + menu `sidebarItem.ts`.
5. SCSS miroir dans `src/scss/` si besoin.
6. Tests `__tests__/*.test.ts` pour la logique critique.
7. Doc : `docs/features/<domaine>/contract.md` (même PR).
8. `npm run validate`.
