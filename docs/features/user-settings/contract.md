# User settings — contrat front

> Code : `src/features/user-settings/`  
> Statut : active · Relu : 2026-08-13  
> Voir aussi : `patterns/app-tabs-shell.md`, `features/auth/contract.md`

## Boundaries

| Couche                 | Détail                                                                                        |
| ---------------------- | --------------------------------------------------------------------------------------------- |
| Route                  | `/app/comptes` (`AppAccountsPage`) — onglets Account / Preferences / Notifications / Security |
| Store                  | `useUserSettingsStore` — settings + draft/baseline + dirty                                    |
| Settings API           | `userSettingsApi` → **`fetchWrapper`** — `GET\|PUT\|PATCH /api/settings`                      |
| Compte / 2FA / devices | via **`useAuthStore` / `authApi`** — pas `userSettingsApi`                                    |

## State

- `ensureLoaded()` avec mutex (promise partagée).
- PATCH = clés dirty uniquement ; `null` explicite inclus (ex. idle off) ; patch vide = no-op.
- Avant save : clamp `idleLogoutMinutes` (5–10080 ou null), `trustedDeviceDurationDays` (1–365).
- Après save : `applyUserSettingsToRuntime` (i18n/thème) + `notifications.syncRealtimePreference`.
- Échec `ensureLoaded` dans le guard : non bloquant ; hydrate draft depuis defaults si besoin.

## Invariants

- Merge API : `{ ...USER_SETTINGS_DEFAULTS, ...api }`.
- Prefs push : impactent chips notifications uniquement (voir contrat notifications).
- Persistence Pinia : aucune ; side-effects thème/locale via `app-settings-store` (localStorage).

## Tests critiques

- `stores/__tests__/user-settings-store.test.ts`
- `__tests__/mappers.test.ts`, `mappers.security.test.ts`, `account-profile.test.ts`
