# Structure de page — Tabbed Action Shell

> Nom du modèle : **Tabbed Action Shell**  
> Références :
>
> - `src/components/shared/TabbedActionShell.vue` (shell réutilisable)
> - `src/views/app/parametres/accounts/AppAccountsPage.vue` (multi-onglets)
> - `src/views/app/parametres/applications/AppApplicationsPage.vue` (un onglet)
>
> À utiliser pour toute nouvelle view `/app` qui combine **onglets fixes**, **contenu scrollable** et **barre d’actions fixe**.

---

## Qu’est-ce qu’un Tabbed Action Shell ?

Un **Tabbed Action Shell** est une page authentifiée qui occupe **toute la hauteur utile** du layout (`page-wrapper`), sous la forme d’une **card unique** découpée en trois zones figées :

| Zone       | Rôle                                     | Comportement                                   |
| ---------- | ---------------------------------------- | ---------------------------------------------- |
| **Header** | `v-tabs` (navigation interne)            | Fixe — ne scroll pas                           |
| **Body**   | Contenu de l’onglet actif                | Seule zone scrollable (`perfect-scrollbar`)    |
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

Même avec **un seul onglet** (ex. Applications → Thème), conserver `v-tabs` + le shell — ne pas inventer une variante « sans tabs » pour ces pages paramètres.

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
    ├── account/                  # cartes UI (photo, perso, credentials)
    ├── NotificationTab.vue
    ├── SecurityTab.vue
    └── TwoFactor*.vue
```

**Exemple Applications :**

```
src/views/app/parametres/applications/AppApplicationsPage.vue
src/features/applications/
├── index.ts
├── themeOptions.ts
└── components/
    ├── ThemeTab.vue
    └── LanguageTab.vue
```

- La **view** orchestre le shell (tabs, scroll, footer) + dirty / save / cancel.
- Chaque onglet est un **composant feature** (`*Tab.vue`), exporté via `features/<domaine>/index.ts`.
- Pas de logique métier lourde dans la view : elle compose uniquement.

---

## Anatomie de la view

### 1. Script

```vue
<script setup lang="ts">
import { computed, ref } from 'vue';
import { UserCircleIcon, BellIcon, LockIcon } from 'vue-tabler-icons';
import { AccountTab, NotificationTab, SecurityTab } from '@/features/settings';
import { PERFECT_SCROLLBAR_OPTIONS } from '@/utils/helpers/scrollbar-helpers';

type AccountTabExpose = {
    saveProfile: () => void;
    resetProfile: () => void;
    loading: boolean;
};

const tab = ref('Account');
const accountTabRef = ref<AccountTabExpose | null>(null);
const profileDirty = ref(false);

const isAccountTab = computed(() => tab.value === 'Account');
const saveLoading = computed(() => !!accountTabRef.value?.loading);
const saveDisabled = computed(() => !isAccountTab.value || saveLoading.value || !profileDirty.value);
</script>
```

Pattern Applications : même idée avec `ThemeTab` (`saveSettings` / `resetSettings` / `@dirty`).

### 2. Template (ordre imposé)

1. Wrapper page (flex colonne, `flex: 1`) — classes `settings-page`
2. `v-card` shell (flex colonne, `overflow: hidden`, pleine hauteur) — `settings-page-card`
3. `v-tabs` — fond `grey100`, `density="comfortable"`, `height="52"`
4. `v-divider`
5. `perfect-scrollbar` → `v-card-text` → `v-window` / `v-window-item` → composants `*Tab`
6. `v-divider`
7. Barre d’actions (boutons taille **default**, pas `large`) — désactivés si pas dirty / mauvais onglet

Les boutons **Enregistrer** / **Annuler** vivent **uniquement** dans le footer du shell — jamais dans les tabs.

### 3. Styles (contrats CSS)

| Classe                 | Rôle                                                        |
| ---------------------- | ----------------------------------------------------------- |
| `settings-page`        | Conteneur flex `flex: 1`, `min-height: 0`                   |
| `settings-page-card`   | Card shell pleine hauteur, colonne flex, `overflow: hidden` |
| `settings-tabs`        | Tabs header (`flex-grow-0`)                                 |
| `settings-tabs-scroll` | Zone scroll : `flex: 1`, `min-height: 0`, `height: 0`       |
| `settings-actions-bar` | Footer actions (`flex-shrink: 0`), aligné à droite          |

**Mobile (≤ 767px) :** full-bleed horizontal (`100vw` + `margin-left: calc(50% - 50vw)`), `border-radius: 0` sur la card.

Le layout parent (`page-wrapper` / `page-content`) doit déjà être en flex colonne pleine hauteur — ne pas recalculer en `100vh` dans la page.

---

## Contrats UI des tabs

| Élément        | Convention                                                                    |
| -------------- | ----------------------------------------------------------------------------- |
| Fond des tabs  | `bg-color="grey100"`                                                          |
| Hauteur        | `52px`, icônes `18px`, `density="comfortable"`                                |
| Contenu        | Composants feature, pas de markup métier inline dans la view                  |
| Layout interne | `v-row justify-center` + `v-col md="9"` + cartes `elevation="10"` + avatar    |
| Titres         | `h4.text-h4` + avatar `lightprimary` 48px (comme Account / Security)          |
| Scroll         | Uniquement via `perfect-scrollbar` sur le body                                |
| Dirty          | Tab émet `@dirty` ; expose `save*` / `reset*` + `loading`                     |
| Footer         | Commun ; Enregistrer / Annuler actifs seulement si dirty (et onglet concerné) |

---

## Checklist nouvelle page Tabbed Action Shell

1. [ ] Créer `src/views/app/<header>/<page>/App<Name>Page.vue`
2. [ ] Ajouter la route dans `AppRoutes.ts` (import vers le nouveau chemin)
3. [ ] Ajouter l’entrée menu sous le bon `{ header: '...' }` dans `sidebarItem.ts` (et horizontal / headerData si besoin)
4. [ ] Créer les `*Tab.vue` dans `src/features/<domaine>/components/` (structure cartes centrées)
5. [ ] Exporter les tabs depuis `src/features/<domaine>/index.ts`
6. [ ] Reprendre le shell (tabs + perfect-scrollbar + actions bar + dirty) — ne pas inventer une autre structure
7. [ ] Vérifier mobile full-bleed et scroll interne uniquement

---

## Variante Action Shell (sans onglets)

Si la page n’a **vraiment** pas d’onglets (hors paramètres multi-sections), conserver le même shell :

- Header fixe (titre / sous-titre en `v-card-item` à la place de `v-tabs`)
- Body `perfect-scrollbar`
- Footer optionnel (seulement s’il y a des actions globales)

Pour **Paramètres → Applications**, préférer quand même un `v-tab` unique (aligné Comptes).

---

## Référence

| Fichier                                                         | Rôle                                         |
| --------------------------------------------------------------- | -------------------------------------------- |
| `src/views/app/parametres/accounts/AppAccountsPage.vue`         | Modèle canonique multi-onglets               |
| `src/views/app/parametres/applications/AppApplicationsPage.vue` | Variante un onglet (même shell)              |
| `src/features/settings/components/*Tab.vue`                     | Contenu onglets Compte                       |
| `src/features/applications/components/ThemeTab.vue`             | Contenu onglet Thème                         |
| `src/layouts/full/vertical-sidebar/sidebarItem.ts`              | Headers → dossiers views                     |
| `src/scss/layout/_container.scss`                               | `page-wrapper` / `page-content` flex hauteur |
