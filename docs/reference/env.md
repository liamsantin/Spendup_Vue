# Inventaire — environnement

> Fichiers : `.env`, `.env.example` · Relu : 2026-08-13

| Variable                            | Rôle                                                        |
| ----------------------------------- | ----------------------------------------------------------- |
| `VITE_API_BASE_URL`                 | Base API (ex. `http://localhost:5124`)                      |
| `VITE_API_URL`                      | Alias / legacy éventuel — vérifier `.env.example`           |
| `VITE_GOOGLE_CLIENT_ID`             | GIS web — aligné API Web Client ID                          |
| `VITE_GOOGLE_DESKTOP_CLIENT_ID`     | OAuth Desktop PKCE (Tauri) — API doit accepter cet `aud`    |
| `VITE_GOOGLE_DESKTOP_CLIENT_SECRET` | **Requis** avec l’ID (échange token Google / client Bureau) |
| `VITE_AUTH_COOKIE_MODE`             | `true` → cookies HttpOnly + CSRF                            |
| `VITE_PRICING_PAGE`                 | `true`/`1` → page Tarifs                                    |
| `VITE_APP_ENV`                      | `development` → routes `devOnly`                            |

**CORS Tauri :** l’origine WebView (dev `http://localhost:5173`, prod selon bundle) doit figurer dans `Cors:AllowedOrigins` API.

Toutes les `VITE_*` sont injectées dans le bundle (publiques).  
`.env` local hors Git ; `.env.example` commité.
