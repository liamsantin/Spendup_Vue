# Conventions — Pinia

> Voir : `architecture/state.md` · Relu : 2026-08-13

## Obligatoire

- Setup Store : `defineStore('id', () => { … return {…} })`.
- **Interdit** : Options API (`state` / `getters` / `actions`).

## Emplacements

- Global → `app/stores/`
- Métier → `features/<domaine>/stores/`
- Ancien `src/stores/` : ne pas réintroduire.

## Références

`features/countries/stores/countries-store.ts`, `features/auth/stores/auth-store.ts`.
