# Inventaire — stores Pinia

> Relu : 2026-08-13 · Style : Setup Store only

| Store           | Fichier                                                | Rôle                                    | Persist                               |
| --------------- | ------------------------------------------------------ | --------------------------------------- | ------------------------------------- |
| `app-settings`  | `app/stores/app-settings-store.ts`                     | Thème, sidebar, layout                  | `localStorage`                        |
| `auth`          | `features/auth/stores/auth-store.ts`                   | Session, refresh mutex, `/me`, avatars… | cookies / sessionStorage selon mode   |
| `step-up`       | `features/auth/stores/step-up-store.ts`                | Challenge actions sensibles             | mémoire                               |
| `countries`     | `features/countries/stores/countries-store.ts`         | Cache liste pays                        | mémoire                               |
| `user-settings` | `features/user-settings/stores/user-settings-store.ts` | Préférences `/api/settings`             | mémoire (+ side-effects app-settings) |
| `notifications` | `features/notifications/stores/notifications-store.ts` | Inbox, badge, hub                       | mémoire                               |
| `friends`       | `features/friends/stores/friends-store.ts`             | Graphe social                           | mémoire                               |
