# AppAlert

> Code : `src/components/shared/alert/AppAlert.vue`  
> Style unique : `variant="tonal"` · `density="default"`  
> Preview : `/components` (`VITE_APP_ENV=development`) · Catalogue : `catalog.md`

## Import

```vue
import AppAlert from '@/components/shared/alert/AppAlert.vue';
```

## Style Spend.Up

Un seul rendu : tonal, densité default, icône selon `type`. Ne pas passer `variant`, `density` ni `color` — ils sont ignorés.

```vue
<AppAlert type="success">Opération réussie.</AppAlert>
<AppAlert type="info">Information utile.</AppAlert>
<AppAlert type="warning">Vérifiez ce champ.</AppAlert>
<AppAlert type="error" closable>Une erreur s’est produite.</AppAlert>
```

Ne pas utiliser `v-alert` brut : toujours `AppAlert`.

## Props

| Prop        | Défaut | Notes                                              |
| ----------- | ------ | -------------------------------------------------- |
| `type`      | —      | `success`, `info`, `warning`, `error`              |
| `closable`  | `false`| Croix de fermeture                                 |
| `dismissMs` | —      | Auto-fermeture + barre de progression              |
| `class`     | —      | Espacement (`mb-4`, `mt-3`, `su-alert`…)           |

`v-model` optionnel pour contrôler la visibilité avec `closable` / `dismissMs`.

## Exemples

```vue
<AppAlert v-if="success" type="success" class="mt-3">{{ success }}</AppAlert>
<AppAlert v-if="error" type="error" class="mt-3" closable @dismiss="error = null">{{ error }}</AppAlert>
<AppAlert type="info" class="mb-4">La réinitialisation nécessite un e-mail vérifié.</AppAlert>
```
