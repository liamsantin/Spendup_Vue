# AppAccordion

> Code : `src/components/shared/accordion/AppAccordion.vue`  
> Preview : `/components` (`VITE_APP_ENV=development`) · Catalogue : `catalog.md`

## Import

```vue
import AppAccordion from '@/components/shared/accordion/AppAccordion.vue';
```

## Style Spend.Up

Rangée sur filets 1 px (sans fond ni bordure colorée), titre 700, chevron trait animé, ouverture en `grid-template-rows` (pas de `v-expansion-panels`).

```vue
<AppAccordion v-model="open" title="Synthèse" subtitle="Détails optionnels">
  <p>Contenu déplié…</p>
</AppAccordion>
```

## Props

| Prop       | Défaut  | Notes                           |
| ---------- | ------- | ------------------------------- |
| `v-model`  | `false` | Ouvert / fermé                  |
| `title`    | `''`    | Titre (ou slot `title`)         |
| `subtitle` | —       | Sous-titre (ou slot `subtitle`) |
| `disabled` | `false` | Bloque le toggle                |

## Slots

| Slot       | Rôle                                  |
| ---------- | ------------------------------------- |
| `default`  | Contenu du panneau                    |
| `title`    | Remplace le titre                     |
| `subtitle` | Remplace le sous-titre                |
| `extra`    | Zone à droite du titre (chip, badge…) |
