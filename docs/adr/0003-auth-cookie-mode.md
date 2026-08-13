# ADR 0003 — Auth cookie mode (P1)

- **Statut :** accepted
- **Date :** 2026-08-13

## Contexte

Stocker refresh (et access) en JS storage expose au XSS. L’API Spend.Up propose cookies HttpOnly + CSRF.

## Décision

Activer le mode cookie via `VITE_AUTH_COOKIE_MODE=true` : access/refresh en cookies HttpOnly, `withCredentials`, CSRF double-submit sur refresh/logout, pas de Bearer côté JS en ce mode. Voir `features/auth/contract.md` § P1.

## Conséquences

### Positives

- Surface XSS réduite pour les jetons ; alignement API sécurité.

### Négatives / trade-offs

- CORS credentials stricts ; complexité CSRF ; deux modes à maintenir pendant transition éventuelle.

## Alternatives rejetées

- Refresh durable en `localStorage`.
- Access only en mémoire sans cookie (UX refresh plus fragile cross-tab).
