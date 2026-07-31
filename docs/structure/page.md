# Structure de page — Tabbed Action Shell

> Nom du modèle : **Tabbed Action Shell**  
> Référence : `src/views/app/parametres/accounts/AppAccountsPage.vue`  
> À utiliser pour toute nouvelle view `/app` qui combine **onglets fixes**, **contenu scrollable** et **barre d’actions fixe**.

---

## Qu’est-ce qu’un Tabbed Action Shell ?

Un **Tabbed Action Shell** est une page authentifiée qui occupe **toute la hauteur utile** du layout (`page-wrapper`), sous la forme d’une **card unique** découpée en trois zones figées :

| Zone       | Rôle                                     | Comportement                                   |
| ---------- | ---------------------------------------- | ---------------------------------------------- |
| **Header** | `v-tabs` (navigation interne)            | Fixe — ne scroll pas                           |
| **Body**   | Contenu de l’onglet actif                | Seul zone scrollable (`perfect-scrollbar`)     |
| **Footer** | Actions globales (Enregistrer / Annuler) | Fixe — fait partie de la card, pas du viewport |

```
┌─────────────────────────────────────┐
│  Tabs (header fixe)                 │
├─────────────────────────────────────┤
│                                     │
│  Contenu onglet (scroll only)       │
│  ← perfect-scrollbar                │
│                                     │
├─────────────────────────────────────┤
│              [Enregistrer] [Annuler]│
└─────────────────────────────────────┘
```

---

## Emplacement des fichiers

Les views suivent les **headers** de `sidebarItem.ts` :

```
src/views/app/
└── <header-slug>/              # ex. parametres, spendup, finances
    └── <page-slug>/            # ex. accounts, applications
        └── App<Name>Page.vue   # ex. AppAccountsPage.vue
```

| Header sidebar | Dossier parent |
| -------------- | -------------- |
| Spend.Up       | `spendup/`     |
| Finances       | `finances/`    |
| Paramètres     | `parametres/`  |

**Exemple Comptes :**

```
src/views/app/parametres/accounts/AppAccountsPage.vue
src/features/settings/
├── index.ts
├── types.ts
├── data/
│   └── notificationPreferences.ts
└── components/
    ├── AccountTab.vue
    ├── NotificationTab.vue
    └── SecurityTab.vue
```

- La **view** orchestre le shell (tabs, scroll, footer).
- Chaque onglet est un **composant feature** (`*Tab.vue`), exporté via `features/<domaine>/index.ts`.
- Pas de logique métier lourde dans la view : elle compose uniquement.

---

## Anatomie de la view

### 1. Script

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { UserCircleIcon, BellIcon, LockIcon } from 'vue-tabler-icons';
import { AccountTab, NotificationTab, SecurityTab } from '@/features/settings';

const tab = ref('Account'); // valeur du premier v-tab
</script>
```

### 2. Template (ordre imposé)

1. Wrapper page (flex colonne, `flex: 1`)
2. `v-card` shell (flex colonne, `overflow: hidden`, pleine hauteur)
3. `v-tabs` — fond `grey100`, `density="comfortable"`, `height="52"`
4. `v-divider`
5. `perfect-scrollbar` → `v-card-text` → `v-window` / `v-window-item` → composants `*Tab`
6. `v-divider`
7. Barre d’actions (boutons taille **default**, pas `large`)

Les boutons **Enregistrer** / **Annuler** vivent **uniquement** dans le footer du shell — jamais dans les tabs.

### 3. Styles (contrats CSS)

| Classe          | Rôle                                                        |
| --------------- | ----------------------------------------------------------- |
| `*-page`        | Conteneur flex `flex: 1`, `min-height: 0`                   |
| `*-page-card`   | Card shell pleine hauteur, colonne flex, `overflow: hidden` |
| `*-tabs`        | Tabs header (`flex-grow-0`)                                 |
| `*-tabs-scroll` | Zone scroll : `flex: 1`, `min-height: 0`, `height: 0`       |
| `*-actions-bar` | Footer actions (`flex-shrink: 0`), aligné à droite          |

**Mobile (≤ 767px) :** full-bleed horizontal (`100vw` + `margin-left: calc(50% - 50vw)`), `border-radius: 0` sur la card.

Le layout parent (`page-wrapper` / `page-content`) doit déjà être en flex colonne pleine hauteur — ne pas recalculer en `100vh` dans la page.

---

## Contrats UI des tabs

| Élément       | Convention                                                   |
| ------------- | ------------------------------------------------------------ |
| Fond des tabs | `bg-color="grey100"`                                         |
| Hauteur       | `52px`, icônes `18px`, `density="comfortable"`               |
| Contenu       | Composants feature, pas de markup métier inline dans la view |
| Scroll        | Uniquement via `perfect-scrollbar` sur le body               |
| Footer        | Commun à tous les onglets                                    |

---

## Checklist nouvelle page Tabbed Action Shell

1. [ ] Créer `src/views/app/<header>/<page>/App<Name>Page.vue`
2. [ ] Ajouter la route dans `AppRoutes.ts` (import vers le nouveau chemin)
3. [ ] Ajouter l’entrée menu sous le bon `{ header: '...' }` dans `sidebarItem.ts` (et horizontal / headerData si besoin)
4. [ ] Créer les `*Tab.vue` dans `src/features/<domaine>/components/`
5. [ ] Exporter les tabs depuis `src/features/<domaine>/index.ts`
6. [ ] Reprendre le shell (tabs + perfect-scrollbar + actions bar) — ne pas inventer une autre structure
7. [ ] Vérifier mobile full-bleed et scroll interne uniquement

---

## Variante sans onglets

Si la page n’a **pas** d’onglets (ex. Applications), conserver le même shell :

- Header fixe (titre / sous-titre en `v-card-item` à la place de `v-tabs`)
- Body `perfect-scrollbar`
- Footer optionnel (seulement s’il y a des actions globales)

C’est toujours un **Action Shell** ; avec onglets, c’est un **Tabbed Action Shell**.

---

## Référence

| Fichier                                                 | Rôle                                         |
| ------------------------------------------------------- | -------------------------------------------- |
| `src/views/app/parametres/accounts/AppAccountsPage.vue` | Modèle canonique                             |
| `src/features/settings/components/*Tab.vue`             | Contenu des onglets                          |
| `src/layouts/full/vertical-sidebar/sidebarItem.ts`      | Headers → dossiers views                     |
| `src/scss/layout/_container.scss`                       | `page-wrapper` / `page-content` flex hauteur |
