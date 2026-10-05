# Pattern — App Tabs Shell

> Code : `src/components/shared/tabs/AppTabsShell.vue`  
> Réf. : `views/app/parametres/accounts/AppAccountsPage.vue`  
> Variante sans onglets : `app-page-shell.md` · Relu : 2026-08-13

## Qu’est-ce que c’est ?

Page authentifiée pleine hauteur (`page-wrapper`) : **une card** à trois zones.

| Zone   | Rôle                  | Comportement                      |
| ------ | --------------------- | --------------------------------- |
| Header | `v-tabs`              | Fixe                              |
| Body   | Onglet actif          | Seul scroll (`perfect-scrollbar`) |
| Footer | Enregistrer / Annuler | Fixe dans la card                 |

Même avec un seul onglet (paramètres) : conserver `v-tabs` + ce shell.

## Emplacement

```
views/app/<zone>/<page-slug>/App<Name>Page.vue
features/<domaine>/components/*Tab.vue
```

- View = orchestration shell + dirty / save / cancel.
- Tabs = composants feature exportés via `index.ts`.
- Pas de logique métier lourde dans la view.
- Boutons d’action **uniquement** dans le footer.

## Contrats CSS

| Classe                 | Rôle                                                |
| ---------------------- | --------------------------------------------------- |
| `settings-page`        | Flex colonne, `flex: 1`, `min-height: 0`            |
| `settings-page-card`   | Card pleine hauteur, `overflow: hidden`             |
| `settings-tabs`        | Header tabs                                         |
| `settings-tabs-scroll` | Zone scroll `flex: 1`, `min-height: 0`, `height: 0` |
| `settings-actions-bar` | Footer actions                                      |

Mobile ≤ 767px : full-bleed horizontal, `border-radius: 0`.  
Ne pas recalculer en `100vh` — s’appuyer sur `page-wrapper` / `page-content`.

## Contrats UI tabs

| Élément        | Convention                                                        |
| -------------- | ----------------------------------------------------------------- |
| Fond           | `bg-color="grey100"`                                              |
| Hauteur        | `52px`, icônes `18px`, `density="comfortable"`                    |
| Contenu        | Composants feature uniquement                                     |
| Layout interne | `v-row justify-center` + `v-col md="9"` + cartes `elevation="10"` |
| Dirty          | Tab émet `@dirty` ; expose `save*` / `reset*` + `loading`         |

## Checklist

1. View `App<Name>Page.vue` sous le bon header views
2. Route `AppRoutes.ts` + entrée `sidebarItem.ts`
3. `*Tab.vue` dans la feature + export barrel
4. Reprendre shell (tabs + scrollbar + actions + dirty)
5. Vérifier mobile full-bleed + scroll interne seul
