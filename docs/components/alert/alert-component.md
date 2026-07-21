# AppAlert

> Composant : `src/components/shared/AppAlert.vue`  
> Wrapper fin autour de `v-alert` (Vuetify). Référence visuelle : `_template/modernize/components/ui-components/alert/`.

## Import

```vue
import AppAlert from '@/components/shared/AppAlert.vue';
```

## Défaut Spend.Up

| Prop      | Défaut    | Notes                                    |
| --------- | --------- | ---------------------------------------- |
| `density` | `compact` | Surchargeable (`default`, `comfortable`) |

Toutes les autres props / attrs / slots de `v-alert` passent telles quelles.

---

## Variantes (style Modernize)

### Filled (défaut avec `type`)

```vue
<AppAlert type="error">Message d’erreur</AppAlert>
<AppAlert type="warning">Avertissement</AppAlert>
<AppAlert type="info">Information</AppAlert>
<AppAlert type="success">Succès</AppAlert>
```

### Tonal (`variant="tonal"` + `color`)

```vue
<AppAlert color="error" variant="tonal">Erreur tonale</AppAlert>
<AppAlert color="warning" variant="tonal">Warning tonal</AppAlert>
<AppAlert color="info" variant="tonal">Info tonale</AppAlert>
<AppAlert color="success" variant="tonal">Succès tonal</AppAlert>
```

### Outlined

```vue
<AppAlert type="error" variant="outlined">Erreur outlined</AppAlert>
<AppAlert type="info" variant="outlined">Info outlined</AppAlert>
```

### Description (titre + corps)

```vue
<AppAlert type="info" variant="tonal">
  <h5 class="text-h6 text-capitalize">Info</h5>
  <div>Texte détaillé de l’alerte.</div>
</AppAlert>
```

### Avec icône (`prepend`)

```vue
<AppAlert color="success" variant="tonal">
  <template #prepend>
    <v-icon class="text-24">mdi-checkbox-marked-circle-outline</v-icon>
  </template>
  Opération réussie.
</AppAlert>
```

### Closable

```vue
<script setup lang="ts">
import { ref } from 'vue';
const open = ref(true);
</script>

<template>
    <AppAlert v-model="open" border="start" variant="tonal" color="primary" title="Alerte fermable" closable close-label="Fermer">
        Contenu de l’alerte.
    </AppAlert>
</template>
```

### Action / compact + closable

```vue
<AppAlert type="warning" closable class="single-line-alert">
  <div>Message court avec fermeture.</div>
  <template #prepend>
    <v-icon class="text-24">mdi-alert-outline</v-icon>
  </template>
</AppAlert>
```

---

## Props Vuetify utiles

| Prop / attr | Exemples                                     |
| ----------- | -------------------------------------------- |
| `type`      | `success`, `info`, `warning`, `error`        |
| `color`     | `primary`, `error`, `success`…               |
| `variant`   | `flat` (filled), `tonal`, `outlined`, `text` |
| `density`   | `compact` (défaut), `comfortable`, `default` |
| `closable`  | bouton fermer                                |
| `border`    | `start`, `end`, `top`, `bottom`              |
| `title`     | titre intégré Vuetify                        |
| `class`     | espacement (`mb-4`, `mt-3`…)                 |

## Slots

| Slot      | Usage                     |
| --------- | ------------------------- |
| défaut    | Contenu / message         |
| `prepend` | Icône à gauche            |
| `append`  | Action à droite (bouton…) |
| `title`   | Titre custom (si besoin)  |

---

## Usages typiques auth

```vue
<!-- Feedback après action -->
<AppAlert v-if="success" type="success" class="mt-3">{{ success }}</AppAlert>
<AppAlert v-if="error" type="error" class="mt-3">{{ error }}</AppAlert>

<!-- Notice / hint -->
<AppAlert type="info" variant="tonal" class="mb-4">
  La réinitialisation nécessite un e-mail vérifié.
</AppAlert>
```

Ne pas utiliser `v-alert` brut dans les features Spend.Up : passer par `AppAlert` pour garder le défaut `compact` et un point d’extension unique.
