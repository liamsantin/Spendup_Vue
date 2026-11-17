<script setup lang="ts">
/** Infobulle d'aide d'une case : rien n'est affiché si le texte est vide. */
defineOptions({ name: 'TaxHelpTip' });

import { HelpCircleIcon } from 'vue-tabler-icons';

defineProps<{ text: string }>();
</script>

<template>
    <span v-if="text" class="tax-help">
        <button type="button" class="tax-help__btn" :aria-label="text">
            <HelpCircleIcon :size="16" stroke-width="1.8" aria-hidden="true" />
        </button>
        <v-tooltip activator="parent" location="top" open-delay="100" content-class="tax-help__tip">
            <v-chip class="tax-help__chip" color="primary" variant="flat" label>{{ text }}</v-chip>
        </v-tooltip>
    </span>
</template>
