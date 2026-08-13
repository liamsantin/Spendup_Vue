# Conventions — structure

> Voir : `architecture/layers.md`, `architecture/boundaries.md` · Relu : 2026-08-13

## Règles

- Pas de fichier métier à la racine de `views/` ou `components/`.
- Toute logique métier → `features/<domaine>/`.
- `views/` = coquilles légères (shell + import feature).
- Dossiers en **kebab-case**.
- Pas de dossiers features vides « pour plus tard ».
- Types métier → `features/<domaine>/types.ts` (pas de `entities/`/`models/` tant que non nécessaires).
- Données statiques → `data/<domaine>/`, jamais racine `data/`.
- Helpers transverses → `utils/helpers/<domaine>-helpers.ts`.
- Feedback UI → `AppAlert` (jamais `v-alert` brut).
- Modales métier → `AppModalBase` (jamais `v-dialog` brut).
- Pages paramètres multi-onglets → App Tabs Shell (`patterns/app-tabs-shell.md`).
- Pages `/app` sans onglets → App Page Shell (`patterns/app-page-shell.md`).

## Auth — répartition

| Couche                              | Emplacement                           |
| ----------------------------------- | ------------------------------------- |
| Store / API / types / device / csrf | `features/auth/`                      |
| Formulaires UI                      | `components/auth/` → store uniquement |
| Styles                              | `scss/pages/_authentication.scss`     |
| Guard                               | `app/guards/auth-guard.ts`            |

Pending password post-register : **mémoire seule** (jamais storage).
