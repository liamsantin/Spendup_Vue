# ADR 0004 — Shell desktop Tauri

- **Statut :** accepted
- **Date :** 2026-08-13

## Contexte

Spend.Up est une SPA Vue (landings + auth + `/app`). Un client desktop est requis sans exposer les pages marketing, avec Google Sign-In fiable hors WebView, et des alertes OS quand l’app est en arrière-plan.

## Décision

1. **Tauri 2** encapsule le build Vite (`src-tauri/`, scripts `tauri:dev` / `tauri:build`).
2. Sous `isTauri()`, les routes `FrontPagesRoutes` ne sont pas enregistrées ; `/` → `/auth/login`.
3. **Google desktop** : navigateur système + Authorization Code PKCE + redirect loopback `http://127.0.0.1:<port>/…` → `id_token` → `POST /api/auth/google` (contrat session inchangé). Client OAuth **Desktop** distinct (`VITE_GOOGLE_DESKTOP_CLIENT_ID`) ; l’API accepte son `aud` en plus du Web. Les schemes custom (`spendup://`) sont refusés par la politique OAuth Google.
4. **Notifications** : SignalR inchangé ; sous Tauri, `notificationReceived` peut émettre une notif OS (`plugin-notification`) filtrée par les prefs push existantes.

## Conséquences

### Positives

- Un seul front Vue pour web et desktop.
- GIS reste sur le web ; desktop contourne les limites WebView.
- Cookies / 2FA / guards inchangés une fois l’idToken obtenu.

### Négatives / trade-offs

- Prérequis Rust + outillage Tauri pour builder.
- Coordination API (audience Desktop + CORS origine WebView).
- Deep links desktop : enregistrement scheme OS (dev : `register_all`).

## Alternatives rejetées

- GIS dans la WebView Tauri (fragile / origines).
- Electron (plus lourd, hors choix produit).
- Nouvel endpoint session Google desktop (inutile si dual-audience idToken).
