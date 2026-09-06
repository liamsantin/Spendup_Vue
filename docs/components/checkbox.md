# AppCheckbox

> Code : `src/components/shared/checkbox/AppCheckbox.vue`  
> Style unique : case arrondie, coche blanche, couleur primaire  
> Preview : `/components` (`VITE_APP_ENV=development`) · Catalogue : `catalog.md`

## Import

```vue
import AppCheckbox from '@/components/shared/checkbox/AppCheckbox.vue';
```

## Style Spend.Up

Carré arrondi (`6px`), bordure `--thread` à l’off, fond primaire + coche à l’on.

```vue
<AppCheckbox v-model="accepted" label="J’accepte" />
<AppCheckbox v-model="accepted" label="Désactivé" disabled />
```

Ne pas utiliser `v-checkbox` brut : toujours `AppCheckbox`.

## Props

| Prop            | Défaut    | Notes                                 |
| --------------- | --------- | ------------------------------------- |
| `v-model`       | `false`   | `boolean` ou `null`                   |
| `label`         | —         | Libellé à droite de la case           |
| `disabled`      | `false`   |                                       |
| `indeterminate` | `false`   | État mixte                            |
| `class`         | —         | Espacement (`mb-2`…)                  |
