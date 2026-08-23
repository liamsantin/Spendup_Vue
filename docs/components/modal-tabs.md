# AppModalTabs

> Code : `src/components/shared/modal/AppModalTabs.vue`  
> Shell modal à onglets — `AppModalBase` + `AppBaseTabs`  
> Preview : `/components` → Modal (`VITE_APP_ENV=development`) · Catalogue : `catalog.md`

**Règle :** pour une modale métier avec onglets, passer par `AppModalTabs` — ne pas recâbler `AppModalBase` + `AppBaseTabs` à la main.

---

## Anatomie

```
┌─────────────────────────────────────┐
│  Titre + sous-titre          [✕]    │  ← header fixe
├─────────────────────────────────────┤
│  [Tab] [Tab] [Tab]                  │  ← tabs hors scroll
├─────────────────────────────────────┤
│  Panel actif                        │  ← body scrollable
├─────────────────────────────────────┤
│  Actions (slot footer)              │  ← footer fixe
└─────────────────────────────────────┘
```

---

## Import

```vue
import AppModalTabs from '@/components/shared/modal/AppModalTabs.vue'; import type { AppBaseTabsItem } from
'@/components/shared/tabs/AppBaseTabs.vue';
```

---

## Props

Hérite des props `AppModalBase` (`modelValue`, `title`, `subtitle`, `maxWidth`, `height`, `persistent`, `showFooter`, `scrollable`).

| Prop        | Type                | Défaut         | Notes                                |
| ----------- | ------------------- | -------------- | ------------------------------------ |
| `tab`       | `string \| null`    | —              | Onglet actif (`v-model:tab`)         |
| `tabs`      | `AppBaseTabsItem[]` | —              | Items (label, icon, disabled, color) |
| `preset`    | `AppBaseTabsPreset` | `align-center` | Sans fond par défaut                 |
| `alignTabs` | `start \| …`        | `start`        | Alignement des tabs                  |
| `grow`      | `boolean`           | `false`        | Tabs pleine largeur                  |
| `color`     | `string`            | —              | Couleur d’accent des tabs            |
| `bgColor`   | `string`            | —              | Fond des tabs                        |

Défauts modal : `maxWidth=640`, `height=720`.

---

## Slots

| Slot            | Props slot           | Usage                                      |
| --------------- | -------------------- | ------------------------------------------ |
| défaut          | `{ activeTab }`      | Contenu au-dessus des panels (alert, load) |
| `panel-<value>` | `{ tab, activeTab }` | Corps de l’onglet `value`                  |
| `footer`        | `{ close }`          | Actions bas                                |
| `header-extra`  | —                    | Sous le sous-titre                         |

---

## Exemple

```vue
<AppModalTabs v-model="open" v-model:tab="activeTab" title="Compte" :tabs="tabs">
    <template #panel-details>…</template>
    <template #panel-shares>…</template>
    <template #footer="{ close }">
        <v-spacer />
        <v-btn color="primary" flat @click="close">Fermer</v-btn>
    </template>
</AppModalTabs>
```

---

## Références d’usage

| Fichier                  | Pattern                    |
| ------------------------ | -------------------------- |
| `AccountDetailModal.vue` | Détails / Relevé / Partage |
