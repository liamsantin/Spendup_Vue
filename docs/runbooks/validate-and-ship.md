# Runbook — validate & ship

> Relu : 2026-08-16

| Étape          | Commande                                                              |
| -------------- | --------------------------------------------------------------------- |
| Tests          | `npm test`                                                            |
| Qualité locale | `npm run validate` (= typecheck + lint + format:check + test + build) |
| Pre-commit     | Husky → lint-staged (ESLint + Prettier sur staged)                    |
| CI             | `.github/workflows/ci.yml`                                            |

Ne pas merger si `validate` échoue. Pas d’API réelle dans les tests unitaires.

## Release web + desktop Windows

Ordre détaillé : [`tauri-desktop.md` → Publier web + application Windows](tauri-desktop.md#publier-web--application-windows-ordre).

1. `npm run validate`
2. `npm run tauri:publish-msi` (build app + MSI dans `public/downloads/`)
3. Commit du MSI (+ code)
4. Déployer le site web

Pour tester le lien de téléchargement en local : **`npm run preview` sert `dist/`, pas `public/`**. Après `tauri:publish-msi`, refaire `npm run build` puis `npm run preview` (détail : [`tauri-desktop.md`](tauri-desktop.md#tester-le-téléchargement-en-local-preview-vs-dev)). En `npm run dev`, le MSI de `public/downloads/` est servi directement.
