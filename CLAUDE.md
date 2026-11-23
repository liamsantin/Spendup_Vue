# Spendup Vue — consignes de travail

## Repères

- Vue 3 + TypeScript + Pinia, Vite, Vitest ; desktop via Tauri (`src-tauri`). Code par domaine dans `src/features/<module>`, avec un mode démo (`src/features/demo`).
- **Point d'entrée de la doc : `docs/INDEX.md`** (architecture, conventions obligatoires, contrat par domaine dans `docs/features/<domaine>/contract.md`, runbooks, ADR). Lire les conventions (`docs/conventions/before-implementing.md`) avant d'implémenter, et le runbook `docs/runbooks/add-app-feature.md` pour une nouvelle feature.
- L'API est configurée par `VITE_API_BASE_URL` (voir `.env` / `.env.example`).

## Lancement local

- Front : `npm run dev` (port 5173 par défaut).
- **Ports réservés par Windows** : la plage 5094–5193 est parfois réservée, ce qui fait échouer vite sur 5173 (`EACCES`). Dans ce cas : `npm run dev -- --port 5300 --strictPort`, et autoriser cette origine côté API (CORS) en pointant `VITE_API_BASE_URL` vers l'API sur son nouveau port.

## Vérifications : aller vite

- **Pendant le travail**, ne lancer que les tests du module touché :
  `npx vitest run src/features/<module> src/features/demo/__tests__/<module>.test.ts`.
- **Une seule fois, à la fin** : `npx vitest run` (suite complète), `npm run typecheck`, eslint + prettier sur les fichiers touchés, `npm run build`.
- **Pas de vérification dans le navigateur** quand les tests (notamment ceux du mode démo) couvrent déjà le parcours. La faire seulement si on la demande, ou pour un changement purement visuel.

## Style et économie de tokens

- Réponses courtes, directes et factuelles : va droit au but.
- Supprime les introductions, conclusions, formules de politesse et reformulations de la demande.
- N'explique le code ou la logique que si je le demande explicitement ou en cas de choix critique.
- Privilégie les listes à puces brèves plutôt que de longs paragraphes.
