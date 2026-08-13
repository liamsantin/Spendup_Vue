# Routing

> Code : `src/router/` · Guard : `src/app/guards/auth-guard.ts`  
> Inventaire : `reference/routes.md` · Statut : active · Relu : 2026-08-13

## Zones

| Zone         | Fichier routes        | Layout        | Meta                                   |
| ------------ | --------------------- | ------------- | -------------------------------------- |
| Public       | `FrontPagesRoutes.ts` | `BlankLayout` | `requiresAuth: false`                  |
| Auth         | `AuthRoutes.ts`       | `BlankLayout` | public                                 |
| Application  | `AppRoutes.ts`        | `FullLayout`  | `requiresAuth: true`                   |
| Dev showcase | conditionnel          | Blank         | `devOnly` + `VITE_APP_ENV=development` |

Catch-all `/:pathMatch(.*)*` → `Error.vue` (`router/index.ts`).

## Guard

Branché via `router.beforeEach(authGuard)`.

| Meta           | Comportement                                       |
| -------------- | -------------------------------------------------- |
| `requiresAuth` | Session requise ; `fetchMe()` null / morte → login |
| `devOnly`      | Sinon `isDevAppEnv()` → redirect `/auth/404`       |

Ne pas dupliquer la logique de garde dans les views.

## Logo

`layouts/full/logo/Logo.vue` : sous `/app` → `/app` ; ailleurs → `/` (ou prop `homeTo`).

## Squelette page publique

```
AnnounceBar → Header → contenu → ContactBar → Footer
```

Wrapper racine : `.front-wraper`.

## Enregistrement

| Action                 | Fichiers                                                              |
| ---------------------- | --------------------------------------------------------------------- |
| Nouvelle page publique | `FrontPagesRoutes.ts` + nav/footer si besoin                          |
| Nouvelle page `/app`   | `AppRoutes.ts` + `sidebarItem.ts` (+ horizontal/headerData si besoin) |

Ne pas casser les URLs françaises existantes (`/fonctionnalites`, `/a-propos`, …).
