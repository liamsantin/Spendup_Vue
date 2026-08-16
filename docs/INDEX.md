# Documentation Spend.Up (Vue)

> Public : développeur expérimenté (Vue 3 / TS / Pinia).  
> Entrée unique — pas de README dans les sous-dossiers.  
> Relu : 2026-08-13

## Carte

| Besoin                                     | Dossier                                                                                          |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| Modèle mental, frontières, HTTP, realtime  | [`architecture/`](architecture/layers.md)                                                        |
| Normes obligatoires (naming, Pinia, SCSS…) | [`conventions/`](conventions/before-implementing.md)                                             |
| Shells UI réutilisables                    | [`patterns/`](patterns/app-tabs-shell.md)                                                        |
| Contrat d’un domaine métier                | [`features/<domaine>/contract.md`](features/auth/contract.md)                                    |
| Composants shared                          | [`components/`](components/catalog.md)                                                           |
| Inventaire (routes, stores, helpers, env)  | [`reference/`](reference/tree.md)                                                                |
| Checklists opérationnelles                 | [`runbooks/`](runbooks/add-app-feature.md)                                                       |
| Décisions figées                           | [`adr/`](adr/0000-template.md)                                                                   |
| Desktop Tauri                              | [`runbooks/tauri-desktop.md`](runbooks/tauri-desktop.md) · [ADR 0004](adr/0004-tauri-desktop.md) |

## Features documentées

| Domaine       | Contrat                                                                    |
| ------------- | -------------------------------------------------------------------------- |
| Auth          | [`features/auth/contract.md`](features/auth/contract.md)                   |
| Notifications | [`features/notifications/contract.md`](features/notifications/contract.md) |
| Friends       | [`features/friends/contract.md`](features/friends/contract.md)             |
| Accounts      | [`features/accounts/contract.md`](features/accounts/contract.md)           |
| User settings | [`features/user-settings/contract.md`](features/user-settings/contract.md) |
| Countries     | [`features/countries/contract.md`](features/countries/contract.md)         |
| Dashboard     | [`features/dashboard/contract.md`](features/dashboard/contract.md)         |

## Règles d’évolution

1. Top-level figé : `architecture`, `conventions`, `patterns`, `features`, `components`, `reference`, `runbooks`, `adr`.
2. Pas de `README.md` sous `docs/**` — uniquement cet `INDEX.md`.
3. Nouvelle feature `src/features/X` → `docs/features/X/contract.md` dans le même PR.
4. Feature absente du code → pas de dossier docs.
5. Inventaire ≠ règles ≠ contrats : pas de duplication ; croiser par liens.
6. Choix irréversible → ADR numéroté.

## Bootstrap repo

Voir le `README.md` racine (`npm run dev`, env, scripts). Validation : `npm run validate`.
