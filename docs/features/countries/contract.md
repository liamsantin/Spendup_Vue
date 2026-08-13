# Countries — contrat front

> Code : `src/features/countries/`  
> Statut : active · Relu : 2026-08-13

## Boundaries

Feature sans UI propre. Consommée surtout par Account (profil) pour le select pays.

| Élément | Détail                                                                    |
| ------- | ------------------------------------------------------------------------- |
| API     | `countriesApi` → `fetchWrapper` — `GET /api/countries` (JWT)              |
| Store   | `useCountriesStore` — cache mémoire + `ensureLoaded` / `refresh` / `byId` |
| Shape   | `{ items: Country[] }` — `id`, `code`, `codeAlpha3`, `name`               |

## Invariants

- Concurrent `ensureLoaded` : une seule promise partagée.
- Skip réseau si `loaded` sauf `force`.
- `items` non-array → `[]`.
- Pas de `reset()` dédié ; pas de realtime.

## Tests

`stores/__tests__/countries-store.test.ts`
