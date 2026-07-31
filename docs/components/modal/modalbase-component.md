# AppModalBase

> Composant : `src/components/shared/AppModalBase.vue`  
> Shell modal standard Spend.Up — **header fixe**, **body** (optionnellement scrollable), **footer fixe**.  
> Preview live (dev) : `/components` → onglet **Modal** — uniquement si `VITE_APP_ENV=development`.

**Règle :** ne pas utiliser `v-dialog` / `v-card` bruts pour les modales métier. Passer toujours par `AppModalBase`.

---

## Anatomie

```
┌─────────────────────────────────────┐
│  Titre + sous-titre          [✕]    │  ← header fixe
├─────────────────────────────────────┤
│                                     │
│  Contenu (slot défaut)              │  ← body
│  ± perfect-scrollbar si scrollable  │
│                                     │
├─────────────────────────────────────┤
│  Actions (slot footer)              │  ← footer fixe
└─────────────────────────────────────┘
```

- Croix de fermeture en haut à droite (toujours présente).
- Scroll horizontal désactivé (`suppressScrollX`) quand `scrollable` est actif.
- Hauteur max. viewport : `85vh`.

---

## Import

```vue
import AppModalBase from '@/components/shared/AppModalBase.vue';
```

---

## Props

| Prop         | Type               | Défaut | Notes                                                                   |
| ------------ | ------------------ | ------ | ----------------------------------------------------------------------- |
| `modelValue` | `boolean`          | —      | Ouverture (`v-model`)                                                   |
| `title`      | `string`           | —      | Titre du header                                                         |
| `subtitle`   | `string`           | —      | Sous-titre optionnel                                                    |
| `maxWidth`   | `number \| string` | `520`  | Largeur max. du dialog                                                  |
| `height`     | `number \| string` | `640`  | Hauteur fixe de la card (**ignorée** si `scrollable=false`)             |
| `persistent` | `boolean`          | `true` | Empêche la fermeture au clic overlay                                    |
| `showFooter` | `boolean`          | `true` | Affiche le footer / slot `footer`                                       |
| `scrollable` | `boolean`          | `true` | Active `perfect-scrollbar`. **`false`** si le contenu ne déborde jamais |

### Quand mettre `scrollable=false` ?

| Cas                                                   | `scrollable` |
| ----------------------------------------------------- | ------------ |
| Contenu long (QR, listes, formulaires multi-sections) | `true`       |
| Contenu court (OTP 6 chiffres, confirmation simple)   | `false`      |

Avec `scrollable=false`, la card s’adapte en **hauteur auto** (pas de rails / scroll inutiles).

---

## Slots

| Slot           | Props slot  | Usage                                   |
| -------------- | ----------- | --------------------------------------- |
| défaut         | —           | Corps de la modale                      |
| `footer`       | `{ close }` | Actions bas ; `close()` ferme la modale |
| `header-extra` | —           | Contenu additionnel sous le sous-titre  |

---

## API exposée (`ref`)

| Méthode              | Description                                                                                    |
| -------------------- | ---------------------------------------------------------------------------------------------- |
| `close()`            | Ferme la modale                                                                                |
| `refreshScrollbar()` | Recalcule perfect-scrollbar après un changement de contenu async (no-op si `scrollable=false`) |

```vue
const modalRef = ref<InstanceType<typeof AppModalBase> | null>(null);

await loadData();
await modalRef.value?.refreshScrollbar();
```

---

## Exemples

### Modale scrollable (contenu long)

```vue
<script setup lang="ts">
import { ref } from 'vue';
import AppModalBase from '@/components/shared/AppModalBase.vue';

const open = ref(false);
</script>

<template>
    <v-btn color="primary" flat @click="open = true">Ouvrir</v-btn>

    <AppModalBase
        v-model="open"
        title="Exemple scrollable"
        subtitle="Header et footer restent fixes."
        :max-width="520"
        :height="640"
        scrollable
    >
        <p v-for="n in 20" :key="n" class="mb-3">Ligne de contenu {{ n }}</p>

        <template #footer="{ close }">
            <v-btn variant="text" flat @click="close">Annuler</v-btn>
            <v-spacer />
            <v-btn color="primary" flat @click="close">Confirmer</v-btn>
        </template>
    </AppModalBase>
</template>
```

### Modale statique (sans scroll)

```vue
<AppModalBase v-model="open" title="Confirmation" subtitle="Contenu court — pas de scrollbar." :max-width="440" :scrollable="false">
    <p class="text-body-1">Voulez-vous continuer ?</p>

    <template #footer="{ close }">
        <v-btn variant="text" flat @click="close">Annuler</v-btn>
        <v-spacer />
        <v-btn color="primary" flat @click="close">OK</v-btn>
    </template>
</AppModalBase>
```

### Sans footer

```vue
<AppModalBase v-model="open" title="Info" :show-footer="false" :scrollable="false">
    <p>Message informatif uniquement.</p>
</AppModalBase>
```

---

## Références d’usage

| Fichier                      | Pattern                                                             |
| ---------------------------- | ------------------------------------------------------------------- |
| `TwoFactorSetupDialog.vue`   | `scrollable` + `height` + `refreshScrollbar` après chargement async |
| `TwoFactorDisableDialog.vue` | `:scrollable="false"` (OTP court)                                   |
