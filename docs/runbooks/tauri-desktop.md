# Runbook — desktop Tauri

> Prérequis : Rust (rustup), toolchain Windows (MSVC) / macOS Xcode CLT / Linux deps Tauri.  
> Relu : 2026-08-16

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

## Publier web + application Windows (ordre)

L’installeur doit être dans `public/downloads/` **avant** le build/déploiement du site, sinon la landing sert un MSI périmé (ou absent).

| #   | Étape                                                                           | Commande / action                                                                               |
| --- | ------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| 1   | Qualité                                                                         | `npm run validate`                                                                              |
| 2   | Build desktop **et** copie du MSI vers `public/downloads/SpendUp-Setup-x64.msi` | `npm run tauri:publish-msi`                                                                     |
| 3   | Commit du MSI (et du code)                                                      | `git add public/downloads/SpendUp-Setup-x64.msi` (+ le reste) puis commit                       |
| 4   | Déployer le **web** (hébergeur / CI)                                            | push / pipeline habituelle — le site embarque alors le MSI à `/downloads/SpendUp-Setup-x64.msi` |

En résumé : **desktop d’abord (publish-msi) → commit du MSI → déploiement web**.

Ne pas faire `npm run build` / déployer le site **avant** `tauri:publish-msi` si tu changes l’app bureau : le bouton landing pointerait encore sur l’ancienne version.

Si le MSI est déjà à jour et que tu ne changes que le front web :

```bash
npm run validate
# puis déployer le web comme d’habitude
```

Si le build Tauri vient d’être fait sans le script :

```bash
npm run tauri:sync-msi   # recopie uniquement le dernier MSI
# puis commit + déploiement web
```

### Tester le téléchargement en local (`preview` vs `dev`)

Le bouton landing pointe vers `/downloads/SpendUp-Setup-x64.msi`.

| Mode    | Commande          | D’où vient le MSI ?                                                                                                                     |
| ------- | ----------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Dev     | `npm run dev`     | `public/downloads/` servi **directement** — dès que le fichier y est (après `tauri:publish-msi` / `tauri:sync-msi`), le lien est à jour |
| Preview | `npm run preview` | Sert **`dist/`**, pas `public/`                                                                                                         |

Après `tauri:publish-msi`, le build Tauri **supprime** volontairement `dist/downloads` (pour ne pas embarquer le MSI dans l’app bureau). Donc **`preview` seul ne suffit pas** juste après publish-msi.

Pour vérifier le MSI via preview :

```bash
npm run tauri:publish-msi   # ou tauri:sync-msi si le build est déjà fait
npm run build               # recopie public/ → dist/ (dont le MSI)
npm run preview             # http://localhost:5050/downloads/SpendUp-Setup-x64.msi
```

Sans ce `npm run build` web, `preview` peut servir un MSI absent ou périmé dans `dist/`.

## Build desktop seul

```bash
npm run tauri:build
```

Artefacts sous `src-tauri/target/release/bundle/` (MSI + NSIS).  
Pour la landing, préférer `npm run tauri:publish-msi` (build + copie au nom stable).

```bash
# Build + copie automatique du MSI au bon endroit (release complète)
npm run tauri:publish-msi

# Si le build vient déjà d’être fait : recopier uniquement le dernier MSI
npm run tauri:sync-msi
```

## Notes

- Web seul : `npm run dev` / `npm run build` inchangés.
- Icônes : `src-tauri/icons/` (remplacer par branding produit avant release store).
- Prod : l’origine WebView Tauri doit aussi figurer dans `Cors:AllowedOrigins` (souvent `http://tauri.localhost` — vérifier l’origine réelle).
- Deep links : `spendup://app/friends` (ou `spendup:///app/friends`) → route `/app/friends` si session OK ; 2ᵉ instance Windows/Linux forwardée via single-instance + focus fenêtre.
- CSP : `app.security.csp` (prod) et `devCsp` (HMR) dans `src-tauri/tauri.conf.json` — alignées sur `src/security/csp.ts`, avec `ipc:` / `asset:` requis par Tauri.
- MSI non signé : SmartScreen peut afficher « Éditeur inconnu » au premier lancement.
- Preview MSI : voir [Tester le téléchargement en local](#tester-le-téléchargement-en-local-preview-vs-dev) — `preview` = `dist/`, pas `public/`.
