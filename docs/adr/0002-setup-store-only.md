# ADR 0002 — Setup Store only (Pinia)

- **Statut :** accepted
- **Date :** 2026-08-13

## Contexte

Pinia autorise Options API et Setup Store. Mélanger les deux complexifie lectures, tests et conventions IA/équipe.

## Décision

Tous les stores Pinia sont écrits en Setup Store (`defineStore(id, () => {…})`). Options API interdite.

## Conséquences

### Positives

- Uniformité ; composables familiers (`ref`/`computed`) ; tests plus directs.

### Négatives / trade-offs

- Migration nécessaire si du code Options API réapparaît depuis un template.

## Alternatives rejetées

- Options API par défaut (style Vuex-like).
- Mixte selon « complexité » du store.
