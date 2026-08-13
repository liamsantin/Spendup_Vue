# Conventions — tests

> Runbook : `runbooks/validate-and-ship.md` · Relu : 2026-08-13

| Élément  | Règle                                                           |
| -------- | --------------------------------------------------------------- |
| Runner   | Vitest + `@vue/test-utils` + jsdom                              |
| Fichiers | `__tests__/*.test.ts` sibling du module                         |
| Setup    | `src/test/setup.ts`, `src/test/pinia.ts`                        |
| Priorité | auth (tokens/refresh/guard), HTTP, stores critiques             |
| Réseau   | mocker `authApi` / `fetchWrapper` / Axios — jamais d’API réelle |
| CI       | inclus dans `npm run validate`                                  |
