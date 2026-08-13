# Runbook — validate & ship

> Relu : 2026-08-13

| Étape          | Commande                                                              |
| -------------- | --------------------------------------------------------------------- |
| Tests          | `npm test`                                                            |
| Qualité locale | `npm run validate` (= typecheck + lint + format:check + test + build) |
| Pre-commit     | Husky → lint-staged (ESLint + Prettier sur staged)                    |
| CI             | `.github/workflows/ci.yml`                                            |

Ne pas merger si `validate` échoue. Pas d’API réelle dans les tests unitaires.
