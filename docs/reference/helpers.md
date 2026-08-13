# Inventaire — helpers

> Dossier : `src/utils/helpers/` · Relu : 2026-08-13

| Fichier                | Exports typiques                               |
| ---------------------- | ---------------------------------------------- |
| `fetch-helpers.ts`     | `fetchWrapper` — Bearer/cookies + refresh 401  |
| `axios-helpers.ts`     | `getApiBaseUrl`, `createApiAxios`, `authAxios` |
| `pricing-helpers.ts`   | `isPricingPageEnabled()`                       |
| `env-helpers.ts`       | `isDevAppEnv()`                                |
| `scrollbar-helpers.ts` | `PERFECT_SCROLLBAR_OPTIONS`                    |

Import : `@/utils/helpers/<domaine>-helpers`.  
Helpers métier → `features/<domaine>/` (ex. `profilePicture.ts`, `device.ts`, `csrf.ts`).
