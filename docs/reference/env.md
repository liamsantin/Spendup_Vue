# Inventaire — environnement

> Fichiers : `.env`, `.env.example` · Relu : 2026-08-13

| Variable                | Rôle                                              |
| ----------------------- | ------------------------------------------------- |
| `VITE_API_BASE_URL`     | Base API (ex. `http://localhost:5124`)            |
| `VITE_API_URL`          | Alias / legacy éventuel — vérifier `.env.example` |
| `VITE_GOOGLE_CLIENT_ID` | GIS — aligné API                                  |
| `VITE_AUTH_COOKIE_MODE` | `true` → cookies HttpOnly + CSRF                  |
| `VITE_PRICING_PAGE`     | `true`/`1` → page Tarifs                          |
| `VITE_APP_ENV`          | `development` → routes `devOnly`                  |

Toutes les `VITE_*` sont injectées dans le bundle (publiques).  
`.env` local hors Git ; `.env.example` commité.
