# ADR 0003 — Auth Bearer (cross-site)

- **Statut :** superseded (cookie P1) → **accepted Bearer**
- **Date :** 2026-09-06
- **Remplace :** cookie HttpOnly (`VITE_AUTH_COOKIE_MODE=true`) comme mode prod

## Contexte

Front (`spendup-vue.onrender.com`) et API (`api-spendup.ch`) sont **cross-site**. Les cookies de session (`spendup_access`, `spendup_refresh`, `spendup_csrf`) sont des cookies tiers : refusés ou non renvoyés sur mobile (Safari / iOS) → 401 après login. CORS / `SameSite=None` côté API ne suffisent pas.

## Décision

Mode **Bearer** par défaut — **forcé en production** (les cookies tiers cassent Safari / iOS) :

- Lire `accessToken`, `refreshToken`, `expiresAt` dans le JSON (login / Google / 2FA / refresh).
- Header `Authorization: Bearer {accessToken}` sur les appels authentifiés.
- Refresh / logout : `{ refreshToken }` dans le body — pas de `X-CSRF-Token`.
- SignalR : JWT via `accessTokenFactory` (`Authorization` et/ou `?access_token=`).
- Stockage : mémoire Pinia + `sessionStorage` (pas `localStorage`).

Cookie-mode reste disponible en opt-in same-site uniquement (dev).

## Mise à jour du 2026-11-20 — sortie prévue du mode Bearer (revue de code, A1.9)

Le compromis ci-dessous (jetons lisibles par le JS) n'est accepté que tant que le front et l'API sont sur deux sites. Dès que l'API est servie sous le domaine du site (sous-domaine du même domaine enregistrable, pas un domaine d'hébergeur de la Public Suffix List), le site repasse en cookies HttpOnly :

- build de production avec `VITE_AUTH_COOKIE_MODE=true` **et** `VITE_AUTH_SAME_SITE_API=true` (le second évite qu'un ancien réglage bascule le site par accident) ;
- côté API, retirer `ReturnAccessTokenInBody` / `ReturnRefreshTokenInBody` : seules les origines de `Authentication:TokensInBody:Origins` (app de bureau) reçoivent encore les jetons dans le JSON ;
- l'app de bureau reste en Bearer dans tous les cas (`isAuthCookieMode()` renvoie `false` sous Tauri).

Procédure complète : `Docs/deployment.md` de l'API, « Bascule vers le même site ».

## Conséquences

### Positives

- Auth mobile / cross-site sans dépendance aux cookies tiers.

### Négatives / trade-offs

- Jetons accessibles au JS → surface XSS (mitigée : pas de `localStorage`, CSP, refresh court).
- L’API prod doit renvoyer les tokens dans le body (`ReturnAccessTokenInBody` + `ReturnRefreshTokenInBody`).
