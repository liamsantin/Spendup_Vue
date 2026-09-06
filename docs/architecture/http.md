# Couche HTTP

> Helpers : `utils/helpers/axios-helpers.ts`, `fetch-helpers.ts`  
> Auth : `features/auth/contract.md` · Statut : active · Relu : 2026-08-13

## Clients

| Client                                   | Usage                                                            |
| ---------------------------------------- | ---------------------------------------------------------------- |
| `authApi` / `authHttp` (`features/auth`) | `/api/auth/*` — **sans** interceptor refresh (évite les boucles) |
| `fetchWrapper` (`fetch-helpers`)         | API domaine authentifiée + refresh sur 401 + retry               |
| `authAxios` / `createApiAxios`           | Instances Axios partagées (ex. blob avatar cross-user)           |

## Enveloppe API

```json
{ "success": true, "message": null, "result": {} }
```

Toujours lire **HTTP status** + `body.success`. Payload métier = `body.result`. JSON camelCase.

## Refresh & session

1. `ensureAccessToken()` : access absent ou `expiresAt` proche (~30 s) → `refreshSession()`.
2. Mutex : un seul refresh concurrent (partagé store / `fetchWrapper`).
3. 401 domaine → refresh → retry une fois ; sinon `forceReLogin()`.
4. Mode Bearer (`VITE_AUTH_COOKIE_MODE=false`, défaut / prod) : header `Authorization` ; refresh `{ refreshToken }` dans le body ; pas de CSRF. Cookie-mode (`true`) : credentials + cookies HttpOnly + CSRF — same-site only.

## Variables

| Variable                | Rôle                            |
| ----------------------- | ------------------------------- |
| `VITE_API_BASE_URL`     | Base API (paths `/api/...`)     |
| `VITE_AUTH_COOKIE_MODE` | `false` = Bearer (prod). `true` = cookies + CSRF |
| `VITE_GOOGLE_CLIENT_ID` | GIS — même ID que l’API         |

Les `VITE_*` sont publiques (bundle). Secrets → backend uniquement.
