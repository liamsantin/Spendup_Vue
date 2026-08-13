# ADR 0001 — Feature-based folders

- **Statut :** accepted
- **Date :** 2026-08-13

## Contexte

Le starterkit Modernize mélange views, widgets et logique. Spend.Up doit scaler vers de nombreux domaines financiers sans monolithe `views/` / `stores/`.

## Décision

Organiser le métier par `src/features/<domaine>/` (api, stores, composants, types, barrel). Les `views/` restent des coquilles de routing. Le transverse vit dans `app/`.

## Conséquences

### Positives

- Frontières claires ; onboarding par domaine ; doc miroir `docs/features/<domaine>/`.

### Négatives / trade-offs

- Discipline requise pour ne pas faire fuiter le métier dans les views ; parfois un peu plus de fichiers.

## Alternatives rejetées

- Stores globaux uniques type ancien `src/stores/`.
- Pages « fat views » comme dans le template Modernize brut.
