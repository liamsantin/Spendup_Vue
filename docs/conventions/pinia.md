# Conventions — Pinia

> Voir : `architecture/state.md` · Relu : 2026-08-24

## Obligatoire

- Setup Store : `defineStore('id', () => { … return {…} })`.
- **Interdit** : Options API (`state` / `getters` / `actions`).

## Emplacements

- Global → `app/stores/`
- Métier → `features/<domaine>/stores/`
- Ancien `src/stores/` : ne pas réintroduire.

## Pattern `stores/internal/` (stores volumineux)

Dès qu’un store dépasse ~300–400 lignes ou mélange plusieurs responsabilités (CRUD, listes paginées, realtime, lifecycle), le découper en factories composées :

```
features/<domaine>/stores/
  <domaine>-store.ts          # façade Pinia fine (composition + return public)
  internal/
    <domaine>-state.ts        # refs, computed, cache, helpers locaux
    <domaine>-crud.ts         # ou -lists / -inbox / …
    <domaine>-realtime.ts
    <domaine>-lifecycle.ts    # bootstrap / openTab / reset
```

### Règles

- Chaque module exporte `createX(deps)` (ou `createXState()` sans deps).
- La façade `useXStore` reste **seule API publique** : même surface pour les composants / tests.
- Pas de breaking change côté consumers lors d’un split.
- Référence canonique : `features/accounts/stores/` (déjà découpé).
- Appliqué aussi à : `friends`, `notifications`, `auth`.

Exemple de composition :

```ts
export const useAccountsStore = defineStore('accounts', () => {
  const state = createAccountsState();
  const crud = createAccountsCrud(state);
  const realtime = createAccountsRealtime(state, { … });
  const lifecycle = createAccountsLifecycle(state, { … });
  return { /* exposer refs + actions */ };
});
```

## Références

`features/accounts/stores/accounts-store.ts`, `features/friends/stores/friends-store.ts`, `features/auth/stores/auth-store.ts`, `features/countries/stores/countries-store.ts`.
