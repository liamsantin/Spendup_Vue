# Pattern — App Page Shell

> Code : `src/components/shared/page-shell/AppPageShell.vue`  
> Réf. : `views/app/notifications/AppNotificationsPage.vue`  
> Multi-onglets : `app-tabs-shell.md` · Relu : 2026-08-13

## Qu’est-ce que c’est ?

Même card pleine hauteur que App Tabs Shell, header = **titre** (icône + titre + sous-titre) au lieu de `v-tabs`.

| Zone   | Rôle                    | Comportement                      |
| ------ | ----------------------- | --------------------------------- |
| Header | Titre + slot `#actions` | Fixe, fond `grey100`              |
| Body   | Slot défaut             | Seul scroll                       |
| Footer | Optionnel               | Masqué par défaut (`hideActions`) |

## Props principales

`title`, `subtitle?`, `icon?`, `hideActions` (défaut `true`).

Slot `#actions` : actions header (ex. « Tout lu »).

## Quand l’utiliser

- Pages `/app` mono-contenu (inbox, listes…).
- Paramètres multi-sections → préférer **App Tabs Shell** (même un seul onglet).
