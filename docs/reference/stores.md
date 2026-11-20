# Inventaire — stores Pinia

> Relu : 2026-08-13 · Style : Setup Store only

| Store            | Fichier                                                  | Rôle                                               | Persist                               |
| ---------------- | -------------------------------------------------------- | -------------------------------------------------- | ------------------------------------- |
| `app-settings`   | `app/stores/app-settings-store.ts`                       | Thème, sidebar, layout                             | `localStorage`                        |
| `auth`           | `features/auth/stores/auth-store.ts`                     | Session, refresh mutex, `/me`, avatars…            | cookies / sessionStorage selon mode   |
| `step-up`        | `features/auth/stores/step-up-store.ts`                  | Challenge actions sensibles                        | mémoire                               |
| `countries`      | `features/countries/stores/countries-store.ts`           | Cache liste pays                                   | mémoire                               |
| `user-settings`  | `features/user-settings/stores/user-settings-store.ts`   | Préférences `/api/settings`                        | mémoire (+ side-effects app-settings) |
| `notifications`  | `features/notifications/stores/notifications-store.ts`   | Inbox, badge, hub                                  | mémoire                               |
| `friends`        | `features/friends/stores/friends-store.ts`               | Graphe social                                      | mémoire                               |
| `categories`     | `features/categories/stores/categories-store.ts`         | Arbre de catégories perso                          | mémoire                               |
| `tiers`          | `features/tiers/stores/tiers-store.ts`                   | Annuaire perso de contreparties                    | mémoire                               |
| `tags`           | `features/tags/stores/tags-store.ts`                     | Libellés perso (plats)                             | mémoire                               |
| `files`          | `features/files/stores/files-store.ts`                   | Documents PDF perso                                | mémoire                               |
| `transactions`   | `features/transactions/stores/transactions-store.ts`     | Journal + justificatifs PDF                        | mémoire                               |
| `imports`        | `features/imports/stores/imports-store.ts`               | Imports de relevés + modèles                       | mémoire                               |
| `savings-goals`  | `features/savings-goals/stores/savings-goals-store.ts`   | Objectifs d’épargne perso                          | mémoire                               |
| `assets`         | `features/assets/stores/assets-store.ts`                 | Actifs patrimoniaux, valorisations, volet véhicule | mémoire                               |
| `real-estate`    | `features/real-estate/stores/real-estate-store.ts`       | Lots, charges, travaux, documents, baux d’un bien  | mémoire                               |
| `investments`    | `features/investments/stores/investments-store.ts`       | Positions et opérations par compte de placement    | mémoire                               |
| `instruments`    | `features/investments/stores/instruments-store.ts`       | Catalogue perso d’instruments, cours manuels       | mémoire                               |
| `liabilities`    | `features/liabilities/stores/liabilities-store.ts`       | Passifs (crédits, hypothèques…)                    | mémoire                               |
| `personal-loans` | `features/personal-loans/stores/personal-loans-store.ts` | Prêts entre personnes (tiers)                      | mémoire                               |
| `shared-debts`   | `features/shared-debts/stores/shared-debts-store.ts`     | Dettes entre amis (créancier / débiteur)           | mémoire                               |
| `net-worth`      | `features/net-worth/stores/net-worth-store.ts`           | Patrimoine net du jour + snapshots mensuels        | mémoire (cache 30 s)                  |
| `subscription`   | `features/subscription/stores/subscription-store.ts`     | Abonnement, plans, sélecteur de plan               | mémoire (API mockée)                  |
