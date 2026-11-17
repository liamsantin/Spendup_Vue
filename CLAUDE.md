# Spendup Vue — consignes de travail

## Vérifications : aller vite

- **Pendant le travail**, ne lancer que les tests du module touché :
  `npx vitest run src/features/<module> src/features/demo/__tests__/<module>.test.ts`.
- **Une seule fois, à la fin** : `npx vitest run` (suite complète), `npm run typecheck`, eslint + prettier sur les fichiers touchés, `npm run build`.
- **Pas de vérification dans le navigateur** quand les tests (notamment ceux du mode démo) couvrent déjà le parcours. La faire seulement si on la demande, ou pour un changement purement visuel.
