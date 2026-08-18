<script setup lang="ts">
/**
 * Wrapper autour de `v-chip` (Vuetify).
 * Props Spend.Up : `closable` + `visible` (présence du chip, distinct de la sélection).
 * Autres props / attrs / slots de `v-chip` passent telles quelles.
 * Référence visuelle : `_template/modernize/components/ui-components/chip/`.
 */
defineOptions({ name: 'AppChip', inheritAttrs: false });

import { computed, ref } from 'vue';

const props = withDefaults(
    defineProps<{
        /** Affiche l’icône de fermeture (v-chip closable). */
        closable?: boolean;
        /**
         * Présence du chip (optionnel).
         * Distinct de `modelValue` / sélection Vuetify — utiliser `v-model:visible`.
         */
        visible?: boolean;
    }>(),
    {
        closable: false,
        visible: undefined
    }
);

const emit = defineEmits<{
    'update:visible': [value: boolean];
    'click:close': [event: MouseEvent];
    dismiss: [];
}>();

const internalVisible = ref(true);
const isControlled = computed(() => props.visible !== undefined);
const isVisible = computed(() => (isControlled.value ? props.visible !== false : internalVisible.value));

function onClose(event: MouseEvent) {
    event.stopPropagation();
    emit('click:close', event);
    if (!isControlled.value) {
        internalVisible.value = false;
    }
    emit('update:visible', false);
    emit('dismiss');
}
</script>

<template>
    <v-chip v-if="isVisible" :closable="closable" v-bind="$attrs" @click:close="onClose">
        <template v-for="(_, name) in $slots" #[name]="slotData">
            <slot :name="name" v-bind="slotData || {}" />
        </template>
    </v-chip>
</template>
