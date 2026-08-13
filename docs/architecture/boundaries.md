# Frontières & flux d’appels

> Voir aussi : `http.md`, `conventions/structure.md`, `features/*/contract.md`  
> Statut : active · Relu : 2026-08-13

## Direction des dépendances

```
views/  →  features/<domaine>  →  api (authApi | fetchWrapper)
                ↓
         components/shared|auth   (présentation)
                ↓
         app/guards · app/stores  (transverse)
```

| Interdit                                             | Autorisé                          |
| ---------------------------------------------------- | --------------------------------- |
| View → `authApi` / `fetchWrapper` direct             | View → store / composants feature |
| Formulaire auth → `authApi` direct                   | Formulaire → `useAuthStore`       |
| Logique métier dans `views/` ou racine `components/` | Métier dans `features/<domaine>/` |
| Store Options API Pinia                              | Setup Store uniquement            |

## Répartition par zone

| Zone   | Views                   | Métier                | UI                                               |
| ------ | ----------------------- | --------------------- | ------------------------------------------------ |
| `/app` | `views/app/…`           | `features/<domaine>/` | `features/…/components/` ou `components/shared/` |
| Public | `views/front-pages/`    | —                     | `components/frontpages/…`                        |
| Auth   | `views/authentication/` | `features/auth/`      | `components/auth/`                               |
| Dev    | `views/dev/`            | —                     | `components/shared/`                             |

## Barrel

Chaque feature expose son API publique via `features/<domaine>/index.ts`.  
Les modules internes (hub SignalR, helpers privés) peuvent rester non exportés.

## Bootstrap session authentifiée

Après session valide sur route `requiresAuth` (`auth-guard`) :

1. `userSettings.ensureLoaded()`
2. `notifications.onAuthenticatedSession()`
3. `friends.onAuthenticatedSession()`

Échecs settings/notifications : non bloquants (catch).
