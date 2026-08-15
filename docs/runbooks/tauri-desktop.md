# Runbook — desktop Tauri

> Prérequis : Rust (rustup), toolchain Windows (MSVC) / macOS Xcode CLT / Linux deps Tauri.  
> Relu : 2026-08-15

## Dev

1. Copier `.env.example` → `.env` ; renseigner :
   - `VITE_API_BASE_URL`
   - `VITE_GOOGLE_CLIENT_ID` (web / GIS)
   - `VITE_GOOGLE_DESKTOP_CLIENT_ID` **et** `VITE_GOOGLE_DESKTOP_CLIENT_SECRET` (client OAuth **Desktop** — le secret est affiché dans Google Cloud et requis pour l’échange de code, même avec PKCE)
2. API : audience Desktop Client ID + CORS (`http://localhost:5173` en dev).
3. Google Cloud : client OAuth **Application de bureau** (pas d’URI à saisir — loopback `127.0.0.1` géré par l’app).
4. `npm run tauri:dev` (lance Vite + fenêtre Tauri).

Smoke : fenêtre → `/auth/login` (pas de landing) → Google ouvre le navigateur → redirect `http://127.0.0.1:…` → session `/app`.

Sans les deux variables Desktop, le bouton Google affiche « non configuré » (pas d’échec opaque à l’échange de token).

## Build

```bash
npm run tauri:build
```

Artefacts sous `src-tauri/target/release/bundle/`.

## Notes

- Web seul : `npm run dev` / `npm run build` inchangés.
- Icônes : `src-tauri/icons/` (remplacer par branding produit avant release store).
- Prod : l’origine WebView Tauri doit aussi figurer dans `Cors:AllowedOrigins` (souvent `http://tauri.localhost` — vérifier l’origine réelle).
