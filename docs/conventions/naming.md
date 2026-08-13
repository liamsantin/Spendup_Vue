# Conventions — nommage

> Relu : 2026-08-13

## Dossiers

kebab-case : `recurring-payments`, `front-pages`, `user-settings`.

## Composants Vue

- PascalCase : `TransactionTable.vue`.
- Préfixe `Spendup` pour le contenu métier front-pages public.
- Pages `/app` : `App<Name>Page.vue`.

## Composables

`use<Nom>.ts` dans `features/<domaine>/composables/`.

## Stores

| Portée | Fichier                            | Composable            |
| ------ | ---------------------------------- | --------------------- |
| Global | `app/stores/<nom>-store.ts`        | `useAppSettingsStore` |
| Métier | `features/…/stores/<nom>-store.ts` | `useAuthStore`, …     |

## Helpers

`utils/helpers/<domaine>-helpers.ts` — pas de `utils.ts` / `helpers.ts` / `fetch-wrapper.ts`.

## Barrel

`features/<domaine>/index.ts` = exports publics.
